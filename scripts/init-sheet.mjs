// Cria as abas e cabeçalhos na planilha e protege contra edição manual.
// Uso: npm run init-sheet   (depois de preencher SHEET_ID e as credenciais Google no .env.local)
import { JWT } from "google-auth-library";

const TABS = {
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
};

const { SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
if (!SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  console.log("Preencha SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY no .env.local.");
  process.exit(1);
}

const jwt = new JWT({
  email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const { token } = await jwt.getAccessToken();
const base = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
const call = async (p, init = {}) => {
  const r = await fetch(base + p, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  const j = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(j.error ?? j));
  return j;
};

const meta = await call("?fields=sheets.properties");
const existing = new Map(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));

const add = Object.keys(TABS).filter((t) => !existing.has(t)).map((title) => ({ addSheet: { properties: { title } } }));
if (add.length) {
  const res = await call(":batchUpdate", { method: "POST", body: JSON.stringify({ requests: add }) });
  res.replies.forEach((r) => existing.set(r.addSheet.properties.title, r.addSheet.properties.sheetId));
}

for (const [tab, cols] of Object.entries(TABS)) {
  await call(`/values/${tab}!A1?valueInputOption=RAW`, { method: "PUT", body: JSON.stringify({ values: [cols] }) });
}

// Congela o cabeçalho e avisa antes de qualquer edição manual.
const requests = Object.keys(TABS).flatMap((tab) => [
  { updateSheetProperties: { properties: { sheetId: existing.get(tab), gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
  { addProtectedRange: { protectedRange: { range: { sheetId: existing.get(tab) }, description: "Gerenciado pelo ClientX — não edite à mão", warningOnly: true } } },
]);
await call(":batchUpdate", { method: "POST", body: JSON.stringify({ requests }) });

console.log("Planilha pronta: abas Clientes, Acessos, Tentativas e Log criadas.");
