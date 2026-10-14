import "server-only";
import { JWT } from "google-auth-library";
import { promises as fs } from "fs";
import path from "path";
import { env } from "./env";

// Estrutura das abas. A ordem das colunas é a ordem na planilha.
export const TABS = {
  Clientes: [
    "id", "criado_em", "atualizado_em", "criado_por", "status", "situacao", "valor_aberto",
    "nome", "responsavel", "whatsapp", "email", "signal_tipo", "signal", "cnpj",
    "dominio_site", "dominio_admin", "dominios_extra",
    "taxa_implantacao", "mensalidade", "base_percentual", "percentual", "inicio_contrato", "condicoes",
    "dia_fatura", "vencimento_dias", "meio_pagamento", "gerente",
    "grupo_whatsapp", "grupo_signal", "ultimo_pagamento",
  ],
  Acessos: ["id", "nome", "senha_hash", "ativo", "criado_em", "validade", "ultimo_uso", "cadastros"],
  Tentativas: ["quando", "tipo", "chave", "sucesso"],
  Log: ["quando", "quem", "acao", "detalhe", "ip_hash"],
} as const;

export type TabName = keyof typeof TABS;
export type Row = Record<string, string>;

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
let jwt: JWT | null = null;

function useLocal() {
  // Modo de desenvolvimento: guarda em arquivo local. Bloqueado em produção.
  if (env.sheetId !== "local") return false;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORE !== "1") {
    throw new Error("Armazenamento local não permitido em produção");
  }
  return true;
}

async function token(): Promise<string> {
  if (!jwt) jwt = new JWT({ email: env.googleEmail, key: env.googleKey, scopes: [SCOPE] });
  const t = await jwt.getAccessToken();
  if (!t.token) throw new Error("Falha ao autenticar no Google");
  return t.token;
}

let ready: Promise<void> | null = null;

// Na primeira chamada, cria as abas e os cabeçalhos que estiverem faltando.
async function ensureTabs() {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${env.sheetId}`;
  const h = { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" };
  const meta = await (await fetch(`${base}?fields=sheets.properties.title`, { headers: h, cache: "no-store" })).json();
  if (!meta.sheets) throw new Error("Não foi possível abrir a planilha. Ela foi compartilhada com a conta de serviço?");
  const have = new Set(meta.sheets.map((s: { properties: { title: string } }) => s.properties.title));
  const missing = (Object.keys(TABS) as TabName[]).filter((t) => !have.has(t));
  if (!missing.length) return;
  await fetch(`${base}:batchUpdate`, {
    method: "POST", headers: h,
    body: JSON.stringify({ requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })) }),
  });
  for (const t of missing) {
    await fetch(`${base}/values/${t}!A1?valueInputOption=RAW`, { method: "PUT", headers: h, body: JSON.stringify({ values: [TABS[t]] }) });
  }
}

async function api(p: string, init?: RequestInit) {
  if (!ready) ready = ensureTabs().catch((e) => { ready = null; throw e; });
  await ready;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${env.sheetId}${p}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erro na planilha (${res.status})`);
  return res.json();
}

const localFile = () => path.join(process.cwd(), ".data", "db.json");
async function localRead(): Promise<Record<string, string[][]>> {
  try {
    return JSON.parse(await fs.readFile(localFile(), "utf8"));
  } catch {
    return {};
  }
}
async function localWrite(db: Record<string, string[][]>) {
  await fs.mkdir(path.dirname(localFile()), { recursive: true });
  await fs.writeFile(localFile(), JSON.stringify(db, null, 2));
}

// Impede que um valor vire fórmula ao ser gravado (injeção de fórmula).
function clean(v: string): string {
  const s = String(v ?? "");
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}
function unclean(v: string): string {
  return v.startsWith("'") ? v.slice(1) : v;
}

function toRow(tab: TabName, values: string[]): Row {
  const r: Row = {};
  TABS[tab].forEach((c, i) => (r[c] = unclean(values[i] ?? "")));
  return r;
}
function toValues(tab: TabName, row: Row): string[] {
  return TABS[tab].map((c) => clean(row[c] ?? ""));
}

export async function readAll(tab: TabName): Promise<Row[]> {
  let values: string[][];
  if (useLocal()) values = (await localRead())[tab] ?? [];
  else {
    const data = await api(`/values/${encodeURIComponent(tab)}!A2:AZ?valueRenderOption=UNFORMATTED_VALUE`);
    values = (data.values ?? []).map((r: unknown[]) => r.map((x) => String(x ?? "")));
  }
  return values.filter((v) => v.some((x) => x !== "")).map((v) => toRow(tab, v));
}

export async function append(tab: TabName, row: Row): Promise<void> {
  const values = toValues(tab, row);
  if (useLocal()) {
    const db = await localRead();
    (db[tab] ??= []).push(values);
    return localWrite(db);
  }
  await api(`/values/${encodeURIComponent(tab)}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: "POST",
    body: JSON.stringify({ values: [values] }),
  });
}

export async function updateById(tab: TabName, id: string, patch: Row): Promise<boolean> {
  const rows = await readAll(tab);
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return false;
  const merged = { ...rows[idx], ...patch, id };
  const values = toValues(tab, merged);
  if (useLocal()) {
    const db = await localRead();
    db[tab][idx] = values;
    await localWrite(db);
    return true;
  }
  const line = idx + 2;
  await api(`/values/${encodeURIComponent(tab)}!A${line}?valueInputOption=RAW`, {
    method: "PUT",
    body: JSON.stringify({ values: [values] }),
  });
  return true;
}
