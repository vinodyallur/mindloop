"use client";
import { useEffect, useState } from "react";
import { getFlags, getOverdue, get30Day, getBehavior } from "@/lib/api";

// Q8 clinician review queue: named role, response times, accept/modify/reject.
// Read-only demo of the queue; actions happen on the Care page / EHR.
export default function Clinician() {
  const [flags, setFlags] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [d30, setD30] = useState<any>(null);
  const [beh, setBeh] = useState<any>(null);
  useEffect(() => {
    getFlags().then((f) => f && setFlags(f));
    getOverdue().then((o) => o && setOverdue(o));
    get30Day().then(setD30);
    getBehavior().then(setBeh);
  }, []);
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Q8 — clinician review</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Review queue</h1>
        <p className="mt-1 text-sm text-[#5c564a]">Decision support only. You own the clinical decision; the vendor owns software performance. Response: crisis same-day · moderate within days · routine via reminders.</p>
      </header>
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Flags awaiting review ({flags.length})</h2>
        {flags.map((f: any) => <p key={f.id} className="mt-1 text-[13px] text-[#5c564a]">[{f.tier}] {f.detail} <span className="text-[#a39c8c]">· {f.status} · {f.at}</span></p>)}
        {!flags.length && <p className="text-sm text-[#a39c8c]">Queue clear.</p>}
      </section>
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Overdue referrals ({overdue.length})</h2>
        {overdue.map((o: any) => <p key={o.id} className="mt-1 text-[13px] text-[#5c564a]">{o.needs_attention ? "🔴" : "🟡"} {o.reason} · {o.state} · {o.attempts} attempts · owner {o.owner}</p>)}
        {!overdue.length && <p className="text-sm text-[#a39c8c]">No stalled referrals.</p>}
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        <div className="card p-5"><h2 className="text-sm font-semibold">30-day outcomes</h2>
          {d30 ? Object.entries(d30).filter(([k]) => !k.startsWith("_")).map(([k, v]: any) => <p key={k} className="mt-1 text-[13px] text-[#5c564a]">{k}: {v.baseline} → {v.latest} (Δ{v.delta})</p>) : <p className="text-sm text-[#a39c8c]">No data yet.</p>}</div>
        <div className="card p-5"><h2 className="text-sm font-semibold">Behavior (Q1)</h2>
          {beh ? <><p className="mt-1 text-[13px] text-[#5c564a]">Fruit/veg {beh.fruit_veg_servings}/day · active {beh.active_minutes} min · sleep {beh.sleep_hours_self}h</p><p className="mt-1 text-[13px] text-[#5c564a]">Steps 7d: {(beh.steps_7d || []).join(", ") || "—"}</p></> : <p className="text-sm text-[#a39c8c]">No check-ins yet.</p>}</div>
      </section>
    </main>
  );
}
