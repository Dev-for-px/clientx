import { Logo } from "@/components/Logo";
import { FormPasswordForm } from "@/components/AuthForms";

export default function FormularioSenha() {
  return (
    <main className="center" style={{ flexDirection: "column", gap: 28 }}>
      <Logo size={44} />
      <div className="auth">
        <div>
          <h1 style={{ fontSize: 22 }}>Cadastro de cliente</h1>
          <p className="sub">Digite a senha de acesso que você recebeu do administrador.</p>
        </div>
        <FormPasswordForm />
      </div>
      <p className="note">Conexão protegida e criptografada</p>
    </main>
  );
}
