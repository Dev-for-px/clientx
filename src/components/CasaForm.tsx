"use client";
import { useFormState } from "react-dom";
import { createCasa, updateCasa, type CState } from "@/app/actions/casino";
import { CASA_SECTIONS } from "@/lib/casino-fields";
import { ClientFields } from "./ClientFields";
import { Submit } from "./Submit";

export function CasaForm({ id, values = {}, podeEditar = true }: { id?: string; values?: Record<string, string>; podeEditar?: boolean }) {
  const [state, action] = useFormState(id ? updateCasa.bind(null, id) : createCasa, {} as CState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <ClientFields sections={CASA_SECTIONS} values={id ? values : { status: "Em andamento", ...values }} numbered={false} />
      </fieldset>
      {podeEditar && <div><Submit>{id ? "Salvar alterações" : "Cadastrar casa"}</Submit></div>}
    </form>
  );
}
