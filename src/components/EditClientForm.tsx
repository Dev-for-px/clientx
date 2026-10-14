"use client";
import { useFormState } from "react-dom";
import { updateClient, type DataState } from "@/app/actions/data";
import { ADMIN_EXTRA, FORM_SECTIONS } from "@/lib/fields";
import { ClientFields } from "./ClientFields";
import { Submit } from "./Submit";

export function EditClientForm({ id, values }: { id: string; values: Record<string, string> }) {
  const [state, action] = useFormState(updateClient.bind(null, id), {} as DataState);
  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <ClientFields sections={[ADMIN_EXTRA, ...FORM_SECTIONS]} values={values} numbered={false} />
      <div><Submit>Salvar alterações</Submit></div>
    </form>
  );
}
