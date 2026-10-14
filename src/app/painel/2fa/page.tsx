import { TwoFactorForm } from "@/components/AuthForms";

export default function DoisFatores() {
  return (
    <main className="center">
      <div className="auth">
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h1>Verificação em duas etapas</h1>
          <p className="sub">Digite o código do seu app autenticador (Google Authenticator, Authy etc.). Você tem 5 minutos.</p>
        </div>
        <TwoFactorForm />
      </div>
    </main>
  );
}
