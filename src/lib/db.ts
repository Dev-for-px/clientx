import "server-only";
import { promises as fs } from "fs";
import path from "path";

// Estrutura das tabelas (mesma ordem de colunas usada no backup da planilha).
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
  Usuarios: ["id", "nome", "email_hash", "email", "senha_hash", "totp_secret", "papel", "ativo", "criado_em", "ultimo_login"],
  Config: ["id", "valor", "criado_em"],
} as const;

export type TabName = keyof typeof TABS;
export type Row = Record<string, string>;

const TABLE: Record<TabName, string> = { Clientes: "clientes", Acessos: "acessos", Tentativas: "tentativas", Log: "log", Usuarios: "usuarios", Config: "config" };
const ORDER: Record<TabName, string> = { Clientes: "criado_em", Acessos: "criado_em", Tentativas: "seq", Log: "seq", Usuarios: "criado_em", Config: "id" };

function cfg() {
  const url = process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (url === "local") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORE !== "1") {
      throw new Error("Armazenamento local não permitido em produção");
    }
    return null;
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error("SUPABASE_URL inválida");
  if (key.length < 30) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente");
  return { url, key };
}

async function rest(tab: TabName, query: string, init: RequestInit = {}) {
  const c = cfg()!;
  const res = await fetch(`${c.url}/rest/v1/${TABLE[tab]}${query}`, {
    ...init,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erro no banco (${res.status})`);
  return res;
}

function pick(tab: TabName, row: Row): Row {
  const out: Row = {};
  for (const c of TABS[tab]) out[c] = String(row[c] ?? "");
  return out;
}

// ---- modo local (só para testes) ----
const localFile = () => path.join(process.cwd(), ".data", "db.json");
async function localRead(): Promise<Record<string, Row[]>> {
  try { return JSON.parse(await fs.readFile(localFile(), "utf8")); } catch { return {}; }
}
async function localWrite(db: Record<string, Row[]>) {
  await fs.mkdir(path.dirname(localFile()), { recursive: true });
  await fs.writeFile(localFile(), JSON.stringify(db, null, 2));
}

export async function readAll(tab: TabName): Promise<Row[]> {
  if (!cfg()) return ((await localRead())[tab] ?? []).map((r) => pick(tab, r));
  const cols = TABS[tab].join(",");
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const res = await rest(tab, `?select=${cols}&order=${ORDER[tab]}.asc`, {
      headers: { Range: `${from}-${from + 999}`, Prefer: "count=none" },
    });
    const page = (await res.json()) as Row[];
    rows.push(...page.map((r) => pick(tab, r)));
    if (page.length < 1000) break;
  }
  return rows;
}

// Consulta só as tentativas recentes (evita ler a tabela inteira).
export async function recentAttempts(tipo: string, chave: string, sinceIso: string): Promise<Row[]> {
  if (!cfg()) return (await readAll("Tentativas")).filter((r) => r.tipo === tipo && r.chave === chave && r.quando > sinceIso);
  const q = `?select=quando,tipo,chave,sucesso&tipo=eq.${encodeURIComponent(tipo)}&chave=eq.${encodeURIComponent(chave)}&quando=gt.${encodeURIComponent(sinceIso)}`;
  return (await (await rest("Tentativas", q)).json()) as Row[];
}

export async function append(tab: TabName, row: Row): Promise<void> {
  const data = pick(tab, row);
  if (!cfg()) {
    const db = await localRead();
    (db[tab] ??= []).push(data);
    return localWrite(db);
  }
  await rest(tab, "", { method: "POST", body: JSON.stringify(data) });
}

export async function updateById(tab: TabName, id: string, patch: Row): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{6,30}$/.test(id)) return false;
  const allowed = new Set<string>(TABS[tab]);
  const data: Row = {};
  for (const [k, v] of Object.entries(patch)) if (allowed.has(k) && k !== "id") data[k] = String(v ?? "");
  if (!cfg()) {
    const db = await localRead();
    const i = (db[tab] ?? []).findIndex((r) => r.id === id);
    if (i < 0) return false;
    db[tab][i] = { ...db[tab][i], ...data };
    await localWrite(db);
    return true;
  }
  const res = await rest(tab, `?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
    headers: { Prefer: "return=representation" },
  });
  return ((await res.json()) as unknown[]).length > 0;
}

// Configurações simples (chave → valor).
export async function getConfig(id: string, fallback: string): Promise<string> {
  return (await readAll("Config")).find((r) => r.id === id)?.valor ?? fallback;
}

export async function setConfig(id: string, valor: string): Promise<void> {
  const ok = await updateById("Config", id, { valor });
  if (!ok) await append("Config", { id, valor, criado_em: new Date().toISOString() });
}
