import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePerm } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { TIPOS, camposDe, catalog, listCasas, openCreds } from "@/lib/casino";
import { deleteCasa } from "@/app/actions/casino";
import { CasaForm } from "@/components/CasaForm";
import { CasaIntegrationRow } from "@/components/CasaIntegrationRow";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function Casa({ params }: { params: { id: string } }) {
  const me = await requirePerm("cassino_ver");
  const c = (await listCasas()).find((x) => x.id === params.id);
  if (!c) notFound();
  const pode = me.perms.includes("cassino_editar");
  const cat = await catalog();
  const links = (await readAll("CasaIntegracoes")).filter((x) => x.casa_id === c.id);
  return (
    <>
      <header className="top">
        <div>
          <Link href="/cassino" className="note">← Voltar para casas</Link>
          <h1 style={{ marginTop: 6 }}>{c.nome || "Casa sem nome"}</h1>
          <p className="sub">Cadastrada em {new Date(c.criado_em).toLocaleDateString("pt-BR")} por {c.criado_por || "—"}</p>
        </div>
        {pode && (
          <form action={deleteCasa}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit pergunta={`Excluir a casa ${c.nome || "sem nome"}? Integrações e credenciais dela também serão apagadas.`}>Excluir casa</ConfirmSubmit>
          </form>
        )}
      </header>
      <div className="content" style={{ maxWidth: 900 }}>
        <CasaForm id={c.id} values={c} podeEditar={pode} />
        {TIPOS.map((t) => {
          const lista = cat.filter((i) => i.tipo === t.id && i.ativo === "sim");
          if (!lista.length) return null;
          return (
            <section key={t.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2 style={{ fontSize: 18 }}>{t.label}</h2>
              {lista.map((i) => {
                const l = links.find((x) => x.integracao_id === i.id);
                return (
                  <CasaIntegrationRow
                    key={i.id} casaId={c.id} campos={camposDe(i)}
                    integ={{ id: i.id, nome: i.nome, taxa_padrao: i.taxa_padrao }}
                    atual={{ status: l?.status ?? "", taxa: l?.taxa ?? "", obs: l?.obs ?? "", creds: pode ? openCreds(l?.credenciais ?? "") : {} }}
                    podeEditar={pode}
                  />
                );
              })}
            </section>
          );
        })}
      </div>
    </>
  );
}
