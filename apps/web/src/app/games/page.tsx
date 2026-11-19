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
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Train &amp; Measure</h1>
        <p className="mt-1 text-sm text-[#5c564a]">{GAMES.length} short tasks · each session feeds your personal baseline · practice shows near-transfer only, not IQ gains.</p>
      </header>
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => (
          <button key={d} onClick={() => setDomain(d)} className={`rounded-full px-4 py-1.5 text-sm transition ${domain === d ? "bg-[#b3541e] text-white" : "bg-[#f1ecdd] text-[#5c564a] hover:bg-[#e5ddcc]"}`}>{d}</button>
        ))}
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks…" className="w-full rounded-xl border border-[#e5ddcc] bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-400" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((g) => (
          <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#f1ecdd] px-2.5 py-1 text-[11px] font-medium text-[#5c564a]">{g.domain}</span>
              <span className="text-xs text-[#a39c8c]">{g.minutes} min</span>
            </div>
            <h2 className="mt-3 text-lg font-semibold tracking-tight">{g.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-[#5c564a]">{g.mechanic}</p>
            <p className="mt-2 text-[11px] text-[#a39c8c]">Evidence: {g.evidence}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
