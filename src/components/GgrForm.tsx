"use client";
import { useFormState } from "react-dom";
import { saveGgr, type CState } from "@/app/actions/casino";
import { Submit } from "./Submit";

export function GgrForm({ inicio, fim, podeEditar, children }: { inicio: string; fim: string; podeEditar: boolean; children: React.ReactNode }) {
  const [state, action] = useFormState(saveGgr, {} as CState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fim" value={fim} />
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>{children}</fieldset>
      {podeEditar && <div><Submit>Salvar fechamento</Submit></div>}
    </form>
  );
}
