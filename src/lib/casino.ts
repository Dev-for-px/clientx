import "server-only";
import { decrypt, encrypt, newId } from "./crypto";
import { append, readAll, type Row } from "./db";
import { num } from "./clients";
export { CASA_SECTIONS } from "./casino-fields";

export const TIPOS = [
  { id: "gateway", label: "Gateways" },
  { id: "provedor", label: "Provedores" },
  { id: "sportsbook", label: "Sportsbook" },
  { id: "outro", label: "Outros" },
] as const;
export type Tipo = (typeof TIPOS)[number]["id"];

export const STATUS_INT = ["Ativo", "Aguardando", "Inativo"] as const;
export const PAGAMENTOS = ["", "UaiPag", "Payevo", "PIX", "Cripto (USDT)", "Isento", "Zerado", "Outro"] as const;
export const STATUS_PAG = ["Pendente", "Pago", "Isento", "Zerado"] as const;

const PADRAO: { tipo: Tipo; nome: string; taxa: string; campos: string }[] = [
  { tipo: "gateway", nome: "Payevo", taxa: "", campos: "API Key,API Secret,Callback secret" },
  { tipo: "gateway", nome: "UaiPag", taxa: "", campos: "API Key,API Secret,Callback secret" },
  { tipo: "provedor", nome: "Softlazy (SL)", taxa: "", campos: "Nome,Agent ID,Agent Secret,Callback,RTP" },
  { tipo: "provedor", nome: "Switchyard (SY)", taxa: "", campos: "Nome,Agent ID,Agent Secret,Callback,RTP" },
  { tipo: "provedor", nome: "OpenBox (OB)", taxa: "", campos: "Nome,Agent ID,Agent Secret,Callback,RTP" },
  { tipo: "provedor", nome: "Aviator (Direta)", taxa: "", campos: "Nome,Agent ID,Agent Secret,Callback,RTP" },
  { tipo: "sportsbook", nome: "Bety Integration", taxa: "", campos: "Usuário,Senha,API Key" },
  { tipo: "outro", nome: "DeltaCRM", taxa: "", campos: "Usuário,Senha,API Key" },
  { tipo: "outro", nome: "Smartico", taxa: "", campos: "Usuário,Senha,API Key" },
];

// Catálogo de integrações. Na primeira vez, cria as da planilha original.
export async function catalog(): Promise<Row[]> {
  let rows = await readAll("Integracoes");
  if (rows.length === 0) {
    const now = new Date().toISOString();
    for (const [i, p] of PADRAO.entries()) {
      await append("Integracoes", {
        id: newId(), tipo: p.tipo, nome: p.nome, taxa_padrao: p.taxa, campos: p.campos,
        ativo: "sim", ordem: String(i + 1).padStart(3, "0"), criado_em: now,
      });
    }
    rows = await readAll("Integracoes");
  }
  return rows;
}

export const camposDe = (i: Row) => i.campos.split(",").map((c) => c.trim()).filter(Boolean).slice(0, 12);

export function openCreds(v: string): Record<string, string> {
  if (!v) return {};
  try { return JSON.parse(decrypt(v)); } catch { return {}; }
}
export const sealCreds = (o: Record<string, string>) => encrypt(JSON.stringify(o));

// Valor a pagar do período: GGR de cada categoria × taxa da casa (+ servidor, se marcado).
export function calcPagar(casa: Row, g: { ggr_sl: string; ggr_sy: string; ggr_vivo: string; incluir_servidor: string }): number {
  const pct = (v: string) => num(v) / 100;
  let v = num(g.ggr_sl) * pct(casa.ggr_sl) + num(g.ggr_sy) * pct(casa.ggr_sy) + num(g.ggr_vivo) * pct(casa.ggr_vivo);
  if (g.incluir_servidor === "sim") v += num(casa.servidor_semana);
  return Math.max(0, Math.round(v * 100) / 100);
}

export const toBr = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Semana anterior completa (segunda a domingo), no fuso de Brasília.
export function semanaPadrao(): { inicio: string; fim: string } {
  const hoje = new Date(Date.now() - 3 * 3600 * 1000);
  const dow = (hoje.getUTCDay() + 6) % 7; // 0 = segunda
  const seg = new Date(hoje); seg.setUTCDate(hoje.getUTCDate() - dow - 7);
  const dom = new Date(seg); dom.setUTCDate(seg.getUTCDate() + 6);
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return { inicio: f(seg), fim: f(dom) };
}

// ---- Casas ----
// Marca e domínios ficam em texto (busca); contato e observações criptografados.
const CASA_ENC = ["responsavel", "whatsapp", "signal", "grupo_whatsapp", "grupo_signal", "observacoes"];
export function sealCasa(r: Row): Row {
  const o = { ...r };
  for (const f of CASA_ENC) if (f in o) o[f] = encrypt(o[f] ?? "");
  return o;
}
export async function listCasas(): Promise<Row[]> {
  return (await readAll("Casas")).map((r) => {
    const o = { ...r };
    for (const f of CASA_ENC) o[f] = decrypt(o[f] ?? "");
    return o;
  });
}
