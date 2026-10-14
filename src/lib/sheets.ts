import "server-only";
import { JWT } from "google-auth-library";
import { TABS, readAll, type TabName } from "./db";

// Backup: copia todas as tabelas do Supabase para a planilha (sobrescreve cada aba).
// Os campos sensíveis já estão criptografados no banco e continuam assim na planilha.

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
let jwt: JWT | null = null;

function cfg() {
  const id = process.env.SHEET_ID ?? "";
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const key = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!id || !email || !key) throw new Error("Backup não configurado (SHEET_ID / credenciais Google)");
  return { id, email, key };
}

async function headers() {
  const c = cfg();
  if (!jwt) jwt = new JWT({ email: c.email, key: c.key, scopes: [SCOPE] });
  const t = await jwt.getAccessToken();
  if (!t.token) throw new Error("Falha ao autenticar no Google");
  return { Authorization: `Bearer ${t.token}`, "Content-Type": "application/json" };
}

async function call(p: string, init: RequestInit = {}) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cfg().id}${p}`, {
    ...init,
    headers: await headers(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Erro na planilha (${res.status})`);
  return res.json();
}

// Impede que um valor vire fórmula na planilha.
const clean = (v: string) => (/^[=+\-@\t\r]/.test(v) ? "'" + v : v);

export async function backupToSheet(): Promise<Record<string, number>> {
  const tabs = Object.keys(TABS) as TabName[];
  const meta = await call("?fields=sheets.properties.title");
  const have = new Set((meta.sheets ?? []).map((s: { properties: { title: string } }) => s.properties.title));
  const missing = tabs.filter((t) => !have.has(t));
  if (missing.length) {
    await call(":batchUpdate", {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((title) => ({ addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } } })),
      }),
    });
  }

  const counts: Record<string, number> = {};
  for (const tab of tabs) {
    const rows = await readAll(tab);
    const values = [TABS[tab] as readonly string[], ...rows.map((r) => TABS[tab].map((c) => clean(r[c] ?? "")))];
    await call(`/values/${tab}!A:AZ:clear`, { method: "POST", body: "{}" });
    await call(`/values/${tab}!A1?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values }) });
    counts[tab] = rows.length;
  }
  const stamp = [["Último backup", new Date().toISOString()], ...Object.entries(counts).map(([k, v]) => [k, String(v)])];
  if (!have.has("Backup")) {
    await call(":batchUpdate", { method: "POST", body: JSON.stringify({ requests: [{ addSheet: { properties: { title: "Backup" } } }] }) });
  }
  await call(`/values/Backup!A1?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: stamp }) });
  return counts;
}
