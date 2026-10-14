import Link from "next/link";
import { notFound } from "next/navigation";
import { EditAccessForm } from "@/components/AccessForm";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteAccess } from "@/app/actions/data";
import { requirePerm } from "@/lib/auth";
import { readAll } from "@/lib/db";

export default async function Acesso({ params }: { params: { id: string } }) {
  await requirePerm("acessos");
  const a = (await readAll("Acessos")).find((x) => x.id === params.id);
  if (!a) notFound();
  return (
    <>
      <header className="top">
        <div>
          <Link href="/painel/acessos" className="note">← Voltar para acessos</Link>
          <h1 style={{ marginTop: 6 }}>{a.nome}</h1>
          <p className="sub">Criado em {new Date(a.criado_em).toLocaleDateString("pt-BR")} · {a.cadastros || "0"} cadastros</p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        <EditAccessForm id={a.id} nome={a.nome} ativo={a.ativo === "sim"} validade={a.validade} />
        <section className="card">
          <h2>Excluir</h2>
          <p className="note">Remove o acesso de vez. Os clientes já cadastrados por ele continuam no sistema.</p>
          <form action={deleteAccess}>
            <input type="hidden" name="id" value={a.id} />
            <ConfirmSubmit pergunta={`Excluir o acesso de ${a.nome}? Isso não pode ser desfeito.`}>Excluir acesso</ConfirmSubmit>
          </form>
        </section>
      </div>
    </>
  );
}
