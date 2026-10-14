import { Logo } from "@/components/Logo";
import { SideNav } from "@/components/SideNav";
import { adminLogout } from "@/app/actions/auth";
import { requireAdmin } from "@/lib/auth";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="shell">
      <aside className="side">
        <div style={{ padding: "0 6px" }}>
          <Logo size={38} />
        </div>
        <SideNav />
        <form action={adminLogout} style={{ marginTop: "auto" }}>
          <button type="submit" className="btn btn-sm" style={{ width: "100%" }}>Sair</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
