"use client";
import Link from "next/link";
import { useState } from "react";
import { submitSession, type Trial } from "@/lib/api";

export function useSubmit(taskKey: string) {
  const [saved, setSaved] = useState<any>(null);
  const [offline, setOffline] = useState(false);
  async function save(trials: Trial[]) {
    const r = await submitSession(taskKey, trials);
    if (r) setSaved(r); else setOffline(true);
  }
  return { saved, offline, save };
}

export function Intro({ title, body, onStart, cta = "Start" }: { title: string; body: string; onStart: () => void; cta?: string }) {
  return (
    <main className="mx-auto max-w-lg px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{body}</p>
      <p className="mt-2 text-xs text-neutral-400">Practice task — compared only with your own baseline. Not a diagnosis.</p>
      <button onClick={onStart} className="btn-primary mt-6">{cta}</button>
    </main>
  );
}

export function Done({ saved, offline }: { saved: any; offline: boolean }) {
  return (
    <main className="mx-auto max-w-lg space-y-4 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Results</h1>
      {saved ? (
        <pre className="card overflow-auto p-4 font-mono text-xs">{JSON.stringify(saved.metrics, null, 2)}</pre>
      ) : offline ? (
        <p className="card p-4 text-sm text-amber-700">Backend offline — start the API to save &amp; score this session.</p>
      ) : <p className="text-sm text-neutral-500">Saving…</p>}
      <p className="text-xs text-neutral-400">Metrics are compared only with your own baseline. No composite score, no diagnosis.</p>
      <div className="flex gap-3">
        <Link href="/baseline" className="btn-primary">View baseline</Link>
        <Link href="/games" className="btn-ghost">More games</Link>
      </div>
    </main>
  );
}
