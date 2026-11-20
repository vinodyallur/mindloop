"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getPlanToday, completePlanItem, getScreenTime, logScreenTime } from "@/lib/api";

const TONE_STYLE: Record<string, { bg: string; ink: string }> = {
  celebrate: { bg: "#d3f5df", ink: "#14703a" },
  encourage: { bg: "#d8e7ff", ink: "#1d4fc4" },
  kind: { bg: "#ffedb8", ink: "#8a5a00" },
  warm: { bg: "#e7f6c9", ink: "#4d7c0f" },
  welcome: { bg: "#eee9fb", ink: "#5b21b6" },
};

export default function Today() {
  const [plan, setPlan] = useState<any>(null);
  const [screen, setScreen] = useState<any[]>([]);
  const [sMin, setSMin] = useState("");
  const [dMin, setDMin] = useState("");
  const [msg, setMsg] = useState("");
  const [remind, setRemind] = useState<string | null>(null);

  const load = useCallback(() => {
    getPlanToday().then(setPlan);
    getScreenTime().then((s) => s && setScreen(s));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Gentle local reminder: if plan incomplete after 8pm, show buddy nudge
  useEffect(() => {
    if (!plan || plan.done >= plan.total) return;
    const h = new Date().getHours();
    if (h >= 20) setRemind("🌙 Evening buddy check: a quick 3-minute game before bed keeps your baseline warm. No pressure — tomorrow works too.");
    else if (h >= 12 && plan.done === 0) setRemind("☀️ Midday buddy wave: just one task today is a win. Pick the easiest one below.");
  }, [plan]);

  async function done(key: string) {
    await completePlanItem(key);
    load();
  }

  async function saveScreen() {
    setMsg("");
    const s = Number(sMin), d = Number(dMin);
    if (!(s >= 0) || !(d >= 0)) { setMsg("Minutes must be 0 or more."); return; }
    if (d > s) { setMsg("Doomscroll can't exceed total screen time."); return; }
    const r = await logScreenTime(s, d);
    if (!r) { setMsg("Backend offline."); return; }
    setSMin(""); setDMin(""); setMsg("Logged ✓ — this becomes context for your baseline.");
    load();
  }

  if (!plan) return <main className="px-5 py-10 text-sm font-semibold text-[#6b6257]">Loading today's plan…</main>;
  const tone = TONE_STYLE[plan.buddy?.tone] ?? TONE_STYLE.welcome;
  const pct = Math.round((plan.done / Math.max(plan.total, 1)) * 100);

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header className="rounded-[2rem] bg-[#26221c] p-8 text-white sm:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="chip bg-[#ffb020] text-[#26221c]">☀️ Today · {plan.day}</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Your buddy plan</h1>
            <p className="mt-1 text-sm font-medium text-white/70">{plan.done} of {plan.total} done · 🔥 {plan.streak}-day streak</p>
          </div>
          <div className="relative h-28 w-28">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" className="stroke-white/15" />
              <circle cx="50" cy="50" r="42" fill="none" strokeWidth="10" strokeLinecap="round" stroke="#ffb020" strokeDasharray={`${(pct / 100) * 263.9} 263.9`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-2xl font-black">{pct}%</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#ffb020] transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </header>

      <p className="rounded-2xl p-4 text-sm font-bold" style={{ background: tone.bg, color: tone.ink }}>
        🤗 Buddy: {plan.buddy?.text}
      </p>

      {remind && (
        <p className="card border-l-4 p-4 text-sm font-semibold text-[#6b6257]" style={{ borderLeftColor: "#c026d3" }}>{remind}</p>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plan.items.map((it: any) => (
          <div key={it.item_key} className="card card-lift p-5" style={it.done ? { background: "#d3f5df", borderColor: "transparent" } : undefined}>
            <div className="flex items-center justify-between">
              <span className="chip" style={it.kind === "habit" ? { background: "#f3e8c9", color: "#854d0e" } : { background: "#d8e7ff", color: "#1d4fc4" }}>
                {it.kind === "habit" ? "🌱 Habit" : "🎮 Game"}
              </span>
              {it.done && <span className="chip bg-white text-[#14703a]">✓ Done</span>}
            </div>
            <h2 className="mt-2 text-lg font-black">{it.title}</h2>
            {it.kind === "habit" && <p className="mt-1 text-[13px] font-medium text-[#6b6257]">{it.detail}</p>}
            <div className="mt-3">
              {it.done ? (
                <span className="text-sm font-black text-[#14703a]">Nice work! ✨</span>
              ) : it.kind === "game" ? (
                <Link href={it.detail || "/games"} className="btn-primary !py-2 text-sm">Play ▶</Link>
              ) : (
                <button onClick={() => done(it.item_key)} className="btn-teal !py-2 text-sm">Mark done ✓</button>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="card space-y-3 p-5 sm:p-6">
        <h2 className="text-lg font-black">📵 Log today's screen time</h2>
        <p className="text-[13px] font-medium text-[#6b6257]">Rough numbers are fine. Doomscroll minutes sit next to your focus scores as context — never a judgement.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-bold">Total screen (min)
            <input value={sMin} onChange={(e) => setSMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 240" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
          </label>
          <label className="block text-sm font-bold">Doomscroll (min)
            <input value={dMin} onChange={(e) => setDMin(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 60" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
          </label>
        </div>
        {msg && <p className="text-sm font-bold text-[#8a5a00]">{msg}</p>}
        <button onClick={saveScreen} className="btn-ghost">Save today's log</button>
        {screen.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {screen.slice(0, 7).map((s: any) => (
              <span key={s.day} className="chip bg-[#eee9fb] text-[#5b21b6]">{s.day.slice(5)} · 📱{Math.round(s.screen_minutes)}m · 🌀{Math.round(s.doomscroll_minutes)}m</span>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/baseline" className="btn-ghost">📈 How's my baseline?</Link>
        <Link href="/games" className="btn-ghost">🎮 Extra games</Link>
      </div>
    </main>
  );
}
