import Link from "next/link";
import { notFound } from "next/navigation";
import { listClients } from "@/lib/clients";
import { requireAdmin } from "@/lib/auth";
import { deleteClient } from "@/app/actions/data";
import { EditClientForm } from "@/components/EditClientForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function Cliente({ params }: { params: { id: string } }) {
  const me = await requireAdmin();
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
        {me.perms.includes("clientes_excluir") && (
          <form action={deleteClient}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit pergunta={`Excluir o cliente ${c.nome || "sem nome"}? Isso não pode ser desfeito.`}>Excluir cliente</ConfirmSubmit>
          </form>
        )}
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        <EditClientForm id={c.id} values={c} podeEditar={me.perms.includes("clientes_editar")} />
      </div>
    </>
  );
}
