import { z } from "zod";

export type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "money" | "percent" | "textarea" | "select" | "segment" | "url";
  placeholder?: string;
  options?: string[];
  max?: number;
};

export type Section = { title: string; fields: Field[] };

export const FORM_SECTIONS: Section[] = [
  {
    title: "Contatos",
    fields: [
      { name: "nome", label: "Nome do cliente / marca", placeholder: "Como o cliente é conhecido" },
      { name: "responsavel", label: "Responsável legal", placeholder: "Nome completo" },
      { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "(00) 00000-0000" },
      { name: "email", label: "E-mail", type: "email", placeholder: "nome@empresa.com" },
      { name: "signal_tipo", label: "Conta Signal", type: "segment", options: ["Telefone", "Nome de usuário"] },
      { name: "signal", label: "Telefone ou usuário do Signal", placeholder: "(00) 00000-0000 ou usuario.01" },
      { name: "cnpj", label: "CNPJ", placeholder: "00.000.000/0000-00" },
    ],
  },
  {
    title: "Domínios",
    fields: [
      { name: "dominio_site", label: "Domínio do site (público)", placeholder: "www.marcadocliente.com" },
      { name: "dominio_admin", label: "Domínio do painel administrativo", placeholder: "admin.marcadocliente.com" },
      { name: "dominios_extra", label: "Domínios alternativos (um por linha)", type: "textarea", placeholder: "alt1.marcadocliente.com" },
    ],
  },
  {
    title: "Acordo comercial",
    fields: [
      { name: "taxa_implantacao", label: "Taxa de implantação (R$)", type: "money", placeholder: "0,00" },
      { name: "mensalidade", label: "Mensalidade fixa (R$)", type: "money", placeholder: "0,00" },
      { name: "base_percentual", label: "Percentual sobre", type: "segment", options: ["Receita bruta", "Receita líquida"] },
      { name: "percentual", label: "Percentual (%)", type: "percent", placeholder: "10" },
      { name: "inicio_contrato", label: "Início do contrato", type: "date" },
      { name: "condicoes", label: "Condições especiais", type: "textarea", placeholder: "Carência, reajuste, multa...", max: 2000 },
    ],
  },
  {
    title: "Faturamento e responsável",
    fields: [
      { name: "dia_fatura", label: "Dia da fatura", type: "select", options: ["", ...Array.from({ length: 28 }, (_, i) => `Dia ${i + 1}`)] },
      { name: "vencimento_dias", label: "Vencimento", type: "select", options: ["", "Na emissão", "+3 dias", "+5 dias", "+10 dias", "+15 dias"] },
      { name: "meio_pagamento", label: "Meio de pagamento", type: "segment", options: ["PIX", "Cripto (USDT)"] },
      { name: "gerente", label: "Gerente de conta", placeholder: "Nome do gerente" },
    ],
  },
];

export const ADMIN_EXTRA: Section = {
  title: "Gestão (só no painel)",
  fields: [
    { name: "status", label: "Status", type: "select", options: ["Em implantação", "Ativo", "Suspenso", "Inativo"] },
    { name: "situacao", label: "Situação financeira", type: "select", options: ["Em dia", "Fatura em aberto", "Vencido", "Em negociação"] },
    { name: "valor_aberto", label: "Valor em aberto (R$)", type: "money", placeholder: "0,00" },
    { name: "ultimo_pagamento", label: "Último pagamento", type: "date" },
    { name: "grupo_whatsapp", label: "Link do grupo WhatsApp", type: "url", placeholder: "https://chat.whatsapp.com/..." },
    { name: "grupo_signal", label: "Link do grupo Signal", type: "url", placeholder: "https://signal.group/..." },
  ],
};

function fieldSchema(f: Field) {
  const base = z.string().trim().max(f.max ?? 300);
  if (f.options) return base.refine((v) => v === "" || f.options!.includes(v), "Opção inválida");
  if (f.type === "email") return base.refine((v) => v === "" || z.string().email().safeParse(v).success, "E-mail inválido");
  if (f.type === "url") return base.refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Link inválido");
  if (f.type === "money") return base.refine((v) => v === "" || /^\d{1,3}(\.?\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(v), "Valor inválido");
  if (f.type === "percent") return base.refine((v) => v === "" || /^\d{1,3}(,\d{1,2})?$/.test(v), "Percentual inválido");
  if (f.type === "date") return base.refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Data inválida");
  return base;
}

export function buildSchema(sections: Section[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const s of sections) for (const f of s.fields) shape[f.name] = fieldSchema(f).optional().default("");
  return z.object(shape).strict();
}

export function formDataToObject(fd: FormData, sections: Section[]) {
  const o: Record<string, string> = {};
  for (const s of sections) for (const f of s.fields) {
    const v = fd.get(f.name);
    if (typeof v === "string") o[f.name] = v;
  }
  return o;
}
