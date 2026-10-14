"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/painel", label: "Clientes", dono: false },
  { href: "/painel/equipe", label: "Equipe", dono: true },
  { href: "/painel/acessos", label: "Acessos ao formulário", dono: true },
  { href: "/painel/log", label: "Registro de atividades", dono: true },
];

export function SideNav({ dono }: { dono: boolean }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Menu">
      {ITEMS.filter((i) => dono || !i.dono).map((i) => {
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
