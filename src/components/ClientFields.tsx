"use client";
import { useState } from "react";
import type { Field, Section } from "@/lib/fields";

function Segment({ f, value }: { f: Field; value: string }) {
  const [v, setV] = useState(value);
  return (
    <div className="f">
      <span className="lbl" id={`${f.name}-l`}>{f.label}</span>
      <input type="hidden" name={f.name} value={v} />
      <div className="seg" role="group" aria-labelledby={`${f.name}-l`}>
        {f.options!.map((o) => (
          <button key={o} type="button" aria-pressed={v === o} onClick={() => setV(v === o ? "" : o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Input({ f, value }: { f: Field; value: string }) {
  if (f.type === "segment") return <Segment f={f} value={value} />;
  const common = { id: f.name, name: f.name, defaultValue: value, className: "input", placeholder: f.placeholder, maxLength: f.max ?? 300 };
  let el: React.ReactNode;
  if (f.type === "textarea") el = <textarea {...common} />;
  else if (f.type === "select")
    el = (
      <select {...common}>
        {f.options!.map((o) => (
          <option key={o} value={o}>{o || "Selecione"}</option>
        ))}
      </select>
    );
  else {
    const t = f.type === "email" ? "email" : f.type === "tel" ? "tel" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text";
    const mode = f.type === "money" || f.type === "percent" ? "decimal" : undefined;
    el = <input {...common} type={t} inputMode={mode} autoComplete="off" />;
  }
  return (
    <div className="f">
      <label htmlFor={f.name}>{f.label}</label>
      {el}
    </div>
  );
}

export function ClientFields({ sections, values = {}, numbered = true }: { sections: Section[]; values?: Record<string, string>; numbered?: boolean }) {
  return (
    <>
      {sections.map((s, i) => (
        <section className="card" key={s.title}>
          <h2>{numbered ? `${i + 1}. ` : ""}{s.title}</h2>
          {s.fields.map((f) => (
            <Input key={f.name} f={f} value={values[f.name] ?? ""} />
          ))}
        </section>
      ))}
    </>
  );
}
