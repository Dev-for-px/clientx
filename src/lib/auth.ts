import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIES, verify } from "./jwt";
import { append, readAll } from "./sheets";
import { sha256 } from "./crypto";

export function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

export const ipHash = () => sha256("cx:" + clientIp()).slice(0, 16);

// Toda ação protegida chama isto de novo — o middleware não é a única barreira.
export async function requireAdmin() {
  const s = await verify("admin", cookies().get(COOKIES.admin)?.value);
  if (!s) redirect("/");
  return s;
}

export async function requireForm() {
  const s = await verify("form", cookies().get(COOKIES.form)?.value);
  if (!s) redirect("/formulario");
  return s as { acesso: string; nome: string };
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;

// Bloqueio por excesso de tentativas (por IP e por tipo).
export async function isLocked(tipo: string): Promise<boolean> {
  const since = Date.now() - WINDOW_MS;
  const chave = ipHash();
  const rows = await readAll("Tentativas");
  const fails = rows.filter(
    (r) => r.tipo === tipo && r.chave === chave && r.sucesso === "nao" && Date.parse(r.quando) > since,
  ).length;
  return fails >= MAX_FAILS;
}

export async function recordAttempt(tipo: string, ok: boolean) {
  await append("Tentativas", {
    quando: new Date().toISOString(),
    tipo,
    chave: ipHash(),
    sucesso: ok ? "sim" : "nao",
  });
}

export async function audit(quem: string, acao: string, detalhe = "") {
  await append("Log", {
    quando: new Date().toISOString(),
    quem,
    acao,
    detalhe: detalhe.slice(0, 300),
    ip_hash: ipHash(),
  });
}

// Atraso fixo para não revelar, pelo tempo de resposta, o que falhou.
export const slow = () => new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
