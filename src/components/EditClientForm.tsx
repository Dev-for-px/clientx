"use client";
import { useFormState } from "react-dom";
import { updateClient, type DataState } from "@/app/actions/data";
import { ADMIN_EXTRA, FORM_SECTIONS } from "@/lib/fields";
import { ClientFields } from "./ClientFields";
import { Submit } from "./Submit";

export function EditClientForm({ id, values, podeEditar = true }: { id: string; values: Record<string, string>; podeEditar?: boolean }) {
  const [state, action] = useFormState(updateClient.bind(null, id), {} as DataState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      {/* Sem permissão de edição: mesmos campos, só para leitura. */}
      <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
        <ClientFields sections={[ADMIN_EXTRA, ...FORM_SECTIONS]} values={values} numbered={false} />
      </fieldset>
      {podeEditar ? (
        <div><Submit>Salvar alterações</Submit></div>
      ) : (
        <p className="note">Você pode ver este cliente, mas não tem permissão para editar.</p>
      )}
    </form>
  );
}
