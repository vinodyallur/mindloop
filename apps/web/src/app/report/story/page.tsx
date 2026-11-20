"use client";
import { useState } from "react";
import { getStory } from "@/lib/api";

const LEVEL_STYLE: Record<string, { bg: string; ink: string; emoji: string; label: string }> = {
  super: { bg: "#d3f5df", ink: "#14703a", emoji: "🌟", label: "Super!" },
  good: { bg: "#d8e7ff", ink: "#1d4fc4", emoji: "💪", label: "Strong" },
  growing: { bg: "#ffedb8", ink: "#8a5a00", emoji: "🌱", label: "Growing" },
  sleepy: { bg: "#eee9fb", ink: "#5b21b6", emoji: "😴", label: "Sleepy" },
};

export default function StoryReport() {
  const [story, setStory] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function generate() {
    setLoading(true); setErr("");
    const s = await getStory();
    if (!s) setErr("Couldn't load your story — play a game first, then try again.");
    else setStory(s);
    setLoading(false);
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-8">
      <header className="rounded-[2rem] bg-[#26221c] p-8 text-center text-white sm:p-10">
        <p className="text-5xl">📖</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">My Brain Story</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-medium text-white/70">
          Press the button and MindLoop reads your games, then tells you — like a storybook —
          how your <b>coordination</b>, <b>attention span</b> and <b>focus</b> are doing, and how to grow them.
        </p>
        <button onClick={generate} disabled={loading} className="btn-primary mt-5 text-lg disabled:opacity-50">
          {loading ? "✨ Reading your games…" : story ? "🔄 Generate my report again" : "✨ Generate my report"}
        </button>
        {err && <p className="mt-3 text-sm font-bold text-[#ffb020]">{err}</p>}
      </header>

      {story && (
        <div className="pop-in space-y-5">
          <section className="card p-6 text-center sm:p-8" style={{ background: "#fff1d6", borderColor: "transparent" }}>
            <p className="text-2xl font-black leading-snug text-[#8a5a00]">{story.headline}</p>
            {story.trend_line && <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-[#8a5a00]">{story.trend_line}</p>}
            <p className="mt-2 text-xs font-bold text-[#b3a893]">{story.sessions} games played · baseline {story.index != null ? `${Math.round(story.index)}/100` : "not ready yet"}</p>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            {story.cards.map((c: any) => {
              const s = LEVEL_STYLE[c.level ?? "growing"] ?? LEVEL_STYLE.growing;
              return (
                <section key={c.title} className="card card-lift p-6" style={{ background: s.bg, borderColor: "transparent" }}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black" style={{ color: s.ink }}>{c.title}</h2>
                    <span className="chip bg-white/80" style={{ color: s.ink }}>{s.emoji} {c.level ? s.label : "Not yet"}</span>
                  </div>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed" style={{ color: s.ink }}>{c.story}</p>
                </section>
              );
            })}
          </div>

          {story.screen_card && (
            <section className="card card-lift p-6" style={{ background: "#eee9fb", borderColor: "transparent" }}>
              <h2 className="text-xl font-black text-[#5b21b6]">{story.screen_card.title}</h2>
              <p className="mt-2 text-[15px] font-medium leading-relaxed text-[#5b21b6]">{story.screen_card.story}</p>
            </section>
          )}

          <section className="card p-6 sm:p-8">
            <h2 className="text-2xl font-black tracking-tight">🚀 How to grow stronger</h2>
            <div className="mt-3 space-y-2">
              {story.improvements.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-3 rounded-2xl bg-[#faf6ec] p-4">
                  <span className="text-2xl">{t.emoji}</span>
                  <p className="text-[15px] font-medium leading-relaxed text-[#26221c]"><b>{i + 1}.</b> {t.text}</p>
                </div>
              ))}
            </div>
          </section>

          <p className="text-center text-xs font-semibold text-[#b3a893]">{story.note}</p>
          <div className="flex flex-wrap justify-center gap-3 no-print">
            <button className="btn-primary" onClick={() => window.print()}>🖨️ Print / Save PDF</button>
          </div>
        </div>
      )}
    </main>
  );
}
