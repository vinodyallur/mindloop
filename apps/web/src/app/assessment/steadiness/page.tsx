"use client";
import { useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "@/components/TaskShell";
import type { Trial } from "@/lib/api";

const DURATION_S = 30;

export default function Steadiness() {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState(0);
  const [supported, setSupported] = useState(true);
  const samples = useRef<number[]>([]);
  const { saved, offline, save } = useSubmit("steadiness");

  useEffect(() => {
    if (phase !== "run") return;
    let orient = false;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null) return;
      orient = true;
      const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
      samples.current.push(mag);
      setLive(mag);
    };
    const needPerm = typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as any).requestPermission === "function";
    if (needPerm) {
      (DeviceMotionEvent as any).requestPermission().then((r: string) => {
        if (r === "granted") window.addEventListener("devicemotion", onMotion);
        else setSupported(false);
      }).catch(() => setSupported(false));
    } else if ("DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", onMotion);
    } else setSupported(false);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const s = (Date.now() - t0) / 1000;
      setElapsed(Math.min(s, DURATION_S));
      if (s >= DURATION_S) {
        clearInterval(tick);
        window.removeEventListener("devicemotion", onMotion);
        const arr = samples.current;
        const mean = arr.reduce((x, y) => x + y, 0) / Math.max(arr.length, 1);
        const trials: Trial[] = arr.filter((_, i) => i % 5 === 0).map((m, i) => ({
          trial_index: i, stimulus: "hold", expected_action: "withhold",
          actual_action: null, reaction_time_ms: null, correct: true, sway: Math.abs(m - mean),
        }));
        save(trials.length ? trials : [{ trial_index: 0, stimulus: "hold", expected_action: "withhold", actual_action: null, reaction_time_ms: null, correct: true, sway: 0 }]);
        setPhase("done");
      }
    }, 200);
    return () => { clearInterval(tick); window.removeEventListener("devicemotion", onMotion); };
  }, [phase, save]);

  if (phase === "intro") return (
    <Intro title="Hold Steady" cta="Begin 30-second hold"
      body="Hold your phone flat in one hand, arm resting, for 30 seconds. We measure tiny motion changes (steadiness variability) as a coordination signal. Same posture and device each time. Exploratory — not a medical tremor test."
      onStart={() => { samples.current = []; setElapsed(0); setPhase("run"); }} />
  );
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-5">
      <div className="relative h-40 w-40">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-neutral-200" />
          <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-emerald-500 transition-all" strokeDasharray={`${(elapsed / DURATION_S) * 276.5} 276.5`} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold tabular-nums">{Math.ceil(DURATION_S - elapsed)}s</span>
          <span className="text-xs text-neutral-400">hold still</span>
        </div>
      </div>
      {!supported && <p className="card p-3 text-xs text-amber-700">No motion sensor found — on desktop this records a flat baseline sample.</p>}
      <div className="flex h-16 w-full items-end justify-center gap-1">
        {samples.current.slice(-40).map((m, i) => (
          <div key={i} className="w-1.5 rounded-full bg-emerald-400" style={{ height: `${Math.min(100, Math.abs(m - 9.8) * 60 + 4)}%` }} />
        ))}
      </div>
      <p className="font-mono text-xs text-neutral-400">live {live.toFixed(2)} m/s²</p>
    </main>
  );
}
