"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { audit, requireAdmin, requireForm } from "@/lib/auth";
import { newId } from "@/lib/crypto";
import { sealRow } from "@/lib/clients";
import { ADMIN_EXTRA, FORM_SECTIONS, buildSchema, formDataToObject } from "@/lib/fields";
import { append, readAll, updateById } from "@/lib/db";

export type DataState = { error?: string; ok?: string; secret?: string };

const formSchema = buildSchema(FORM_SECTIONS);
const adminSchema = buildSchema([...FORM_SECTIONS, ADMIN_EXTRA]);

export async function submitClient(_: DataState, fd: FormData): Promise<DataState> {
  const s = await requireForm();
  const parsed = formSchema.safeParse(formDataToObject(fd, FORM_SECTIONS));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const now = new Date().toISOString();
  const id = newId();
  await append("Clientes", sealRow({
    ...(parsed.data as Record<string, string>),
    id,
    criado_em: now,
    atualizado_em: now,
    criado_por: s.nome,
    status: "Em implantação",
    situacao: "Em dia",
    valor_aberto: "",
  }));
  const acesso = (await readAll("Acessos")).find((a) => a.id === s.acesso);
  if (acesso) await updateById("Acessos", acesso.id, { cadastros: String(Number(acesso.cadastros || 0) + 1) });
  await audit(s.nome, "cliente_cadastrado", id);
  return { ok: "Cliente cadastrado com sucesso." };
}

export async function updateClient(id: string, _: DataState, fd: FormData): Promise<DataState> {
  await requireAdmin();
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return { error: "Cliente inválido" };
  const parsed = adminSchema.safeParse(formDataToObject(fd, [...FORM_SECTIONS, ADMIN_EXTRA]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const ok = await updateById("Clientes", id, sealRow({
    ...(parsed.data as Record<string, string>),
    atualizado_em: new Date().toISOString(),
  }));
  if (!ok) return { error: "Cliente não encontrado" };
  await audit("admin", "cliente_editado", id);
  revalidatePath("/painel");
  return { ok: "Alterações salvas." };
}

function strongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export async function createAccess(_: DataState, fd: FormData): Promise<DataState> {
  await requireAdmin();
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const validadeDias = String(fd.get("validade") ?? "0");
  let senha = String(fd.get("senha") ?? "").trim();
  if (!nome) return { error: "Informe o nome de quem vai usar." };
  if (!senha) senha = strongPassword();
  if (senha.length < 10) return { error: "A senha precisa ter pelo menos 10 caracteres." };

  const dias = ["0", "7", "30", "90"].includes(validadeDias) ? Number(validadeDias) : 0;
  const validade = dias ? new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10) : "";

  await append("Acessos", {
    id: newId(),
    nome,
    senha_hash: await bcrypt.hash(senha, 12),
    ativo: "sim",
    criado_em: new Date().toISOString(),
    validade,
    ultimo_uso: "",
    cadastros: "0",
  });
  await audit("admin", "acesso_criado", nome);
  revalidatePath("/painel/acessos");
  return { ok: `Acesso criado para ${nome}. Copie a senha agora — ela não será mostrada de novo.`, secret: senha };
}

export async function toggleAccess(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const ativo = String(fd.get("ativo") ?? "") === "sim" ? "sim" : "nao";
  await updateById("Acessos", id, { ativo });
  await audit("admin", ativo === "sim" ? "acesso_ativado" : "acesso_desativado", id);
  revalidatePath("/painel/acessos");
}

export async function runBackup(): Promise<void> {
  await requireAdmin();
  const { backupToSheet } = await import("@/lib/sheets");
  try {
    const counts = await backupToSheet();
    await audit("admin", "backup_ok", JSON.stringify(counts));
  } catch (e) {
    await audit("admin", "backup_falhou", String(e));
  }
  revalidatePath("/painel/log");
}
