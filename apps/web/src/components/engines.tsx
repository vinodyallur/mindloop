"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "./TaskShell";
import type { Trial } from "@/lib/api";

function useTimer() { const r = useRef<any>(null); useEffect(() => () => clearTimeout(r.current), []); return r; }

/* ---------- 2/3-choice engine (flanker, choice, math, rotate, pattern, switch) ---------- */
export function ChoiceGame({ taskKey, title, intro, total = 24, options, gen }: {
  taskKey: string; title: string; intro: string; total?: number;
  options: string[]; gen: (i: number) => { show: React.ReactNode; correct: string; label: string };
}) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [stim, setStim] = useState<{ show: React.ReactNode; correct: string; label: string } | null>(null);
  const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0);
  const { saved, offline, save } = useSubmit(taskKey);
  const next = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    setStim(gen(n)); setIdx(n); start.current = performance.now();
  }, [total, gen, save]);
  const pick = useCallback((o: string) => {
    if (phase !== "run" || !stim) return;
    trials.current.push({ trial_index: trials.current.length, stimulus: stim.label, expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: o === stim.correct });
    next(trials.current.length);
  }, [phase, stim, next]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (e.key === "ArrowLeft") pick(options[0]);
      else if (e.key === "ArrowRight") pick(options[options.length - 1]);
      else if (i >= 0 && options[i]) pick(options[i]);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [pick, options]);
  if (phase === "intro") return <Intro title={title} body={intro} onStart={() => { trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center gap-6 px-5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"><div className="h-full rounded-full bg-neutral-900 transition-all" style={{ width: `${(idx / total) * 100}%` }} /></div>
      <div className="card flex min-h-40 w-full items-center justify-center p-8 text-center">{stim?.show}</div>
      <div className="grid w-full grid-cols-2 gap-2">{options.map((o) => <button key={o} onClick={() => pick(o)} className="btn-ghost">{o}</button>)}</div>
      <p className="text-xs text-neutral-400">{idx + 1} / {total} · ← → keys work</p>
    </main>
  );
}

