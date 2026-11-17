"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { submitSession } from "@/lib/api";

interface StimulusResult {
  letter: string;
  isTarget: boolean;
  responded: boolean;
  reactionTime: number | null;
  correct: boolean;
}

const TOTAL_STIMULI = 60;
const TARGET_LETTER = "X";
const STIMULUS_DURATION = 1500;
const TARGET_PROBABILITY = 0.3;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function generateStimuli(): string[] {
  const stimuli: string[] = [];
  for (let i = 0; i < TOTAL_STIMULI; i++) {
    if (Math.random() < TARGET_PROBABILITY) {
      stimuli.push(TARGET_LETTER);
    } else {
      let letter;
      do {
        letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
      } while (letter === TARGET_LETTER);
      stimuli.push(letter);
    }
  }
  return stimuli;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

export default function CPTPage() {
  const [phase, setPhase] = useState<"intro" | "testing" | "results">("intro");
  const [stimuli] = useState<string[]>(() => generateStimuli());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentLetter, setCurrentLetter] = useState("");
  const [results, setResults] = useState<StimulusResult[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "error" | null>(null);

  const stimulusStartRef = useRef<number>(0);
  const respondedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const resultsRef = useRef<StimulusResult[]>([]);

  const showNextStimulus = useCallback(() => {
    const idx = indexRef.current;
    if (idx >= TOTAL_STIMULI) { submitSession("cpt", resultsRef.current.map((r, i) => ({ trial_index: i, stimulus: r.letter, expected_action: r.isTarget ? "respond" : "withhold", actual_action: r.responded ? "respond" : null, reaction_time_ms: r.reactionTime, correct: r.correct }))).then((s) => { if (s) (window as any).__ml = s; }); setPhase("results");
      return;
    }
    const letter = stimuli[idx];
    setCurrentLetter(letter);
    setCurrentIndex(idx);
    setFeedback(null);
    respondedRef.current = false;
    stimulusStartRef.current = performance.now();

    timerRef.current = setTimeout(() => {
      // If user didn't respond
      if (!respondedRef.current) {
        const isTarget = letter === TARGET_LETTER;
        const result: StimulusResult = {
          letter,
          isTarget,
          responded: false,
          reactionTime: null,
          correct: !isTarget, // correct to not respond to non-target
        };
        resultsRef.current = [...resultsRef.current, result];
        setResults(resultsRef.current);
        if (isTarget) {
          setFeedback("error");
          feedbackTimerRef.current = setTimeout(() => {
            setFeedback(null);
            indexRef.current += 1;
            showNextStimulus();
          }, 300);
        } else {
          indexRef.current += 1;
          showNextStimulus();
        }
      } else {
        indexRef.current += 1;
        showNextStimulus();
      }
    }, STIMULUS_DURATION);
  }, [stimuli]);

  const handleResponse = useCallback(() => {
    if (phase !== "testing" || respondedRef.current) return;
    respondedRef.current = true;
    const rt = performance.now() - stimulusStartRef.current;
    const isTarget = currentLetter === TARGET_LETTER;
    const correct = isTarget;

    const result: StimulusResult = {
      letter: currentLetter,
      isTarget,
      responded: true,
      reactionTime: rt,
      correct,
    };
    resultsRef.current = [...resultsRef.current, result];
    setResults(resultsRef.current);
    setFeedback(correct ? "correct" : "error");

    if (timerRef.current) clearTimeout(timerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      indexRef.current += 1;
      showNextStimulus();
    }, 400);
  }, [phase, currentLetter, showNextStimulus]);

  useEffect(() => {
    if (phase !== "testing") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleResponse();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, handleResponse]);

  const startTest = () => {
    setPhase("testing");
    indexRef.current = 0;
    resultsRef.current = [];
    setResults([]);
    setTimeout(() => showNextStimulus(), 500);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Compute results
  const hits = results.filter((r) => r.isTarget && r.responded).length;
  const misses = results.filter((r) => r.isTarget && !r.responded).length;
  const falseAlarms = results.filter((r) => !r.isTarget && r.responded).length;
  const correctRejections = results.filter((r) => !r.isTarget && !r.responded).length;
  const totalTargets = results.filter((r) => r.isTarget).length;
  const totalNonTargets = results.filter((r) => !r.isTarget).length;
  const accuracy = results.length > 0
    ? ((hits + correctRejections) / results.length) * 100
    : 0;
  const reactionTimes = results
    .filter((r) => r.responded && r.reactionTime !== null)
    .map((r) => r.reactionTime!);
  const avgRT = reactionTimes.length > 0
    ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    : 0;
  const rtVariability = stdDev(reactionTimes);

  const score = Math.min(100, Math.max(0, Math.round(
    (hits / Math.max(1, totalTargets)) * 50 +
    (1 - falseAlarms / Math.max(1, totalNonTargets)) * 30 +
    (avgRT > 0 ? Math.max(0, (600 - avgRT) / 600) * 20 : 0)
  )));

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">🎯</div>
          <h1 className="text-3xl font-bold">Continuous Performance Test</h1>
          <p className="text-neutral-500 text-lg">Sustained Attention Assessment</p>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-left space-y-3 text-neutral-600">
            <h2 className="text-neutral-900 font-semibold text-lg">Instructions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Letters will appear one at a time on screen.</li>
              <li>
                Press the <span className="font-bold text-blue-400">TAP button</span> or{" "}
                <span className="font-bold text-blue-400">Spacebar</span> ONLY when you see
                the letter <span className="text-3xl font-black text-yellow-400">X</span>.
              </li>
              <li>Do NOT press for any other letter.</li>
              <li>Respond as quickly and accurately as possible.</li>
              <li>{TOTAL_STIMULI} letters total • ~{Math.round((TOTAL_STIMULI * STIMULUS_DURATION) / 1000 / 60)} min</li>
            </ul>
          </div>
          <button
            onClick={startTest}
            className="px-10 py-4 bg-neutral-900 hover:bg-black rounded-xl text-xl font-bold transition-colors text-white"
          >
            Start Test
          </button>
        </div>
      </div>
    );
  }

  if (phase === "testing") {
    const progress = ((currentIndex + 1) / TOTAL_STIMULI) * 100;
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-200 ${
          feedback === "correct"
            ? "bg-green-950"
            : feedback === "error"
            ? "bg-red-950"
            : "bg-[#fafafa]"
        }`}
      >
        {/* Progress bar */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-neutral-500 mb-1">
            <span>Progress</span>
            <span>{currentIndex + 1} / {TOTAL_STIMULI}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-neutral-900 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stimulus */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className={`text-[12rem] font-black leading-none select-none transition-colors duration-100 ${
              feedback === "correct"
                ? "text-green-400"
                : feedback === "error"
                ? "text-red-400"
                : "text-neutral-900"
            }`}
          >
            {currentLetter}
          </div>
        </div>

        {/* TAP button */}
        <button
          onClick={handleResponse}
          className="mb-12 w-40 h-40 rounded-full bg-neutral-900 hover:bg-black active:bg-neutral-700 text-white text-3xl font-black shadow-lg shadow-blue-600/30 transition-all active:scale-95 select-none"
        >
          TAP
        </button>

        <p className="text-gray-500 text-sm">Tap only when you see <span className="font-bold text-yellow-400">X</span></p>
      </div>
    );
  }

  // Results
  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl">📊</div>
          <h1 className="text-3xl font-bold">CPT Results</h1>
          <p className="text-neutral-500">Sustained Attention Performance</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center"><p className="text-neutral-500">Compared only with your personal baseline — no composite score, no diagnosis.</p></div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Accuracy</p>
            <p className="text-2xl font-bold text-green-400">{accuracy.toFixed(1)}%</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Hits</p>
            <p className="text-2xl font-bold text-blue-400">{hits}<span className="text-sm text-gray-500">/{totalTargets}</span></p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Misses</p>
            <p className="text-2xl font-bold text-red-400">{misses}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">False Alarms</p>
            <p className="text-2xl font-bold text-yellow-400">{falseAlarms}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Avg RT</p>
            <p className="text-2xl font-bold text-purple-400">{avgRT > 0 ? `${avgRT.toFixed(0)}ms` : "—"}</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">RT Variability</p>
            <p className="text-2xl font-bold text-orange-400">{rtVariability > 0 ? `${rtVariability.toFixed(0)}ms` : "—"}</p>
          </div>
        </div>

        <div className="text-center">
          <a
            href="/assessment"
            className="inline-block px-8 py-3 bg-neutral-900 hover:bg-black rounded-xl font-semibold transition-colors"
          >
            ← Back to Assessment
          </a>
        </div>
      </div>
    </div>
  );
}

