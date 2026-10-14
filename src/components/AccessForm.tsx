"use client";
import { useFormState } from "react-dom";
import { createAccess, updateAccess, type DataState } from "@/app/actions/data";
import { Submit } from "./Submit";

export function AccessForm() {
  const [state, action] = useFormState(createAccess, {} as DataState);
  return (
    <section className="card">
      <h2>Novo acesso</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && (
        <div className="alert alert-ok" role="status">
          {state.ok}
          {state.secret && <div className="secret">{state.secret}</div>}
        </div>
      )}
      <form action={action} className="row">
        <div className="f">
          <label htmlFor="nome">Nome de quem vai usar</label>
          <input id="nome" name="nome" className="input" placeholder="Ex.: Vendedor 1" maxLength={80} required />
        </div>
        <div className="f">
          <label htmlFor="senha">Senha (vazio = gerar uma forte)</label>
          <input id="senha" name="senha" type="text" className="input" minLength={10} maxLength={100} autoComplete="off" />
        </div>
        <div className="f">
          <label htmlFor="validade">Validade</label>
          <select id="validade" name="validade" className="input">
            <option value="0">Sem validade</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
          </select>
        </div>
        <Submit>Criar acesso</Submit>
      </form>
    </section>
  );
}

export function EditAccessForm({ id, nome, ativo, validade }: { id: string; nome: string; ativo: boolean; validade: string }) {
  const [state, action] = useFormState(updateAccess.bind(null, id), {} as DataState);
  const atual = validade ? `Manter (até ${new Date(validade + "T12:00:00").toLocaleDateString("pt-BR")})` : "Manter (sem validade)";
  return (
    <section className="card">
      <h2>Editar acesso</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="row">
          <div className="f">
            <label htmlFor="nome">Nome de quem vai usar</label>
            <input id="nome" name="nome" className="input" maxLength={80} defaultValue={nome} required />
          </div>
          <div className="f">
            <label htmlFor="senha">Nova senha (vazio = manter a atual)</label>
            <input id="senha" name="senha" type="text" className="input" minLength={10} maxLength={100} autoComplete="off" />
          </div>
        </div>
        <div className="row">
          <div className="f">
            <label htmlFor="validade">Validade</label>
            <select id="validade" name="validade" className="input" defaultValue="manter">
              <option value="manter">{atual}</option>
              <option value="0">Sem validade</option>
              <option value="7">7 dias a partir de hoje</option>
              <option value="30">30 dias a partir de hoje</option>
              <option value="90">90 dias a partir de hoje</option>
            </select>
          </div>
          <div className="f">
            <label htmlFor="ativo">Status</label>
            <select id="ativo" name="ativo" className="input" defaultValue={ativo ? "sim" : "nao"}>
              <option value="sim">Ativo</option>
              <option value="nao">Desativado</option>
            </select>
          </div>
        </div>
        <div><Submit>Salvar alterações</Submit></div>
      </form>
      <p className="note">Desativar ou trocar a senha vale na hora, inclusive para quem já está com o formulário aberto.</p>
    </section>
  );
}
