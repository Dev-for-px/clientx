import { readAll } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { clearLog, runBackup } from "@/app/actions/data";
import { Submit } from "@/components/Submit";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

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
  cliente_excluido: "Excluiu cliente",
  acesso_criado: "Criou acesso",
  acesso_editado: "Editou acesso",
  acesso_excluido: "Excluiu acesso",
  acesso_desativado: "Desativou acesso",
  acesso_ativado: "Reativou acesso",
  backup_ok: "Backup na planilha feito",
  backup_falhou: "Backup na planilha falhou",
  form_senha_ligada: "Formulário passou a exigir senha",
  form_senha_desligada: "Formulário liberado sem senha",
  membro_criado: "Adicionou membro da equipe",
  membro_editado: "Editou membro da equipe",
  membro_excluido: "Excluiu membro da equipe",
  membro_desativado: "Desativou membro da equipe",
  membro_ativado: "Reativou membro da equipe",
  membro_resetado: "Gerou novo acesso para membro",
  log_limpo: "Limpou o registro de atividades",
  seguranca_ligada: "Ligou proteção",
  seguranca_desligada: "Desligou proteção",
};

// Ações cujo detalhe ajuda a entender o que aconteceu (as demais mostram a origem).
const COM_DETALHE = new Set([
  "backup_ok", "backup_falhou", "membro_criado", "membro_editado", "membro_excluido", "membro_resetado",
  "acesso_criado", "acesso_editado", "acesso_excluido", "log_limpo",
]);

export default async function Log() {
  const me = await requirePerm("log");
  const dono = me.papel === "dono";
  const rows = (await readAll("Log")).reverse().slice(0, 200);
  return (
    <>
      <header className="top">
        <div>
          <h1>Registro de atividades</h1>
          <p className="sub">Últimos 200 eventos: logins, tentativas e alterações</p>
        </div>
        {dono && (
          <div className="links">
            <form action={runBackup}>
              <Submit className="btn">Fazer backup agora</Submit>
            </form>
          </div>
        )}
      </header>
      <div className="content">
        {dono && (
          <section className="card">
            <h2>Limpar registro</h2>
            <p className="note">Apaga os eventos de vez no banco (Supabase). Fica registrado quem limpou e quando.</p>
            <form action={clearLog} className="links">
              <ConfirmSubmit name="modo" value="30" className="btn btn-sm" pergunta="Apagar do banco todos os eventos com mais de 30 dias?">
                Apagar mais antigos que 30 dias
              </ConfirmSubmit>
              <ConfirmSubmit name="modo" value="tudo" pergunta="Apagar TODO o registro de atividades do banco? Isso não pode ser desfeito.">
                Apagar tudo
              </ConfirmSubmit>
            </form>
          </section>
        )}
        <div className="tablebox">
          {rows.length === 0 ? (
            <div className="empty">Nenhum evento registrado.</div>
          ) : (
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
                      <td className="s">{COM_DETALHE.has(r.acao) ? r.detalhe : r.ip_hash}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
