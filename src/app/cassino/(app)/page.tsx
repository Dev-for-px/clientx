import Link from "next/link";
import { requirePerm } from "@/lib/auth";
import { brl, safeUrl } from "@/lib/clients";
import { catalog, listCasas } from "@/lib/casino";
import { readAll } from "@/lib/db";

const statusPill: Record<string, string> = { Ativa: "p-ok", "Em andamento": "p-info", Inativa: "p-off" };
const intPill: Record<string, string> = { Ativo: "p-ok", Aguardando: "p-warn", Inativo: "p-off" };

type SP = { q?: string; status?: string };
const pct = (v: string) => (v ? `${v}%` : "—");

export default async function CassinoCasas({ searchParams }: { searchParams: SP }) {
  const me = await requirePerm("cassino_ver");
  const [all, cat, links] = await Promise.all([listCasas(), catalog(), readAll("CasaIntegracoes")]);
  const ints = cat.filter((i) => i.ativo === "sim");
  const q = (searchParams.q ?? "").toLowerCase().slice(0, 100);
  const rows = all
    .filter((c) => !searchParams.status || c.status === searchParams.status)
    .filter((c) => !q || [c.nome, c.dominio_site, c.dominio_backoffice, c.dominio_afiliados].join(" ").toLowerCase().includes(q))
    .sort((a, b) => Number(a.numero || 999) - Number(b.numero || 999));
  const st = (casa: string, integ: string) => links.find((l) => l.casa_id === casa && l.integracao_id === integ)?.status ?? "";
  const aguardando = links.filter((l) => l.status === "Aguardando").length;

  return (
    <>
      <header className="top">
        <div>
          <h1>Casas</h1>
          <p className="sub">Marcas, taxas e status de cada integração</p>
        </div>
        {me.perms.includes("cassino_editar") && <Link className="btn btn-primary" href="/cassino/casas/nova">+ Nova casa</Link>}
      </header>
      <div className="content" style={{ maxWidth: "none" }}>
        <div className="kpis">
          <div className="kpi"><div className="k">Casas ativas</div><div className="v">{all.filter((c) => c.status === "Ativa").length}</div></div>
          <div className="kpi"><div className="k">Em andamento</div><div className="v">{all.filter((c) => c.status === "Em andamento").length}</div></div>
          <div className="kpi warn"><div className="k">Integrações aguardando</div><div className="v">{aguardando}</div></div>
          <div className="kpi"><div className="k">Total de casas</div><div className="v">{all.length}</div></div>
        </div>

        <form className="filters" method="get">
          <label className="sr" htmlFor="q">Buscar</label>
          <input id="q" name="q" className="input" placeholder="Buscar marca ou domínio" defaultValue={searchParams.q} />
          <label className="sr" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={searchParams.status ?? ""}>
            <option value="">Status: todos</option>
            {Object.keys(statusPill).map((s) => <option key={s}>{s}</option>)}
          </select>
          <button className="btn" type="submit" style={{ height: 46 }}>Filtrar</button>
        </form>

        <div className="tablebox">
          {rows.length === 0 ? (
            <div className="empty">Nenhuma casa encontrada.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nº</th><th>Marca</th><th>Backoffice / Afiliados</th><th>Setup</th>
                  <th>GGR SL</th><th>GGR SY/OB/Dir.</th><th>GGR ao vivo</th><th>Servidor/sem.</th><th>Status</th>
                  {ints.map((i) => <th key={i.id}>{i.nome}</th>)}
                  <th>Comunicação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const wa = safeUrl(c.grupo_whatsapp), sg = safeUrl(c.grupo_signal);
                  return (
                    <tr key={c.id}>
                      <td>{c.numero || "—"}</td>
                      <td><Link href={`/cassino/casas/${c.id}`} style={{ fontWeight: 700, color: "var(--ink)" }}>{c.nome || "Sem nome"}</Link></td>
                      <td><div>{c.dominio_backoffice || "—"}</div><div className="s">{c.dominio_afiliados}</div></td>
                      <td>{c.setup || "—"}</td>
                      <td>{pct(c.ggr_sl)}</td><td>{pct(c.ggr_sy)}</td><td>{pct(c.ggr_vivo)}</td>
                      <td>{brl(c.servidor_semana)}</td>
                      <td><span className={`pill ${statusPill[c.status] ?? "p-off"}`}>{c.status || "—"}</span></td>
                      {ints.map((i) => {
                        const s = st(c.id, i.id);
                        return <td key={i.id}>{s ? <span className={`pill ${intPill[s]}`}>{s}</span> : <span className="s">—</span>}</td>;
                      })}
                      <td>
                        <div className="links">
                          {wa && <a className="pill p-ok" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                          {sg && <a className="pill p-info" href={sg} target="_blank" rel="noopener noreferrer">Signal</a>}
                          {!wa && !sg && "—"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
