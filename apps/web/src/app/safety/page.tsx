"use client";
import { useEffect, useState } from "react";
import { getFlags, getReferrals, getOverdue, nudgeReferral, createReferral, transitionReferral, getModelCard } from "@/lib/api";

// Q7 referral loop + Q8 decision-support boundaries + Q10 model card.
const STATES = ["referred", "accepted", "booked", "attended", "outcome", "closed", "did_not_attend", "uncontactable", "escalated"];
const CHANNELS = ["app", "sms", "whatsapp", "call", "kin", "visit"];

export default function Safety() {
  const [flags, setFlags] = useState<any[]>([]);
  const [refs, setRefs] = useState<any[]>([]);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [reason, setReason] = useState("");
  const [card, setCard] = useState<any>(null);
  const load = () => { getFlags().then((f) => f && setFlags(f)); getReferrals().then((r) => r && setRefs(r)); getOverdue().then((o) => o && setOverdue(o)); };
  useEffect(() => { load(); getModelCard().then(setCard); }, []);
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Q7 · Q8 · Q10 — safety & transparency</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Care & transparency</h1>
        <p className="mt-1 text-sm text-[#5c564a]">Decision support only — final decisions stay with qualified professionals. Every referral is tracked until formally closed.</p>
      </header>
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Safety flags</h2>
        {flags.length ? flags.map((f) => <p key={f.id} className="mt-1 text-[13px] text-[#5c564a]">[{f.tier}] {f.detail} <span className="text-[#a39c8c]">· {f.status}</span></p>) : <p className="text-sm text-[#a39c8c]">No flags. If you ever feel unsafe, contact your local emergency number or helpline immediately.</p>}
      </section>
      <section className="card space-y-2 p-5">
        <h2 className="text-sm font-semibold">Referrals — closed loop</h2>
        <div className="flex gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. low mood review" className="flex-1 rounded-xl border border-[#e5ddcc] px-3 py-2 text-sm outline-none focus:border-neutral-400" />
          <button className="btn-primary" onClick={async () => { if (reason.trim()) { await createReferral(reason.trim()); setReason(""); load(); } }}>Refer</button>
        </div>
        {refs.map((r) => (
          <div key={r.id} className="rounded-xl bg-[#faf6ec] p-3 text-[13px]">
            <p className="font-medium">{r.reason} · <span className="text-[#5c564a]">{r.state}</span> · owner {r.owner}</p>
            <div className="mt-1 flex flex-wrap gap-1">{STATES.filter((s) => s !== r.state).map((s) => <button key={s} onClick={async () => { await transitionReferral(r.id, s); load(); }} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#5c564a] ring-1 ring-neutral-200 hover:bg-[#f1ecdd]">{s}</button>)}</div>
            <div className="mt-1 flex flex-wrap items-center gap-1"><span className="text-[11px] text-[#a39c8c]">Nudge:</span>{CHANNELS.map((ch) => <button key={ch} onClick={async () => { await nudgeReferral(r.id, ch); load(); }} className="rounded-full bg-white px-2 py-0.5 text-[11px] text-[#5c564a] ring-1 ring-neutral-200 hover:bg-[#f1ecdd]">{ch}</button>)}</div>
          </div>
        ))}
        {!refs.length && <p className="text-sm text-[#a39c8c]">No referrals yet.</p>}
      </section>
      {overdue.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Overdue — needs attention first</h2>
          {overdue.map((o: any) => <p key={o.id} className="mt-1 text-[13px] text-[#5c564a]">{o.needs_attention ? "🔴" : "🟡"} {o.reason} · {o.state} · {o.attempts} attempts · owner {o.owner}</p>)}
        </section>
      )}
      {card && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Model card — {card.model}</h2>
          <p className="mt-1 text-[13px] text-[#5c564a]"><b>Use:</b> {card.intended_use}</p>
          <p className="mt-1 text-[13px] text-[#5c564a]"><b>Inputs:</b> {card.inputs}</p>
          <p className="mt-1 text-[13px] text-[#5c564a]"><b>Limits:</b></p>
          <ul className="text-[13px] text-[#5c564a]">{card.limits.map((l: string) => <li key={l}>• {l}</li>)}</ul>
          <p className="mt-1 text-[13px] text-[#5c564a]"><b>Challenge:</b> {card.challenge}</p>
        </section>
      )}
    </main>
  );
}
