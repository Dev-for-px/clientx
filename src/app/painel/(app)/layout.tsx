import { Logo } from "@/components/Logo";
import { SideNav } from "@/components/SideNav";
import { adminLogout } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="shell">
      <aside className="side">
        <div style={{ padding: "0 6px" }}>
          <Logo size={38} />
        </div>
        <div style={{ padding: "0 6px", fontSize: 13, color: "var(--muted)" }}>
          Olá, <b style={{ color: "var(--ink)" }}>{me.nome}</b>
        </div>
        <SideNav dono={me.papel === "dono"} />
        <form action={adminLogout} style={{ marginTop: "auto" }}>
          <button type="submit" className="btn btn-sm" style={{ width: "100%" }}>Sair</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
