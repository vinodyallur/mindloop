"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-key-change-me";
const req = (p: string) => fetch(`${API}${p}`, { headers: { "x-api-key": KEY } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);

function band(v: number) {
  if (v >= 70) return { label: "Above your usual", cls: "text-emerald-700" };
  if (v >= 40) return { label: "Around your usual", cls: "text-[#5c564a]" };
  return { label: "Below your usual", cls: "text-amber-700" };
}

export default function Baseline() {
  const [data, setData] = useState<any>(null);
  const [task, setTask] = useState("");
  const [metric, setMetric] = useState("");
  const [aset, setAset] = useState<any>(null);
  const [screen, setScreen] = useState<any[]>([]);
  useEffect(() => {
    const q = `?task_key=${task}&metric_key=${metric}&window=30`;
    req(`/api/v1/baseline/index${q}`).then(setData);
    req("/api/v1/baseline/forecast").then((f) => f && setData((d: any) => (d ? { ...d, forecast: f } : d)));
    req("/api/v1/baseline/assessment-set").then(setAset);
    req("/api/v1/screentime/latest").then((s) => s && setScreen(s));
  }, [task, metric]);
  const series = useMemo(() => (data?.series || []).map((s: any, i: number) => ({ i: i + 1, index: s.index, task: s.task_key })), [data]);
  const tasks = useMemo(() => Array.from(new Set((data?.series || []).map((s: any) => s.task_key as string))), [data]);
  const idx = data?.index;
  const b = idx != null ? band(idx) : null;
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Personal baseline</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your Index</h1>
        <p className="mt-1 max-w-xl text-sm text-[#5c564a]">0 = far below your usual pattern · 50 = at your baseline median · 100 = far above. Descriptive only — never a diagnosis.</p>
      </header>

      {aset && !aset.baseline_ready && (
        <section className="card border-l-4 p-5" style={{ borderLeftColor: "#ff4d6d" }}>
          <h2 className="text-sm font-black">🎮 Finish your 4 baseline games ({aset.completed}/{aset.total})</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {aset.items.map((g: any) => (
              <Link key={g.task_key} href={g.href} className="chip" style={g.done ? { background: "#d3f5df", color: "#14703a" } : { background: "#ffedb8", color: "#8a5a00" }}>
                {g.done ? "✓" : g.emoji} {g.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {screen.length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">📵 Screen-time context <span className="font-normal text-[#a39c8c]">(shapes baseline story)</span></h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {screen.slice(0, 7).map((s: any) => (
              <span key={s.day} className="chip bg-[#eee9fb] text-[#5b21b6]">{s.day.slice(5)} · 📱{Math.round(s.screen_minutes)}m · 🌀{Math.round(s.doomscroll_minutes)}m</span>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <select value={task} onChange={(e) => setTask(e.target.value)} className="rounded-full border border-[#e5ddcc] bg-white px-4 py-2 text-sm">
          <option value="">All tasks</option>
          {tasks.map((t) => <option key={String(t)} value={String(t)}>{String(t)}</option>)}
        </select>
        <select value={metric} onChange={(e) => setMetric(e.target.value)} className="rounded-full border border-[#e5ddcc] bg-white px-4 py-2 text-sm">
          <option value="">All metrics</option>
          {["accuracy", "median_rt_ms", "rt_variability_ms", "omissions", "commissions", "hit_rate", "steadiness_score", "sway_variability"].map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <section className="card flex flex-col items-center gap-2 p-8">
        {idx != null ? (
          <>
            <div className="relative h-44 w-44">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" className="stroke-neutral-200" />
                <circle cx="50" cy="50" r="42" fill="none" strokeWidth="9" strokeLinecap="round" className="stroke-neutral-900 transition-all duration-700" strokeDasharray={`${(idx / 100) * 263.9} 263.9`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-semibold tabular-nums tracking-tight">{Math.round(idx)}</span>
                <span className="text-xs text-[#a39c8c]">/ 100</span>
              </div>
            </div>
            <p className={`text-sm font-medium ${b!.cls}`}>{b!.label}</p>
            {data?.trend_delta != null && <p className="text-xs text-[#a39c8c]">Trend {data.trend_delta >= 0 ? "+" : ""}{data.trend_delta} vs earlier half · {data.sessions} sessions · {data.confidence}</p>}
          </>
        ) : <p className="py-8 text-sm text-[#5c564a]">Complete a few tasks to build your baseline — 3–5 valid sessions across days.</p>}
      </section>

      {series.length > 1 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Index over sessions</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series} margin={{ top: 12, right: 12, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="i" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceArea y1={40} y2={70} fill="#f5f5f4" />
              <Line type="monotone" dataKey="index" stroke="#1a1a1a" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {(data?.baselines || []).length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Metric baselines</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.baselines.map((x: any) => (
              <div key={x.task_key + x.metric_key} className="rounded-xl bg-[#faf6ec] px-4 py-3 text-[13px]">
                <span className="font-medium">{x.task_key} · {x.metric_key}</span>
                <span className="text-[#5c564a]"> — median {x.centre}, MAD {x.variability_mad}, {x.valid_sessions} sessions ({x.confidence})</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {data?.forecast && Object.keys(data.forecast.models || {}).length > 0 && (
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Core ML forecast <span className="font-normal text-[#a39c8c]">(trained on your history)</span></h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {Object.entries(data.forecast.models).slice(0, 6).map(([k, m]: any) => (
              <div key={k} className="rounded-xl bg-[#faf6ec] px-4 py-3 text-[13px]">
                <span className="font-medium">{k}</span>
                <span className="text-[#5c564a]"> — next ≈ {m.forecast} (range {m.band?.[0]}–{m.band?.[1]}), n={m.n}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#a39c8c]">{data.forecast.note}</p>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/today" className="btn-primary">☀️ Today's tasks</Link>
        <Link href="/games" className="btn-ghost">Practice to grow your baseline</Link>
      </div>
    </main>
  );
}
