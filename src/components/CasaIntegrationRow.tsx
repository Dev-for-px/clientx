"use client";
import { useFormState } from "react-dom";
import { saveCasaIntegration, type CState } from "@/app/actions/casino";
import { Submit } from "./Submit";

type Props = {
  casaId: string;
  integ: { id: string; nome: string; taxa_padrao: string };
  campos: string[];
  atual: { status: string; taxa: string; obs: string; creds: Record<string, string> };
  podeEditar: boolean;
};

export function CasaIntegrationRow({ casaId, integ, campos, atual, podeEditar }: Props) {
  const [state, action] = useFormState(saveCasaIntegration.bind(null, casaId, integ.id), {} as CState);
  const pill = atual.status === "Ativo" ? "p-ok" : atual.status === "Aguardando" ? "p-warn" : atual.status ? "p-off" : "";
  return (
    <details className="card" style={{ gap: 12 }}>
      <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontWeight: 700 }}>
        {integ.nome}
        {atual.status ? <span className={`pill ${pill}`}>{atual.status}</span> : <span className="s">não configurado</span>}
        {atual.taxa && <span className="s">taxa {atual.taxa}</span>}
      </summary>
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
        {state.error && <div className="alert alert-bad" role="alert">{state.error}</div>}
        {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
        <fieldset disabled={!podeEditar} style={{ border: 0, padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="row">
            <div className="f">
              <label htmlFor={`st-${integ.id}`}>Status</label>
              <select id={`st-${integ.id}`} name="status" className="input" defaultValue={atual.status || "Aguardando"}>
                <option>Ativo</option><option>Aguardando</option><option>Inativo</option>
              </select>
            </div>
            <div className="f">
              <label htmlFor={`tx-${integ.id}`}>Taxa</label>
              <input id={`tx-${integ.id}`} name="taxa" className="input" defaultValue={atual.taxa} placeholder={integ.taxa_padrao || "Ex.: 1,5 entrada / 1 saída"} maxLength={40} />
            </div>
          </div>
          {campos.length > 0 && (
            <div className="grid2">
              {campos.map((c, i) => (
                <div className="f" key={c}>
                  <label htmlFor={`c${i}-${integ.id}`}>{c}</label>
                  <input
                    id={`c${i}-${integ.id}`} name={`c${i}`} className="input" autoComplete="off" maxLength={500}
                    placeholder={atual.creds[c] ? "salvo — digite para trocar" : ""}
                  />
                  {atual.creds[c] && (
                    <span className="s" style={{ wordBreak: "break-all" }}>
                      Atual: <code>{atual.creds[c]}</code>{" "}
                      <label style={{ fontWeight: 400 }}><input type="checkbox" name={`limpar${i}`} value="sim" /> apagar</label>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="f">
            <label htmlFor={`ob-${integ.id}`}>Observação</label>
            <input id={`ob-${integ.id}`} name="obs" className="input" defaultValue={atual.obs} maxLength={500} />
          </div>
        </fieldset>
        {podeEditar && <div><Submit className="btn btn-primary">Salvar {integ.nome}</Submit></div>}
        <p className="note">Credenciais ficam criptografadas no banco e no backup.</p>
      </form>
    </details>
  );
}
