"use client";
export const dynamic = "force-dynamic";

import { useState, useRef, useEffect, useCallback } from "react";
import { submitSession } from "@/lib/api";

const TOTAL_TRIALS = 10;
const MIN_DELAY = 2000;
const MAX_DELAY = 5000;

type TrialPhase = "waiting" | "ready" | "green" | "recorded";
type Phase = "intro" | "testing" | "results";

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1));
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mapScore(med: number): number {
  if (med <= 150) return 100;
  if (med <= 250) return 100 - ((med - 150) / 100) * 40; // 100→60
  if (med <= 400) return 60 - ((med - 250) / 150) * 40;  // 60→20
  if (med <= 500) return 20 - ((med - 400) / 100) * 20;  // 20→0
  return 0;
}

export default function ReactionTimePage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [trialPhase, setTrialPhase] = useState<TrialPhase>("waiting");
  const [validRTs, setValidRTs] = useState<number[]>([]);
  const [earlyClicks, setEarlyClicks] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [lastRT, setLastRT] = useState<number | null>(null);
  const [showEarlyMessage, setShowEarlyMessage] = useState(false);

  const greenTimeRef = useRef<number>(0);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTrial = useCallback(() => {
    setTrialPhase("ready");
    setShowEarlyMessage(false);
    setLastRT(null);

    const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
    delayTimerRef.current = setTimeout(() => {
      greenTimeRef.current = performance.now();
      setTrialPhase("green");
    }, delay);
  }, []);

  const startTest = () => {
    setValidRTs([]);
    setEarlyClicks(0);
    setCurrentTrial(0);
    setPhase("testing");
    setTimeout(() => startTrial(), 500);
  };

  const handleTap = useCallback(() => {
    if (phase !== "testing") return;

    if (trialPhase === "ready") {
      // Too early!
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      setEarlyClicks((p) => p + 1);
      setShowEarlyMessage(true);
      feedbackTimerRef.current = setTimeout(() => {
        startTrial(); // restart this trial
      }, 1500);
      return;
    }

    if (trialPhase === "green") {
      const rt = performance.now() - greenTimeRef.current;
      setLastRT(rt);
      setTrialPhase("recorded");

      const newRTs = [...validRTs, rt];
      setValidRTs(newRTs);
      const newTrialCount = currentTrial + 1;
      setCurrentTrial(newTrialCount);

      feedbackTimerRef.current = setTimeout(() => {
        if (newTrialCount >= TOTAL_TRIALS) {
          setPhase("results"); submitSession("reaction", validRTs.map((rt, i) => ({ trial_index: i, stimulus: "cue", expected_action: "respond" as const, actual_action: "respond" as const, reaction_time_ms: rt, correct: true })));
        } else {
          startTrial();
        }
      }, 1200);
    }
  }, [phase, trialPhase, validRTs, currentTrial, startTrial]);

  useEffect(() => {
    if (phase !== "testing") return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handleTap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleTap]);

  useEffect(() => {
    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  // Results calculations
  const meanRT = validRTs.length > 0 ? validRTs.reduce((a, b) => a + b, 0) / validRTs.length : 0;
  const medianRT = median(validRTs);
  const fastestRT = validRTs.length > 0 ? Math.min(...validRTs) : 0;
  const slowestRT = validRTs.length > 0 ? Math.max(...validRTs) : 0;
  const rtVar = stdDev(validRTs);
  const score = Math.round(mapScore(medianRT));

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">⚡</div>
          <h1 className="text-3xl font-bold">Reaction Time Test</h1>
          <p className="text-neutral-500 text-lg">Processing Speed Assessment</p>
          <div className="bg-white border border-neutral-200 rounded-xl p-6 text-left space-y-3 text-neutral-600">
            <h2 className="text-neutral-900 font-semibold text-lg">Instructions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>A large circle will appear in the center.</li>
              <li>Wait while the circle is <span className="font-bold text-red-400">RED</span>.</li>
              <li>Tap or press Space as fast as possible when it turns <span className="font-bold text-green-400">GREEN</span>.</li>
              <li>Don&apos;t tap too early! That won&apos;t count.</li>
              <li>{TOTAL_TRIALS} trials total.</li>
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
    return (
      <div className="min-h-screen bg-[#fafafa] text-neutral-900 flex flex-col items-center justify-center p-6 select-none">
        {/* Progress */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-neutral-500 mb-1">
            <span>Trial {Math.min(currentTrial + 1, TOTAL_TRIALS)} of {TOTAL_TRIALS}</span>
            <span>Valid: {validRTs.length}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-neutral-900 rounded-full transition-all" style={{ width: `${(validRTs.length / TOTAL_TRIALS) * 100}%` }} />
          </div>
        </div>

        {/* Circle */}
        <button
          onClick={handleTap}
          className={`w-[200px] h-[200px] rounded-full transition-colors duration-100 shadow-2xl ${
            trialPhase === "green"
              ? "bg-green-500 shadow-green-500/40 cursor-pointer"
              : trialPhase === "recorded"
              ? "bg-blue-500 shadow-blue-500/40"
              : "bg-red-600 shadow-red-600/40 cursor-pointer"
          }`}
        >
          <span className="text-neutral-900 font-bold text-lg">
            {trialPhase === "green" ? "TAP!" : trialPhase === "recorded" ? `${lastRT?.toFixed(0)}ms` : "WAIT"}
          </span>
        </button>

        {/* Feedback */}
        <div className="mt-8 h-12 text-center">
          {showEarlyMessage && (
            <p className="text-red-400 text-xl font-bold animate-pulse">⚠️ Too early! Wait for green.</p>
          )}
          {trialPhase === "recorded" && lastRT !== null && (
            <p className={`text-xl font-bold ${lastRT < 250 ? "text-green-400" : lastRT < 400 ? "text-yellow-400" : "text-orange-400"}`}>
              {lastRT < 250 ? "⚡ Lightning fast!" : lastRT < 400 ? "👍 Good!" : "Keep trying!"}
            </p>
          )}
          {trialPhase === "ready" && !showEarlyMessage && (
            <p className="text-gray-500 text-lg">Wait for green...</p>
          )}
        </div>

        {earlyClicks > 0 && (
          <p className="mt-4 text-gray-500 text-sm">Early taps: {earlyClicks}</p>
        )}
      </div>
    );
  }

  // Results
  return (
    <div className="min-h-screen bg-[#fafafa] text-neutral-900 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="text-5xl">📊</div>
          <h1 className="text-3xl font-bold">Reaction Time Results</h1>
          <p className="text-neutral-500">Processing Speed Performance</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 text-center">
          <p className="text-neutral-500 mb-2">Processing Speed Score</p>
          <p className="text-5xl font-black text-blue-400 mb-4">
            {score}<span className="text-2xl text-gray-500">/100</span>
          </p>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${score}%`,
                backgroundColor: score >= 70 ? "#10B981" : score >= 40 ? "#EAB308" : "#EF4444",
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Mean RT</p>
            <p className="text-2xl font-bold text-purple-400">{meanRT.toFixed(0)}ms</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Median RT</p>
            <p className="text-2xl font-bold text-blue-400">{medianRT.toFixed(0)}ms</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Fastest</p>
            <p className="text-2xl font-bold text-green-400">{fastestRT.toFixed(0)}ms</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Slowest</p>
            <p className="text-2xl font-bold text-orange-400">{slowestRT.toFixed(0)}ms</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">RT Variability</p>
            <p className="text-2xl font-bold text-yellow-400">{rtVar.toFixed(0)}ms</p>
          </div>
          <div className="bg-white border border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-neutral-500 text-sm">Early Taps</p>
            <p className="text-2xl font-bold text-red-400">{earlyClicks}</p>
          </div>
        </div>

        {/* Individual trials */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <h3 className="font-semibold text-neutral-600 mb-3">Trial Breakdown</h3>
          <div className="space-y-2">
            {validRTs.map((rt, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-16">Trial {i + 1}</span>
                <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (rt / 600) * 100)}%`,
                      backgroundColor: rt < 250 ? "#10B981" : rt < 400 ? "#EAB308" : "#EF4444",
                    }}
                  />
                </div>
                <span className="text-neutral-600 text-sm w-16 text-right">{rt.toFixed(0)}ms</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <a href="/assessment" className="inline-block px-8 py-3 bg-neutral-900 hover:bg-black rounded-xl font-semibold transition-colors">
            ← Back to Assessment
          </a>
        </div>
      </div>
    </div>
  );
}

