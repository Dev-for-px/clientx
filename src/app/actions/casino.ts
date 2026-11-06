"use server";

import { revalidatePath } from "next/cache";
import { audit, requireOwner, requirePerm } from "@/lib/auth";
import { newId } from "@/lib/crypto";
import { append, deleteById, readAll, updateById } from "@/lib/db";
import { CASA_SECTIONS } from "@/lib/casino-fields";
import { STATUS_INT, STATUS_PAG, PAGAMENTOS, TIPOS, calcPagar, camposDe, catalog, listCasas, openCreds, sealCasa, sealCreds, toBr } from "@/lib/casino";
import { buildSchema, formDataToObject } from "@/lib/fields";
import { redirect } from "next/navigation";

export type CState = { error?: string; ok?: string };

const txt = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const moneyOk = (v: string) => v === "" || /^-?\d{1,3}(\.?\d{3})*(,\d{1,2})?$|^-?\d+(,\d{1,2})?$/.test(v);
const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

// ---- Catálogo (só o dono) ----
export async function createIntegration(_: CState, fd: FormData): Promise<CState> {
  const me = await requireOwner();
  const tipo = txt(fd, "tipo");
  const nome = txt(fd, "nome", 60);
  const taxa = txt(fd, "taxa_padrao", 40);
  const campos = txt(fd, "campos", 400).split(",").map((c) => c.trim().slice(0, 40)).filter(Boolean).slice(0, 12).join(",");
  if (!TIPOS.some((t) => t.id === tipo)) return { error: "Escolha o tipo." };
  if (!nome) return { error: "Informe o nome." };
  const atuais = await catalog();
  if (atuais.some((i) => i.nome.toLowerCase() === nome.toLowerCase())) return { error: "Já existe uma integração com esse nome." };
  await append("Integracoes", {
    id: newId(), tipo, nome, taxa_padrao: taxa, campos: campos || "Usuário,Senha,API Key",
    ativo: "sim", ordem: String(atuais.length + 1).padStart(3, "0"), criado_em: new Date().toISOString(),
  });
  await audit(me.nome, "integracao_criada", nome);
  revalidatePath("/cassino/integracoes");
  return { ok: `${nome} adicionada. Ela já aparece em todas as casas.` };
}

export async function updateIntegration(id: string, _: CState, fd: FormData): Promise<CState> {
  const me = await requireOwner();
  const nome = txt(fd, "nome", 60);
  if (!nome) return { error: "Informe o nome." };
  const campos = txt(fd, "campos", 400).split(",").map((c) => c.trim().slice(0, 40)).filter(Boolean).slice(0, 12).join(",");
  await updateById("Integracoes", id, {
    nome, taxa_padrao: txt(fd, "taxa_padrao", 40), campos, ativo: txt(fd, "ativo") === "nao" ? "nao" : "sim",
  });
  await audit(me.nome, "integracao_editada", nome);
  revalidatePath("/cassino/integracoes");
  return { ok: "Salvo." };
}

export async function deleteIntegration(fd: FormData) {
  const me = await requireOwner();
  const id = txt(fd, "id");
  const i = (await catalog()).find((x) => x.id === id);
  if (!i) return;
  for (const ci of (await readAll("CasaIntegracoes")).filter((x) => x.integracao_id === id)) await deleteById("CasaIntegracoes", ci.id);
  await deleteById("Integracoes", id);
  await audit(me.nome, "integracao_excluida", i.nome);
  revalidatePath("/cassino/integracoes");
}

// ---- Integração dentro de uma casa ----
export async function saveCasaIntegration(casaId: string, integracaoId: string, _: CState, fd: FormData): Promise<CState> {
  const me = await requirePerm("cassino_editar");
  const casa = (await listCasas()).find((c) => c.id === casaId);
  const integ = (await catalog()).find((i) => i.id === integracaoId);
  if (!casa || !integ) return { error: "Casa ou integração não encontrada." };
  const status = txt(fd, "status");
  if (!(STATUS_INT as readonly string[]).includes(status)) return { error: "Status inválido." };

  const atual = (await readAll("CasaIntegracoes")).find((x) => x.casa_id === casaId && x.integracao_id === integracaoId);
  const creds = openCreds(atual?.credenciais ?? "");
  camposDe(integ).forEach((c, idx) => {
    const v = String(fd.get(`c${idx}`) ?? "").trim().slice(0, 500);
    if (v) creds[c] = v; // vazio = mantém o valor atual
    if (fd.get(`limpar${idx}`) === "sim") delete creds[c];
  });
  const patch = {
    status, taxa: txt(fd, "taxa", 40), obs: txt(fd, "obs", 500),
    credenciais: sealCreds(creds), atualizado_em: new Date().toISOString(),
  };
  if (atual) await updateById("CasaIntegracoes", atual.id, patch);
  else await append("CasaIntegracoes", { id: newId(), casa_id: casaId, integracao_id: integracaoId, ...patch });
  await audit(me.nome, "integracao_da_casa", `${casa.nome} · ${integ.nome}: ${status}`);
  revalidatePath(`/cassino/casas/${casaId}`);
  revalidatePath("/cassino");
  return { ok: `${integ.nome} salvo.` };
}

