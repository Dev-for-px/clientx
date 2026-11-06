import { requireOwner } from "@/lib/auth";
import { TIPOS, catalog } from "@/lib/casino";
import { deleteIntegration } from "@/app/actions/casino";
import { EditIntegrationForm, NewIntegrationForm } from "@/components/IntegrationForms";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export default async function CassinoIntegracoes() {
  await requireOwner();
  const cat = await catalog();
  return (
    <>
      <header className="top">
        <div>
          <h1>Integrações</h1>
          <p className="sub">Gateways, provedores, sportsbook e outros. O que estiver aqui aparece em todas as casas.</p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 1100 }}>
        <NewIntegrationForm />
        {TIPOS.map((t) => {
          const lista = cat.filter((i) => i.tipo === t.id);
          if (!lista.length) return null;
          return (
            <section className="card" key={t.id}>
              <h2>{t.label}</h2>
              {lista.map((i) => (
                <div key={i.id} style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
                  <EditIntegrationForm i={{ id: i.id, nome: i.nome, taxa_padrao: i.taxa_padrao, campos: i.campos, ativo: i.ativo }} />
                  <form action={deleteIntegration}>
                    <input type="hidden" name="id" value={i.id} />
                    <ConfirmSubmit pergunta={`Excluir ${i.nome}? O status e as credenciais dela em todas as casas serão apagados.`}>Excluir</ConfirmSubmit>
                  </form>
                </div>
              ))}
            </section>
          );
        })}
        <p className="note">Prefira &quot;Oculta&quot; a excluir: assim o histórico e as credenciais ficam guardados.</p>
      </div>
    </>
  );
}