/* ---------- Digit vigilance (SART): tap all except "3" ---------- */
export function SartGame({ taskKey = "sart", total = 40 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [digit, setDigit] = useState(0); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0); const responded = useRef(false);
  const timer = useTimer(); const { saved, offline, save } = useSubmit(taskKey);
  const next = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    const d = Math.floor(Math.random() * 10); setDigit(d); setIdx(n);
    responded.current = false; start.current = performance.now();
    timer.current = setTimeout(() => {
      if (!responded.current) trials.current.push({ trial_index: n, stimulus: String(d), expected_action: d === 3 ? "withhold" : "respond", actual_action: null, reaction_time_ms: null, correct: d === 3 });
      next(n + 1);
    }, 1000);
  }, [total, save, timer]);
  const tap = () => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(timer.current);
    trials.current.push({ trial_index: trials.current.length, stimulus: String(digit), expected_action: digit === 3 ? "withhold" : "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: digit !== 3 });
    next(trials.current.length);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  if (phase === "intro") return <Intro title="Steady Response" body="Digits flash fast. TAP every digit EXCEPT 3 — withhold for 3. Tests sustained attention and mind-wandering." onStart={() => { trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-6" onClick={tap}><p className="text-xs text-neutral-400">{idx + 1} / {total} · withhold for 3</p><div className="text-9xl font-semibold tabular-nums">{digit}</div><button className="tap-btn">TAP</button></main>;
}

/* ---------- Stop-signal: GO, but stop if it turns red ---------- */
export function StopSignalGame({ taskKey = "stopsignal", total = 30 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [stop, setStop] = useState(false); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0); const responded = useRef(false); const stopTrial = useRef(false);
  const t1 = useTimer(); const t2 = useTimer(); const { saved, offline, save } = useSubmit(taskKey);
  const next = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    setStop(false); setIdx(n); responded.current = false; stopTrial.current = Math.random() < 0.3;
    start.current = performance.now();
    if (stopTrial.current) t2.current = setTimeout(() => setStop(true), 250 + Math.random() * 200);
    t1.current = setTimeout(() => {
      if (!responded.current) trials.current.push({ trial_index: n, stimulus: stopTrial.current ? "stop" : "go", expected_action: stopTrial.current ? "withhold" : "respond", actual_action: null, reaction_time_ms: null, correct: stopTrial.current });
      next(n + 1);
    }, 1200);
  }, [total, save, t1, t2]);
  const tap = () => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(t1.current); clearTimeout(t2.current);
    const ok = !stopTrial.current && !stop;
    trials.current.push({ trial_index: trials.current.length, stimulus: stopTrial.current ? "stop" : "go", expected_action: stopTrial.current ? "withhold" : "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: ok });
    next(trials.current.length);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  if (phase === "intro") return <Intro title="Stop Signal" body="TAP on green GO. If it turns RED, STOP yourself — don't tap. Tests reactive inhibition." onStart={() => { trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-8" onClick={tap}><p className="text-xs text-neutral-400">{idx + 1} / {total}</p><div className={`flex h-40 w-40 items-center justify-center rounded-full text-2xl font-bold text-white ${stop ? "bg-rose-500" : "bg-emerald-500"}`}>{stop ? "STOP" : "GO"}</div><button className="tap-btn">TAP</button></main>;
}

/* ---------- N-back: tap if letter matches 2 back ---------- */
export function NBackGame({ taskKey = "nback", n = 2, total = 30 }: { taskKey?: string; n?: number; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [letter, setLetter] = useState(""); const [idx, setIdx] = useState(0);
  const seq = useRef<string[]>([]); const trials = useRef<Trial[]>([]);
  const start = useRef(0); const responded = useRef(false); const timer = useTimer();
  const { saved, offline, save } = useSubmit(taskKey);
  const L = "ABCDEFGH";
  const next = useCallback((k: number) => {
    if (k >= total) { setPhase("done"); save(trials.current); return; }
    let ch: string;
    if (k >= n && Math.random() < 0.3) ch = seq.current[k - n];
    else { do { ch = L[Math.floor(Math.random() * L.length)]; } while (k >= n && ch === seq.current[k - n]); }
    seq.current.push(ch); setLetter(ch); setIdx(k); responded.current = false; start.current = performance.now();
    timer.current = setTimeout(() => {
      if (!responded.current) { const match = k >= n && ch === seq.current[k - n]; trials.current.push({ trial_index: k, stimulus: ch, expected_action: match ? "respond" : "withhold", actual_action: null, reaction_time_ms: null, correct: !match }); }
      next(k + 1);
    }, 1800);
  }, [total, n, save, timer]);
  const tap = () => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(timer.current);
    const k = trials.current.length; const match = k >= n && letter === seq.current[k - n];
    trials.current.push({ trial_index: k, stimulus: letter, expected_action: match ? "respond" : "withhold", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: match });
    next(k + 1);
  };
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });
  if (phase === "intro") return <Intro title={`N-Back ${n}`} body={`Letters appear one by one. TAP only when the letter matches the one ${n} steps back. Tests working-memory updating.`} onStart={() => { seq.current = []; trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-6" onClick={tap}><p className="text-xs text-neutral-400">{idx + 1} / {total} · match {n}-back</p><div className="text-9xl font-semibold">{letter}</div><button className="tap-btn">MATCH</button></main>;
}

/* ---------- Digit span: watch, then type back ---------- */
export function DigitSpanGame({ taskKey = "span" }: { taskKey?: string }) {
  const [phase, setPhase] = useState<"intro" | "show" | "input" | "done">("intro");
  const [len, setLen] = useState(3); const [digits, setDigits] = useState<number[]>([]);
  const [showIdx, setShowIdx] = useState(0); const [entry, setEntry] = useState("");
  const trials = useRef<Trial[]>([]); const { saved, offline, save } = useSubmit(taskKey);
  const startRound = (l: number) => {
    const d = Array.from({ length: l }, () => Math.floor(Math.random() * 10));
    setDigits(d); setShowIdx(0); setEntry(""); setPhase("show");
    d.forEach((_, i) => setTimeout(() => { setShowIdx(i + 1); if (i === d.length - 1) setTimeout(() => setPhase("input"), 700); }, 800 * (i + 1)));
  };
  const submit = () => {
    const ok = entry === digits.join("");
    trials.current.push({ trial_index: trials.current.length, stimulus: digits.join(""), expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: ok, sway: undefined });
    if (ok) { const l = len + 1; setLen(l); if (l > 9) { setPhase("done"); save(trials.current); } else startRound(l); }
    else { setPhase("done"); save(trials.current); }
  };
  if (phase === "intro") return <Intro title="Digit Span" body="Watch the digits, then type them back in order. Span grows until you miss. Tests short-term memory." onStart={() => { trials.current = []; setLen(3); startRound(3); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  if (phase === "show") return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4"><p className="text-xs text-neutral-400">Memorize · length {len}</p><div className="text-8xl font-semibold tabular-nums">{digits.slice(0, showIdx).join(" ")}</div></main>;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-5">
      <p className="text-sm text-neutral-500">Type the {len} digits in order</p>
      <input value={entry} onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-center text-2xl tracking-widest outline-none focus:border-neutral-900" autoFocus />
      <button onClick={submit} className="btn-primary w-full">Submit</button>
    </main>
  );
}

/* ---------- Simon (sequence echo): repeat flashing pads ---------- */
export function SimonGame({ taskKey = "sequence" }: { taskKey?: string }) {
  const COLORS = ["bg-rose-400", "bg-emerald-400", "bg-sky-400", "bg-amber-400"];
  const [phase, setPhase] = useState<"intro" | "show" | "input" | "done">("intro");
  const [seq, setSeq] = useState<number[]>([]); const [lit, setLit] = useState<number | null>(null);
  const [pos, setPos] = useState(0);
  const trials = useRef<Trial[]>([]); const { saved, offline, save } = useSubmit(taskKey);
  const play = (s: number[]) => {
    setPhase("show"); setPos(0);
    s.forEach((c, i) => {
      setTimeout(() => { setLit(c); setTimeout(() => setLit(null), 450); if (i === s.length - 1) setTimeout(() => setPhase("input"), 600); }, 700 * (i + 1));
    });
  };
  const begin = () => { const s = [Math.floor(Math.random() * 4)]; setSeq(s); trials.current = []; play(s); };
  const press = (c: number) => {
    if (phase !== "input") return;
    const ok = c === seq[pos];
    if (!ok) { trials.current.push({ trial_index: trials.current.length, stimulus: seq.join(","), expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: false }); setPhase("done"); save(trials.current); return; }
    if (pos + 1 === seq.length) {
      trials.current.push({ trial_index: trials.current.length, stimulus: seq.join(","), expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true });
      if (seq.length >= 8) { setPhase("done"); save(trials.current); return; }
      const s = [...seq, Math.floor(Math.random() * 4)]; setSeq(s); play(s);
    } else setPos(pos + 1);
  };
  if (phase === "intro") return <Intro title="Sequence Echo" body="Watch the pads flash, then repeat the sequence. Grows each round. Tests serial recall." onStart={begin} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-4 px-5">
      <p className="text-xs text-neutral-400">{phase === "show" ? "Watch…" : `Your turn · ${pos + 1}/${seq.length}`}</p>
      <div className="grid w-full grid-cols-2 gap-3">
        {COLORS.map((c, i) => <button key={i} onClick={() => press(i)} className={`h-32 rounded-2xl transition ${c} ${lit === i ? "scale-95 brightness-125" : "opacity-70"}`} />)}
      </div>
    </main>
  );
}

/* ---------- Pairs (memory match) ---------- */
export function PairsGame({ taskKey = "pairs" }: { taskKey?: string }) {
  const ICONS = ["●", "▲", "■", "★", "◆", "⬢"];
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [deck, setDeck] = useState<string[]>([]); const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<number[]>([]); const [moves, setMoves] = useState(0);
  const start = useRef(0); const trials = useRef<Trial[]>([]);
  const { saved, offline, save } = useSubmit(taskKey);
  const begin = () => {
    const d = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
    setDeck(d); setOpen([]); setFound([]); setMoves(0); trials.current = []; start.current = performance.now(); setPhase("run");
  };
  const flip = (i: number) => {
    if (open.includes(i) || found.includes(i) || open.length >= 2) return;
    const o = [...open, i]; setOpen(o);
    if (o.length === 2) {
      setMoves(moves + 1);
      const match = deck[o[0]] === deck[o[1]];
      trials.current.push({ trial_index: trials.current.length, stimulus: deck[o[0]] + deck[o[1]], expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: match });
      setTimeout(() => { if (match) setFound([...found, ...o]); setOpen([]); }, 600);
    }
  };
  useEffect(() => {
    if (phase === "run" && found.length === deck.length && deck.length) { setPhase("done"); save(trials.current); }
  }, [found, phase, deck, save]);
  if (phase === "intro") return <Intro title="Pair Match" body="Flip cards and match all 6 pairs in as few moves as you can. Tests paired-associate memory." onStart={begin} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto max-w-sm space-y-4 px-5 py-8">
      <p className="text-center text-xs text-neutral-400">Moves: {moves} · Found {found.length / 2}/6</p>
      <div className="grid grid-cols-4 gap-2">
        {deck.map((c, i) => (
          <button key={i} onClick={() => flip(i)} className={`flex h-20 items-center justify-center rounded-xl border text-3xl transition ${open.includes(i) || found.includes(i) ? "border-neutral-900 bg-white" : "border-neutral-200 bg-neutral-100"}`}>
            {open.includes(i) || found.includes(i) ? c : ""}
          </button>
        ))}
      </div>
    </main>
  );
}

/* ---------- Grid recall: memorize highlighted cells ---------- */
export function GridRecallGame({ taskKey = "grid", size = 3, count = 4 }: { taskKey?: string; size?: number; count?: number }) {
  const [phase, setPhase] = useState<"intro" | "show" | "input" | "done">("intro");
  const [targets, setTargets] = useState<number[]>([]); const [picked, setPicked] = useState<number[]>([]);
  const trials = useRef<Trial[]>([]); const { saved, offline, save } = useSubmit(taskKey);
  const begin = () => {
    const all = Array.from({ length: size * size }, (_, i) => i).sort(() => Math.random() - 0.5).slice(0, count);
    setTargets(all); setPicked([]); trials.current = []; setPhase("show");
    setTimeout(() => setPhase("input"), 2200);
  };
  const toggle = (i: number) => {
    if (picked.includes(i) || picked.length >= count) return;
    const p = [...picked, i]; setPicked(p);
    if (p.length === count) {
      const ok = p.filter((x) => targets.includes(x)).length;
      trials.current.push({ trial_index: 0, stimulus: targets.join(","), expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: ok === count });
      setPhase("done"); save(trials.current);
    }
  };
  if (phase === "intro") return <Intro title="Grid Recall" body={`Memorize the ${count} highlighted cells, then tap them back. Tests spatial span.`} onStart={begin} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xs flex-col items-center justify-center gap-4">
      <p className="text-xs text-neutral-400">{phase === "show" ? "Memorize…" : "Tap the cells"}</p>
      <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, i) => (
          <button key={i} onClick={() => phase === "input" && toggle(i)} className={`aspect-square rounded-xl border transition ${phase === "show" && targets.includes(i) ? "border-neutral-900 bg-neutral-900" : picked.includes(i) ? "border-neutral-900 bg-neutral-200" : "border-neutral-200 bg-white"}`} />
        ))}
      </div>
    </main>
  );
}

