"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// precisa: "dono" = só o dono; uma permissão = dono ou membro com ela; null = todos.
const ITEMS = [
  { href: "/painel", label: "Clientes", precisa: null },
  { href: "/painel/equipe", label: "Equipe", precisa: "dono" },
  { href: "/painel/acessos", label: "Acessos ao formulário", precisa: "acessos" },
  { href: "/painel/log", label: "Registro de atividades", precisa: "log" },
  { href: "/painel/seguranca", label: "Segurança", precisa: "dono" },
];

export function SideNav({ dono, perms }: { dono: boolean; perms: string[] }) {
  const path = usePathname();
  const pode = (p: string | null) => p === null || dono || (p !== "dono" && perms.includes(p));
  return (
    <nav className="nav" aria-label="Menu">
      {ITEMS.filter((i) => pode(i.precisa)).map((i) => {
        const active = i.href === "/painel" ? path === "/painel" || path.startsWith("/painel/clientes") : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
