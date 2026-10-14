import { Logo } from "@/components/Logo";
import { FormPasswordForm } from "@/components/AuthForms";
import { Submit } from "@/components/Submit";
import { formOpen } from "@/app/actions/auth";
import { getConfig } from "@/lib/db";

export default async function FormularioSenha() {
  const exigeSenha = (await getConfig("form_senha", "sim")) !== "nao";
  return (
    <main className="center" style={{ flexDirection: "column", gap: 28 }}>
      <Logo size={44} />
      <div className="auth">
        <div>
          <h1 style={{ fontSize: 22 }}>Cadastro de cliente</h1>
          <p className="sub">
            {exigeSenha ? "Digite a senha de acesso que você recebeu do administrador." : "Toque no botão para abrir o formulário."}
          </p>
        </div>
        {exigeSenha ? (
          <FormPasswordForm />
        ) : (
          <form action={formOpen} style={{ display: "flex", flexDirection: "column" }}>
            <Submit>Abrir formulário</Submit>
          </form>
        )}
      </div>
      <p className="note">Conexão protegida e criptografada</p>
    </main>
  );
}
