"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/cassino", label: "Casas", dono: false },
  { href: "/cassino/ggr", label: "Fechamento de GGR", dono: false },
  { href: "/cassino/integracoes", label: "Integrações", dono: true },
];

export function CassinoNav({ dono }: { dono: boolean }) {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Menu do Cassino">
      {ITEMS.filter((i) => dono || !i.dono).map((i) => {
        const active = i.href === "/cassino" ? path === "/cassino" || path.startsWith("/cassino/casas") : path.startsWith(i.href);
        return <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}>{i.label}</Link>;
      })}
      <Link href="/painel" style={{ marginTop: 12, color: "var(--muted)" }}>← ClientX</Link>
    </nav>
  );
}
