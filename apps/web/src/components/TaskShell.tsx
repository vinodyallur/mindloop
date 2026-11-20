"use client";
import Link from "next/link";
import { useState } from "react";
import { submitSession, type Trial } from "@/lib/api";
import { useLang } from "@/lib/i18n";

export function useSubmit(taskKey: string) {
  const [saved, setSaved] = useState<any>(null);
  const [offline, setOffline] = useState(false);
  async function save(trials: Trial[]) {
    const r = await submitSession(taskKey, trials);
    if (r) {
      setSaved(r);
      // Mark today's plan item done when the game belongs to the plan
      try {
        const { completePlanItem } = await import("@/lib/api");
        await completePlanItem(taskKey);
      } catch { /* plan optional — game score still saved */ }
    } else setOffline(true);
  }
  return { saved, offline, save };
}

export function Intro({ title, body, onStart, cta }: { title: string; body: string; onStart: () => void; cta?: string }) {
  const { t } = useLang();
  return (
    <main className="mx-auto w-full max-w-[1400px] px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5c564a]">{body}</p>
      <p className="mt-2 text-xs text-[#a39c8c]">{t("practiceNote")}</p>
      <button onClick={onStart} className="btn-primary mt-6">{cta ?? t("start")}</button>
    </main>
  );
}

export function Done({ saved, offline }: { saved: any; offline: boolean }) {
  const { t } = useLang();
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-5 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("results")}</h1>
      {saved ? (
        <pre className="card overflow-auto p-4 font-mono text-xs">{JSON.stringify(saved.metrics, null, 2)}</pre>
      ) : offline ? (
        <p className="card p-4 text-sm text-amber-700">Backend offline — start the API to save &amp; score this session.</p>
      ) : <p className="text-sm text-[#5c564a]">Saving…</p>}
      <p className="text-xs text-[#a39c8c]">Metrics are compared only with your own baseline. No composite score, no diagnosis.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/today" className="btn-primary">☀️ Back to today's tasks</Link>
        <Link href="/baseline" className="btn-ghost">View baseline</Link>
        <Link href="/games" className="btn-ghost">More games</Link>
      </div>
    </main>
  );
}
