"use client";
import { useFormState } from "react-dom";
import { createMember, resetMember, type TeamState } from "@/app/actions/team";
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

export function NewMemberForm() {
  const [state, action] = useFormState(createMember, {} as TeamState);
  return (
    <section className="card">
      <h2>Adicionar membro</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      <Credentials s={state} />
      <form action={action} className="row">
        <div className="f">
          <label htmlFor="nome">Nome</label>
          <input id="nome" name="nome" className="input" maxLength={80} required />
        </div>
        <div className="f">
          <label htmlFor="email">E-mail de login</label>
          <input id="email" name="email" type="email" className="input" maxLength={200} required />
        </div>
        <Submit>Criar acesso</Submit>
      </form>
      <p className="note">Membros veem e editam clientes. Equipe, acessos ao formulário e registro de atividades ficam só com você.</p>
    </section>
  );
}

export function ResetMember({ id }: { id: string }) {
  const [state, action] = useFormState(resetMember, {} as TeamState);
  return (
    <>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <Submit className="btn btn-sm">Gerar novo acesso</Submit>
      </form>
      {(state.senha || state.error) && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,30,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 }}>
          <div className="card" style={{ maxWidth: 560, whiteSpace: "normal" }}>
            {state.error && <div className="alert alert-bad">{state.error}</div>}
            <Credentials s={state} />
            <a className="btn" href="/painel/equipe">Fechar</a>
          </div>
        </div>
      )}
    </>
  );
}
