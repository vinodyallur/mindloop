"use client";
import { useEffect, useState } from "react";
import { getInstruments, submitSurvey, get30Day, getOutcomeHistory } from "@/lib/api";

// Q1/Q4: validated self-report instruments + 30-day evaluation set.
// BCT labels: self-monitoring (2.3), feedback on behaviour (2.2), goal review (1.5).
const BCT = "BCT 2.3 self-monitoring · 2.2 feedback · 1.5 goal review";
const NAMES: Record<string, string> = { who5: "WHO-5 Wellbeing", pss4: "Stress (PSS-4)", isi3: "Sleep (ISI-3)", phq2: "Mood (PHQ-2)", gad2: "Worry (GAD-2)", srbai: "Habit automaticity (SRBAI)" };

export default function Outcomes() {
  const [specs, setSpecs] = useState<any>(null);
  const [inst, setInst] = useState("who5");
  const [answers, setAnswers] = useState<number[]>([]);
  const [res, setRes] = useState<any>(null);
  const [d30, setD30] = useState<any>(null);
  const [hist, setHist] = useState<any[]>([]);
  useEffect(() => { getInstruments().then(setSpecs); get30Day().then(setD30); getOutcomeHistory("srbai").then((h) => h && setHist(h)); }, []);
  useEffect(() => { setAnswers(specs ? Array(specs[inst].questions.length).fill(Math.floor(specs[inst].scale.length / 2)) : []); setRes(null); }, [inst, specs]);
  if (!specs) return <main className="px-5 py-10 text-sm text-neutral-500">Loading…</main>;
  const spec = specs[inst];
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Q1 · Q4 — measurable outcomes</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Wellbeing check</h1>
        <p className="mt-1 text-sm text-neutral-500">Validated self-report scales. Context only — not a diagnosis. {BCT}.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {Object.keys(specs).map((k) => <button key={k} onClick={() => setInst(k)} className={`rounded-full px-4 py-1.5 text-sm transition ${inst === k ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"}`}>{NAMES[k]}</button>)}
      </div>
      <section className="card space-y-3 p-5">
        {spec.questions.map((q: string, i: number) => (
          <label key={q} className="block text-sm"><span className="font-medium capitalize">{q}</span>
            <input type="range" min={spec.scale[0]} max={spec.scale[spec.scale.length - 1]} value={answers[i] ?? 0} onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? Number(e.target.value) : v)))} className="mt-1 w-full" />
          </label>
        ))}
        <button className="btn-primary" onClick={async () => { const r = await submitSurvey(inst, answers); setRes(r); setD30(await get30Day()); }}>Save {NAMES[inst]}</button>
        {res && <p className="text-sm text-neutral-600">Score {res.score}/{res.max}. {res.flag ? res.flag.message : res.note}</p>}
      </section>
      {d30 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">30-day evaluation set</h2>
          {Object.entries(d30).filter(([k]) => !k.startsWith("_")).map(([k, v]: any) => (
            <p key={k} className="mt-1 text-[13px] text-neutral-500">{NAMES[k] ?? k}: {v.baseline} → {v.latest} (Δ {v.delta >= 0 ? "+" : ""}{v.delta}, n={v.n})</p>
          ))}
          <p className="mt-1 text-[13px] text-neutral-500">Behavior: {d30._behavior?.target_days_met}/{d30._behavior?.active_days} target days ({d30._behavior?.maintenance_pct}%)</p>
          <p className="mt-2 text-[11px] text-neutral-400">Thresholds: {Object.entries(d30._thresholds || {}).map(([k, v]) => `${k} ${v}`).join(" · ")}</p>
        </section>
      )}
      {hist.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Habit automaticity (SRBAI) <span className="font-normal text-neutral-400">0 → 30 → 90 days, Lally 2010</span></h2>
          <div className="mt-2 flex items-end gap-1.5">
            {hist.map((h: any, i: number) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-lg bg-neutral-900" style={{ height: `${Math.max(6, (h.score / h.max) * 120)}px` }} />
                <span className="text-[10px] text-neutral-400">{h.score}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
