import Link from "next/link";
import { notFound } from "next/navigation";
import { listClients } from "@/lib/clients";
import { EditClientForm } from "@/components/EditClientForm";

export default async function Cliente({ params }: { params: { id: string } }) {
  const c = (await listClients()).find((x) => x.id === params.id);
  if (!c) notFound();
  return (
    <>
      <header className="top">
        <div>
          <Link href="/painel" className="note">← Voltar para clientes</Link>
          <h1 style={{ marginTop: 6 }}>{c.nome || "Cliente sem nome"}</h1>
          <p className="sub">
            Cadastrado em {new Date(c.criado_em).toLocaleDateString("pt-BR")} por {c.criado_por || "—"}
          </p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        <EditClientForm id={c.id} values={c} />
      </div>
    </>
  );
}
