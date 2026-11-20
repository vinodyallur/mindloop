"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import RequireProfile from "@/components/RequireProfile";

export default function Assessment() {
  return (
    <RequireProfile>
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Assessment library</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Measure to build your baseline</h1>
        <p className="mt-1 max-w-xl text-sm text-[#5c564a]">Every task feeds the same personal baseline. Start with the core five, then explore the full library of {GAMES.length}.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#f1ecdd] px-2.5 py-1 text-[11px] font-medium text-[#5c564a]">{g.domain}</span>
              <span className="text-xs text-[#a39c8c]">{g.minutes} min</span>
            </div>
            <h2 className="mt-3 font-semibold tracking-tight">{g.title}</h2>
            <p className="mt-1 text-[13px] text-[#5c564a]">{g.mechanic}</p>
            <p className="mt-2 text-[11px] text-[#a39c8c]">{g.evidence}</p>
          </Link>
        ))}
      </div>
    </main>
    </RequireProfile>
  );
}
