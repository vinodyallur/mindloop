"use client";
import { useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "@/components/TaskShell";
import RequireProfile from "@/components/RequireProfile";
import type { Trial } from "@/lib/api";

const N = 9, LIMIT = 15;

function Inner() {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [balls, setBalls] = useState<{ x: number; y: number; dir: 1 | -1; odd: boolean }[]>([]);
  const [left, setLeft] = useState(LIMIT);
  const [over, setOver] = useState(false);
  const trials = useRef<Trial[]>([]);
  const start = useRef(0);
  const { saved, offline, save } = useSubmit("orbit");

  useEffect(() => {
    if (phase !== "run") return;
    const oddIdx = Math.floor(Math.random() * N);
    const cx = 50, cy = 42, rx = 34, ry = 24;
    setBalls(Array.from({ length: N }, (_, i) => ({
      x: cx + rx * Math.cos((2 * Math.PI * i) / N),
      y: cy + ry * Math.sin((2 * Math.PI * i) / N),
      dir: i === oddIdx ? -1 : 1,
      odd: i === oddIdx,
    })));
    trials.current = [];
    start.current = performance.now();
    setLeft(LIMIT); setOver(false);
    const tick = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(tick);
          finish(false);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // rotate positions
  useEffect(() => {
    if (phase !== "run") return;
    const iv = setInterval(() => {
      setBalls((bs) => {
        const step = 0.045;
        return bs.map((b) => {
          const cx = 50, cy = 42;
          const dx = b.x - cx, dy = b.y - cy;
          const ang = Math.atan2(dy, dx) + step * b.dir;
          const r = Math.hypot(dx, dy);
          return { ...b, x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
        });
      });
    }, 50);
    return () => clearInterval(iv);
  }, [phase]);

  function finish(found: boolean) {
    if (over) return;
    setOver(true);
    const secs = Math.min(LIMIT, Math.round((performance.now() - start.current) / 1000));
    const capped = Math.min(secs, LIMIT);
    const display = secs > LIMIT ? `${LIMIT}+` : `${capped}`;
    trials.current.push({
      trial_index: 0, stimulus: found ? `found@${display}s` : `timeout@${LIMIT}+s`,
      expected_action: "respond", actual_action: found ? "respond" : null,
      reaction_time_ms: capped * 1000, correct: found,
    });
    save(trials.current);
    setPhase("done");
  }

  if (phase === "intro") return (
    <Intro title="Orbit Odd-One-Out" cta="Start the orbits"
      body="9 balls orbit — 8 go one way, 1 sneaks the other way. Find the odd one in 15 seconds and tap it. Over time? Marked 15+."
      onStart={() => setPhase("run")} />
  );
  if (phase === "done") return <Done saved={saved} offline={offline} />;

  return (
    <main className="min-h-[70vh] bg-[#e9d5ff]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-4 px-5 py-8">
        <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
            <span>🪐 Find the rebel</span><span className={left <= 5 ? "text-[#c2274b]" : ""}>⏱ {left}s</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#c026d3] transition-all" style={{ width: `${(left / LIMIT) * 100}%` }} />
          </div>
        </div>
        <div className="relative h-80 w-full max-w-lg overflow-hidden rounded-[2rem] border-2 border-[#c026d3]/20 bg-white shadow-xl">
          {balls.map((b, i) => (
            <button key={i} onClick={() => (b.odd ? finish(true) : finish(false))}
              aria-label={`ball ${i + 1}`}
              className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-lg transition-transform active:scale-90"
              style={{ left: `${b.x}%`, top: `${b.y}%`, background: b.odd ? "#c026d3" : "#3b82f6" }} />
          ))}
          <p className="absolute bottom-2 w-full text-center text-[11px] font-bold text-[#b3a893]">tap the one going the wrong way</p>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return <RequireProfile><Inner /></RequireProfile>;
}
