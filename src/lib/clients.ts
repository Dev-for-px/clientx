import "server-only";
import { decrypt, encrypt } from "./crypto";
import { readAll, type Row } from "./db";

// Campos guardados criptografados na planilha.
export const ENCRYPTED = [
  "nome", "responsavel", "whatsapp", "email", "signal", "cnpj",
  "dominio_site", "dominio_admin", "dominios_extra",
  "taxa_implantacao", "mensalidade", "percentual", "condicoes", "valor_aberto",
  "grupo_whatsapp", "grupo_signal",
] as const;

export function sealRow(row: Row): Row {
  const out: Row = { ...row };
  for (const f of ENCRYPTED) if (f in out) out[f] = encrypt(out[f] ?? "");
  return out;
}

export function openRow(row: Row): Row {
  const out: Row = { ...row };
  for (const f of ENCRYPTED) out[f] = decrypt(out[f] ?? "");
  return out;
}

export async function listClients(): Promise<Row[]> {
  return (await readAll("Clientes")).map(openRow);
}

export const STATUS = ["Em implantação", "Ativo", "Suspenso", "Inativo"] as const;
export const SITUACAO = ["Em dia", "Fatura em aberto", "Vencido", "Em negociação"] as const;

export function brl(v: string): string {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!v || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(v: string): number {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

// Só aceita links http(s) — evita links "javascript:".
export function safeUrl(v: string): string | null {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}
