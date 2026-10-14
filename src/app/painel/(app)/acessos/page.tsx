import { AccessForm } from "@/components/AccessForm";
import { setFormPassword, toggleAccess } from "@/app/actions/data";
import { getConfig, readAll } from "@/lib/db";
import { requireOwner } from "@/lib/auth";

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");

export default async function Acessos() {
  await requireOwner();
  const exigeSenha = (await getConfig("form_senha", "sim")) !== "nao";
  const hoje = new Date().toISOString().slice(0, 10);
  const rows = (await readAll("Acessos")).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  return (
    <>
      <header className="top">
        <div>
          <h1>Acessos ao formulário</h1>
          <p className="sub">Crie uma senha para cada pessoa que vai cadastrar clientes</p>
        </div>
      </header>
      <div className="content">
        <section className="card">
          <h2>Como o formulário é aberto</h2>
          <form action={setFormPassword} className="seg" style={{ maxWidth: 520 }}>
            <button type="submit" name="valor" value="sim" aria-pressed={exigeSenha}>Com senha</button>
            <button type="submit" name="valor" value="nao" aria-pressed={!exigeSenha}>Sem senha</button>
          </form>
          <p className="note">
            {exigeSenha
              ? "Cada pessoa precisa de uma senha criada abaixo para abrir o formulário."
              : "Atenção: qualquer pessoa com o link /formulario consegue cadastrar. Há um limite de 15 cadastros a cada 15 minutos por origem."}
          </p>
        </section>
        {exigeSenha && <AccessForm />}
        <div className="tablebox">
          {rows.length === 0 ? (
            <div className="empty">Nenhum acesso criado ainda.</div>
          ) : (
            <table>
              <thead>
                <tr><th>Nome</th><th>Status</th><th>Criado em</th><th>Validade</th><th>Último uso</th><th>Cadastros</th><th>Ações</th></tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const vencido = a.validade && a.validade < hoje;
                  const ativo = a.ativo === "sim" && !vencido;
                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 700 }}>{a.nome}</td>
                      <td><span className={`pill ${ativo ? "p-ok" : "p-off"}`}>{ativo ? "Ativo" : vencido ? "Expirado" : "Desativado"}</span></td>
                      <td>{fmt(a.criado_em)}</td>
                      <td>{a.validade ? new Date(a.validade + "T12:00:00").toLocaleDateString("pt-BR") : "Sem validade"}</td>
                      <td>{fmt(a.ultimo_uso)}</td>
                      <td>{a.cadastros || "0"}</td>
                      <td>
                        <form action={toggleAccess}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="ativo" value={a.ativo === "sim" ? "nao" : "sim"} />
                          <button type="submit" className={`btn btn-sm ${a.ativo === "sim" ? "danger" : ""}`}>
                            {a.ativo === "sim" ? "Desativar" : "Reativar"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="note">As senhas são guardadas só como hash (bcrypt) e nunca podem ser vistas de novo. Para trocar, desative e crie um novo acesso.</p>
      </div>
    </>
  );
}
