import Link from "next/link";
import { brl, listClients, num, safeUrl } from "@/lib/clients";
import { requireAdmin } from "@/lib/auth";

const statusPill: Record<string, string> = {
  Ativo: "p-ok", "Em implantação": "p-info", Suspenso: "p-orange", Inativo: "p-off",
};
const finPill: Record<string, string> = {
  "Em dia": "p-ok", "Fatura em aberto": "p-warn", Vencido: "p-bad", "Em negociação": "p-orange",
};

type SP = { q?: string; status?: string; fin?: string; gerente?: string };

export default async function Clientes({ searchParams }: { searchParams: SP }) {
  const me = await requireAdmin();
  const podeEditar = me.perms.includes("clientes_editar");
  const all = await listClients();
  const q = (searchParams.q ?? "").toLowerCase().slice(0, 100);
  const rows = all
    .filter((c) => !searchParams.status || c.status === searchParams.status)
    .filter((c) => !searchParams.fin || c.situacao === searchParams.fin)
    .filter((c) => !searchParams.gerente || c.gerente === searchParams.gerente)
    .filter((c) => !q || [c.nome, c.cnpj, c.dominio_site, c.dominio_admin, c.responsavel].join(" ").toLowerCase().includes(q))
    .sort((a, b) => b.criado_em.localeCompare(a.criado_em));

  const ativos = all.filter((c) => c.status === "Ativo");
  const mrr = ativos.reduce((s, c) => s + num(c.mensalidade), 0);
  const atraso = all.filter((c) => c.situacao === "Vencido").reduce((s, c) => s + num(c.valor_aberto), 0);
  const devendo = all.filter((c) => c.situacao === "Vencido" || c.situacao === "Fatura em aberto").length;
  const gerentes = Array.from(new Set(all.map((c) => c.gerente).filter(Boolean))).sort();

  return (
    <>
      <header className="top">
        <div>
          <h1>Clientes</h1>
          <p className="sub">Status, cobrança e responsáveis de cada conta</p>
        </div>
      </header>
      <div className="content">
        <div className="kpis">
          <div className="kpi"><div className="k">Clientes ativos</div><div className="v">{ativos.length}</div></div>
          <div className="kpi"><div className="k">Mensalidades (ativos)</div><div className="v">{brl(String(mrr).replace(".", ","))}</div></div>
          <div className="kpi bad"><div className="k">Valor vencido</div><div className="v">{brl(String(atraso).replace(".", ","))}</div></div>
          <div className="kpi warn"><div className="k">Clientes com fatura pendente</div><div className="v">{devendo}</div></div>
        </div>

        <form className="filters" method="get">
          <label className="sr" htmlFor="q">Buscar</label>
          <input id="q" name="q" className="input" placeholder="Buscar por nome, CNPJ ou domínio" defaultValue={searchParams.q} />
          <label className="sr" htmlFor="status">Status</label>
          <select id="status" name="status" className="input" defaultValue={searchParams.status ?? ""}>
            <option value="">Status: todos</option>
            {Object.keys(statusPill).map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="sr" htmlFor="fin">Financeiro</label>
          <select id="fin" name="fin" className="input" defaultValue={searchParams.fin ?? ""}>
            <option value="">Financeiro: todos</option>
            {Object.keys(finPill).map((s) => <option key={s}>{s}</option>)}
          </select>
          <label className="sr" htmlFor="gerente">Gerente</label>
          <select id="gerente" name="gerente" className="input" defaultValue={searchParams.gerente ?? ""}>
            <option value="">Gerente: todos</option>
            {gerentes.map((g) => <option key={g}>{g}</option>)}
          </select>
          <button className="btn" type="submit" style={{ height: 46 }}>Filtrar</button>
        </form>

        <div className="tablebox">
          {rows.length === 0 ? (
            <div className="empty">Nenhum cliente encontrado.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Status</th><th>Financeiro</th><th>Dia da fatura</th><th>Pagamento</th>
                  <th>Em aberto</th><th>Gerente</th><th>Domínios</th><th>Comunicação</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const wa = safeUrl(c.grupo_whatsapp);
                  const sg = safeUrl(c.grupo_signal);
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/painel/clientes/${c.id}`} style={{ fontWeight: 700, color: "var(--ink)" }}>{c.nome || "Sem nome"}</Link>
                        <div className="s">{c.responsavel || "—"}</div>
                      </td>
                      <td><span className={`pill ${statusPill[c.status] ?? "p-off"}`}>{c.status || "—"}</span></td>
                      <td><span className={`pill ${finPill[c.situacao] ?? "p-off"}`}>{c.situacao || "—"}</span></td>
                      <td>{c.dia_fatura || "—"}</td>
                      <td>{c.meio_pagamento || "—"}</td>
                      <td style={{ fontWeight: 700 }}>{brl(c.valor_aberto)}</td>
                      <td>{c.gerente || "—"}</td>
                      <td><div>{c.dominio_site || "—"}</div><div className="s">{c.dominio_admin}</div></td>
                      <td>
                        <div className="links">
                          {wa && <a className="pill p-ok" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                          {sg && <a className="pill p-info" href={sg} target="_blank" rel="noopener noreferrer">Signal</a>}
                          {!wa && !sg && "—"}
                        </div>
                      </td>
                      <td><Link className="btn btn-sm" href={`/painel/clientes/${c.id}`}>{podeEditar ? "Editar" : "Ver"}</Link></td>
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
