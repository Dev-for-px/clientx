"use client";
import { useFormStatus } from "react-dom";

// Botão de envio que pede confirmação antes (ações que não têm volta).
export function ConfirmSubmit({
  children,
  pergunta,
  className = "btn btn-sm danger",
  name,
  value,
}: {
  children: React.ReactNode;
  pergunta: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (!window.confirm(pergunta)) e.preventDefault();
      }}
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}