// ---- Fechamento de GGR do período ----
export async function saveGgr(_: CState, fd: FormData): Promise<CState> {
  const me = await requirePerm("cassino_editar");
  const inicio = txt(fd, "inicio"), fim = txt(fd, "fim");
  if (!dateOk(inicio) || !dateOk(fim) || fim < inicio) return { error: "Período inválido." };
  const casas = await listCasas();
  const existentes = (await readAll("Ggr")).filter((g) => g.inicio === inicio);
  let salvos = 0;
  for (const casa of casas) {
    const k = (n: string) => txt(fd, `${n}_${casa.id}`, 40);
    const linha = {
      ggr_sl: k("ggr_sl"), ggr_sy: k("ggr_sy"), ggr_vivo: k("ggr_vivo"),
      incluir_servidor: k("servidor") === "sim" ? "sim" : "nao",
      pagamento: k("pagamento"), status_pagamento: k("status_pagamento") || "Pendente", obs: txt(fd, `obs_${casa.id}`, 300),
    };
    const manual = k("manual");
    const vazio = !linha.ggr_sl && !linha.ggr_sy && !linha.ggr_vivo && !manual && linha.incluir_servidor === "nao";
    const atual = existentes.find((g) => g.casa_id === casa.id);
    if (vazio && !atual) continue;
    for (const v of [linha.ggr_sl, linha.ggr_sy, linha.ggr_vivo, manual]) if (!moneyOk(v)) return { error: `Valor inválido em ${casa.nome}.` };
    if (!(PAGAMENTOS as readonly string[]).includes(linha.pagamento)) return { error: "Forma de pagamento inválida." };
    if (!(STATUS_PAG as readonly string[]).includes(linha.status_pagamento)) return { error: "Status de pagamento inválido." };
    const valor_pagar = manual || toBr(calcPagar(casa, linha));
    const row = { ...linha, valor_pagar, fim };
    if (atual) await updateById("Ggr", atual.id, row);
    else await append("Ggr", { id: newId(), casa_id: casa.id, inicio, ...row, criado_em: new Date().toISOString(), criado_por: me.nome });
    salvos++;
  }
  await audit(me.nome, "ggr_salvo", `${inicio} a ${fim} (${salvos} casas)`);
  revalidatePath("/cassino/ggr");
  return { ok: `Fechamento salvo (${salvos} casas).` };
}


// ---- Casas ----
const casaSchema = buildSchema(CASA_SECTIONS);

export async function createCasa(_: CState, fd: FormData): Promise<CState> {
  const me = await requirePerm("cassino_editar");
  const parsed = casaSchema.safeParse(formDataToObject(fd, CASA_SECTIONS));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data as Record<string, string>;
  const now = new Date().toISOString();
  const id = newId();
  await append("Casas", sealCasa({
    ...d, id, criado_em: now, atualizado_em: now, criado_por: me.nome,
    status: d.status || "Em andamento",
    numero: d.numero || String((await readAll("Casas")).length + 1),
  }));
  await audit(me.nome, "casa_cadastrada", d.nome || id);
  redirect(`/cassino/casas/${id}`);
}

export async function updateCasa(id: string, _: CState, fd: FormData): Promise<CState> {
  const me = await requirePerm("cassino_editar");
  const parsed = casaSchema.safeParse(formDataToObject(fd, CASA_SECTIONS));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const d = parsed.data as Record<string, string>;
  const ok = await updateById("Casas", id, sealCasa({ ...d, atualizado_em: new Date().toISOString() }));
  if (!ok) return { error: "Casa não encontrada." };
  await audit(me.nome, "casa_editada", d.nome || id);
  revalidatePath("/cassino");
  return { ok: "Alterações salvas." };
}

export async function deleteCasa(fd: FormData) {
  const me = await requirePerm("cassino_editar");
  const id = txt(fd, "id");
  const casa = (await readAll("Casas")).find((c) => c.id === id);
  if (!casa) return;
  for (const ci of (await readAll("CasaIntegracoes")).filter((x) => x.casa_id === id)) await deleteById("CasaIntegracoes", ci.id);
  await deleteById("Casas", id);
  await audit(me.nome, "casa_excluida", casa.nome);
  redirect("/cassino");
}
