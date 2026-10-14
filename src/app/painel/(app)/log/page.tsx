import { readAll } from "@/lib/sheets";

const ACOES: Record<string, string> = {
  login_ok: "Entrou no painel",
  login_falhou: "Tentativa de login falhou",
  "2fa_falhou": "Código 2FA incorreto",
  formulario_acesso: "Abriu o formulário",
  senha_formulario_falhou: "Senha do formulário incorreta",
  cliente_cadastrado: "Cadastrou cliente",
  cliente_editado: "Editou cliente",
  acesso_criado: "Criou acesso",
  acesso_desativado: "Desativou acesso",
  acesso_ativado: "Reativou acesso",
};

export default async function Log() {
  const rows = (await readAll("Log")).sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 200);
  return (
    <>
      <header className="top">
        <div>
          <h1>Registro de atividades</h1>
          <p className="sub">Últimos 200 eventos: logins, tentativas e alterações</p>
        </div>
      </header>
      <div className="content">
        <div className="tablebox">
          <table>
            <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Origem</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const falha = r.acao.includes("falhou");
                return (
                  <tr key={i}>
                    <td>{new Date(r.quando).toLocaleString("pt-BR")}</td>
                    <td>{r.quem}</td>
                    <td><span className={`pill ${falha ? "p-bad" : "p-off"}`}>{ACOES[r.acao] ?? r.acao}</span></td>
                    <td className="s">{r.ip_hash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
