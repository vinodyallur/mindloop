"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect, useRef, useCallback } from "react";
import { submitSession } from "@/lib/api";

// Fixed block positions (scattered layout, as % of container)
const BLOCK_POSITIONS = [
  { x: 15, y: 20 },
  { x: 55, y: 10 },
  { x: 80, y: 25 },
  { x: 10, y: 55 },
  { x: 45, y: 45 },
  { x: 75, y: 55 },
  { x: 25, y: 80 },
  { x: 55, y: 75 },
  { x: 85, y: 80 },
];

interface TrialResult {
  spanLength: number;
  sequence: number[];
  userSequence: number[];
  correct: boolean;
}

type Phase = "intro" | "showing" | "responding" | "feedback" | "results";

function generateSequence(length: number): number[] {
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * 9);
    } while (seq.length > 0 && seq[seq.length - 1] === idx);
    seq.push(idx);
  }
  return seq;
}

function spanToScore(span: number): number {
  if (span <= 2) return 10;
  if (span <= 3) return 25;
  if (span <= 4) return 40;
  if (span <= 5) return 50;
  if (span <= 6) return 65;
  if (span <= 7) return 80;
  if (span <= 8) return 90;
  return 100;
}

export default function CorsiPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [spanLength, setSpanLength] = useState(2);
  const [currentSequence, setCurrentSequence] = useState<number[]>([]);
  const [highlightedBlock, setHighlightedBlock] = useState<number | null>(null);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [results, setResults] = useState<TrialResult[]>([]);
  const [failuresAtCurrentSpan, setFailuresAtCurrentSpan] = useState(0);
  const [feedbackCorrect, setFeedbackCorrect] = useState<boolean | null>(null);
  const [maxSpan, setMaxSpan] = useState(0);
  const [tappedBlock, setTappedBlock] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setHighlightedBlock(null);
    let i = 0;
    const show = () => {
      if (i < seq.length) {
        setHighlightedBlock(seq[i]);
        timerRef.current = setTimeout(() => {
          setHighlightedBlock(null);
          i++;
          timerRef.current = setTimeout(show, 500);
        }, 800);
      } else {
        setPhase("responding");
        setUserSequence([]);
      }
    };
    timerRef.current = setTimeout(show, 600);
  }, []);

  const startNewRound = useCallback(
    (span: number) => {
      const seq = generateSequence(span);
      setCurrentSequence(seq);
      setUserSequence([]);
      setFeedbackCorrect(null);
      showSequence(seq);
    },
    [showSequence]
  );

  const startTest = () => {
    setSpanLength(2);
    setResults([]);
    setFailuresAtCurrentSpan(0);
    setMaxSpan(0);
    startNewRound(2);
  };

  const handleBlockTap = useCallback(
    (blockIndex: number) => {
      if (phase !== "responding") return;

      setTappedBlock(blockIndex);
      setTimeout(() => setTappedBlock(null), 200);

      const newUserSeq = [...userSequence, blockIndex];
      setUserSequence(newUserSeq);

      // Check once the user has tapped enough
      if (newUserSeq.length === currentSequence.length) {
        const correct = newUserSeq.every((v, i) => v === currentSequence[i]);
        const result: TrialResult = {
          spanLength,
          sequence: currentSequence,
          userSequence: newUserSeq,
          correct,
        };
        const newResults = [...results, result];
        setResults(newResults);
        setFeedbackCorrect(correct);
        setPhase("feedback");

        timerRef.current = setTimeout(() => {
          if (correct) {
            const newSpan = spanLength + 1;
            const newMax = Math.max(maxSpan, spanLength);
            setMaxSpan(newMax);
            setFailuresAtCurrentSpan(0);
            if (newSpan > 9) {
              setMaxSpan(9);
              setPhase("results");
            } else {
              setSpanLength(newSpan);
              startNewRound(newSpan);
            }
          } else {
            const newFailures = failuresAtCurrentSpan + 1;
            setFailuresAtCurrentSpan(newFailures);
            if (newFailures >= 2) {
              setMaxSpan(Math.max(maxSpan, spanLength - 1));
              setPhase("results");
            } else {
              // Retry same span
              startNewRound(spanLength);
            }
          }
        }, 1200);
      }
    },
    [phase, userSequence, currentSequence, spanLength, results, failuresAtCurrentSpan, maxSpan, startNewRound]
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const finalMaxSpan = Math.max(maxSpan, ...results.filter((r) => r.correct).map((r) => r.spanLength), 0);
  const totalCorrect = results.filter((r) => r.correct).length;
  const wmScore = spanToScore(finalMaxSpan);

  if (phase === "intro") {
    return (
      <div className="min-h-screen bg-[#fafafa] text-[#23201a] flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="text-6xl">🧩</div>
          <h1 className="text-3xl font-bold">Corsi Block Tapping</h1>
          <p className="text-[#5c564a] text-lg">Visuospatial Working Memory</p>
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-6 text-left space-y-3 text-[#5c564a]">
            <h2 className="text-[#23201a] font-semibold text-lg">Instructions</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>Watch the blocks as they light up in a sequence.</li>
              <li>After the sequence, tap the blocks in the <span className="font-bold text-yellow-400">SAME ORDER</span>.</li>
              <li>The sequence gets longer each time you get it right.</li>
              <li>Two mistakes at the same length ends the test.</li>
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

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-[#fafafa] text-[#23201a] p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="text-5xl">📊</div>
            <h1 className="text-3xl font-bold">Corsi Results</h1>
            <p className="text-[#5c564a]">Visuospatial Working Memory</p>
          </div>

          <div className="bg-white border border-[#e5ddcc] rounded-xl p-6 text-center">
            <p className="text-[#5c564a] mb-2">Working Memory Metric (vs your baseline only)</p>
            <p className="text-5xl font-black text-blue-400 mb-4">
              {wmScore}<span className="text-2xl text-gray-500">/100</span>
            </p>
            <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${wmScore}%`,
                  backgroundColor: wmScore >= 70 ? "#10B981" : wmScore >= 40 ? "#EAB308" : "#EF4444",
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-[#e5ddcc] rounded-xl p-5 text-center">
              <p className="text-[#5c564a] text-sm">Max Span</p>
              <p className="text-4xl font-black text-purple-400">{finalMaxSpan}</p>
            </div>
            <div className="bg-white border border-[#e5ddcc] rounded-xl p-5 text-center">
              <p className="text-[#5c564a] text-sm">Total Correct</p>
              <p className="text-4xl font-black text-green-400">{totalCorrect}</p>
            </div>
          </div>

          {/* Trial history */}
          <div className="bg-white border border-[#e5ddcc] rounded-xl p-5 space-y-2">
            <h3 className="font-semibold text-[#5c564a] mb-3">Trial History</h3>
            {results.map((r, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-[#5c564a]">Span {r.spanLength}</span>
                <span className={r.correct ? "text-green-400" : "text-red-400"}>
                  {r.correct ? "✓ Correct" : "✗ Incorrect"}
                </span>
              </div>
            ))}
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

  // Showing / Responding / Feedback
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#23201a] flex flex-col items-center p-6">
      {/* Status bar */}
      <div className="w-full max-w-md mb-4 flex justify-between items-center">
        <span className="text-[#5c564a]">Span: <span className="text-[#23201a] font-bold">{spanLength}</span></span>
        <span className="text-[#5c564a]">
          {phase === "showing" && "👀 Watch..."}
          {phase === "responding" && `Tap: ${userSequence.length} / ${currentSequence.length}`}
          {phase === "feedback" && (feedbackCorrect ? "✓ Correct!" : "✗ Incorrect")}
        </span>
      </div>

      {/* Grid area */}
      <div className="relative w-full max-w-md aspect-square bg-white border border-[#e5ddcc] rounded-2xl overflow-hidden">
        {BLOCK_POSITIONS.map((pos, idx) => {
          const isHighlighted = highlightedBlock === idx;
          const isTapped = tappedBlock === idx;
          const isInUserSeq = userSequence.includes(idx);

          return (
            <button
              key={idx}
              onClick={() => handleBlockTap(idx)}
              disabled={phase !== "responding"}
              className={`absolute w-[60px] h-[60px] rounded-lg transition-all duration-200 border-2 ${
                isHighlighted
                  ? "bg-yellow-400 border-yellow-300 scale-110 shadow-lg shadow-yellow-400/50"
                  : isTapped
                  ? "bg-blue-400 border-blue-300 scale-105"
                  : isInUserSeq && phase === "responding"
                  ? "bg-[#b3541e] border-blue-500"
                  : phase === "feedback" && feedbackCorrect
                  ? "bg-green-700 border-green-600"
                  : phase === "feedback" && !feedbackCorrect
                  ? "bg-red-900 border-red-800"
                  : "bg-gray-700 border-gray-600 hover:bg-gray-600"
              } ${phase === "responding" ? "cursor-pointer" : "cursor-default"}`}
              style={{
                left: `calc(${pos.x}% - 30px)`,
                top: `calc(${pos.y}% - 30px)`,
              }}
            >
              {isInUserSeq && phase === "responding" && (
                <span className="text-[#23201a] font-bold text-sm">
                  {userSequence.indexOf(idx) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {phase === "feedback" && (
        <div className={`mt-6 text-2xl font-bold ${feedbackCorrect ? "text-green-400" : "text-red-400"}`}>
          {feedbackCorrect ? "✓ Correct! Moving to span " + (spanLength + 1) : "✗ Incorrect — " + (failuresAtCurrentSpan >= 1 ? "Test complete" : "Try again")}
        </div>
      )}
    </div>
  );
}

