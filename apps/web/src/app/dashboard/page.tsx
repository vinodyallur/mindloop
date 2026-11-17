"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getDashboard, syncDemoWearables } from "@/lib/api";

export default function Dashboard() {
  const [d, setD] = useState<any>(null);
  useEffect(() => { syncDemoWearables().then(() => getDashboard()).then(setD); }, []);
  if (!d) return <main className="px-5 py-10 text-sm text-neutral-500">Loading… (start API: <code>uvicorn app.main:app --port 8000</code>)</main>;
  const rt = (d.history || []).filter((h: any) => h.metrics?.median_rt_ms).map((h: any, i: number) => ({ i: i + 1, rt: h.metrics.median_rt_ms })).reverse();
  const w = d.wearables_latest || {};
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Overview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Dashboard</h1>
      </header>
      <p className="card border-l-2 p-4 text-[13px] text-neutral-500">{d.wearable_source}. Metrics compare only with your own baseline.</p>
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[["Heart rate", w.heart_rate], ["Steps", w.steps], ["Sleep", w.sleep], ["SpO₂", w.spo2]].map(([label, v]: any) => (
          <div key={label as string} className="card p-4">
            <div className="text-xs text-neutral-400">{label} · DEMO</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{v ? `${v.value} ${v.unit}` : "—"}</div>
            <div className="text-[11px] text-neutral-400">{v?.at ? new Date(v.at).toLocaleString() : "no sync yet"}</div>
          </div>
        ))}
      </section>
      <section className="card p-5">
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">Reaction time trend</h2>
          <Link href="/baseline" className="text-xs text-neutral-400 underline underline-offset-4">Full baseline →</Link>
        </div>
        {rt.length ? <ResponsiveContainer width="100%" height={220}><LineChart data={rt} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#eee" /><XAxis dataKey="i" tick={{ fontSize: 11 }} /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="rt" stroke="#1a1a1a" strokeWidth={2.5} dot={{ r: 3 }} /></LineChart></ResponsiveContainer> : <p className="text-sm text-neutral-400">Complete a task to see your trend.</p>}
      </section>
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Recent sessions</h2>
        {(d.history || []).length ? <ul className="mt-2 space-y-1.5 text-[13px] text-neutral-500">{d.history.slice(0, 6).map((h: any) => <li key={h.session_id}>{h.task_key} · {h.validity_status} · {Object.entries(h.metrics || {}).slice(0, 3).map(([k, v]) => `${k} ${v}`).join(" · ")}</li>)}</ul> : <p className="text-sm text-neutral-400">No sessions yet.</p>}
      </section>
      {(d.change_events || []).map((c: any, i: number) => <p key={i} className="card p-4 text-[13px] text-neutral-600">{c.message}</p>)}
      <section className="card p-5">
        <h2 className="text-sm font-semibold">Today&apos;s programme</h2>
        <ul className="mt-2 space-y-1.5 text-[13px]">{(d.program || []).map((a: any) => <li key={a.activity_key}>{a.href ? <Link className="underline underline-offset-4" href={a.href}>{a.title}</Link> : a.title} <span className="text-neutral-400">· {Math.round(a.duration_seconds / 60)} min</span></li>)}</ul>
      </section>
    </main>
  );
}
