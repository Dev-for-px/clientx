"use client";
import { useFormState } from "react-dom";
import { adminLogin, adminVerify2fa, formUnlock, type State } from "@/app/actions/auth";
import { Submit } from "./Submit";

const init: State = {};

export function LoginForm() {
  const [state, action] = useFormState(adminLogin, init);
  return (
    <form action={action} className="auth" style={{ padding: 0, border: 0, gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      <div className="f">
        <label htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" autoComplete="username" required maxLength={200} />
      </div>
      <div className="f">
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="senha" type="password" className="input" autoComplete="current-password" required maxLength={200} />
      </div>
      <Submit>Continuar</Submit>
    </form>
  );
}

export function TwoFactorForm() {
  const [state, action] = useFormState(adminVerify2fa, init);
  return (
    <form action={action} className="auth" style={{ padding: 0, border: 0, gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      <div className="f">
        <label htmlFor="codigo">Código de 6 dígitos</label>
        <input
          id="codigo" name="codigo" className="input code" inputMode="numeric" pattern="[0-9]{6}"
          maxLength={6} autoComplete="one-time-code" autoFocus required placeholder="000000"
        />
      </div>
      <Submit>Verificar e entrar</Submit>
    </form>
  );
}

export function FormPasswordForm() {
  const [state, action] = useFormState(formUnlock, init);
  return (
    <form action={action} className="auth" style={{ padding: 0, border: 0, gap: 16 }}>
      {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
      <div className="f">
        <label htmlFor="senha">Senha de acesso</label>
        <input id="senha" name="senha" type="password" className="input" autoComplete="current-password" required maxLength={200} />
      </div>
      <Submit>Acessar formulário</Submit>
    </form>
  );
}
