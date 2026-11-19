"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "./TaskShell";
import type { Trial } from "@/lib/api";

interface Stim { label: string; go: boolean }

export default function GenericTask({ taskKey, title, intro, total = 30, dur = 1200, goLabel = "GO", stopLabel = "STOP", goProb = 0.7 }: {
  taskKey: string; title: string; intro: string; total?: number; dur?: number;
  goLabel?: string; stopLabel?: string; goProb?: number;
}) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [stim, setStim] = useState<Stim>({ label: "", go: true });
  const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]);
  const start = useRef(0); const responded = useRef(false); const timer = useRef<any>(null);
  const { saved, offline, save } = useSubmit(taskKey);

  const finish = useCallback(() => { setPhase("done"); save(trials.current); }, [save]);

  const next = useCallback(() => {
    if (trials.current.length >= total) { finish(); return; }
    const go = Math.random() < goProb;
    const label = go ? goLabel : stopLabel;
    setStim({ label, go }); setIdx(trials.current.length);
    responded.current = false; start.current = performance.now();
    timer.current = setTimeout(() => {
      if (!responded.current) trials.current.push({ trial_index: trials.current.length, stimulus: label, expected_action: go ? "respond" : "withhold", actual_action: null, reaction_time_ms: null, correct: !go });
      next();
    }, dur);
  }, [total, dur, goLabel, stopLabel, goProb, finish]);

  const respond = useCallback(() => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(timer.current);
    const rt = Math.round(performance.now() - start.current);
    trials.current.push({ trial_index: trials.current.length, stimulus: stim.label, expected_action: stim.go ? "respond" : "withhold", actual_action: "respond", reaction_time_ms: rt, correct: stim.go });
    setTimeout(next, 250);
  }, [phase, stim, next]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); respond(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [respond]);

  if (phase === "intro") return <Intro title={title} body={intro} onStart={() => { trials.current = []; setPhase("run"); setTimeout(next, 400); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-8 px-5" onClick={respond}>
      <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[#e5ddcc]"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(idx / total) * 100}%` }} /></div>
      <div className={`text-7xl font-bold tracking-tight ${stim.go ? "text-emerald-600" : "text-rose-500"}`}>{stim.label}</div>
      <button className="tap-btn">TAP</button>
      <p className="text-xs text-[#a39c8c]">{idx + 1} / {total} · Space or tap</p>
    </main>
  );
}
