"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { submitSession, type Trial } from "@/lib/api";

const TOTAL = 40, DUR = 1200;
export default function GoNoGo() {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [stim, setStim] = useState(""), [idx, setIdx] = useState(0), [saved, setSaved] = useState<any>(null);
  const trials = useRef<Trial[]>([]), start = useRef(0), responded = useRef(false), timer = useRef<any>(null);

  const finish = useCallback(async () => {
    setPhase("done");
    setSaved(await submitSession("gonogo", trials.current));
  }, []);

  const next = useCallback(() => {
    if (trials.current.length >= TOTAL) { finish(); return; }
    const s = Math.random() < 0.75 ? "GO" : "STOP";
    setStim(s); setIdx(trials.current.length);
    responded.current = false; start.current = performance.now();
    timer.current = setTimeout(() => {
      if (!responded.current) trials.current.push({ trial_index: trials.current.length, stimulus: s, expected_action: s === "GO" ? "respond" : "withhold", actual_action: null, reaction_time_ms: null, correct: s === "STOP" });
      next();
    }, DUR);
  }, [finish]);

  const respond = useCallback(() => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(timer.current);
    setStim((s) => {
      trials.current.push({ trial_index: trials.current.length, stimulus: s, expected_action: s === "GO" ? "respond" : "withhold", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: s === "GO" });
      return s;
    });
    setTimeout(next, 250);
  }, [phase, next]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); respond(); } };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [respond]);

  if (phase === "intro") return (
    <main className="mx-auto max-w-lg p-6 space-y-4">
      <h1 className="text-3xl font-bold">Go / No-Go</h1>
      <p>Press <b>Space / TAP</b> for <b className="text-green-500">GO</b>, withhold for <b className="text-red-500">STOP</b>. Practice task — not a diagnosis.</p>
      <button className="rounded-xl bg-blue-600 px-8 py-3 font-bold text-white" onClick={() => { trials.current = []; setPhase("run"); setTimeout(next, 400); }}>Start</button>
    </main>);
  if (phase === "done") return (
    <main className="mx-auto max-w-lg p-6 space-y-4">
      <h1 className="text-3xl font-bold">Results</h1>
      {saved ? <pre className="overflow-auto rounded-xl bg-gray-900 p-4 text-sm text-green-300">{JSON.stringify(saved.metrics, null, 2)}</pre>
        : <p className="text-amber-500">Backend offline — start the API to save &amp; score this session.</p>}
      <p className="text-sm opacity-70">Metrics are compared only with your own baseline. No composite score, no diagnosis.</p>
      <Link className="text-blue-500 underline" href="/dashboard">View dashboard →</Link>
    </main>);
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-8 p-6" onClick={respond}>
      <p className="text-sm opacity-60">{idx + 1} / {TOTAL}</p>
      <div className={`text-8xl font-black ${stim === "GO" ? "text-green-500" : "text-red-500"}`}>{stim}</div>
      <button className="h-32 w-32 rounded-full bg-blue-600 text-2xl font-black text-white">TAP</button>
    </main>);
}
