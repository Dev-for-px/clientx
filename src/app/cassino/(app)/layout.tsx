import { Logo } from "@/components/Logo";
import { CassinoNav } from "@/components/CassinoNav";
import { adminLogout } from "@/app/actions/auth";
import { requirePerm } from "@/lib/auth";

export default async function CassinoLayout({ children }: { children: React.ReactNode }) {
  const me = await requirePerm("cassino_ver");
  return (
    <div className="shell">
      <aside className="side">
        <div style={{ padding: "0 6px" }}>
          <Logo size={38} />
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginTop: 6, letterSpacing: ".08em" }}>CASSINO</div>
        </div>
        <div style={{ padding: "0 6px", fontSize: 13, color: "var(--muted)" }}>
          Olá, <b style={{ color: "var(--ink)" }}>{me.nome}</b>
        </div>
        <CassinoNav dono={me.papel === "dono"} />
        <form action={adminLogout} style={{ marginTop: "auto" }}>
          <button type="submit" className="btn btn-sm" style={{ width: "100%" }}>Sair</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
