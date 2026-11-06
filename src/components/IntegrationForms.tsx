"use client";
import { useFormState } from "react-dom";
import { createIntegration, updateIntegration, type CState } from "@/app/actions/casino";
import { Submit } from "./Submit";

const TIPOS = [
  { id: "gateway", label: "Gateway" },
  { id: "provedor", label: "Provedor" },
  { id: "sportsbook", label: "Sportsbook" },
  { id: "outro", label: "Outro" },
];

export function NewIntegrationForm() {
  const [state, action] = useFormState(createIntegration, {} as CState);
  return (
    <section className="card">
      <h2>Adicionar integração</h2>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="row">
          <div className="f">
            <label htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" className="input">{TIPOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          </div>
          <div className="f">
            <label htmlFor="nome">Nome</label>
            <input id="nome" name="nome" className="input" maxLength={60} required placeholder="Ex.: PagNova" />
          </div>
          <div className="f">
            <label htmlFor="taxa_padrao">Taxa padrão</label>
            <input id="taxa_padrao" name="taxa_padrao" className="input" maxLength={40} placeholder="Ex.: 1,5% entrada / 1% saída" />
          </div>
        </div>
        <div className="f">
          <label htmlFor="campos">Campos de credencial (separados por vírgula)</label>
          <input id="campos" name="campos" className="input" maxLength={400} placeholder="API Key, API Secret, Callback secret" />
        </div>
        <div><Submit>Adicionar</Submit></div>
      </form>
    </section>
  );
}

export function EditIntegrationForm({ i }: { i: { id: string; nome: string; taxa_padrao: string; campos: string; ativo: string } }) {
  const [state, action] = useFormState(updateIntegration.bind(null, i.id), {} as CState);
  return (
    <form action={action} className="row" style={{ alignItems: "flex-end" }}>
      <div className="f"><label htmlFor={`n-${i.id}`}>Nome</label><input id={`n-${i.id}`} name="nome" className="input" defaultValue={i.nome} maxLength={60} /></div>
      <div className="f"><label htmlFor={`t-${i.id}`}>Taxa padrão</label><input id={`t-${i.id}`} name="taxa_padrao" className="input" defaultValue={i.taxa_padrao} maxLength={40} /></div>
      <div className="f" style={{ flex: "2 1 300px" }}><label htmlFor={`c-${i.id}`}>Campos de credencial</label><input id={`c-${i.id}`} name="campos" className="input" defaultValue={i.campos} maxLength={400} /></div>
      <div className="f" style={{ flex: "0 1 150px" }}>
        <label htmlFor={`a-${i.id}`}>Exibir</label>
        <select id={`a-${i.id}`} name="ativo" className="input" defaultValue={i.ativo}><option value="sim">Sim</option><option value="nao">Oculta</option></select>
      </div>
      <Submit className="btn">Salvar</Submit>
      {state.error && <div className="alert alert-bad">{state.error}</div>}
      {state.ok && <span className="pill p-ok">{state.ok}</span>}
    </form>
  );
}
