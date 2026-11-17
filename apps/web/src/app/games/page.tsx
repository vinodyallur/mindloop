"use client";
import Link from "next/link";
import { useState } from "react";
import { GAMES } from "@/lib/games";

const DOMAINS = ["All", ...Array.from(new Set(GAMES.map((g) => g.domain)))];

export default function Games() {
  const [domain, setDomain] = useState("All");
  const [q, setQ] = useState("");
  const list = GAMES.filter((g) => (domain === "All" || g.domain === domain) && g.title.toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Train &amp; Measure</h1>
        <p className="mt-1 text-sm text-neutral-500">{GAMES.length} short tasks · each session feeds your personal baseline · practice shows near-transfer only, not IQ gains.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button key={d} onClick={() => setDomain(d)} className={`rounded-full px-4 py-1.5 text-sm transition ${domain === d ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}>{d}</button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">{g.domain}</span>
              <span className="text-xs text-neutral-400">{g.minutes} min</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">{g.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{g.mechanic}</p>
            <p className="mt-2 text-[11px] text-neutral-400">Evidence: {g.evidence}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
