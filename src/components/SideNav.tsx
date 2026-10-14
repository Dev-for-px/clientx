"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/painel", label: "Clientes" },
  { href: "/painel/acessos", label: "Acessos ao formulário" },
  { href: "/painel/log", label: "Registro de atividades" },
];

export function SideNav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Menu">
      {ITEMS.map((i) => {
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
