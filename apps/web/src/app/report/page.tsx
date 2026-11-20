"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getReport } from "@/lib/api";

export default function Report() {
  const [r, setR] = useState<any>(null);
  useEffect(() => { getReport().then(setR); }, []);
  if (!r) return <main className="px-5 py-10 text-sm text-[#5c564a]">Loading…</main>;
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Plain-language summary</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your Report</h1>
        <Link href="/report/story" className="btn-primary mt-4">📖 Generate my story report — written for a 10-year-old</Link>
      </header>
      <p className="card p-4 text-[13px] text-[#5c564a]">{r.summary}</p>
      <section className="card p-5"><h2 className="text-sm font-semibold">Baseline</h2>
        {(r.baselines || []).map((b: any) => <p key={b.task_key + b.metric_key} className="mt-1 text-[13px] text-[#5c564a]">{b.task_key} · {b.metric_key}: {b.centre} ({b.valid_sessions} sessions, {b.confidence})</p>)}
        {!(r.baselines || []).length && <p className="text-sm text-[#a39c8c]">No baseline yet — complete 3–5 valid sessions.</p>}
        <Link href="/baseline" className="mt-2 inline-block text-xs underline underline-offset-4">Open baseline index →</Link>
      </section>
      <section className="card p-5"><h2 className="text-sm font-semibold">Possible changes</h2>
        {(r.change_events || []).map((c: any, i: number) => <p key={i} className="mt-1 text-[13px] text-[#5c564a]">• {c.message}</p>)}
        {!(r.change_events || []).length && <p className="text-sm text-[#a39c8c]">No repeated change from your usual pattern detected.</p>}</section>
      <section className="card p-5"><h2 className="text-sm font-semibold">Limitations</h2>
        {(r.limitations || []).map((l: string) => <p key={l} className="mt-1 text-[13px] text-[#5c564a]">• {l}</p>)}</section>
      <section className="card p-5"><h2 className="text-sm font-semibold">Suggested next steps</h2>
        {(r.next_steps || []).map((l: string) => <p key={l} className="mt-1 text-[13px] text-[#5c564a]">• {l}</p>)}</section>
      <button className="btn-primary no-print" onClick={() => window.print()}>Print / Save PDF</button>
    </main>
  );
}
