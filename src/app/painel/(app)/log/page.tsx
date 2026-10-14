import { readAll } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { runBackup } from "@/app/actions/data";
import { Submit } from "@/components/Submit";

// O botão "Fazer backup agora" roda aqui; o Apps Script pode levar alguns segundos.
export const maxDuration = 60;

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
  backup_ok: "Backup na planilha feito",
  form_senha_ligada: "Formulário passou a exigir senha",
  form_senha_desligada: "Formulário liberado sem senha",
  membro_criado: "Adicionou membro da equipe",
  membro_desativado: "Desativou membro da equipe",
  membro_ativado: "Reativou membro da equipe",
  membro_resetado: "Gerou novo acesso para membro",
  backup_falhou: "Backup na planilha falhou",
};

export default async function Log() {
  await requireOwner();
  const rows = (await readAll("Log")).reverse().slice(0, 200);
  return (
    <>
      <header className="top">
        <div>
          <h1>Registro de atividades</h1>
          <p className="sub">Últimos 200 eventos: logins, tentativas e alterações</p>
        </div>
        <form action={runBackup}>
          <Submit className="btn">Fazer backup agora</Submit>
        </form>
      </header>
      <div className="content">
        <div className="tablebox">
          <table>
            <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Origem / detalhe</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const falha = r.acao.includes("falhou");
                return (
                  <tr key={i}>
                    <td>{new Date(r.quando).toLocaleString("pt-BR")}</td>
                    <td>{r.quem}</td>
                    <td><span className={`pill ${falha ? "p-bad" : "p-off"}`}>{ACOES[r.acao] ?? r.acao}</span></td>
                    <td className="s">{r.acao.startsWith("backup_") ? r.detalhe : r.ip_hash}</td>
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
