"use client";
import { useState } from "react";
import { setConsent } from "@/lib/api";

const CATS = [
  ["assessment", "Cognitive assessment tasks"],
  ["wearable", "Wearable health data (DEMO until Fire-Boltt verified)"],
  ["digital_use", "Digital-use summary (optional)"],
] as const;

// Q2 COM-B onboarding: capability / opportunity / motivation + if-then plan.
// Q3: autonomy-supportive, no shaming streaks; lapse recovery built in.
export default function Settings() {
  const [state, setState] = useState<Record<string, boolean>>({ assessment: true, wearable: false, digital_use: false });
  const [msg, setMsg] = useState("");
  const [plan, setPlan] = useState({ cue: "after morning coffee", action: "one 3-minute task", place: "at my desk" });
  async function toggle(cat: string, v: boolean) {
    setState((s) => ({ ...s, [cat]: v }));
    setMsg(await setConsent(cat, v) ? `Saved: ${cat} ${v ? "granted" : "revoked"}` : "Backend offline — not saved.");
  }
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-5 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings & Privacy</h1>
      <p className="text-sm text-neutral-500">Separate consent per data category. MindLoop is not a diagnostic device. Data is never sent to third-party AI APIs.</p>
      {CATS.map(([cat, label]) => (
        <label key={cat} className="card flex items-center justify-between p-4">
          <span className="text-sm font-medium">{label}</span>
          <input type="checkbox" checked={!!state[cat]} onChange={(e) => toggle(cat, e.target.checked)} className="h-5 w-5 accent-neutral-900" />
        </label>
      ))}
      {msg && <p className="text-sm text-neutral-600">{msg}</p>}
      <section className="card space-y-3 p-5">
        <h2 className="text-sm font-semibold">Your if-then plan <span className="font-normal text-neutral-400">(BCT 1.4 action planning)</span></h2>
        {[["cue", "If… (stable cue)", plan.cue], ["action", "Then I will…", plan.action], ["place", "Where", plan.place]].map(([k, label, v]) => (
          <label key={k} className="block text-sm"><span className="text-neutral-500">{label}</span>
            <input value={v as string} onChange={(e) => setPlan((p) => ({ ...p, [k]: e.target.value }))} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400" />
          </label>
        ))}
        <p className="rounded-xl bg-neutral-50 p-3 text-[13px] text-neutral-600">“If {plan.cue}, then I will do {plan.action} {plan.place}.” Missed a day? Never miss twice — just restart. No streaks reset to zero here.</p>
      </section>
      <section className="card space-y-2 p-5 text-sm">
        <h2 className="text-sm font-semibold">Your data</h2>
        <p className="text-[13px] text-neutral-500">Export: <code>POST /api/v1/me/export</code> · Delete: <code>DELETE /api/v1/me</code> (demo auth).</p>
        <p className="text-[13px] text-neutral-500">Wearable source: Fire-Boltt Ultimate 1.39 — <b>unverified</b>. Confirm companion app + phone OS before enabling real sync.</p>
      </section>
    </main>
  );
}
