import "server-only";
import { TABS, readAll, type TabName } from "./db";

// Backup: envia as tabelas para um Apps Script ligado à planilha
// (apps-script/Backup.gs), que sobrescreve cada aba. Os campos sensíveis já
// vão criptografados. Usuários (senhas/2FA) e configurações nunca vão.

const TAB_BACKUP = (Object.keys(TABS) as TabName[]).filter((t) => t !== "Usuarios" && t !== "Config");

function cfg() {
  // trim: valores colados na Vercel costumam vir com espaço ou quebra de linha.
  const url = (process.env.APPS_SCRIPT_URL ?? "").trim();
  const token = (process.env.BACKUP_TOKEN ?? "").trim();
  if (!url) throw new Error("APPS_SCRIPT_URL não configurada na Vercel");
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)) {
    throw new Error("APPS_SCRIPT_URL inválida (deve ser https://script.google.com/macros/s/.../exec)");
  }
  if (token.length < 32) throw new Error("BACKUP_TOKEN ausente ou com menos de 32 caracteres na Vercel");
  return { url, token };
}

type Resposta = { ok?: boolean; erro?: string };

// Lê a resposta do Apps Script e traduz os erros comuns de implantação.
async function lerResposta(res: Response): Promise<Resposta> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Resposta;
  } catch {
    if (/accounts\.google\.com|ServiceLogin|<title>Sign in/i.test(text) || res.status === 401 || res.status === 403) {
      throw new Error("Apps Script pediu login: na implantação, 'Quem pode acessar' deve ser 'Qualquer pessoa'");
    }
    if (res.status === 404) throw new Error("Apps Script não encontrado: confira a URL /exec e se a implantação está ativa");
    if (/Script function not found/i.test(text)) throw new Error("Apps Script sem doPost: cole o Backup.gs inteiro e crie uma nova versão da implantação");
    if (/authorization|autoriza/i.test(text)) throw new Error("Apps Script não autorizado: rode a função 'autorizar' no editor");
    throw new Error(`Resposta inesperada do Apps Script (HTTP ${res.status})`);
  }
}

export async function backupToSheet(): Promise<Record<string, number>> {
  const { url, token } = cfg();

  const payload: Record<string, string[][]> = {};
  const counts: Record<string, number> = {};
  for (const tab of TAB_BACKUP) {
    const rows = await readAll(tab);
    payload[tab] = [[...TABS[tab]], ...rows.map((r) => TABS[tab].map((c) => r[c] ?? ""))];
    counts[tab] = rows.length;
  }

  let res: Response;
  try {
    // O Apps Script responde com redirecionamento 302; o fetch segue com GET, que é o esperado.
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ token, tabs: payload }),
      redirect: "follow",
      cache: "no-store",
      signal: AbortSignal.timeout(50_000),
    });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new Error(timeout ? "Apps Script demorou mais de 50s para responder" : "Não foi possível conectar ao Apps Script");
  }

  const data = await lerResposta(res);
  if (data.ok !== true) throw new Error(`Apps Script recusou: ${data.erro ?? "sem detalhe"}`);
  return counts;
}
