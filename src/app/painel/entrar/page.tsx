import { Logo } from "@/components/Logo";
import { LoginForm } from "@/components/AuthForms";

export default function Entrar() {
  return (
    <main className="center">
      <div className="auth">
        <Logo size={40} />
        <div>
          <h1>Entrar no painel</h1>
          <p className="sub">Acesso restrito a administradores.</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
