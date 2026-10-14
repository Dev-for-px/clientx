"use client";
import { useFormState } from "react-dom";
import { createAccess, type DataState } from "@/app/actions/data";
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
          <input id="senha" name="senha" type="password" className="input" minLength={10} maxLength={100} autoComplete="new-password" />
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
