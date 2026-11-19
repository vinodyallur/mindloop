"use client";
import Link from "next/link";
import { useState } from "react";
import { GAMES } from "@/lib/games";

const DOMAIN_STYLE: Record<string, { bg: string; ink: string; emoji: string }> = {
  Attention: { bg: "#d3f5df", ink: "#14703a", emoji: "🎯" },
  Inhibition: { bg: "#ffedb8", ink: "#8a5a00", emoji: "🛑" },
  Memory: { bg: "#d8e7ff", ink: "#1d4fc4", emoji: "🧠" },
  Speed: { bg: "#ffd9e2", ink: "#c2274b", emoji: "⚡" },
  Flexibility: { bg: "#e9d5ff", ink: "#7e22ce", emoji: "🔀" },
  Spatial: { bg: "#c9f2f1", ink: "#0b6f6e", emoji: "🧩" },
  Reasoning: { bg: "#ffe4d6", ink: "#c2410c", emoji: "💡" },
  Coordination: { bg: "#e7f6c9", ink: "#4d7c0f", emoji: "🤸" },
  Calm: { bg: "#d9f6f3", ink: "#0f766e", emoji: "🌊" },
  Habit: { bg: "#f3e8c9", ink: "#854d0e", emoji: "🌱" },
  Context: { bg: "#eee9fb", ink: "#5b21b6", emoji: "📝" },
};

const DOMAINS = ["All", ...Array.from(new Set(GAMES.map((g) => g.domain)))];

export default function Games() {
  const [domain, setDomain] = useState("All");
  const [q, setQ] = useState("");
  const list = GAMES.filter((g) => (domain === "All" || g.domain === domain) && (g.title + g.mechanic).toLowerCase().includes(q.toLowerCase()));
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header className="rounded-[2rem] bg-[#26221c] p-8 text-white">
        <p className="chip bg-[#ffb020] text-[#26221c]">🎮 {GAMES.length} games</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Pick your <span className="text-[#ffb020]">playground</span></h1>
        <p className="mt-2 max-w-2xl text-sm font-medium text-white/70">Every session feeds your personal baseline · practice shows near-transfer only, not IQ gains.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search games…" className="mt-5 w-full max-w-md rounded-full border-2 border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white placeholder:text-white/50 outline-none focus:border-[#ffb020]" />
      </header>
      <div className="flex flex-wrap gap-2">
        {DOMAINS.map((d) => {
          const s = DOMAIN_STYLE[d];
          return (
            <button key={d} onClick={() => setDomain(d)} className="rounded-full px-4 py-2 text-sm font-black transition hover:-translate-y-0.5" style={domain === d ? { background: "#26221c", color: "#fff" } : { background: s?.bg ?? "#fff1d6", color: s?.ink ?? "#8a5a00" }}>{s?.emoji ?? "🎲"} {d}</button>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((g) => {
          const s = DOMAIN_STYLE[g.domain] ?? { bg: "#fff1d6", ink: "#8a5a00", emoji: "🎲" };
          return (
            <Link key={g.key} href={g.href} className="card card-lift group overflow-hidden p-0">
              <div className="flex items-start justify-between p-5 pb-2" style={{ background: s.bg }}>
                <span className="text-5xl transition group-hover:scale-110 group-hover:rotate-6">{s.emoji}</span>
                <span className="chip bg-white/85" style={{ color: s.ink }}>⏱ {g.minutes} min</span>
              </div>
              <div className="px-5 pb-2 pt-1" style={{ background: s.bg }}>
                <h2 className="text-lg font-black tracking-tight" style={{ color: s.ink }}>{g.title}</h2>
                <p className="mt-1 min-h-10 text-[13px] font-medium leading-snug" style={{ color: s.ink, opacity: 0.75 }}>{g.mechanic}</p>
              </div>
              <div className="flex items-center justify-between bg-white px-5 py-3">
                <span className="text-[11px] font-bold text-[#b3a893]">📖 {g.evidence}</span>
                <span className="rounded-full px-3 py-1 text-xs font-black text-white transition group-hover:scale-110" style={{ background: s.ink }}>▶</span>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
