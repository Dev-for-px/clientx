import "server-only";
import { TABS, readAll, type TabName } from "./db";

// Backup: envia todas as tabelas para um Apps Script ligado à planilha,
// que sobrescreve cada aba. Os campos sensíveis já vão criptografados.

function cfg() {
  const url = process.env.APPS_SCRIPT_URL ?? "";
  const token = process.env.BACKUP_TOKEN ?? "";
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error("APPS_SCRIPT_URL ausente ou inválida");
  }
  if (token.length < 32) throw new Error("BACKUP_TOKEN ausente");
  return { url, token };
}

export async function backupToSheet(): Promise<Record<string, number>> {
  const { url, token } = cfg();
  // Usuários (senhas/2FA) e configurações nunca vão para a planilha.
  const tabs = (Object.keys(TABS) as TabName[]).filter((t) => t !== "Usuarios" && t !== "Config");

  const payload: Record<string, string[][]> = {};
  const counts: Record<string, number> = {};
  for (const tab of tabs) {
    const rows = await readAll(tab);
    payload[tab] = [TABS[tab] as unknown as string[], ...rows.map((r) => TABS[tab].map((c) => r[c] ?? ""))];
    counts[tab] = rows.length;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token, tabs: payload }),
    redirect: "follow",
    cache: "no-store",
  });
  const text = await res.text();
  let data: { ok?: boolean; erro?: string } = {};
  try { data = JSON.parse(text); } catch { /* resposta não-JSON */ }
  if (!res.ok || data.ok !== true) throw new Error(`Backup recusado: ${data.erro ?? res.status}`);
  return counts;
}

