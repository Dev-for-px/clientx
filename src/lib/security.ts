import "server-only";
import { readAll } from "./db";

// Opções de segurança que o dono pode ligar/desligar. Padrão: tudo ligado.
export const SEG = {
  seg_2fa: { label: "Verificação em duas etapas (2FA)", desc: "Pede o código do app autenticador depois da senha." },
  seg_caminho: { label: "Endereço secreto do painel", desc: "Desligado, o login fica em /entrar." },
  seg_bloqueio: { label: "Bloqueio por tentativas", desc: "5 erros de senha ou código bloqueiam por 15 minutos." },
} as const;

export type SegKey = keyof typeof SEG;

export async function security(): Promise<Record<SegKey, boolean>> {
  const cfg = await readAll("Config");
  const on = (k: SegKey) => cfg.find((r) => r.id === k)?.valor !== "nao";
  return { seg_2fa: on("seg_2fa"), seg_caminho: on("seg_caminho"), seg_bloqueio: on("seg_bloqueio") };
}
