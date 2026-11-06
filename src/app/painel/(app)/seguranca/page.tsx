import { setSecurity } from "@/app/actions/data";
import { requireOwner } from "@/lib/auth";
import { SEG, security, type SegKey } from "@/lib/security";

export default async function Seguranca() {
  await requireOwner();
  const atual = await security();
  const adminPath = process.env.ADMIN_PATH ?? "";
  return (
    <>
      <header className="top">
        <div>
          <h1>Segurança</h1>
          <p className="sub">Ligue ou desligue as proteções do painel. Recomendado: tudo ligado.</p>
        </div>
      </header>
      <div className="content" style={{ maxWidth: 820 }}>
        {(Object.keys(SEG) as SegKey[]).map((k) => (
          <section className="card" key={k}>
            <h2>{SEG[k].label}</h2>
            <p className="note" style={{ fontSize: 14 }}>{SEG[k].desc}</p>
            <form action={setSecurity} className="seg" style={{ maxWidth: 420 }}>
              <input type="hidden" name="chave" value={k} />
              <button type="submit" name="valor" value="sim" aria-pressed={atual[k]}>Ligado</button>
              <button type="submit" name="valor" value="nao" aria-pressed={!atual[k]}>Desligado</button>
            </form>
            {k === "seg_caminho" && (
              <p className="note">
                Endereço atual do login: <b>{atual.seg_caminho ? `/${adminPath}` : "/entrar"}</b>
                {!atual.seg_caminho && " (pode levar até 30 segundos para valer)"}
              </p>
            )}
            {!atual[k] && <div className="alert alert-bad">Proteção desligada: o painel fica mais exposto.</div>}
          </section>
        ))}
        <p className="note">Senha forte, criptografia dos dados e registro de atividades continuam sempre ativos.</p>
      </div>
    </>
  );
}
