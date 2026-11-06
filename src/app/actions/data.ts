"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { audit, isLocked, recordAttempt, requireForm, requireOwner, requirePerm } from "@/lib/auth";
import { newId } from "@/lib/crypto";
import { sealRow } from "@/lib/clients";
import { ADMIN_EXTRA, FORM_SECTIONS, buildSchema, formDataToObject } from "@/lib/fields";
import { append, clearLog as clearLogRows, deleteById, getConfig, readAll, setConfig, updateById } from "@/lib/db";

export type DataState = { error?: string; ok?: string; secret?: string };

const formSchema = buildSchema(FORM_SECTIONS);
const adminSchema = buildSchema([...FORM_SECTIONS, ADMIN_EXTRA]);

export async function submitClient(_: DataState, fd: FormData): Promise<DataState> {
  const s = await requireForm();
  if (s.acesso === "livre") {
    // Sem senha: o dono pode ter religado a senha; e limitamos cadastros por origem.
    if ((await getConfig("form_senha", "sim")) !== "nao") return { error: "O formulário agora exige senha. Recarregue a página." };
    if (await isLocked("cadastro_livre", 15)) return { error: "Muitos cadastros seguidos. Aguarde alguns minutos." };
  } else {
    // Acesso desativado, vencido ou excluído deixa de valer na hora.
    const hoje = new Date().toISOString().slice(0, 10);
    const a = (await readAll("Acessos")).find((x) => x.id === s.acesso);
    if (!a || a.ativo !== "sim" || (a.validade && a.validade < hoje)) {
      return { error: "Seu acesso ao formulário foi desativado. Fale com o responsável." };
    }
  }
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
  if (s.acesso === "livre") await recordAttempt("cadastro_livre", false); // conta para o limite
  await audit(s.nome, "cliente_cadastrado", id);
  return { ok: "Cliente cadastrado com sucesso." };
}

export async function updateClient(id: string, _: DataState, fd: FormData): Promise<DataState> {
  const me = await requirePerm("clientes_editar");
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return { error: "Cliente inválido" };
  const parsed = adminSchema.safeParse(formDataToObject(fd, [...FORM_SECTIONS, ADMIN_EXTRA]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const ok = await updateById("Clientes", id, sealRow({
    ...(parsed.data as Record<string, string>),
    atualizado_em: new Date().toISOString(),
  }));
  if (!ok) return { error: "Cliente não encontrado" };
  await audit(me.nome, "cliente_editado", id);
  revalidatePath("/painel");
  return { ok: "Alterações salvas." };
}

export async function deleteClient(fd: FormData) {
  const me = await requirePerm("clientes_excluir");
  const id = String(fd.get("id") ?? "");
  if (await deleteById("Clientes", id)) await audit(me.nome, "cliente_excluido", id);
  revalidatePath("/painel");
  redirect("/painel");
}

function strongPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const VALIDADES = ["0", "7", "30", "90"];
const validadeEm = (dias: number) => (dias ? new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10) : "");

export async function createAccess(_: DataState, fd: FormData): Promise<DataState> {
  const me = await requirePerm("acessos");
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const validadeDias = String(fd.get("validade") ?? "0");
  let senha = String(fd.get("senha") ?? "").trim();
  if (!nome) return { error: "Informe o nome de quem vai usar." };
  if (!senha) senha = strongPassword();
  if (senha.length < 10) return { error: "A senha precisa ter pelo menos 10 caracteres." };

  await append("Acessos", {
    id: newId(),
    nome,
    senha_hash: await bcrypt.hash(senha, 12),
    ativo: "sim",
    criado_em: new Date().toISOString(),
    validade: validadeEm(VALIDADES.includes(validadeDias) ? Number(validadeDias) : 0),
    ultimo_uso: "",
    cadastros: "0",
  });
  await audit(me.nome, "acesso_criado", nome);
  revalidatePath("/painel/acessos");
  return { ok: `Acesso criado para ${nome}. Copie a senha agora — ela não será mostrada de novo.`, secret: senha };
}

// Edita nome, senha (opcional), validade e status de um acesso ao formulário.
export async function updateAccess(id: string, _: DataState, fd: FormData): Promise<DataState> {
  const me = await requirePerm("acessos");
  const a = (await readAll("Acessos")).find((x) => x.id === id);
  if (!a) return { error: "Acesso não encontrado." };
  const nome = String(fd.get("nome") ?? "").trim().slice(0, 80);
  const senha = String(fd.get("senha") ?? "").trim();
  const validade = String(fd.get("validade") ?? "manter");
  if (!nome) return { error: "Informe o nome de quem vai usar." };
  if (senha && senha.length < 10) return { error: "A senha precisa ter pelo menos 10 caracteres." };
  if (senha.length > 100) return { error: "Senha longa demais." };

  const patch: Record<string, string> = { nome, ativo: String(fd.get("ativo") ?? "") === "nao" ? "nao" : "sim" };
  if (senha) patch.senha_hash = await bcrypt.hash(senha, 12);
  if (VALIDADES.includes(validade)) patch.validade = validadeEm(Number(validade));
  await updateById("Acessos", id, patch);
  await audit(me.nome, "acesso_editado", nome);
  revalidatePath("/painel/acessos");
  return { ok: senha ? "Alterações salvas. A senha antiga parou de funcionar." : "Alterações salvas." };
}

export async function deleteAccess(fd: FormData) {
  const me = await requirePerm("acessos");
  const id = String(fd.get("id") ?? "");
  const a = (await readAll("Acessos")).find((x) => x.id === id);
  if (a && (await deleteById("Acessos", id))) await audit(me.nome, "acesso_excluido", a.nome);
  revalidatePath("/painel/acessos");
  redirect("/painel/acessos");
}

export async function runBackup(): Promise<void> {
  const me = await requireOwner();
  const { backupToSheet } = await import("@/lib/sheets");
  try {
    const counts = await backupToSheet();
    await audit(me.nome, "backup_ok", JSON.stringify(counts));
  } catch (e) {
    await audit(me.nome, "backup_falhou", e instanceof Error ? e.message : String(e));
  }
  revalidatePath("/painel/log");
}

// Limpa o registro de atividades direto no banco (Supabase). Só o dono.
export async function clearLog(fd: FormData) {
  const me = await requireOwner();
  const modo = String(fd.get("modo") ?? "");
  if (modo === "tudo") await clearLogRows();
  else if (modo === "30") await clearLogRows(new Date(Date.now() - 30 * 86400000).toISOString());
  else return;
  // Fica registrado quem limpou e quando.
  await audit(me.nome, "log_limpo", modo === "tudo" ? "tudo" : "mais de 30 dias");
  revalidatePath("/painel/log");
}

export async function setFormPassword(fd: FormData) {
  const me = await requirePerm("acessos");
  const v = String(fd.get("valor") ?? "") === "nao" ? "nao" : "sim";
  await setConfig("form_senha", v);
  await audit(me.nome, v === "sim" ? "form_senha_ligada" : "form_senha_desligada");
  revalidatePath("/painel/acessos");
}

export async function setSecurity(fd: FormData) {
  const me = await requireOwner();
  const { SEG } = await import("@/lib/security");
  const chave = String(fd.get("chave") ?? "");
  if (!(chave in SEG)) return;
  const v = String(fd.get("valor") ?? "") === "nao" ? "nao" : "sim";
  await setConfig(chave, v);
  await audit(me.nome, v === "sim" ? "seguranca_ligada" : "seguranca_desligada", chave);
  revalidatePath("/painel/seguranca");
}
