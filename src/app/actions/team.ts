"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { audit, requireOwner } from "@/lib/auth";
import { encrypt, newId, sha256 } from "@/lib/crypto";
import { append, readAll, updateById } from "@/lib/db";

export type TeamState = { error?: string; ok?: string; nome?: string; email?: string; senha?: string; qr?: string; chave?: string };

function strongPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(16), (b) => a[b % a.length]).join("");
}

async function credentials(nome: string, email: string) {
  const senha = strongPassword();
  const totp = authenticator.generateSecret(32);
  const qr = await QRCode.toDataURL(authenticator.keyuri(email, "ClientX", totp), { width: 260, margin: 1 });
  return { senha, totp, qr, senha_hash: await bcrypt.hash(senha, 12) };
}

export async function createMember(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!nome) return { error: "Informe o nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "E-mail inválido." };
  if (email === (process.env.ADMIN_EMAIL ?? "").toLowerCase()) return { error: "Esse e-mail já é o do dono." };
  if ((await readAll("Usuarios")).some((u) => u.email_hash === sha256(email))) return { error: "Já existe um membro com esse e-mail." };

  const c = await credentials(nome, email);
  await append("Usuarios", {
    id: newId(), nome, email_hash: sha256(email), email: encrypt(email),
    senha_hash: c.senha_hash, totp_secret: encrypt(c.totp),
    papel: "membro", ativo: "sim", criado_em: new Date().toISOString(), ultimo_login: "",
  });
  await audit(me.nome, "membro_criado", nome);
  revalidatePath("/painel/equipe");
  return { ok: "Membro criado.", nome, email, senha: c.senha, qr: c.qr, chave: c.totp };
}

export async function resetMember(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const u = (await readAll("Usuarios")).find((x) => x.id === id);
  if (!u) return { error: "Membro não encontrado." };
  const { decrypt } = await import("@/lib/crypto");
  const email = decrypt(u.email);
  const c = await credentials(u.nome, email);
  await updateById("Usuarios", id, { senha_hash: c.senha_hash, totp_secret: encrypt(c.totp) });
  await audit(me.nome, "membro_resetado", u.nome);
  return { ok: "Novo acesso gerado. O anterior parou de funcionar.", nome: u.nome, email, senha: c.senha, qr: c.qr, chave: c.totp };
}

export async function toggleMember(fd: FormData) {
  const me = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "sim" ? "sim" : "nao";
  await updateById("Usuarios", id, { ativo });
  await audit(me.nome, ativo === "sim" ? "membro_ativado" : "membro_desativado", id);
  revalidatePath("/painel/equipe");
}
