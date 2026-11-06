import { requirePerm } from "@/lib/auth";
import { listCasas } from "@/lib/casino";
import { readAll } from "@/lib/db";
import { PAGAMENTOS, STATUS_PAG, semanaPadrao } from "@/lib/casino";
import { num } from "@/lib/clients";
import { GgrForm } from "@/components/GgrForm";

const d = (iso: string) => iso.split("-").reverse().join("/");
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const okDate = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export default async function Ggr({ searchParams }: { searchParams: { inicio?: string; fim?: string } }) {
  const me = await requirePerm("cassino_ver");
  const pad = semanaPadrao();
  const inicio = okDate(searchParams.inicio) || pad.inicio;
  const fim = okDate(searchParams.fim) || pad.fim;
  const [casas, todos] = await Promise.all([listCasas(), readAll("Ggr")]);
  const doPeriodo = todos.filter((g) => g.inicio === inicio);
  const lista = casas.filter((c) => c.status !== "Inativa" || doPeriodo.some((g) => g.casa_id === c.id))
    .sort((a, b) => Number(a.numero || 999) - Number(b.numero || 999));
  const totalGgr = doPeriodo.reduce((s, g) => s + num(g.ggr_sl) + num(g.ggr_sy) + num(g.ggr_vivo), 0);
  const totalPagar = doPeriodo.reduce((s, g) => s + num(g.valor_pagar), 0);
  const recebido = doPeriodo.filter((g) => g.status_pagamento === "Pago").reduce((s, g) => s + num(g.valor_pagar), 0);
  const periodos = Array.from(new Map(todos.map((g) => [g.inicio, g.fim])).entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  const pode = me.perms.includes("cassino_editar");

  return (
    <>
      <header className="top">
        <div>
          <h1>Fechamento de GGR</h1>
          <p className="sub">Período {d(inicio)} a {d(fim)}. O valor a pagar é calculado com as taxas de cada casa.</p>
        </div>
        <form method="get" className="row" style={{ alignItems: "flex-end" }}>
          <div className="f" style={{ flex: "0 1 170px" }}><label htmlFor="inicio">Início</label><input id="inicio" name="inicio" type="date" className="input" defaultValue={inicio} /></div>
          <div className="f" style={{ flex: "0 1 170px" }}><label htmlFor="fim">Fim</label><input id="fim" name="fim" type="date" className="input" defaultValue={fim} /></div>
          <button className="btn" type="submit" style={{ height: 48 }}>Abrir período</button>
        </form>
      </header>
      <div className="content" style={{ maxWidth: "none" }}>
        <div className="kpis">
          <div className="kpi"><div className="k">GGR total do período</div><div className="v">{brl(totalGgr)}</div></div>
          <div className="kpi"><div className="k">Total a receber</div><div className="v">{brl(totalPagar)}</div></div>
          <div className="kpi"><div className="k">Já pago</div><div className="v">{brl(recebido)}</div></div>
          <div className="kpi warn"><div className="k">Pendente</div><div className="v">{brl(totalPagar - recebido)}</div></div>
        </div>

        <GgrForm inicio={inicio} fim={fim} podeEditar={pode}>
          <div className="tablebox">
            <table>
              <thead>
                <tr>
                  <th>Nº</th><th>Marca</th><th>GGR SL (R$)</th><th>GGR SY/OB/Dir. (R$)</th><th>GGR ao vivo (R$)</th>
                  <th>+ Servidor</th><th>A pagar</th><th>Valor manual</th><th>Pagamento</th><th>Status</th><th>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const g = doPeriodo.find((x) => x.casa_id === c.id);
                  const inp = (n: string, v = "", w = 120) => (
                    <input name={`${n}_${c.id}`} defaultValue={v} className="input" inputMode="decimal" style={{ width: w, height: 40, fontSize: 14 }} aria-label={`${n} ${c.nome}`} />
                  );
                  return (
                    <tr key={c.id}>
                      <td>{c.numero || "—"}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{c.nome}</div>
                        <div className="s">SL {c.ggr_sl || 0}% · SY {c.ggr_sy || 0}% · vivo {c.ggr_vivo || 0}%</div>
                      </td>
                      <td>{inp("ggr_sl", g?.ggr_sl)}</td>
                      <td>{inp("ggr_sy", g?.ggr_sy)}</td>
                      <td>{inp("ggr_vivo", g?.ggr_vivo)}</td>
                      <td><label><input type="checkbox" name={`servidor_${c.id}`} value="sim" defaultChecked={g?.incluir_servidor === "sim"} /> {c.servidor_semana ? `R$ ${c.servidor_semana}` : "—"}</label></td>
                      <td style={{ fontWeight: 700 }}>{g ? `R$ ${g.valor_pagar}` : "—"}</td>
                      <td>{inp("manual", "", 110)}</td>
                      <td>
                        <select name={`pagamento_${c.id}`} className="input" defaultValue={g?.pagamento ?? ""} style={{ height: 40, fontSize: 14 }} aria-label={`Pagamento ${c.nome}`}>
                          {PAGAMENTOS.map((p) => <option key={p} value={p}>{p || "—"}</option>)}
                        </select>
                      </td>
                      <td>
                        <select name={`status_pagamento_${c.id}`} className="input" defaultValue={g?.status_pagamento ?? "Pendente"} style={{ height: 40, fontSize: 14 }} aria-label={`Status ${c.nome}`}>
                          {STATUS_PAG.map((p) => <option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td><input name={`obs_${c.id}`} defaultValue={g?.obs ?? ""} className="input" maxLength={300} style={{ width: 160, height: 40, fontSize: 14 }} aria-label={`Obs ${c.nome}`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="note" style={{ marginTop: 10 }}>
            &quot;A pagar&quot; = GGR de cada categoria × taxa da casa (+ servidor, se marcado). Use &quot;Valor manual&quot; para substituir o cálculo.
          </p>
        </GgrForm>

        {periodos.length > 0 && (
          <section className="card">
            <h2>Períodos fechados</h2>
            <div className="links" style={{ flexWrap: "wrap" }}>
              {periodos.map(([i, f]) => (
                <a key={i} className={`pill ${i === inicio ? "p-info" : "p-off"}`} href={`/cassino/ggr?inicio=${i}&fim=${f}`}>{d(i)} – {d(f)}</a>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
