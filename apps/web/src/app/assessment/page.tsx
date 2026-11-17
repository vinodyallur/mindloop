"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";

export default function Assessment() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">Assessment library</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Measure to build your baseline</h1>
        <p className="mt-1 max-w-xl text-sm text-neutral-500">Every task feeds the same personal baseline. Start with the core five, then explore the full library of {GAMES.length}.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">{g.domain}</span>
              <span className="text-xs text-neutral-400">{g.minutes} min</span>
            </div>
            <h2 className="mt-3 font-semibold tracking-tight">{g.title}</h2>
            <p className="mt-1 text-[13px] text-neutral-500">{g.mechanic}</p>
            <p className="mt-2 text-[11px] text-neutral-400">{g.evidence}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
