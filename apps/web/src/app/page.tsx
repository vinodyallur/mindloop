"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/lib/games";
import { useLang } from "@/lib/i18n";
import { getMe, getStreak } from "@/lib/api";

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

export default function Home() {
  const { t } = useLang();
  const [me, setMe] = useState<any>(null);
  const [streak, setStreak] = useState<any>(null);
  useEffect(() => {
    getMe().then(setMe);
    getStreak().then(setStreak);
  }, []);
  const onboarded = !!me?.onboarding_done;
  const name = me?.display_name && me.display_name !== "Demo User" ? me.display_name : null;

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-12 px-5 py-10">
      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-[2rem] border-2 border-[#f0e3cd] bg-white p-8 text-center sm:p-14">
        <span className="floaty absolute left-6 top-6 text-4xl sm:left-12 sm:text-6xl">🧠</span>
        <span className="floaty absolute bottom-8 right-8 text-4xl sm:right-16 sm:text-6xl" style={{ animationDelay: "1.2s" }}>✨</span>
        <span className="floaty absolute right-10 top-8 hidden text-3xl sm:block" style={{ animationDelay: "2s" }}>🎯</span>
        <p className="chip mx-auto bg-[#ffedb8] text-[#8a5a00]">
          {name ? `👋 Welcome back, ${name}` : "👋 Welcome to MindLoop"}
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Get your <span className="hl hl-coral">baseline</span> done, then grow your <span className="hl hl-teal">brain health</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] font-medium leading-relaxed text-[#6b6257]">
          Short games measure your <b>attention span</b> and <b>focus</b>. Daily tasks help you improve them —
          and spend a little less time <b>doomscrolling</b>. Compared only with your own usual pattern. Never a diagnosis.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {!onboarded ? (
            <Link href="/onboarding" className="btn-primary text-lg">🌱 Begin assessment</Link>
          ) : (
            <Link href="/today" className="btn-primary text-lg">
              {streak && streak.streak > 0 ? `🔥 Day ${streak.streak + 1} — today's tasks` : "☀️ Today's tasks"}
            </Link>
          )}
          <Link href="/games" className="btn-teal">🎮 {t("browseTasks")} · {GAMES.length}</Link>
        </div>
        {streak?.buddy && onboarded && (
          <p className="mx-auto mt-5 max-w-xl rounded-2xl bg-[#fff1d6] px-5 py-3 text-sm font-semibold text-[#8a5a00]">
            {streak.buddy.text}
          </p>
        )}
        <div className="mx-auto mt-6 flex max-w-lg items-center justify-center gap-2 text-xs font-bold text-[#b3a893]">
          <span className="chip bg-[#d3f5df] text-[#14703a]">✓ {t("notDiagnosis").split("-")[0]}</span>
        </div>
      </section>

      {/* How it works */}
      <section className="grid gap-4 sm:grid-cols-4">
        {[
          ["👋", "1 · You", "#ffd9e2", "#c2274b", "Tell us your name, age, country. 30 seconds."],
          ["🎮", "2 · Baseline", "#d8e7ff", "#1d4fc4", "Play the 4 best games. That's your starting line."],
          ["📱", "3 · Connect", "#e9d5ff", "#7e22ce", "Link watch + mobile. Screen time shapes context."],
          ["🌱", "4 · Grow", "#d3f5df", "#14703a", "5 games + 1 habit daily. Buddy cheers you on."],
        ].map(([emoji, title, bg, ink, d]) => (
          <div key={title} className="card card-lift pop-in p-6" style={{ background: bg, borderColor: "transparent" }}>
            <p className="text-4xl">{emoji}</p>
            <p className="mt-2 text-lg font-black" style={{ color: ink }}>{title}</p>
            <p className="mt-1 text-[13px] font-medium leading-relaxed" style={{ color: ink, opacity: 0.8 }}>{d}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-2xl font-black tracking-tight">⭐ Start anywhere</h2>
          <Link href="/games" className="btn-ghost !py-2 text-sm">All {GAMES.length} →</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.slice(0, 6).map((g) => {
            const s = DOMAIN_STYLE[g.domain] ?? { bg: "#fff1d6", ink: "#8a5a00", emoji: "🎲" };
            return (
              <Link key={g.key} href={g.href} className="card card-lift group overflow-hidden p-0">
                <div className="flex items-center justify-between px-5 pt-4" style={{ background: s.bg }}>
                  <span className="text-3xl">{s.emoji}</span>
                  <span className="chip bg-white/80" style={{ color: s.ink }}>{g.domain} · {g.minutes} min</span>
                </div>
                <div className="px-5 pb-5 pt-3" style={{ background: s.bg }}>
                  <h3 className="text-xl font-black tracking-tight" style={{ color: s.ink }}>{g.title}</h3>
                  <p className="mt-1 text-[13px] font-medium" style={{ color: s.ink, opacity: 0.75 }}>{g.mechanic}</p>
                </div>
                <div className="bg-white px-5 py-3 text-xs font-bold text-[#b3a893] transition group-hover:text-[#ff4d6d]">▶ Play now</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] bg-[#26221c] p-8 text-center text-white sm:p-10">
        <p className="text-4xl">🔬</p>
        <p className="mt-2 text-xl font-black">Grounded, not hyped.</p>
        <p className="mx-auto mt-2 max-w-2xl text-sm font-medium leading-relaxed text-white/70">
          Training evidence shows near-transfer to similar tasks, not IQ gains (Melby-Lervåg 2016; Sala &amp; Gobet 2017).
          Wearable signals are context only. Phone steadiness is exploratory. Nothing here diagnoses any condition.
        </p>
        <Link href="/evidence" className="mt-5 inline-block rounded-full bg-[#ffb020] px-6 py-2.5 text-sm font-black text-[#26221c] transition hover:-translate-y-0.5">📚 Read the evidence</Link>
      </section>
    </main>
  );
}