/* ---------- Visual search / odd-one-out ---------- */
export function SearchGame({ taskKey, title, intro, total = 20, kind = "search" }: { taskKey: string; title: string; intro: string; total?: number; kind?: "search" | "odd" }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [cells, setCells] = useState<string[]>([]); const [target, setTarget] = useState(0); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0);
  const { saved, offline, save } = useSubmit(taskKey);
  const N = 16;
  const round = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    const t = Math.floor(Math.random() * N); setTarget(t); setIdx(n);
    if (kind === "search") setCells(Array.from({ length: N }, (_, i) => (i === t ? "T" : "L")));
    else { const sym = ["●", "▲", "■", "★"][Math.floor(Math.random() * 4)]; const alt = sym === "●" ? "○" : "●"; setCells(Array.from({ length: N }, (_, i) => (i === t ? alt : sym))); }
    start.current = performance.now();
  }, [total, kind, save]);
  const tap = (i: number) => {
    trials.current.push({ trial_index: trials.current.length, stimulus: `target@${target}`, expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: i === target });
    round(trials.current.length);
  };
  if (phase === "intro") return <Intro title={title} body={intro} onStart={() => { trials.current = []; setPhase("run"); round(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto max-w-sm space-y-3 px-5 py-8">
      <p className="text-center text-xs text-neutral-400">{idx + 1} / {total} · tap the different one</p>
      <div className="grid grid-cols-4 gap-2">{cells.map((c, i) => <button key={i} onClick={() => tap(i)} className="flex h-16 items-center justify-center rounded-xl border border-neutral-200 bg-white text-2xl active:bg-neutral-100">{c}</button>)}</div>
    </main>
  );
}

/* ---------- Trail connect: tap 1-A-2-B… ---------- */
export function TrailGame({ taskKey = "trail" }: { taskKey?: string }) {
  const SEQ = ["1", "A", "2", "B", "3", "C", "4", "D"];
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [order, setOrder] = useState<number[]>([]); const [pos, setPos] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0);
  const { saved, offline, save } = useSubmit(taskKey);
  const begin = () => {
    setOrder(Array.from({ length: SEQ.length }, (_, i) => i).sort(() => Math.random() - 0.5));
    setPos(0); trials.current = []; start.current = performance.now(); setPhase("run");
  };
  const tap = (labelIdx: number) => {
    const ok = SEQ[labelIdx] === SEQ[pos];
    trials.current.push({ trial_index: trials.current.length, stimulus: SEQ[labelIdx], expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: ok });
    if (!ok) { setPhase("done"); save(trials.current); return; }
    if (pos + 1 === SEQ.length) { setPhase("done"); save(trials.current); return; }
    setPos(pos + 1);
  };
  if (phase === "intro") return <Intro title="Trail Connect" body="Tap in order: 1 → A → 2 → B → 3 → C → 4 → D. Tests set-shifting (Trail-Making B)." onStart={begin} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto max-w-sm space-y-3 px-5 py-8">
      <p className="text-center text-xs text-neutral-400">Next: <b>{SEQ[pos]}</b> · {pos}/{SEQ.length}</p>
      <div className="grid grid-cols-4 gap-2">
        {order.map((li) => (
          <button key={li} onClick={() => tap(li)} disabled={SEQ.slice(0, pos).includes(SEQ[li])} className="flex h-16 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xl font-semibold disabled:opacity-20">{SEQ[li]}</button>
        ))}
      </div>
    </main>
  );
}

