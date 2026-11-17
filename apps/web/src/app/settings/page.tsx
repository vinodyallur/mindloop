"use client";
import { useState } from "react";
import { setConsent } from "@/lib/api";

const CATS = [
  ["assessment", "Cognitive assessment tasks"],
  ["wearable", "Wearable health data (DEMO until Fire-Boltt verified)"],
  ["digital_use", "Digital-use summary (optional)"],
] as const;

export default function Settings() {
  const [state, setState] = useState<Record<string, boolean>>({ assessment: true, wearable: false, digital_use: false });
  const [msg, setMsg] = useState("");
  async function toggle(cat: string, v: boolean) {
    setState((s) => ({ ...s, [cat]: v }));
    setMsg(await setConsent(cat, v) ? `Saved: ${cat} ${v ? "granted" : "revoked"}` : "Backend offline — not saved.");
  }
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-3xl font-bold">Settings & Privacy</h1>
      <p className="text-sm opacity-70">Separate consent per data category. MindLoop is not a diagnostic device. Data is never sent to third-party AI APIs.</p>
      {CATS.map(([cat, label]) => (
        <label key={cat} className="flex items-center justify-between rounded-2xl border p-4">
          <span className="text-sm font-medium">{label}</span>
          <input type="checkbox" checked={!!state[cat]} onChange={(e) => toggle(cat, e.target.checked)} className="h-5 w-5" />
        </label>
      ))}
      {msg && <p className="text-sm text-blue-600">{msg}</p>}
      <section className="rounded-2xl border p-4 text-sm space-y-2">
        <h2 className="font-bold">Your data</h2>
        <p>Export: <code>POST /api/v1/me/export</code> · Delete: <code>DELETE /api/v1/me</code> (API, demo auth).</p>
        <p>Wearable source: Fire-Boltt Ultimate 1.39 — <b>unverified</b>. Confirm companion app + phone OS before enabling real sync.</p>
      </section>
    </main>
  );
}
