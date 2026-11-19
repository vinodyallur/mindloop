"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Done, Intro, useSubmit } from "./TaskShell";
import type { Trial } from "@/lib/api";

function useTimer() { const r = useRef<any>(null); useEffect(() => () => clearTimeout(r.current), []); return r; }

/* ---------- Shared game chrome: distinct backdrop + progress per family ---------- */
export function Stage({ family, title, sub, progress, children, onTap }: {
  family: string; title: string; sub: string; progress: number; children: React.ReactNode; onTap?: () => void;
}) {
  const bg: Record<string, string> = {
    focus: "bg-[#d3f5df]", signal: "bg-[#ffedb8]", memory: "bg-[#d8e7ff]",
    speed: "bg-[#ffd9e2]", calm: "bg-[#c9f2f1]", habit: "bg-[#f3e8c9]", body: "bg-[#e7f6c9]",
  };
  const dot: Record<string, string> = {
    focus: "bg-[#22c55e]", signal: "bg-[#f97316]", memory: "bg-[#3b82f6]",
    speed: "bg-[#ff4d6d]", calm: "bg-[#0ea5a4]", habit: "bg-[#b45309]", body: "bg-[#84cc16]",
  };
  const bar: Record<string, string> = {
    focus: "#22c55e", signal: "#f97316", memory: "#3b82f6",
    speed: "#ff4d6d", calm: "#0ea5a4", habit: "#b45309", body: "#84cc16",
  };
  return (
    <main onClick={onTap} className={`min-h-[70vh] transition-colors duration-500 ${bg[family] ?? "bg-[#fff8ef]"}`}>
      <div className="mx-auto flex min-h-[70vh] w-full max-w-[1400px] flex-col items-center justify-center gap-5 px-5 py-8">
        <div className="w-full rounded-full border-2 border-black/5 bg-white/80 px-4 py-2 backdrop-blur">
          <div className="mb-1 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#6b6257]">
            <span className="flex items-center gap-1.5"><span className={`inline-block h-2.5 w-2.5 rounded-full ${dot[family] ?? "bg-[#ffb020]"}`} />{title}</span>
            <span>{sub}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%`, background: bar[family] ?? "#ff4d6d" }} /></div>
        </div>
        {children}
      </div>
    </main>
  );
}

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
    <Stage family="focus" title={title} sub={`${idx + 1} / ${total}`} progress={idx / total}>
      <div className="card flex min-h-44 w-full items-center justify-center p-8 text-center shadow-sm">{stim?.show}</div>
      <div className="grid w-full grid-cols-2 gap-2">{options.map((o) => <button key={o} onClick={(e) => { e.stopPropagation(); pick(o); }} className="btn-ghost bg-white">{o}</button>)}</div>
      <p className="text-[11px] text-[#a39c8c]">keys 1-{options.length} · ← → work</p>
    </Stage>
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
  return <Stage family="signal" title="Steady Response" sub={`${idx + 1} / ${total} · skip 3`} progress={idx / total} onTap={tap}><div className="flex h-52 w-52 items-center justify-center rounded-[2rem] bg-white text-8xl font-semibold tabular-nums shadow-sm ring-1 ring-black/5">{digit}</div><p className="text-[11px] text-[#a39c8c]">tap anywhere except on 3</p></Stage>;
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
  return <Stage family="signal" title="Stop Signal" sub={`${idx + 1} / ${total}`} progress={idx / total} onTap={tap}><div className={`flex h-44 w-44 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg transition-colors ${stop ? "bg-rose-500" : "bg-emerald-500"}`}>{stop ? "STOP" : "GO"}</div><p className="text-[11px] text-[#a39c8c]">green = tap · red = freeze</p></Stage>;
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
  return <Stage family="memory" title={`N-Back ${n}`} sub={`${idx + 1} / ${total}`} progress={idx / total} onTap={tap}><div className="flex gap-2">{seq.current.slice(-3).map((c, i) => <div key={i} className={`flex h-20 w-20 items-center justify-center rounded-2xl text-4xl font-semibold ${i === 2 ? "bg-[#b3541e] text-white shadow" : "bg-white text-[#a39c8c] ring-1 ring-black/5"}`}>{c}</div>)}</div><p className="text-[11px] text-[#a39c8c]">tap MATCH only if letter = {n} back</p><button className="btn-primary">MATCH</button></Stage>;
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
  if (phase === "show") return <Stage family="memory" title="Digit Span" sub={`length ${len}`} progress={showIdx / digits.length}><div className="flex gap-2">{digits.slice(0, showIdx).map((d, i) => <div key={i} className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#b3541e] text-3xl font-semibold text-white shadow">{d}</div>)}</div><p className="text-[11px] text-[#a39c8c]">memorize…</p></Stage>;
  return (
    <Stage family="memory" title="Digit Span" sub={`recall ${len}`} progress={1}>
      <div className="flex gap-2">{Array.from({ length: len }, (_, i) => <div key={i} className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-semibold ${entry[i] ? "bg-[#b3541e] text-white" : "bg-white text-[#a39c8c] ring-1 ring-black/10"}`}>{entry[i] ?? "·"}</div>)}</div>
      <input value={entry} onChange={(e) => setEntry(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="digits" className="w-full rounded-2xl border border-[#e5ddcc] bg-white px-4 py-3 text-center text-2xl tracking-[0.3em] outline-none focus:border-[#b3541e]" autoFocus />
      <button onClick={submit} className="btn-primary w-full">Submit</button>
    </Stage>
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
    <Stage family="memory" title="Sequence Echo" sub={phase === "show" ? "watch…" : `${pos + 1}/${seq.length}`} progress={pos / Math.max(seq.length, 1)}>
      <div className="grid w-full grid-cols-2 gap-3">
        {COLORS.map((c, i) => <button key={i} onClick={() => press(i)} aria-label={`pad ${i + 1}`} className={`h-28 rounded-[1.5rem] shadow-sm transition-all duration-150 ${c} ${lit === i ? "scale-95 brightness-125 ring-4 ring-[#b3541e]/20" : "opacity-80"}`} />)}
      </div>
      <p className="text-[11px] text-[#a39c8c]">{phase === "show" ? "memorize the order" : "repeat it back"}</p>
    </Stage>
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
    <Stage family="memory" title="Pair Match" sub={`${found.length / 2}/6 · ${moves} moves`} progress={found.length / deck.length}>
      <div className="grid w-full grid-cols-4 gap-2">
        {deck.map((c, i) => (
          <button key={i} onClick={() => flip(i)} aria-label={`card ${i + 1}`} className={`flex aspect-square items-center justify-center rounded-2xl text-3xl transition-all duration-200 ${open.includes(i) || found.includes(i) ? "rotate-0 bg-white shadow-sm ring-1 ring-[#b3541e]" : "bg-indigo-100 ring-1 ring-indigo-200 hover:bg-indigo-200"}`}>
            {open.includes(i) || found.includes(i) ? c : <span className="text-indigo-300">?</span>}
          </button>
        ))}
      </div>
    </Stage>
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
    <Stage family="memory" title="Grid Recall" sub={phase === "show" ? "memorize…" : `${picked.length}/${count}`} progress={picked.length / count}>
      <div className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, i) => (
          <button key={i} onClick={() => phase === "input" && toggle(i)} aria-label={`cell ${i + 1}`} className={`aspect-square rounded-2xl transition-all ${phase === "show" && targets.includes(i) ? "scale-95 bg-indigo-600 shadow" : picked.includes(i) ? "bg-indigo-200 ring-1 ring-indigo-400" : "bg-white ring-1 ring-black/10"}`} />
        ))}
      </div>
    </Stage>
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
    <Stage family="focus" title={title} sub={`${idx + 1} / ${total}`} progress={idx / total}>
      <div className="grid w-full grid-cols-4 gap-2">{cells.map((c, i) => <button key={i} onClick={() => tap(i)} aria-label={`option ${i + 1}`} className="flex h-16 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-black/5 transition active:scale-90 active:bg-emerald-50">{c}</button>)}</div>
      <p className="text-[11px] text-[#a39c8c]">scan fast · tap the odd one</p>
    </Stage>
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
    <Stage family="speed" title="Trail Connect" sub={`${pos}/${SEQ.length}`} progress={pos / SEQ.length}>
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm shadow-sm ring-1 ring-black/5">Next <b className="text-lg">{SEQ[pos]}</b><span className="text-[#a39c8c]">→</span><span className="text-[#a39c8c]">{SEQ.slice(pos + 1, pos + 3).join(" · ")}</span></div>
      <div className="grid w-full grid-cols-4 gap-2">
        {order.map((li) => (
          <button key={li} onClick={() => tap(li)} disabled={SEQ.slice(0, pos).includes(SEQ[li])} className="flex h-16 items-center justify-center rounded-2xl bg-white text-xl font-semibold shadow-sm ring-1 ring-black/5 transition active:scale-90 disabled:opacity-15">{SEQ[li]}</button>
        ))}
      </div>
    </Stage>
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
    <main onClick={tap} className={`flex min-h-[70vh] cursor-pointer flex-col items-center justify-center gap-4 transition-colors duration-300 ${phase === "cue" ? "bg-emerald-400" : "bg-[#f7e6e2]"}`}>
      <p className={`text-xs font-medium uppercase tracking-widest ${phase === "cue" ? "text-white" : "text-[#a39c8c]"}`}>{idx + 1} / {total} · vigilance</p>
      <div className={`flex h-48 w-48 items-center justify-center rounded-full text-3xl font-semibold tabular-nums shadow-lg ${phase === "cue" ? "bg-white text-[#23201a]" : "bg-white/60 text-[#a39c8c] ring-1 ring-black/5"}`}>{phase === "cue" ? (rt ?? "TAP!") : "···"}</div>
      <p className={`text-[11px] ${phase === "cue" ? "text-white" : "text-[#a39c8c]"}`}>{phase === "cue" ? "tap now!" : "wait for the flash"}</p>
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
    <Stage family="speed" title="Rhythm Tap" sub={`${idx} / ${total}`} progress={idx / total} onTap={tap}>
      <div className="flex w-full items-center justify-center gap-1">{Array.from({ length: 16 }, (_, i) => <div key={i} className={`h-10 w-2 rounded-full transition-all ${i === idx % 16 ? "bg-[#b3541e]" : "bg-black/10"}`} />)}</div>
      <div className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition-all duration-150 ${beat ? "scale-110 bg-[#b3541e]" : "bg-neutral-300"}`}>♪</div>
      <p className="text-[11px] text-[#a39c8c]">tap exactly on the pulse</p>
    </Stage>
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
    <Stage family="body" title="Trace Path" sub={`${Math.round(n / 10)}s · err ${err.toFixed(1)}`} progress={n / 200}>
      <div className="relative h-72 w-full touch-none overflow-hidden rounded-[1.5rem] bg-white shadow-sm ring-1 ring-black/5" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; }} onPointerDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }; }}>
        <div className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-500 shadow-lg" style={{ left: `${dot.x}%`, top: `${dot.y}%` }} />
        <div className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#b3541e] bg-white/70" style={{ left: `${ptr.current.x}%`, top: `${ptr.current.y}%` }} />
      </div>
      <p className="text-[11px] text-[#a39c8c]">keep your ring on the green dot</p>
    </Stage>
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
  return <Stage family="calm" title="Breath Pace" sub={`cycle ${cycle + 1}/3`} progress={cycle / 3}><div className="relative flex h-56 w-56 items-center justify-center"><div className={`absolute inset-0 rounded-full bg-teal-100 transition-all duration-[4000ms] ${step === "inhale" ? "scale-100 opacity-100" : "scale-50 opacity-40"}`} /><div className={`relative flex h-32 w-32 items-center justify-center rounded-full bg-teal-700 text-sm font-medium uppercase tracking-widest text-white transition-all duration-[4000ms] ${step === "inhale" ? "scale-110" : step === "exhale" ? "scale-90" : "scale-100"}`}>{step}</div></div><p className="text-[11px] text-[#a39c8c]">inhale 4s · hold 4s · exhale 6s</p></Stage>;
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
  return <Stage family="calm" title="Deep Read" sub="phone face-down" progress={1 - left / 600}><div className="text-7xl font-semibold tabular-nums tracking-tight">{m}:{String(s).padStart(2, "0")}</div><div className="flex gap-1">{Array.from({ length: 10 }, (_, i) => <div key={i} className={`h-1.5 w-6 rounded-full ${i < (1 - left / 600) * 10 ? "bg-teal-600" : "bg-black/10"}`} />)}</div><button className="btn-ghost bg-white" onClick={() => { save([{ trial_index: 0, stimulus: "read-early", expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done"); }}>Finish early</button></Stage>;
}

export function CheckinGame({ taskKey = "checkin" }: { taskKey?: string }) {
  const [focus, setFocus] = useState(3); const [mood, setMood] = useState(3); const [sleep, setSleep] = useState(7);
  const [veg, setVeg] = useState(3); const [active, setActive] = useState(20); const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"form" | "done">("form");
  const { saved, offline, save } = useSubmit(taskKey);
  if (phase === "done") return <Done saved={saved} offline={offline} />;
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-4 px-5 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Daily Check-in</h1>
      <p className="text-xs text-[#a39c8c]">Q1 behavior snapshot: mood, sleep, diet, activity. Self-report only.</p>
      {[["Focus today", focus, setFocus, 5], ["Mood", mood, setMood, 5], ["Sleep hours", sleep, setSleep, 12], ["Fruit & veg servings", veg, setVeg, 8], ["Active minutes", active, setActive, 120]].map(([l, v, set, max]: any) => (
        <label key={l as string} className="card block p-4"><span className="text-sm font-medium">{l}: {v}</span><input type="range" min={0} max={max} value={v} onChange={(e) => set(Number(e.target.value))} className="mt-2 w-full" /></label>
      ))}
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything on your mind? (optional)" rows={2} className="card w-full p-4 text-sm outline-none" />
      <button className="btn-primary w-full" onClick={async () => {
        const { postCheckin } = await import("@/lib/api");
        await postCheckin(focus, mood, note, { sleep_hours: sleep, fruit_veg: veg, active_minutes: active });
        save([{ trial_index: 0, stimulus: `f${focus}m${mood}s${sleep}`, expected_action: "respond", actual_action: "respond", reaction_time_ms: null, correct: true }]); setPhase("done");
      }}>Save check-in ✓</button>
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
  return <Stage family="focus" title="Dual Track" sub={`${idx + 1} / ${total}`} progress={idx / total} onTap={tap}><div className="flex w-full gap-3"><div className={`flex h-28 flex-1 items-center justify-center rounded-2xl text-sm font-bold uppercase tracking-widest text-white ${stim.color === "red" ? "bg-rose-500" : "bg-sky-500"}`}>{stim.color}</div><div className="flex h-28 flex-1 items-center justify-center rounded-2xl bg-white text-5xl font-semibold tabular-nums shadow-sm ring-1 ring-black/5">{stim.num}</div></div><p className="text-[11px] text-[#a39c8c]">tap only when RED + EVEN together</p></Stage>;
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
    <Stage family="focus" title="Rule Switch" sub={`${idx + 1}/${total}`} progress={idx / total}>
      <div className={`rounded-full px-5 py-1.5 text-sm font-bold uppercase tracking-widest text-white shadow ${rule === "odd" ? "bg-amber-500" : "bg-sky-600"}`}>rule: {rule}</div>
      <div className="flex h-44 w-44 items-center justify-center rounded-[2rem] bg-white text-8xl font-semibold tabular-nums shadow-sm ring-1 ring-black/5">{num}</div>
      <div className="grid w-full grid-cols-2 gap-2"><button onClick={() => pick("odd")} className="btn-ghost bg-white py-4 text-lg font-bold">ODD</button><button onClick={() => pick("even")} className="btn-ghost bg-white py-4 text-lg font-bold">EVEN</button></div>
    </Stage>
  );
  function ok() { return true; }
}