/* ---------- PVT: wait for cue, tap fast ---------- */
export function PvtGame({ taskKey = "pvt", total = 12 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "wait" | "cue" | "done">("intro");
  const [idx, setIdx] = useState(0); const [rt, setRt] = useState<number | null>(null);
  const trials = useRef<Trial[]>([]); const start = useRef(0); const timer = useTimer();
  const { saved, offline, save } = useSubmit(taskKey);
  const round = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    setIdx(n); setRt(null); setPhase("wait");
    timer.current = setTimeout(() => { setPhase("cue"); start.current = performance.now(); }, 1500 + Math.random() * 3500);
  }, [total, save, timer]);
  const tap = () => {
    if (phase === "wait") { trials.current.push({ trial_index: trials.current.length, stimulus: "early", expected_action: "withhold", actual_action: "respond", reaction_time_ms: null, correct: false }); clearTimeout(timer.current); round(trials.current.length); return; }
    if (phase !== "cue") return;
    const ms = Math.round(performance.now() - start.current); setRt(ms);
    trials.current.push({ trial_index: trials.current.length, stimulus: "cue", expected_action: "respond", actual_action: "respond", reaction_time_ms: ms, correct: ms < 500 });
    setTimeout(() => round(trials.current.length), 800);
  };
  if (phase === "intro") return <Intro title="Vigilance Tap" body="Wait for the screen to turn green, then TAP as fast as you can. Don't tap early. Gold-standard vigilant-attention task (PVT)." onStart={() => { trials.current = []; round(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main onClick={tap} className={`flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-4 transition-colors ${phase === "cue" ? "bg-emerald-100" : ""}`}>
      <p className="text-xs text-neutral-400">{idx + 1} / {total}</p>
      <div className="text-5xl font-semibold tabular-nums">{phase === "cue" ? (rt ?? "TAP!") : "···"}</div>
      <p className="text-xs text-neutral-400">{phase === "cue" ? "tap now" : "wait for green"}</p>
    </main>
  );
}

/* ---------- Rhythm: tap in time with pulse ---------- */
export function RhythmGame({ taskKey = "rhythm", total = 16 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [beat, setBeat] = useState(false); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const nextBeat = useRef(0);
  const { saved, offline, save } = useSubmit(taskKey);
  useEffect(() => {
    if (phase !== "run") return;
    nextBeat.current = performance.now() + 800;
    const iv = setInterval(() => { setBeat(true); nextBeat.current = performance.now() + 800; setTimeout(() => setBeat(false), 150); }, 800);
    return () => clearInterval(iv);
  }, [phase]);
  const tap = () => {
    if (phase !== "run") return;
    const err = Math.abs(performance.now() - nextBeat.current + 800 - 800);
    const dt = Math.round(performance.now() - (nextBeat.current - 800));
    const off = Math.min(dt, 800 - dt);
    trials.current.push({ trial_index: trials.current.length, stimulus: "beat", expected_action: "respond", actual_action: "respond", reaction_time_ms: off, correct: off < 120 });
    setIdx(trials.current.length);
    if (trials.current.length >= total) { setPhase("done"); save(trials.current); }
    void err;
  };
  if (phase === "intro") return <Intro title="Rhythm Tap" body="A pulse flashes every 800ms. TAP exactly in time with it. Tests sensorimotor synchronization." onStart={() => { trials.current = []; setIdx(0); setPhase("run"); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-6" onClick={tap}>
      <p className="text-xs text-neutral-400">{idx} / {total}</p>
      <div className={`h-28 w-28 rounded-full transition-all ${beat ? "scale-110 bg-neutral-900" : "bg-neutral-200"}`} />
      <button className="tap-btn">TAP</button>
    </main>
  );
}

/* ---------- Trace: follow the moving dot ---------- */
export function TraceGame({ taskKey = "trace", dur = 20 }: { taskKey?: string; dur?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [dot, setDot] = useState({ x: 50, y: 50 }); const [err, setErr] = useState(0); const [n, setN] = useState(0);
  const ptr = useRef({ x: 50, y: 50 }); const errs = useRef<number[]>([]);
  const { saved, offline, save } = useSubmit(taskKey);
  useEffect(() => {
    if (phase !== "run") return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const t = (Date.now() - t0) / 1000;
      const x = 50 + 35 * Math.sin(t * 1.2), y = 50 + 25 * Math.sin(t * 2.1);
      setDot({ x, y });
      const d = Math.hypot(x - ptr.current.x, y - ptr.current.y);
      errs.current.push(d); setErr(d); setN(errs.current.length);
      if (t >= dur) {
        clearInterval(iv);
        const mean = errs.current.reduce((a, b) => a + b, 0) / Math.max(errs.current.length, 1);
        save([{ trial_index: 0, stimulus: "trace", expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(mean * 10), correct: mean < 12 }]);
        setPhase("done");
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase, dur, save]);
  if (phase === "intro") return <Intro title="Trace Path" body="Keep your finger on the moving dot for 20 seconds. Tests visuomotor tracking." onStart={() => { errs.current = []; setPhase("run"); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-5">
      <p className="text-xs text-neutral-400">samples {n} · error {err.toFixed(1)}</p>
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; }} onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; }}>
        <div className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-900" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} />
        <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-500" style={{ left: `${ptr.current.x}%`, top: `${ptr.current.y}%` }} />
      </div>
    </main>
  );
}

/* ---------- Breathe / Read / Checkin (no-trial completions) ---------- */
export function BreatheGame({ taskKey = "breathe" }: { taskKey?: string }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [step, setStep] = useState("inhale"); const [cycle, setCycle] = useState(0);
  const { saved, offline, save } = useSubmit(taskKey);
  useEffect(() => {
    if (phase !== "run") return;
    const seq: [string, number][] = [["inhale", 4000], ["hold", 4000], ["exhale", 6000]];
    let c = 0, i = 0;
    const adv = () => {
      if (c >= 3) { save([{ trial_index: 0, stimulus: "breathe", expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done"); return; }
      setStep(seq[i][0]);
      setTimeout(() => { i++; if (i >= seq.length) { i = 0; c++; setCycle(c); } adv(); }, seq[i][1]);
    };
    adv();
  }, [phase, save]);
  if (phase === "intro") return <Intro title="Breath Pace" body="Follow the pacer: inhale 4s, hold 4s, exhale 6s × 3. Mindfulness-based attention practice (Mrazek 2013)." onStart={() => setPhase("run")} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4"><p className="text-xs text-neutral-400">cycle {cycle + 1}/3 · {step}</p><div className={`flex h-40 w-40 items-center justify-center rounded-full bg-neutral-900 text-white transition-all duration-[4000ms] ${step === "inhale" ? "scale-125" : step === "exhale" ? "scale-75" : "scale-100"}`}>{step}</div></main>;
}

export function ReadGame({ taskKey = "read" }: { taskKey?: string }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [left, setLeft] = useState(600);
  const { saved, offline, save } = useSubmit(taskKey);
  useEffect(() => {
    if (phase !== "run") return;
    const iv = setInterval(() => setLeft((l) => { if (l <= 1) { clearInterval(iv); save([{ trial_index: 0, stimulus: "read", expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done"); return 0; } return l - 1; }), 1000);
    return () => clearInterval(iv);
  }, [phase, save]);
  if (phase === "intro") return <Intro title="Deep Read" cta="Start 10-minute read" body="Put the phone face-down and read one thing for 10 minutes. Then mark complete. Practices real-world task persistence." onStart={() => setPhase("run")} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  const m = Math.floor(left / 60), s = left % 60;
  return <main className="flex min-h-[70vh] flex-col items-center justify-center gap-4"><div className="text-6xl font-semibold tabular-nums">{m}:{String(s).padStart(2, "0")}</div><p className="text-sm text-neutral-500">Phone face-down. Keep reading.</p><button className="btn-ghost" onClick={() => { save([{ trial_index: 0, stimulus: "read-early", expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done"); }}>Finish early</button></main>;
}

export function CheckinGame({ taskKey = "checkin" }: { taskKey?: string }) {
  const [focus, setFocus] = useState(3); const [mood, setMood] = useState(3); const [sleep, setSleep] = useState(7);
  const [phase, setPhase] = useState<"form" | "done">("form");
  const { saved, offline, save } = useSubmit(taskKey);
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto max-w-md space-y-5 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Daily Check-in</h1>
      {[["Focus today", focus, setFocus, 5], ["Mood", mood, setMood, 5], ["Sleep hours", sleep, setSleep, 12]].map(([l, v, set, max]: any) => (
        <label key={l as string} className="card block p-4"><span className="text-sm font-medium">{l}: {v}</span><input type="range" min={1} max={max} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full" /></label>
      ))}
      <button className="btn-primary w-full" onClick={() => { save([{ trial_index: 0, stimulus: `f${focus}m${mood}s${sleep}`, expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done"); }}>Save check-in</button>
    </main>
  );
}

/* ---------- Dual: tap only when BOTH match ---------- */
export function DualGame({ taskKey = "dual", total = 24 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [stim, setStim] = useState({ color: "", num: 0 }); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0); const responded = useRef(false);
  const timer = useTimer(); const { saved, offline, save } = useSubmit(taskKey);
  const next = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    const c = Math.random() < 0.5 ? "red" : "blue"; const num = Math.floor(Math.random() * 10);
    setStim({ color: c, num }); setIdx(n); responded.current = false; start.current = performance.now();
    timer.current = setTimeout(() => {
      if (!responded.current) { const both = c === "red" && num % 2 === 0; trials.current.push({ trial_index: n, stimulus: `${c}${num}`, expected_action: both ? "respond" : "withhold", actual_action: null, reaction_time_ms: null, correct: !both }); }
      next(n + 1);
    }, 1500);
  }, [total, save, timer]);
  const tap = () => {
    if (phase !== "run" || responded.current) return;
    responded.current = true; clearTimeout(timer.current);
    const both = stim.color === "red" && stim.num % 2 === 0;
    trials.current.push({ trial_index: trials.current.length, stimulus: `${stim.color}${stim.num}`, expected_action: both ? "respond" : "withhold", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: both });
    next(trials.current.length);
  };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); });
  if (phase === "intro") return <Intro title="Dual Track" body="TAP only when BOTH hold: RED circle AND EVEN number. Otherwise withhold. Tests divided attention." onStart={() => { trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return <main className="flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-6" onClick={tap}><p className="text-xs text-neutral-400">{idx + 1} / {total} · red + even only</p><div className={`flex h-32 w-32 items-center justify-center rounded-full text-4xl font-bold text-white ${stim.color === "red" ? "bg-rose-500" : "bg-sky-500"}`}>{stim.num}</div><button className="tap-btn">TAP</button></main>;
}

/* ---------- Switch: rule alternates odd/even ---------- */
export function SwitchGame({ taskKey = "switch", total = 32 }: { taskKey?: string; total?: number }) {
  const [phase, setPhase] = useState<"intro" | "run" | "done">("intro");
  const [num, setNum] = useState(0); const [rule, setRule] = useState<"odd" | "even">("odd"); const [idx, setIdx] = useState(0);
  const trials = useRef<Trial[]>([]); const start = useRef(0);
  const { saved, offline, save } = useSubmit(taskKey);
  const next = useCallback((n: number) => {
    if (n >= total) { setPhase("done"); save(trials.current); return; }
    setNum(Math.floor(Math.random() * 10)); setRule(n % 8 < 4 ? "odd" : "even"); setIdx(n); start.current = performance.now();
  }, [total, save]);
  const pick = (choice: "odd" | "even") => {
    const ok = (num % 2 === 1) === (choice === "odd") && choice === rule;
    const correctChoice = (num % 2 === 1 ? "odd" : "even") === rule ? rule : rule === "odd" ? "even" : "odd";
    void correctChoice;
    trials.current.push({ trial_index: trials.current.length, stimulus: `${num}/${rule}`, expected_action: "respond", actual_action: "respond", reaction_time_ms: Math.round(performance.now() - start.current), correct: choice === ((num % 2 === 1 ? "odd" : "even")) });
    next(trials.current.length);
  };
  void ok;
  if (phase === "intro") return <Intro title="Rule Switch" body="The rule alternates every 8 trials: answer ODD or EVEN for the number shown. Tests cognitive flexibility (task-switching)." onStart={() => { trials.current = []; setPhase("run"); next(0); }} />;
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center gap-6 px-5">
      <p className="rounded-full bg-neutral-900 px-4 py-1 text-sm font-semibold text-white">Rule: {rule.toUpperCase()}? · {idx + 1}/{total}</p>
      <div className="text-9xl font-semibold tabular-nums">{num}</div>
      <div className="grid w-full grid-cols-2 gap-2"><button onClick={() => pick("odd")} className="btn-ghost">ODD</button><button onClick={() => pick("even")} className="btn-ghost">EVEN</button></div>
    </main>
  );
  function ok() { return true; }
}
