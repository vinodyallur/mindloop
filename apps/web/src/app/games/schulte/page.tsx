"use client";
import { useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "@/components/TaskShell";
import RequireProfile from "@/components/RequireProfile";
import type { Trial } from "@/lib/api";

const TOTAL = 25, LIMIT = 25;

function Inner() {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [grid, setGrid] = useState<number[]>([]);
  const [next, setNext] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [over, setOver] = useState(false);
  const trials = useRef<Trial[]>([]);
  const start = useRef(0);
  const { saved, offline, save } = useSubmit("schulte");

  useEffect(() => {
    if (phase !== "run") return;
    setGrid(Array.from({ length: TOTAL }, (_, i) => i + 1).sort(() => Math.random() - 0.5));
    setNext(1); setElapsed(0); setOver(false);
    trials.current = [];
    start.current = performance.now();
    const iv = setInterval(() => {
      const s = Math.floor((performance.now() - start.current) / 1000);
      setElapsed(s);
      if (s >= LIMIT) {
        clearInterval(iv);
        finish(true);
      }
    }, 250);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function finish(timedOut: boolean) {
    if (over) return;
    setOver(true);
    const secs = Math.min(LIMIT, Math.floor((performance.now() - start.current) / 1000));
    const capped = Math.min(secs, LIMIT);
    const display = (timedOut || secs >= LIMIT) ? `${LIMIT}+` : `${capped}`;
    trials.current.push({
      trial_index: 0, stimulus: timedOut ? `timeout@${LIMIT}+s` : `done@${display}s`,
      expected_action: "respond", actual_action: timedOut ? null : "respond",
      reaction_time_ms: capped * 1000, correct: !timedOut,
    });
    save(trials.current);
    setPhase("done");
  }

  function tap(n: number) {
    if (phase !== "run" || over) return;
    if (n === next) {
      trials.current.push({
        trial_index: trials.current.length, stimulus: String(n),
        expected_action: "respond", actual_action: "respond",
        reaction_time_ms: null, correct: true,
      });
      if (next === TOTAL) finish(false);
      else setNext(next + 1);
    } else {
      trials.current.push({
        trial_index: trials.current.length, stimulus: String(n),
        expected_action: "respond", actual_action: "respond",
        reaction_time_ms: null, correct: false,
      });
    }
  }

  if (phase === "intro") return (
    <Intro title="Schulte 25" cta="Start the grid"
      body="Tap 1 → 25 in order, as fast as you can. Hit STOP when you finish — the clock stops. Over 25 seconds? Marked 25+. Trains visual scanning and peripheral attention."
      onStart={() => setPhase("run")} />
  );
  if (phase === "done") return <Done saved={saved} offline={offline} />;

  return (
    <main className="min-h-[70vh] bg-[#d8e7ff]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-4 px-5 py-8">
        <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
            <span>🔢 Next: {next}/25</span><span className={elapsed >= 20 ? "text-[#c2274b]" : ""}>⏱ {elapsed}s / {LIMIT}s</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#3b82f6] transition-all" style={{ width: `${Math.min(100, (elapsed / LIMIT) * 100)}%` }} />
          </div>
        </div>
        <div className="grid w-full max-w-md grid-cols-5 gap-2">
          {grid.map((n) => (
            <button key={n} onClick={() => tap(n)}
              className={`flex aspect-square items-center justify-center rounded-2xl text-xl font-black shadow transition active:scale-90 ${n < next ? "bg-[#22c55e] text-white" : "bg-white text-[#1d4fc4] hover:bg-[#eef4ff]"}`}>
              {n}
            </button>
          ))}
        </div>
        <button onClick={() => finish(false)} className="btn-primary !py-3 text-base">⏹ STOP — I'm done</button>
        <p className="text-[11px] font-bold text-[#6b6257]">tap 1→25 in order · wrong taps count as errors</p>
      </div>
    </main>
  );
}

export default function Page() {
  return <RequireProfile><Inner /></RequireProfile>;
}
