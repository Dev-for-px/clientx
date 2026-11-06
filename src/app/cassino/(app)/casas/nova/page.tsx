import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { CasaForm } from "@/components/CasaForm";

export default async function NovaCasa() {
  await requirePerm("cassino_editar");
  return (
    <>
      <header className="top">
        <div>
          <Link href="/cassino" className="note">← Voltar para casas</Link>
          <h1 style={{ marginTop: 6 }}>Nova casa</h1>
          <p className="sub">Depois de salvar, você configura gateways, provedores e credenciais.</p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        <CasaForm />
      </div>
    </>
  );
}
