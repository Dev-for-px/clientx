import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIES, verify } from "./jwt";
import { append, readAll, recentAttempts } from "./db";
import { sha256 } from "./crypto";

export function clientIp(): string {
  const h = headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "0.0.0.0").trim();
}

export const ipHash = () => sha256("cx:" + clientIp()).slice(0, 16);

// Toda ação protegida chama isto de novo — o middleware não é a única barreira.
export type Sess = { sub: string; papel: "dono" | "membro"; nome: string };

// Dono (configurado na Vercel) ou membro da equipe ativo.
export async function requireAdmin(): Promise<Sess> {
  const s = await verify("admin", cookies().get(COOKIES.admin)?.value);
  if (!s || typeof s.sub !== "string") redirect("/");
  if (s.papel === "dono") return { sub: "dono", papel: "dono", nome: String(s.nome ?? "Dono") };
  // Membro desativado perde o acesso na hora, mesmo com sessão aberta.
  const u = (await readAll("Usuarios")).find((x) => x.id === s.sub);
  if (!u || u.ativo !== "sim") redirect("/");
  return { sub: u.id, papel: "membro", nome: u.nome };
}

export async function requireOwner(): Promise<Sess> {
  const s = await requireAdmin();
  if (s.papel !== "dono") redirect("/painel");
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
export async function isLocked(tipo: string, max = MAX_FAILS): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const rows = await recentAttempts(tipo, ipHash(), since);
  return rows.filter((r) => r.sucesso === "nao").length >= max;
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
