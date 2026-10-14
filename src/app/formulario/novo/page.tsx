import { Logo } from "@/components/Logo";
import { NewClientForm } from "@/components/NewClientForm";
import { formLogout } from "@/app/actions/auth";
import { requireForm } from "@/lib/auth";

export default async function NovoCliente() {
  const s = await requireForm();
  return (
    <main className="mobile">
      <header className="mhead">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Logo size={36} />
          <form action={formLogout}>
            <button className="btn btn-sm" type="submit">Sair</button>
          </form>
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Novo cliente</h1>
          <p className="sub">Olá, {s.nome}. Preencha só o que tiver agora — nenhum campo é obrigatório.</p>
        </div>
      </header>
      <NewClientForm />
    </main>
  );
}
