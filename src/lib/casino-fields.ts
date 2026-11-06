import type { Section } from "./fields";

export const CASA_SECTIONS: Section[] = [
  {
    title: "Casa",
    fields: [
      { name: "numero", label: "Nº", placeholder: "1" },
      { name: "status", label: "Status da casa", type: "select", options: ["Em andamento", "Ativa", "Inativa"] },
      { name: "nome", label: "Marca", placeholder: "Ex.: minhacasa.com" },
      { name: "dominio_site", label: "Domínio do site (jogadores)", placeholder: "minhacasa.com" },
      { name: "dominio_backoffice", label: "Domínio do backoffice", placeholder: "backoffice.minhacasa.com" },
      { name: "dominio_afiliados", label: "Domínio de afiliados", placeholder: "afiliados.minhacasa.com" },
    ],
  },
  {
    title: "Taxas e acordo",
    fields: [
      { name: "setup", label: "Setup", placeholder: "R$ 12.500,00, Isento ou Não informado" },
      { name: "ggr_sl", label: "GGR SL – Softlazy (%)", type: "percent", placeholder: "12" },
      { name: "ggr_sy", label: "GGR SY, OB e Direta (%)", type: "percent", placeholder: "15" },
      { name: "ggr_vivo", label: "GGR ao vivo (%)", type: "percent", placeholder: "15" },
      { name: "servidor_semana", label: "Servidor por semana (R$)", type: "money", placeholder: "1.500,00" },
    ],
  },
  {
    title: "Contato",
    fields: [
      { name: "responsavel", label: "Responsável", placeholder: "Nome" },
      { name: "whatsapp", label: "WhatsApp", type: "tel", placeholder: "(00) 00000-0000" },
      { name: "signal", label: "Signal (telefone ou usuário)", placeholder: "usuario.01" },
      { name: "grupo_whatsapp", label: "Link do grupo WhatsApp", type: "url", placeholder: "https://chat.whatsapp.com/..." },
      { name: "grupo_signal", label: "Link do grupo Signal", type: "url", placeholder: "https://signal.group/..." },
      { name: "observacoes", label: "Observações", type: "textarea", max: 2000 },
    ],
  },
];

