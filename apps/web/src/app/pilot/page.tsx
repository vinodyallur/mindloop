"use client";
import { useEffect, useState } from "react";
import { getWindows, assignArm } from "@/lib/api";

// Q9 transferability: staged local evaluation checklist + live arm assignment.
const STAGES = [
  ["Feasibility pilot (4–12 wks)", "Uptake, retention, safety, workflow fit. Back-translated HI/KN scales, cognitive interviews, extremes test (older, low literacy)."],
  ["Bridging study", "Compare local results with published norms. Recalibrate forecaster; treat retrained model as new version (re-validate)."],
  ["Effectiveness", "Waitlist RCT or stepped-wedge. ITT analysis incl. dropouts. Pre-registered primary: WHO-5 change vs generic control."],
  ["Silent mode", "Run algorithm silently before live alerts. Monitor drift + equity by language/age subgroup."],
];
const POPS = ["Adults 18–25 (current pilot)", "Teens: needs age-validated measures + parental consent (not started)", "Older adults: needs larger touch targets + caregiver mode (not started)"];

export default function Pilot() {
  const [wins, setWins] = useState<any>(null);
  const [arm, setArm] = useState("");
  useEffect(() => { getWindows().then(setWins); }, []);
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Q9 — local validation</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pilot plan</h1>
        <p className="mt-1 text-sm text-[#5c564a]">Approval elsewhere does not transfer. Current arm: <b>{wins?._design?.arm ?? "…"}</b></p>
      </header>
      <div className="flex gap-2">
        {(["intervention", "waitlist"] as const).map((a) => (
          <button key={a} onClick={async () => { await assignArm(a); setArm(a); setWins(await getWindows()); }} className={`rounded-full px-4 py-1.5 text-sm ${((arm || wins?._design?.arm) === a) ? "bg-[#b3541e] text-white" : "bg-[#f1ecdd] text-[#5c564a]"}`}>{a}</button>
        ))}
      </div>
      {STAGES.map(([t, d], i) => (
        <section key={t} className="card p-5"><h2 className="text-sm font-semibold">Stage {i + 1}: {t}</h2><p className="mt-1 text-[13px] text-[#5c564a]">{d}</p></section>
      ))}
      <section className="card p-5"><h2 className="text-sm font-semibold">Populations</h2>
        {POPS.map((p) => <p key={p} className="mt-1 text-[13px] text-[#5c564a]">• {p}</p>)}
        <p className="mt-2 text-[11px] text-[#a39c8c]">Back-translation: HI/KN strings drafted, independent back-translation + cognitive interviews required before claiming validation. Audio-first + WhatsApp channel planned for low-resource users.</p>
      </section>
    </main>
  );
}
