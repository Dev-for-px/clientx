import Link from "next/link";
import { NewMemberForm } from "@/components/TeamForms";
import { requireOwner } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { PERMS, parsePapel } from "@/lib/perms";

const fmt = (iso: string) => (iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Nunca");

export default async function Equipe() {
  await requireOwner();
  const rows = (await readAll("Usuarios")).reverse();
  return (
    <>
      <header className="top">
        <div>
          <h1>Equipe</h1>
          <p className="sub">Pessoas com acesso ao painel, cada uma com login e 2FA próprios</p>
        </div>
      </header>
      <div className="content">
        <NewMemberForm />
        <div className="tablebox">
          {rows.length === 0 ? (
            <div className="empty">Nenhum membro ainda.</div>
          ) : (
            <table>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Status</th><th>Pode</th><th>Último login</th><th>Ações</th></tr></thead>
              <tbody>
                {rows.map((u) => {
                  const perms = parsePapel(u.papel);
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 700 }}>{u.nome}</td>
                      <td>{decrypt(u.email)}</td>
                      <td><span className={`pill ${u.ativo === "sim" ? "p-ok" : "p-off"}`}>{u.ativo === "sim" ? "Ativo" : "Desativado"}</span></td>
                      <td className="s">
                        {perms.length ? PERMS.filter((p) => perms.includes(p.id)).map((p) => p.label).join(" · ") : "Só ver clientes"}
                      </td>
                      <td>{fmt(u.ultimo_login)}</td>
                      <td><Link className="btn btn-sm" href={`/painel/equipe/${u.id}`}>Editar</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <p className="note">Desativar ou excluir corta o acesso na hora, mesmo que a pessoa esteja logada.</p>
      </div>
    </>
  );
}
