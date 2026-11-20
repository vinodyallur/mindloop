"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMe, saveProfile, saveDevice, finishOnboarding, logScreenTime, getAssessmentSet } from "@/lib/api";

const STEPS = ["You", "Baseline games", "Devices", "Screen time", "Done"];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [country, setCountry] = useState("");
  const [watch, setWatch] = useState("");
  const [mobile, setMobile] = useState("");
  const [screen, setScreen] = useState("240");
  const [doom, setDoom] = useState("60");
  const [err, setErr] = useState("");
  const [games, setGames] = useState<any>(null);

  useEffect(() => {
    getMe().then((m) => {
      if (m?.onboarding_done) router.replace("/today");
      if (m?.display_name && m.display_name !== "Demo User") setName(m.display_name);
    });
    getAssessmentSet().then(setGames);
  }, [router]);

  useEffect(() => {
    if (step === 1) getAssessmentSet().then(setGames);
  }, [step ]);

  async function submitProfile() {
    setErr("");
    if (!name.trim()) { setErr("Please tell us your name — your buddy needs something to call you."); return; }
    if (age.trim() === "") { setErr("Please enter your age — it shapes what a healthy baseline looks like for you."); return; }
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 5 || ageNum > 120) { setErr("Age must be a whole number between 5 and 120."); return; }
    if (!country.trim()) { setErr("Please enter your country — norms and helplines differ by place."); return; }
    if (!gender) { setErr("Please pick a gender option — or 'prefer not to say'."); return; }
    const r = await saveProfile({ name: name.trim(), age: ageNum, gender, country: country.trim(), language: "en" });
    if (!r) { setErr("Backend offline — start the API, then continue."); return; }
    if (r.age_band === "under-13" || r.age_band === "13-17") {
      setErr("Note: MindLoop is built for adults. If you're under 18, please use it with a parent or guardian.");
    }
    setStep(1);
  }

  async function submitDevices() {
    setErr("");
    if (watch.trim()) await saveDevice("watch", watch.trim());
    if (mobile.trim()) await saveDevice("mobile", mobile.trim());
    setStep(3);
  }

  async function submitScreen() {
    setErr("");
    const s = Number(screen), d = Number(doom);
    if (!(s >= 0) || !(d >= 0)) { setErr("Minutes must be 0 or more."); return; }
    if (d > s) { setErr("Doomscroll minutes can't be more than total screen minutes."); return; }
    const r = await logScreenTime(s, d);
    if (!r) { setErr("Backend offline — start the API, then continue."); return; }
    await finishOnboarding();
    setStep(4);
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-6 px-5 py-10">
      <header className="text-center">
        <p className="chip mx-auto bg-[#ffedb8] text-[#8a5a00]">🌱 Step {Math.min(step + 1, 5)} of 5 · {STEPS[Math.min(step, 4)]}</p>
        <div className="mx-auto mt-3 flex max-w-md gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="h-2.5 flex-1 rounded-full" style={{ background: i <= step ? "#ff4d6d" : "#f0e3cd" }} />
          ))}
        </div>
      </header>

      {step === 0 && (
        <section className="card mx-auto max-w-xl space-y-4 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight">👋 First, who are you?</h1>
          <p className="text-sm font-medium text-[#6b6257]">Just the basics so your baseline fits you. Nothing here diagnoses anything.</p>
          <label className="block text-sm font-bold">Name <span className="text-[#ff4d6d]">*</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="What should your buddy call you?" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Age <span className="text-[#ff4d6d]">*</span>
              <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="e.g. 21" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
            </label>
            <label className="block text-sm font-bold">Country <span className="text-[#ff4d6d]">*</span>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
            </label>
          </div>
          <div className="text-sm font-bold">Gender <span className="text-[#ff4d6d]">*</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {[["female", "♀ Female"], ["male", "♂ Male"], ["nonbinary", "⚧ Non-binary"], ["prefer_not_to_say", "🤐 Prefer not to say"]].map(([v, l]) => (
                <button key={v} onClick={() => setGender(v)} className="rounded-full px-4 py-2 text-xs font-black" style={gender === v ? { background: "#26221c", color: "#fff" } : { background: "#fff1d6", color: "#8a5a00" }}>{l}</button>
              ))}
            </div>
          </div>
          {err && <p className="rounded-xl bg-[#ffedb8] p-3 text-sm font-semibold text-[#8a5a00]">{err}</p>}
          <button onClick={submitProfile} className="btn-primary w-full text-lg">Continue →</button>
        </section>
      )}

      {step === 1 && (
        <section className="mx-auto max-w-2xl space-y-4">
          <div className="card p-6 text-center sm:p-8">
            <h1 className="text-3xl font-black tracking-tight">🎮 Your 4 baseline games</h1>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium text-[#6b6257]">
              These 4 were picked because together they cover <b>attention span</b>, <b>visual memory</b>, <b>scanning speed</b> and <b>focus habits</b>.
              Play each once — that draws your starting line.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(games?.items ?? []).map((g: any, i: number) => (
              <Link key={g.task_key} href={g.href} className="card card-lift group p-5">
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{g.emoji}</span>
                  {g.done ? <span className="chip bg-[#d3f5df] text-[#14703a]">✓ Done</span> : <span className="chip bg-[#ffedb8] text-[#8a5a00]">Game {i + 1}</span>}
                </div>
                <h2 className="mt-2 text-lg font-black">{g.title}</h2>
                <p className="mt-1 text-[13px] font-medium text-[#6b6257]">{g.why}</p>
                <p className="mt-2 text-xs font-black text-[#ff4d6d] group-hover:underline">{g.done ? "Play again ↻" : "Play now ▶"}</p>
              </Link>
            ))}
          </div>
          <div className="card p-4 text-center text-sm font-bold text-[#6b6257]">
            {games ? `${games.completed} of ${games.total} done` : "Loading…"}
            {games?.baseline_ready && <span className="text-[#14703a]"> 🎉 Baseline ready!</span>}
          </div>
          <button onClick={() => setStep(2)} className="btn-primary w-full text-lg">
            {games?.baseline_ready ? "Baseline done — connect devices →" : "Continue anyway →"}
          </button>
          <button onClick={() => getAssessmentSet().then(setGames)} className="btn-ghost w-full">↻ Refresh progress</button>
        </section>
      )}

      {step === 2 && (
        <section className="card mx-auto max-w-xl space-y-4 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight">📱 Connect your devices</h1>
          <p className="text-sm font-medium text-[#6b6257]">
            Your <b>smartwatch</b> shares sleep, steps and heart-rate context. Your <b>mobile</b> shares screen-time context.
            Both shape the story around your baseline — neither measures attention directly. Skip if you like; you can add them later in Settings.
          </p>
          <label className="block text-sm font-bold">⌚ Smartwatch <span className="font-medium text-[#b3a893]">(e.g. Fire-Boltt Ultimate 1.39)</span>
            <input value={watch} onChange={(e) => setWatch(e.target.value)} placeholder="Watch name, or leave blank to skip" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
          </label>
          <label className="block text-sm font-bold">📱 Mobile <span className="font-medium text-[#b3a893]">(for screen-time tracking)</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Phone name, or leave blank to skip" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
          </label>
          {err && <p className="rounded-xl bg-[#ffedb8] p-3 text-sm font-semibold text-[#8a5a00]">{err}</p>}
          <button onClick={submitDevices} className="btn-primary w-full text-lg">Continue →</button>
        </section>
      )}

      {step === 3 && (
        <section className="card mx-auto max-w-xl space-y-4 p-6 sm:p-8">
          <h1 className="text-3xl font-black tracking-tight">📵 Yesterday's screen time</h1>
          <p className="text-sm font-medium text-[#6b6257]">
            Rough numbers are fine — check your phone's Digital Wellbeing / Screen Time page.
            Heavy doomscrolling days often sit next to lower focus scores. This becomes <b>context</b> for your baseline, not a judgement.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-bold">Total screen (min)
              <input value={screen} onChange={(e) => setScreen(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
            </label>
            <label className="block text-sm font-bold">Doomscroll (min)
              <input value={doom} onChange={(e) => setDoom(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="mt-1 w-full rounded-xl border-2 border-[#f0e3cd] px-4 py-2.5 text-sm outline-none focus:border-[#ff4d6d]" />
            </label>
          </div>
          {err && <p className="rounded-xl bg-[#ffedb8] p-3 text-sm font-semibold text-[#8a5a00]">{err}</p>}
          <button onClick={submitScreen} className="btn-primary w-full text-lg">Finish — show my plan 🌱</button>
        </section>
      )}

      {step === 4 && (
        <section className="card mx-auto max-w-xl space-y-4 p-8 text-center sm:p-10">
          <p className="pop-in text-6xl">🎉</p>
          <h1 className="text-3xl font-black tracking-tight">You're in{name ? `, ${name}` : ""}!</h1>
          <p className="text-sm font-medium text-[#6b6257]">
            Your buddy plan is ready: <b>5 games + 1 small habit every day</b>. Miss a day? Totally okay —
            your buddy just says <i>"try tomorrow"</i>. No streaks lost, no shame.
          </p>
          <Link href="/today" className="btn-primary w-full text-lg">☀️ See today's tasks</Link>
          <Link href="/baseline" className="btn-ghost w-full">📈 Or check my baseline first</Link>
        </section>
      )}
    </main>
  );
}
