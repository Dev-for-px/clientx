"use client";
import { useRef, useState, useEffect } from "react";
import { useFormState } from "react-dom";
import { submitClient, type DataState } from "@/app/actions/data";
import { FORM_SECTIONS } from "@/lib/fields";
import { ClientFields } from "./ClientFields";
import { Submit } from "./Submit";

export function NewClientForm() {
  const [state, action] = useFormState(submitClient, {} as DataState);
  const [key, setKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.ok) setKey((k) => k + 1); // limpa o formulário após salvar
    if (state.ok || state.error) ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [state]);

  return (
    <form action={action} key={key} style={{ display: "contents" }}>
      <div className="mbody">
        <div ref={ref} />
        {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
        {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
        <ClientFields sections={FORM_SECTIONS} />
      </div>
      <div className="mfoot">
        <Submit className="btn btn-primary" >Cadastrar cliente</Submit>
      </div>
    </form>
  );
}
