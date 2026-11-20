"use client";
import { useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "@/components/TaskShell";
import RequireProfile from "@/components/RequireProfile";
import type { Trial } from "@/lib/api";

const SHELF = ["🍎", "📚", "⚽", "🎧", "🌵", "☕", "🧸", "🔑", "🍌", "🎨", "📱", "🕰️"];
const MEMORIZE_S = 20;

function Inner() {
  const [phase, setPhase] = useState<"intro" | "memorize" | "recall" | "done">("intro");
  const [targets, setTargets] = useState<string[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [left, setLeft] = useState(MEMORIZE_S);
  const trials = useRef<Trial[]>([]);
  const { saved, offline, save } = useSubmit("shelf");

  useEffect(() => {
    if (phase !== "memorize") return;
    setLeft(MEMORIZE_S);
    const iv = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const t = setTimeout(() => { clearInterval(iv); setPhase("recall"); }, MEMORIZE_S * 1000);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [phase]);

  function begin() {
    const shuffled = [...SHELF].sort(() => Math.random() - 0.5);
    const t = shuffled.slice(0, 6);
    const distract = shuffled.slice(6, 10);
    setTargets(t);
    setOptions([...t, ...distract].sort(() => Math.random() - 0.5));
    setPicked([]);
    trials.current = [];
    setPhase("memorize");
  }

  function tap(o: string) {
    if (phase !== "recall" || picked.includes(o)) return;
    const ok = targets.includes(o);
    trials.current.push({
      trial_index: trials.current.length, stimulus: o,
      expected_action: "respond", actual_action: "respond",
      reaction_time_ms: null, correct: ok,
    });
    const p = [...picked, o];
    setPicked(p);
    if (p.length >= targets.length) {
      setPhase("done");
      save(trials.current);
    }
  }

  if (phase === "intro") return (
    <Intro title="Remember the Shelf" cta="Show me the shelf"
      body="Look at 6 objects for 20 seconds and remember them. Then tap ONLY the ones you saw — right taps turn green, wrong ones turn red."
      onStart={begin} />
  );
  if (phase === "done") return <Done saved={saved} offline={offline} />;

  if (phase === "memorize") {
    return (
      <main className="min-h-[70vh] bg-[#d8e7ff] transition-colors">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-5 px-5 py-8">
          <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2">
            <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
              <span>👀 Memorize!</span><span>{left}s left</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
              <div className="h-full rounded-full bg-[#3b82f6] transition-all" style={{ width: `${(left / MEMORIZE_S) * 100}%` }} />
            </div>
          </div>
          <div className="grid w-full max-w-lg grid-cols-3 gap-3 rounded-[2rem] border-4 border-[#8b5a2b] bg-[#c89b6a] p-5 shadow-xl">
            {targets.map((o, i) => (
              <div key={i} className="pop-in flex aspect-square items-center justify-center rounded-2xl bg-white text-5xl shadow" style={{ animationDelay: `${i * 0.08}s` }}>{o}</div>
            ))}
          </div>
          <p className="text-sm font-black text-[#1d4fc4]">Stare hard — {left} seconds…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[70vh] bg-[#e7f6c9] transition-colors">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-5 px-5 py-8">
        <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
            <span>🧠 Recall!</span><span>{picked.length}/{targets.length} tapped</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#84cc16] transition-all" style={{ width: `${(picked.length / targets.length) * 100}%` }} />
          </div>
        </div>
        <p className="text-lg font-black text-[#4d7c0f]">Tap ONLY what was on the shelf 👇</p>
        <div className="grid w-full max-w-lg grid-cols-3 gap-3 sm:grid-cols-5">
          {options.map((o) => {
            const wasPicked = picked.includes(o);
            const correct = wasPicked && targets.includes(o);
            const wrong = wasPicked && !targets.includes(o);
            return (
              <button key={o} onClick={() => tap(o)} disabled={wasPicked}
                className="flex aspect-square items-center justify-center rounded-2xl text-5xl shadow transition active:scale-90"
                style={{
                  background: correct ? "#22c55e" : wrong ? "#ef4444" : "#ffffff",
                  transform: wasPicked ? "scale(0.94)" : undefined,
                  opacity: wasPicked ? 0.95 : 1,
                }}>
                {o}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-bold text-[#4d7c0f]">🟩 green = you remembered! 🟥 red = sneaky intruder</p>
      </div>
    </main>
  );
}

export default function Page() {
  return <RequireProfile><Inner /></RequireProfile>;
}
