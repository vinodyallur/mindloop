"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { submitSession } from "@/lib/api";

const COLORS = [
  { name: "RED", hex: "#EF4444" },
  { name: "BLUE", hex: "#3B82F6" },
  { name: "GREEN", hex: "#10B981" },
  { name: "YELLOW", hex: "#EAB308" },
];

const TOTAL_TRIALS = 30;

interface Trial {
  word: string;
  inkColor: string;
  inkHex: string;
  congruent: boolean;
  response: string | null;
  correct: boolean | null;
  reactionTime: number | null;
}

function generateTrials(): Trial[] {
  const trials: Trial[] = [];
  for (let i = 0; i < TOTAL_TRIALS; i++) {
    const wordIdx = Math.floor(Math.random() * COLORS.length);
    const word = COLORS[wordIdx].name;
    const congruent = Math.random() < 0.5;
    let inkIdx: number;
    if (congruent) {
      inkIdx = wordIdx;
    } else {
      do {
        inkIdx = Math.floor(Math.random() * COLORS.length);
      } while (inkIdx === wordIdx);
    }
    trials.push({
      word,
      inkColor: COLORS[inkIdx].name,
      inkHex: COLORS[inkIdx].hex,
      congruent,
      response: null,
      correct: null,
      reactionTime: null,
    });
  }
  return trials;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

export default function StroopPage() {
  const [phase, setPhase] = useState<"intro" | "testing" | "results">("intro");
  const [trials, setTrials] = useState<Trial[]>(() => generateTrials());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const startTimeRef = useRef<number>(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTrial = trials[currentIndex];

  const handleColorResponse = useCallback(
    (colorName: string) => {
      if (phase !== "testing" || feedback !== null) return;
      const rt = performance.now() - startTimeRef.current;
      const correct = colorName === currentTrial.inkColor;

      setTrials((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          ...next[currentIndex],
          response: colorName,
          correct,
          reactionTime: rt,
        };
        return next;
      });

      setFeedback(correct ? "correct" : "wrong");

      feedbackTimerRef.current = setTimeout(() => {
        setFeedback(null);
        if (currentIndex + 1 >= TOTAL_TRIALS) {
          setPhase("results");
        } else {
          setCurrentIndex((p) => p + 1);
          startTimeRef.current = performance.now();
        }
      }, 500);
    },
    [phase, feedback, currentTrial, currentIndex]
  );

  const startTest = () => {
    const newTrials = generateTrials();
    setTrials(newTrials);
    setCurrentIndex(0);
    setFeedback(null);
    setPhase("testing");
    setTimeout(() => {
      startTimeRef.current = performance.now();
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Keyboard shortcuts (1-4)
  useEffect(() => {
    if (phase !== "testing") return;
    const handler = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < COLORS.length) {
        handleColorResponse(COLORS[idx].name);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleColorResponse]);

  // Compute results
  const completedTrials = trials.filter((t) => t.response !== null);
  const congruent = completedTrials.filter((t) => t.congruent);
  const incongruent = completedTrials.filter((t) => !t.congruent);

  const overallAccuracy = completedTrials.length > 0
    ? (completedTrials.filter((t) => t.correct).length / completedTrials.length) * 100
    : 0;

  const congAccuracy = congruent.length > 0
    ? (congruent.filter((t) => t.correct).length / congruent.length) * 100
    : 0;
  const incongAccuracy = incongruent.length > 0
    ? (incongruent.filter((t) => t.correct).length / incongruent.length) * 100
    : 0;

  const congRTs = congruent.filter((t) => t.reactionTime !== null).map((t) => t.reactionTime!);
  const incongRTs = incongruent.filter((t) => t.reactionTime !== null).map((t) => t.reactionTime!);

  const avgCongRT = congRTs.length > 0 ? congRTs.reduce((a, b) => a + b, 0) / congRTs.length : 0;
  const avgIncongRT = incongRTs.length > 0 ? incongRTs.reduce((a, b) => a + b, 0) / incongRTs.length : 0;
  const interferenceScore = avgIncongRT - avgCongRT;

  const inhibitionScore = Math.min(100, Math.max(0, Math.round(
    incongAccuracy * 0.6 + (interferenceScore < 100 ? 40 : interferenceScore < 200 ? 30 : interferenceScore < 300 ? 15 : 0)
  )));

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#fafafa] text-[#23201a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">🎨</div>
          <h1 className="text-3xl font-bold">Stroop Color Test</h1>
          <p className="text-[#5c564a] text-lg">Cognitive Inhibition Assessment</p>
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-6 text-left space-y-3 text-[#5c564a]">
            <h2 className="text-[#23201a] font-semibold text-lg">Instructions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>A color word will appear on screen in a colored ink.</li>
              <li>
                Select the button matching the <span className="font-bold text-blue-400">INK COLOR</span>,
                not the word itself.
              </li>
              <li>
                Example: if you see <span className="font-bold" style={{ color: "#3B82F6" }}>RED</span>, tap{" "}
                <span className="font-bold text-blue-400">BLUE</span> (the ink color).
              </li>
              <li>Respond as quickly and accurately as possible.</li>
              <li>{TOTAL_TRIALS} trials total.</li>
            </ul>
          </div>
          <button
            onClick={startTest}
            className="px-10 py-4 bg-[#b3541e] hover:bg-[#9c4a1a] rounded-xl text-xl font-bold transition-colors text-white"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  if (phase === "testing") {
    const progress = ((currentIndex + 1) / TOTAL_TRIALS) * 100;
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-between p-6 transition-colors duration-200 ${
          feedback === "correct"
            ? "bg-green-950"
            : feedback === "wrong"
            ? "bg-red-950"
            : "bg-[#fafafa]"
        }`}
      >
        {/* Progress */}
        <div className="w-full max-w-md">
          <div className="flex justify-between text-sm text-[#5c564a] mb-1">
            <span>Trial {currentIndex + 1} of {TOTAL_TRIALS}</span>
            <span>{feedback === "correct" ? "✓ Correct" : feedback === "wrong" ? "✗ Wrong" : ""}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-[#b3541e] rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Stimulus word */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="text-[8rem] md:text-[10rem] font-black select-none leading-none"
            style={{ color: currentTrial.inkHex }}
          >
            {currentTrial.word}
          </div>
        </div>

        {/* Response buttons */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-md pb-8">
          {COLORS.map((c, idx) => (
            <button
              key={c.name}
              onClick={() => handleColorResponse(c.name)}
              className="py-5 rounded-xl text-xl font-bold text-[#23201a] transition-all active:scale-95 hover:opacity-90"
              style={{ backgroundColor: c.hex }}
            >
              {c.name}
              <span className="block text-xs opacity-60 mt-1">({idx + 1})</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Results
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#23201a] p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl">📊</div>
          <h1 className="text-3xl font-bold">Stroop Test Results</h1>
          <p className="text-[#5c564a]">Cognitive Inhibition Performance</p>
        </div>

        {/* Inhibition Score */}
        <div className="bg-white border border-[#e5ddcc] rounded-xl p-6 text-center">
          <p className="text-[#5c564a] mb-2">Inhibition Metric (vs your baseline only)</p>
          <p className="text-5xl font-black text-purple-400 mb-4">
            {inhibitionScore}<span className="text-2xl text-gray-500">/100</span>
          </p>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${inhibitionScore}%`,
                backgroundColor: inhibitionScore >= 80 ? "#10B981" : inhibitionScore >= 50 ? "#EAB308" : "#EF4444",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-4 text-center">
            <p className="text-[#5c564a] text-sm">Overall Accuracy</p>
            <p className="text-2xl font-bold text-green-400">{overallAccuracy.toFixed(1)}%</p>
          </div>
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-4 text-center">
            <p className="text-[#5c564a] text-sm">Interference</p>
            <p className="text-2xl font-bold text-yellow-400">{interferenceScore.toFixed(0)}ms</p>
          </div>
        </div>

        {/* Congruent vs Incongruent */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-5 space-y-3">
            <h3 className="text-center font-semibold text-green-400">Congruent</h3>
            <div className="text-center">
              <p className="text-[#5c564a] text-sm">Accuracy</p>
              <p className="text-xl font-bold">{congAccuracy.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[#5c564a] text-sm">Avg RT</p>
              <p className="text-xl font-bold">{avgCongRT > 0 ? `${avgCongRT.toFixed(0)}ms` : "—"}</p>
            </div>
          </div>
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-5 space-y-3">
            <h3 className="text-center font-semibold text-red-400">Incongruent</h3>
            <div className="text-center">
              <p className="text-[#5c564a] text-sm">Accuracy</p>
              <p className="text-xl font-bold">{incongAccuracy.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[#5c564a] text-sm">Avg RT</p>
              <p className="text-xl font-bold">{avgIncongRT > 0 ? `${avgIncongRT.toFixed(0)}ms` : "—"}</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <a href="/assessment" className="inline-block px-8 py-3 bg-[#b3541e] hover:bg-[#9c4a1a] rounded-xl font-semibold transition-colors">
            ← Back to Assessment
          </a>
        </div>
      </div>
    </div>
  );
}

