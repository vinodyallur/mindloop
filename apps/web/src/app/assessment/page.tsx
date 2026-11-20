"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/lib/games";
import RequireProfile from "@/components/RequireProfile";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-key-change-me";

// Guided baseline flow: 4 unique games with Next/Skip on every step.
const FLOW = [
  { key: "pvt", title: "Vigilance Tap", emoji: "⚡", href: "/games/pvt", blurb: "Pure attention span in 3 minutes" },
  { key: "shelf", title: "Remember the Shelf", emoji: "🛒", href: "/games/shelf", blurb: "See it 20s, tap what was there" },
  { key: "schulte", title: "Schulte 25", emoji: "🔢", href: "/games/schulte", blurb: "Tap 1→25 fast, STOP when done" },
  { key: "quiz", title: "Habits & Puzzles Quiz", emoji: "❓", href: "/assessment/quiz", blurb: "Self-reflection + brain teasers — not a diagnosis" },
];

export default function Assessment() {
  const [done, setDone] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  useEffect(() => {
    fetch(`${API}/api/v1/baseline/assessment-set`, { headers: { "x-api-key": KEY } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setDone(d.items.filter((t: any) => t.done).map((t: any) => t.task_key)))
      .catch(() => {});
  }, []);

  const current = FLOW[Math.min(step, FLOW.length - 1)];
  const finished = step >= FLOW.length;

  return (
    <RequireProfile>
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header className="rounded-[2rem] bg-[#26221c] p-8 text-white sm:p-10">
        <p className="chip bg-[#ffb020] text-[#26221c]">🧭 Guided baseline · {Math.min(step + 1, FLOW.length)}/{FLOW.length}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Your assessment journey</h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">
          Follow the steps in order — each game unlocks the next. In a hurry? <b>Skip</b> any step, or jump anywhere below.
          Every completed game feeds the same personal baseline.
        </p>
        <div className="mt-4 flex gap-1.5">
          {FLOW.map((f, i) => (
            <div key={f.key} className="h-2.5 flex-1 rounded-full" style={{ background: done.includes(f.key) ? "#22c55e" : i === step ? "#ffb020" : "rgba(255,255,255,0.2)" }} />
          ))}
        </div>
      </header>

      {!finished ? (
        <section className="card card-lift mx-auto max-w-2xl space-y-4 p-6 text-center sm:p-8" style={{ background: "#fff1d6", borderColor: "transparent" }}>
          <p className="text-6xl">{current.emoji}</p>
          <p className="text-xs font-black uppercase tracking-widest text-[#8a5a00]">Step {step + 1} of {FLOW.length}</p>
          <h2 className="text-3xl font-black text-[#8a5a00]">{current.title}</h2>
          <p className="text-sm font-medium text-[#8a5a00]">{current.blurb}</p>
          {done.includes(current.key) && <p className="chip mx-auto bg-[#d3f5df] text-[#14703a]">✓ Already done — replay to improve</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={current.href} className="btn-primary flex-1 text-lg">▶ Play now</Link>
            <button onClick={() => setStep(step + 1)} className="btn-ghost flex-1">Skip →</button>
          </div>
          <div className="flex justify-between pt-1">
            <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-sm font-bold text-[#8a5a00] underline underline-offset-4 disabled:opacity-30">← Back</button>
            <button onClick={() => setStep(step + 1)} className="text-sm font-bold text-[#8a5a00] underline underline-offset-4">Next →</button>
          </div>
        </section>
      ) : (
        <section className="card mx-auto max-w-2xl space-y-4 p-8 text-center" style={{ background: "#d3f5df", borderColor: "transparent" }}>
          <p className="text-6xl">🎉</p>
          <h2 className="text-3xl font-black text-[#14703a]">Baseline journey complete!</h2>
          <p className="text-sm font-medium text-[#14703a]">Your starting line is drawn. Now the buddy plan keeps it growing.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/report/story" className="btn-primary flex-1">📖 Generate my story report</Link>
            <Link href="/today" className="btn-teal flex-1">☀️ Today's tasks</Link>
          </div>
        </section>
      )}

      <div>
        <h2 className="mb-3 text-xl font-black tracking-tight">Or jump anywhere ({GAMES.length} tasks)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((g) => (
            <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#f1ecdd] px-2.5 py-1 text-[11px] font-medium text-[#5c564a]">{g.domain}</span>
                <span className="text-xs text-[#a39c8c]">{g.minutes} min {done.includes(g.key) ? "· ✓" : ""}</span>
              </div>
              <h2 className="mt-3 font-semibold tracking-tight">{g.title}</h2>
              <p className="mt-1 text-[13px] text-[#5c564a]">{g.mechanic}</p>
              <p className="mt-2 text-[11px] text-[#a39c8c]">{g.evidence}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
    </RequireProfile>
  );
}
