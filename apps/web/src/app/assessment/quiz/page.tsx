"use client";
import { useRef, useState } from "react";
import { Done, Intro, useSubmit } from "@/components/TaskShell";
import RequireProfile from "@/components/RequireProfile";
import type { Trial } from "@/lib/api";

// Non-diagnostic habits + puzzle quiz. Explicitly NOT an ADHD/IQ test:
// self-reported everyday behaviours + fun brain teasers. Feeds baseline as accuracy.
const QUESTIONS: { q: string; options: string[]; answer: number; why: string }[] = [
  { q: "I start tasks but leave them half-done…", options: ["Almost never", "Sometimes", "Often", "Almost always"], answer: -1, why: "self-report habit" },
  { q: "I lose track of what I was doing when interrupted…", options: ["Almost never", "Sometimes", "Often", "Almost always"], answer: -1, why: "self-report habit" },
  { q: "I fidget, tap, or feel restless sitting still…", options: ["Almost never", "Sometimes", "Often", "Almost always"], answer: -1, why: "self-report habit" },
  { q: "I put off boring tasks until the last minute…", options: ["Almost never", "Sometimes", "Often", "Almost always"], answer: -1, why: "self-report habit" },
  { q: "I misplace things like keys or my phone…", options: ["Almost never", "Sometimes", "Often", "Almost always"], answer: -1, why: "self-report habit" },
  { q: "Which number comes next? 2, 4, 8, 16, …", options: ["20", "24", "32", "30"], answer: 2, why: "pattern puzzle" },
  { q: "If you rearrange CIFAIPC you get the name of a…", options: ["City", "Ocean", "Country", "Animal"], answer: 1, why: "anagram puzzle" },
  { q: "Book is to Reading as Fork is to…", options: ["Drawing", "Writing", "Eating", "Cooking"], answer: 2, why: "analogy puzzle" },
  { q: "Which one is the odd one out?", options: ["Apple", "Banana", "Carrot", "Mango"], answer: 2, why: "category puzzle" },
  { q: "A bat and ball cost 1.10 total. The bat costs 1.00 more. Ball costs…?", options: ["10 cents", "5 cents", "15 cents", "1 cent"], answer: 1, why: "reflection puzzle" },
];

function Inner() {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const buf = useRef<Trial[]>([]);
  const { saved, offline, save } = useSubmit("quiz");

  function answer(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const q = QUESTIONS[idx];
    const correct = q.answer === -1 ? true : i === q.answer;
    buf.current = [...buf.current, {
      trial_index: idx, stimulus: q.q.slice(0, 60),
      expected_action: "respond", actual_action: "respond",
      reaction_time_ms: null, correct,
    }];
    setTimeout(() => {
      setPicked(null);
      if (idx + 1 >= QUESTIONS.length) {
        save(buf.current);
        setPhase("done");
      } else setIdx(idx + 1);
    }, 650);
  }

  if (phase === "intro") return (
    <Intro title="Habits & Puzzles Quiz" cta="Start the quiz"
      body="10 quick questions: 5 about everyday focus habits, 5 fun brain puzzles. This is NOT an ADHD or IQ test — just self-reflection plus play. Your answers feed your baseline as accuracy."
      onStart={() => setPhase("run")} />
  );
  if (phase === "done") return <Done saved={saved} offline={offline} />;

  const q = QUESTIONS[idx];
  return (
    <main className="min-h-[70vh] bg-[#eee9fb]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-5 px-5 py-8">
        <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
            <span>❓ Question {idx + 1}/{QUESTIONS.length}</span><span>{q.why}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#5b21b6] transition-all" style={{ width: `${(idx / QUESTIONS.length) * 100}%` }} />
          </div>
        </div>
        <div className="w-full max-w-xl rounded-[2rem] border-2 border-[#5b21b6]/20 bg-white p-6 shadow-xl sm:p-8">
          <p className="text-xl font-black leading-snug text-[#26221c] sm:text-2xl">{q.q}</p>
          <div className="mt-5 grid gap-2">
            {q.options.map((o, i) => {
              const isAnswer = q.answer >= 0 && picked !== null && i === q.answer;
              const isWrong = picked === i && q.answer >= 0 && i !== q.answer;
              const isHabit = picked === i && q.answer === -1;
              return (
                <button key={i} onClick={() => answer(i)} disabled={picked !== null}
                  className="rounded-2xl border-2 px-4 py-3 text-left text-[15px] font-bold transition active:scale-[0.98]"
                  style={{
                    background: isAnswer ? "#22c55e" : isWrong ? "#ef4444" : isHabit ? "#d8e7ff" : "#faf6ec",
                    color: isAnswer || isWrong ? "#fff" : "#26221c",
                    borderColor: isAnswer ? "#15803d" : isWrong ? "#b91c1c" : "#f0e3cd",
                  }}>
                  {o} {isAnswer ? "✓" : isWrong ? "✗" : ""}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-[11px] font-bold text-[#b3a893]">Self-reflection + play — not a medical test. No score here diagnoses anything.</p>
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return <RequireProfile><Inner /></RequireProfile>;
}
