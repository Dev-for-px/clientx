// Permissões dos membros da equipe. Ficam na coluna `papel` da tabela usuarios
// no formato "membro:perm1,perm2" (sem precisar mudar o banco).
// "membro" sozinho = membro antigo, que já podia ver e editar clientes.
// Ver clientes é sempre permitido; Equipe e limpar o registro são só do dono.

export const PERMS = [
  { id: "clientes_editar", label: "Editar clientes" },
  { id: "clientes_excluir", label: "Excluir clientes" },
  { id: "acessos", label: "Gerenciar acessos ao formulário" },
  { id: "log", label: "Ver registro de atividades" },
] as const;

export type Perm = (typeof PERMS)[number]["id"];

const VALID = new Set<string>(PERMS.map((p) => p.id));

export const ALL_PERMS: Perm[] = PERMS.map((p) => p.id);

export function parsePapel(papel: string): Perm[] {
  if (!papel || papel === "membro") return ["clientes_editar"];
  const lista = papel.startsWith("membro:") ? papel.slice(7) : "";
  return lista.split(",").filter((p): p is Perm => VALID.has(p));
}

export function papelFrom(perms: string[]): string {
  return "membro:" + ALL_PERMS.filter((p) => perms.includes(p)).join(",");
}
