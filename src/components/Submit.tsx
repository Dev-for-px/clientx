"use client";
import { useFormStatus } from "react-dom";

export function Submit({ children, className = "btn btn-primary" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Aguarde…" : children}
    </button>
  );
}
