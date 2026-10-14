"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, requireOwner } from "@/lib/auth";
import { decrypt, encrypt, newId, sha256 } from "@/lib/crypto";
import { append, deleteById, readAll, updateById } from "@/lib/db";
import { papelFrom } from "@/lib/perms";

export type TeamState = { error?: string; ok?: string; nome?: string; email?: string; senha?: string; qr?: string; chave?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function strongPassword() {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(16), (b) => a[b % a.length]).join("");
}

// Senha digitada pelo dono (mín. 10). Vazia = o chamador decide (gerar ou manter).
function chosenPassword(fd: FormData): { senha?: string; error?: string } {
  const senha = String(fd.get("senha") ?? "").trim();
  if (!senha) return {};
  if (senha.length < 10) return { error: "A senha precisa ter pelo menos 10 caracteres." };
  if (senha.length > 100) return { error: "Senha longa demais." };
  return { senha };
}

async function totpFor(email: string) {
  const totp = authenticator.generateSecret(32);
  const qr = await QRCode.toDataURL(authenticator.keyuri(email, "ClientX", totp), { width: 260, margin: 1 });
  return { totp, qr };
}

async function checkEmail(email: string, exceptId = ""): Promise<string | null> {
  if (!EMAIL_RE.test(email)) return "E-mail inválido.";
  if (email === (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase()) return "Esse e-mail já é o do dono.";
  const dup = (await readAll("Usuarios")).some((u) => u.id !== exceptId && u.email_hash === sha256(email));
  return dup ? "Já existe um membro com esse e-mail." : null;
}

const permsFrom = (fd: FormData) => papelFrom(fd.getAll("perm").map(String));

export async function createMember(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!nome) return { error: "Informe o nome." };
  const emailErr = await checkEmail(email);
  if (emailErr) return { error: emailErr };
  const p = chosenPassword(fd);
  if (p.error) return { error: p.error };

  const senha = p.senha ?? strongPassword();
  const t = await totpFor(email);
  await append("Usuarios", {
    id: newId(), nome, email_hash: sha256(email), email: encrypt(email),
    senha_hash: await bcrypt.hash(senha, 12), totp_secret: encrypt(t.totp),
    papel: permsFrom(fd), ativo: "sim", criado_em: new Date().toISOString(), ultimo_login: "",
  });
  await audit(me.nome, "membro_criado", nome);
  revalidatePath("/painel/equipe");
  return { ok: "Membro criado.", nome, email, senha, qr: t.qr, chave: t.totp };
}

// Edita nome, e-mail, senha (opcional), permissões e status de um membro.
export async function updateMember(id: string, _: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const u = (await readAll("Usuarios")).find((x) => x.id === id);
  if (!u) return { error: "Membro não encontrado." };
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  if (!nome) return { error: "Informe o nome." };
  const emailErr = await checkEmail(email, id);
  if (emailErr) return { error: emailErr };
  const p = chosenPassword(fd);
  if (p.error) return { error: p.error };

  const patch: Record<string, string> = {
    nome,
    email_hash: sha256(email),
    email: encrypt(email),
    papel: permsFrom(fd),
    ativo: String(fd.get("ativo") ?? "") === "nao" ? "nao" : "sim",
  };
  if (p.senha) patch.senha_hash = await bcrypt.hash(p.senha, 12);
  await updateById("Usuarios", id, patch);

  const mudou = [
    nome !== u.nome && "nome",
    patch.email_hash !== u.email_hash && "e-mail",
    p.senha && "senha",
    patch.papel !== u.papel && "permissões",
    patch.ativo !== u.ativo && (patch.ativo === "sim" ? "reativado" : "desativado"),
  ].filter(Boolean).join(", ");
  await audit(me.nome, "membro_editado", `${nome}${mudou ? ` (${mudou})` : ""}`);
  revalidatePath("/painel/equipe");
  return { ok: p.senha ? "Alterações salvas. A nova senha vale a partir do próximo login." : "Alterações salvas." };
}

// Gera um novo 2FA e uma senha nova (a digitada, ou uma forte gerada).
export async function resetMember(_: TeamState, fd: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const u = (await readAll("Usuarios")).find((x) => x.id === id);
  if (!u) return { error: "Membro não encontrado." };
  const p = chosenPassword(fd);
  if (p.error) return { error: p.error };
  const email = decrypt(u.email);
  const senha = p.senha ?? strongPassword();
  const t = await totpFor(email);
  await updateById("Usuarios", id, { senha_hash: await bcrypt.hash(senha, 12), totp_secret: encrypt(t.totp) });
  await audit(me.nome, "membro_resetado", u.nome);
  return { ok: "Novo acesso gerado. O anterior parou de funcionar.", nome: u.nome, email, senha, qr: t.qr, chave: t.totp };
}

export async function deleteMember(fd: FormData) {
  const me = await requireOwner();
  const id = String(fd.get("id") ?? "");
  const u = (await readAll("Usuarios")).find((x) => x.id === id);
  if (u && (await deleteById("Usuarios", id))) await audit(me.nome, "membro_excluido", u.nome);
  revalidatePath("/painel/equipe");
  redirect("/painel/equipe");
}
