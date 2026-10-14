import Link from "next/link";
import { notFound } from "next/navigation";
import { EditMemberForm, ResetMember } from "@/components/TeamForms";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { deleteMember } from "@/app/actions/team";
import { requireOwner } from "@/lib/auth";
import { readAll } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { parsePapel } from "@/lib/perms";

export default async function Membro({ params }: { params: { id: string } }) {
  await requireOwner();
  const u = (await readAll("Usuarios")).find((x) => x.id === params.id);
  if (!u) notFound();
  return (
    <>
      <header className="top">
        <div>
          <Link href="/painel/equipe" className="note">← Voltar para equipe</Link>
          <h1 style={{ marginTop: 6 }}>{u.nome}</h1>
          <p className="sub">Membro desde {new Date(u.criado_em).toLocaleDateString("pt-BR")}</p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        <EditMemberForm id={u.id} nome={u.nome} email={decrypt(u.email)} ativo={u.ativo === "sim"} perms={parsePapel(u.papel)} />
        <section className="card">
          <h2>Acesso</h2>
          <p className="note">Perdeu o celular do 2FA? Gere um novo QR code e uma senha nova. O acesso anterior para de funcionar.</p>
          <div className="links">
            <ResetMember id={u.id} />
            <form action={deleteMember}>
              <input type="hidden" name="id" value={u.id} />
              <ConfirmSubmit pergunta={`Excluir ${u.nome} da equipe? Isso não pode ser desfeito.`}>Excluir membro</ConfirmSubmit>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
