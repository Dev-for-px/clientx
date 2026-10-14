"use client";
import { useFormState } from "react-dom";
import { createMember, resetMember, updateMember, type TeamState } from "@/app/actions/team";
import { PERMS, type Perm } from "@/lib/perms";
import { Submit } from "./Submit";

function Credentials({ s }: { s: TeamState }) {
  if (!s.senha) return null;
  return (
    <div className="alert alert-ok" role="status" style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {s.qr && <img src={s.qr} alt="QR code do 2FA" width={180} height={180} style={{ background: "#fff", borderRadius: 10 }} />}
      <div style={{ flex: "1 1 260px" }}>
        <div>{s.ok} Envie para {s.nome} por um canal seguro (ex.: Signal). Isto não será mostrado de novo.</div>
        <div className="secret">
          E-mail: {s.email}
          <br />Senha: {s.senha}
          <br />Chave 2FA: {s.chave}
        </div>
        <p className="note" style={{ marginTop: 8 }}>A pessoa escaneia o QR no Google Authenticator/Authy e entra pelo endereço secreto do painel.</p>
      </div>
    </div>
  );
}

export function PermChecks({ marcadas }: { marcadas: Perm[] }) {
  return (
    <fieldset className="checks">
      <legend className="lbl">O que esta pessoa pode fazer</legend>
      <label><input type="checkbox" defaultChecked disabled /> Ver clientes (sempre)</label>
      {PERMS.map((p) => (
        <label key={p.id}>
          <input type="checkbox" name="perm" value={p.id} defaultChecked={marcadas.includes(p.id)} /> {p.label}
        </label>
      ))}
    </fieldset>
  );
}

export function NewMemberForm() {
  const [state, action] = useFormState(createMember, {} as TeamState);
  return (
    <section className="card">
      <h2>Adicionar membro</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      <Credentials s={state} />
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row">
          <div className="f">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" className="input" maxLength={80} required />
          </div>
          <div className="f">
            <label htmlFor="email">E-mail de login</label>
            <input id="email" name="email" type="email" className="input" maxLength={200} required />
          </div>
          <div className="f">
            <label htmlFor="senha">Senha (vazio = gerar uma forte)</label>
            <input id="senha" name="senha" type="text" className="input" minLength={10} maxLength={100} autoComplete="off" />
          </div>
        </div>
        <PermChecks marcadas={["clientes_editar"]} />
        <div><Submit>Criar acesso</Submit></div>
      </form>
      <p className="note">Equipe e limpar o registro de atividades ficam sempre só com você.</p>
    </section>
  );
}

export function EditMemberForm({ id, nome, email, ativo, perms }: { id: string; nome: string; email: string; ativo: boolean; perms: Perm[] }) {
  const [state, action] = useFormState(updateMember.bind(null, id), {} as TeamState);
  return (
    <section className="card">
      <h2>Dados e permissões</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row">
          <div className="f">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" className="input" maxLength={80} defaultValue={nome} required />
          </div>
          <div className="f">
            <label htmlFor="email">E-mail de login</label>
            <input id="email" name="email" type="email" className="input" maxLength={200} defaultValue={email} required />
          </div>
        </div>
        <div className="row">
          <div className="f">
            <label htmlFor="senha">Nova senha (vazio = manter a atual)</label>
            <input id="senha" name="senha" type="text" className="input" minLength={10} maxLength={100} autoComplete="off" />
          </div>
          <div className="f">
            <label htmlFor="ativo">Status</label>
            <select id="ativo" name="ativo" className="input" defaultValue={ativo ? "sim" : "nao"}>
              <option value="sim">Ativo</option>
              <option value="nao">Desativado</option>
            </select>
          </div>
        </div>
        <PermChecks marcadas={perms} />
        <div><Submit>Salvar alterações</Submit></div>
      </form>
      <p className="note">Mudanças de permissão e de status valem na hora, mesmo com a pessoa logada. O 2FA continua o mesmo.</p>
    </section>
  );
}

export function ResetMember({ id }: { id: string }) {
  const [state, action] = useFormState(resetMember, {} as TeamState);
  return (
    <>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <Submit className="btn btn-sm">Gerar novo 2FA e senha</Submit>
      </form>
      {(state.senha || state.error) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 560, whiteSpace: "normal" }}>
            {state.error && <div className="alert alert-bad">{state.error}</div>}
            <Credentials s={state} />
            <a className="btn" href={`/painel/equipe/${id}`}>Fechar</a>
          </div>
        </div>
      )}
    </>
  );
}
