const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-key-change-me";
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

async function req(path: string, init: RequestInit = {}) {
  if (DEMO_MODE) return demoResponse(path, init);
  try {
    const r = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": KEY, ...(init.headers || {}) },
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// ---- Web-only demo mode: full journey works with zero backend ----
// Used by Vercel/Replit one-click hosting. Scores locally, persists in
// localStorage so baselines, plans and reports survive reloads.
const LS_KEY = "mindloop-demo-v1";
function loadStore(): Record<string, any> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch { /* fresh store */ }
  return {};
}
const demoStore: Record<string, any> = typeof localStorage !== "undefined" ? loadStore() : {};
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(demoStore)); } catch { /* private mode */ }
}

// Transparent scoring, mirrored from services/api/app/analytics.py
function scoreTrials(taskKey: string, trials: any[]) {
  const scored = trials.filter((t) => !t.is_practice);
  if (scored.length < 10) return { metrics: {}, validity: "invalid", reason: `insufficient_trials:${scored.length}<10` };
  const rts = scored.map((t) => t.reaction_time_ms).filter((v) => typeof v === "number");
  const hits = scored.filter((t) => t.expected_action === "respond" && t.actual_action === "respond").length;
  const targets = scored.filter((t) => t.expected_action === "respond").length;
  const nontargets = scored.length - targets;
  const omissions = targets - hits;
  const commissions = scored.filter((t) => t.expected_action === "withhold" && t.actual_action === "respond").length;
  const m: Record<string, number> = {
    accuracy: Math.round((scored.filter((t) => t.correct).length / scored.length) * 1000) / 1000,
    omissions, commissions,
    hit_rate: targets ? Math.round((hits / targets) * 1000) / 1000 : 0,
    false_alarm_rate: nontargets ? Math.round((commissions / nontargets) * 1000) / 1000 : 0,
  };
  if (rts.length) {
    const sorted = [...rts].sort((a, b) => a - b);
    m.median_rt_ms = Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10;
    const mean = rts.reduce((a, b) => a + b, 0) / rts.length;
    m.rt_variability_ms = rts.length > 1 ? Math.round(Math.sqrt(rts.reduce((a, b) => a + (b - mean) ** 2, 0) / rts.length) * 10) / 10 : 0;
  }
  if (taskKey === "shelf" || taskKey === "quiz" || taskKey === "pairs" || taskKey === "span" || taskKey === "sequence" || taskKey === "grid") {
    m.max_span = Math.max(0, ...scored.map((t) => t.span || (t.correct ? 1 : 0)));
  }
  if (taskKey === "steadiness") {
    const sway = scored.map((t) => t.sway).filter((v) => typeof v === "number");
    if (sway.length) {
      const mean = sway.reduce((a, b) => a + b, 0) / sway.length;
      const sd = sway.length > 1 ? Math.sqrt(sway.reduce((a, b) => a + (b - mean) ** 2, 0) / sway.length) : 0;
      m.sway_variability = Math.round(sd * 10000) / 10000;
      m.steadiness_score = Math.round(Math.max(0, Math.min(100, 100 - sd * 400)) * 10) / 10;
    }
  }
  return { metrics: m, validity: "valid", reason: null };
}

function median(vals: number[]) {
  const s = [...vals].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}
function mad(vals: number[], centre: number) {
  return median(vals.map((v) => Math.abs(v - centre)));
}
const LOWER_BETTER = new Set(["omissions", "commissions", "false_alarm_rate", "median_rt_ms", "rt_variability_ms", "interference_ms", "sway_variability"]);
function metricIndex(key: string, value: number, centre: number, spread: number) {
  const sigma = 1.4826 * spread;
  let idx = sigma <= 1e-9 ? (value === centre ? 50 : 100) : Math.max(0, Math.min(100, 50 + ((value - centre) / sigma) * 20));
  if (LOWER_BETTER.has(key)) idx = 100 - idx;
  return Math.round(idx * 10) / 10;
}

function demoBaselines() {
  // { "task.metric": [values] } from stored sessions
  const byMetric: Record<string, number[]> = {};
  for (const s of demoStore.sessions || []) {
    for (const [k, v] of Object.entries(s.metrics || {})) {
      const key = `${s.task_key}.${k}`;
      (byMetric[key] = byMetric[key] || []).push(v as number);
    }
  }
  return Object.entries(byMetric).map(([key, values]) => {
    const [task_key, ...rest] = key.split(".");
    const metric_key = rest.join(".");
    const centre = median(values);
    return { task_key, metric_key, centre: Math.round(centre * 1000) / 1000,
             variability_mad: Math.round(mad(values, centre) * 1000) / 1000,
             valid_sessions: values.length,
             confidence: values.length >= 5 ? "established" : values.length >= 3 ? "moderate" : "building" };
  });
}

function demoIndex(taskFilter = "", metricFilter = "") {
  const bl = demoBaselines();
  const blMap: Record<string, any> = {};
  for (const b of bl) blMap[`${b.task_key}.${b.metric_key}`] = b;
  const sessions = (demoStore.sessions || []).filter((s: any) => !taskFilter || s.task_key === taskFilter);
  const series = sessions.slice(-30).map((s: any) => {
    const mets: Record<string, number> = {};
    for (const [k, v] of Object.entries(s.metrics || {})) {
      if (!metricFilter || k === metricFilter) mets[k] = v as number;
    }
    const indexed: Record<string, number> = {};
    for (const [k, v] of Object.entries(mets)) {
      const b = blMap[`${s.task_key}.${k}`];
      if (b) indexed[k] = metricIndex(k, v, b.centre, b.variability_mad);
    }
    const vals = Object.values(indexed);
    const comp = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
    return { session_id: s.id, task_key: s.task_key, at: s.at, metrics: mets, indexed, index: comp };
  });
  const idxVals = series.map((s: any) => s.index).filter((v: any) => typeof v === "number");
  const cur = idxVals.length ? idxVals[idxVals.length - 1] : null;
  let trend = null;
  if (idxVals.length >= 3) {
    const half = Math.floor(idxVals.length / 2);
    const a = idxVals.slice(0, half), b = idxVals.slice(half);
    trend = Math.round(((b.reduce((x: number, y: number) => x + y, 0) / b.length) - (a.reduce((x: number, y: number) => x + y, 0) / a.length)) * 10) / 10;
  }
  return { index: cur, trend_delta: trend, sessions: idxVals.length,
           confidence: bl.length ? bl[0].confidence : "building",
           scale_note: "0 = far below your usual pattern, 50 = at your baseline median, 100 = far above. Descriptive only, not a diagnosis.",
           series, baselines: bl };
}

function demoStory() {
  const idx = demoIndex();
  const sessions = demoStore.sessions || [];
  const n = sessions.length;
  const name = demoStore.name && demoStore.name !== "Demo User" ? demoStore.name : "friend";
  const cur = idx.index;
  const byTask: Record<string, number[]> = {};
  for (const s of idx.series) if (typeof s.index === "number") (byTask[s.task_key] = byTask[s.task_key] || []).push(s.index);
  const avg = (k: string) => { const v = byTask[k]; return v ? v.reduce((a, b) => a + b, 0) / v.length : undefined; };
  const attention = avg("pvt") ?? avg("cpt");
  const focus = avg("sart") ?? avg("flanker");
  const coord = avg("steadiness");
  const memory = avg("shelf") ?? avg("nback") ?? avg("span") ?? avg("pairs");
  const lvl = (v: number | undefined) => v == null ? null : v >= 70 ? "super" : v >= 55 ? "good" : v >= 40 ? "growing" : "sleepy";
  const storyFor = (area: string, value: number | undefined): string => {
    const missing: Record<string, string> = {
      attention: "We haven't measured your attention span yet — play Vigilance Tap and I'll tell you all about it! ⚡",
      focus: "We haven't measured your focus yet — play Steady Response and come back! 🎯",
      coordination: "We haven't measured your coordination yet — try Hold Steady for 30 seconds! 🤸",
      memory: "We haven't measured your memory yet — play Remember the Shelf! 🛒" };
    if (value == null || n === 0) return missing[area];
    const v = Math.round(value);
    const bank: Record<string, Record<string, string>> = {
      attention: { super: "You can stick with boring things for a long time — like a cat watching a mouse hole. 🐱", good: "You keep watching even when it's dull. That's the exact muscle doomscrolling weakens — and you're training it! 💪", growing: "Your attention is like a young plant — it looks away sometimes, and every game waters it. 🌱", sleepy: "Your attention feels sleepy right now. Tired brains wander — more sleep and less scrolling wake it up. 😴" },
      focus: { super: "Distractions bounce right off you — like rain off a raincoat! 🧥", good: "You mostly ignore the tricky bits and catch the right ones. Sharp eyes! 👀", growing: "Sometimes the tricky bits fool you — that's normal, your focus filter is still learning. 🔎", sleepy: "Everything grabs your attention right now. That's okay — it means your brain needs rest, not scolding. 🤗" },
      coordination: { super: "Your hands are super steady — like a surgeon or an artist! 🎨", good: "Your hands hold nice and still. Good teamwork between brain and body! 🤝", growing: "A little wobble is totally normal — even grown-ups wobble. Practice makes it smoother. 🌵", sleepy: "Lots of wobble today — tired hands wobble more. Try again after rest. 💤" },
      memory: { super: "Your memory is like an elephant — it never forgets! 🐘", good: "You remember most things you see. Your brain's sticky notes are working well! 📝", growing: "Some things slip away — that's how all brains start. Each game adds more sticky notes! 📌", sleepy: "Things slip away fast right now. Sleep is when memories get saved — check your bedtime. 🌙" } };
    const names: Record<string, string> = { attention: "attention span", focus: "focus", coordination: "coordination", memory: "memory" };
    return `Your ${names[area]} scores ${v} out of 100. ` + bank[area][lvl(value)!];
  };
  const cards = [
    { title: "🎯 Attention span", level: lvl(attention), story: storyFor("attention", attention) },
    { title: "🔎 Focus", level: lvl(focus), story: storyFor("focus", focus) },
    { title: "🤸 Coordination", level: lvl(coord), story: storyFor("coordination", coord) },
    { title: "🧠 Memory", level: lvl(memory), story: storyFor("memory", memory) },
  ];
  const screens = demoStore.screens || [];
  const screenCard = screens.length ? (() => {
    const avgD = screens.reduce((a: number, s: any) => a + s.doomscroll_minutes, 0) / screens.length;
    const avgS = screens.reduce((a: number, s: any) => a + s.screen_minutes, 0) / screens.length;
    return { title: "📵 Screen-time sidekick", level: avgD <= 60 ? "good" : avgD <= 150 ? "growing" : "sleepy",
      story: `You scroll about ${Math.round(avgS)} minutes a day, and ${Math.round(avgD)} of those are doomscrolling. ` + (avgD <= 60 ? "That's light — your eyes and brain get lots of rest. " : avgD <= 150 ? "Cutting even 15 minutes of scrolling can make focus games feel easier. " : "Lots of scrolling can make your brain feel tired. Try swapping 15 scroll-minutes for a walk. ") };
  })() : null;
  const improvements = [];
  if (n < 4) improvements.push({ emoji: "🎮", text: "Finish your 4 baseline games first — that's the starting line everything is measured from." });
  improvements.push({ emoji: "📖", text: "Read a book for 15 minutes a day. Readers beat scrollers at attention games — every single time." });
  if (screens.length && screens[screens.length - 1].doomscroll_minutes > 60) improvements.push({ emoji: "📵", text: `You doomscroll ~${Math.round(screens[screens.length - 1].doomscroll_minutes)} min a day. Swap 15 of those minutes for a walk and watch your focus scores climb.` });
  else improvements.push({ emoji: "📵", text: "Keep doomscrolling small. When you catch yourself scrolling, ask: 'am I enjoying this, or just scrolling?'" });
  if (idx.trend_delta != null && idx.trend_delta < 0) improvements.push({ emoji: "😴", text: "Your scores dipped a little. The usual suspects: less sleep, more stress, or playing while tired. Rest is training too." });
  else improvements.push({ emoji: "🎯", text: "Play your 5 daily games at the same time each day — brains love routine, and scores get steadier." });
  improvements.push({ emoji: "🤸", text: "Do the 30-second Hold Steady every day. Steady hands mean a calm, focused brain." });
  improvements.push({ emoji: "🌙", text: "Sleep 8 hours. Memories from today's games get saved overnight — no sleep, no saving." });
  const headline = cur == null ? `Hey ${name}! Play your 4 baseline games and I'll write your story here. 🌱`
    : cur >= 70 ? `Wow ${name}, your brain is on fire! Your baseline is ${Math.round(cur)} out of 100. 🔥`
    : cur >= 55 ? `Nice going ${name}! Your baseline is ${Math.round(cur)} out of 100 and climbing. 💪`
    : cur >= 40 ? `Hey ${name}, your baseline is ${Math.round(cur)} out of 100 — a young plant getting stronger every day. 🌱`
    : `Hey ${name}, your baseline is ${Math.round(cur)} out of 100. Tired brains can wake up — small steps work. 🤗`;
  return { headline, trend_line: idx.trend_delta != null && n >= 3 ? `Lately you've moved ${idx.trend_delta >= 0 ? "up" : "down"} by ${Math.abs(idx.trend_delta)} points.` : "",
    index: cur, sessions: n, cards, screen_card: screenCard, improvements: improvements.slice(0, 5),
    note: "A friendly story about your games. Not a medical report, not a diagnosis." };
}

function demoResponse(path: string, init: RequestInit) {
  const body = (() => { try { return JSON.parse((init.body as string) || "{}"); } catch { return {}; } })();
  if (path === "/api/v1/me") return Promise.resolve({ id: "demo", email: "demo@mindloop.local", display_name: demoStore.name || "Demo User", age_band: "18-25", age: demoStore.age ?? null, gender: demoStore.gender || "", country: demoStore.country || "", language: "en", onboarding_done: !!demoStore.onboarded, devices: demoStore.devices || {}, consents: {}, notice: "Demo mode — runs fully in your browser." });
  if (path === "/api/v1/me/profile") { Object.assign(demoStore, { name: body.name, age: body.age, gender: body.gender, country: body.country }); persist(); return Promise.resolve({ saved: true, age_band: "18-25" }); }
  if (path === "/api/v1/me/devices") { demoStore.devices = { ...(demoStore.devices || {}), [body.kind]: { name: body.name, connected: true } }; persist(); return Promise.resolve({ devices: demoStore.devices }); }
  if (path === "/api/v1/me/onboarding-complete") { demoStore.onboarded = true; persist(); return Promise.resolve({ onboarding_done: true }); }
  if (path === "/api/v1/screentime") { demoStore.screens = [...(demoStore.screens || []), { day: "today", screen_minutes: body.screen_minutes, doomscroll_minutes: body.doomscroll_minutes }]; persist(); return Promise.resolve({ day: "today", ...body }); }
  if (path === "/api/v1/screentime/latest") return Promise.resolve(demoStore.screens || []);
  if (path === "/api/v1/baseline/assessment-set") {
    const done: string[] = demoStore.baselineDone || [];
    const items = [
      { task_key: "pvt", title: "Vigilance Tap", why: "Pure attention span in 3 minutes", href: "/games/pvt", emoji: "⚡" },
      { task_key: "shelf", title: "Remember the Shelf", why: "See objects for 20s, tap what was there", href: "/games/shelf", emoji: "🛒" },
      { task_key: "schulte", title: "Schulte 25", why: "Tap 1 to 25 in order", href: "/games/schulte", emoji: "🔢" },
      { task_key: "quiz", title: "Habits & Puzzles Quiz", why: "Self-reflection + brain teasers", href: "/assessment/quiz", emoji: "❓" },
    ].map((t) => ({ ...t, done: done.includes(t.task_key) }));
    return Promise.resolve({ items, completed: done.length, total: 4, baseline_ready: done.length >= 4 });
  }
  if (path === "/api/v1/assessment-sessions") { demoStore.lastTask = body.task_key; return Promise.resolve({ session_id: `demo-${Date.now()}`, task_key: body.task_key }); }
  if (path.includes("/trials")) { demoStore.lastTrials = body.trials || []; return Promise.resolve({ stored: (body.trials || []).length }); }
  if (path.includes("/complete")) {
    const { metrics, validity } = scoreTrials(demoStore.lastTask || "pvt", demoStore.lastTrials || []);
    demoStore.sessions = [...(demoStore.sessions || []), { id: `demo-${Date.now()}`, task_key: demoStore.lastTask || "pvt", at: new Date().toISOString(), metrics }];
    demoStore.baselineDone = [...new Set([...(demoStore.baselineDone || []), demoStore.lastTask || "pvt"])];
    persist();
    return Promise.resolve({ session_id: "demo", validity_status: validity, metrics, change_events: [] });
  }
  if (path === "/api/v1/plan/today") {
    if (!demoStore.plan) {
      demoStore.plan = [
        { item_key: "pvt", kind: "game", title: "Vigilance Tap", detail: "/games/pvt", done: false },
        { item_key: "shelf", kind: "game", title: "Remember the Shelf", detail: "/games/shelf", done: false },
        { item_key: "schulte", kind: "game", title: "Schulte 25", detail: "/games/schulte", done: false },
        { item_key: "orbit", kind: "game", title: "Orbit Odd-One-Out", detail: "/games/orbit", done: false },
        { item_key: "quiz", kind: "game", title: "Habits & Puzzles Quiz", detail: "/assessment/quiz", done: false },
        { item_key: "read-15", kind: "habit", title: "Read a book for 15 minutes", detail: "Phone face-down.", done: false },
      ];
    }
    const items = demoStore.plan;
    const doneN = items.filter((i: any) => i.done).length;
    return Promise.resolve({ day: "today", items, done: doneN, total: items.length, streak: 0, buddy: { tone: doneN >= items.length ? "celebrate" : doneN > 0 ? "encourage" : "welcome", text: doneN >= items.length ? "All done! Rest well. 🌟" : doneN > 0 ? `${doneN} of ${items.length} done — nice work! 💪` : "Hey, buddy here. Pick just one task to start. 🙂" } });
  }
  if (path === "/api/v1/plan/complete") {
    const it = (demoStore.plan || []).find((i: any) => i.item_key === body.item_key);
    if (!it) return Promise.resolve(null);
    it.done = true; persist();
    return Promise.resolve({ recorded: body.item_key });
  }
  if (path === "/api/v1/plan/streak") return Promise.resolve({ streak: 0, buddy: { tone: "welcome", text: "Hey, buddy here. Pick just one task to start. 🙂" }, day: "today" });
  if (path === "/api/v1/reports/story") return Promise.resolve(demoStory());
  // ---- Remaining pages: dashboard, outcomes, safety, program ----
  if (path === "/api/v1/dashboard/summary") {
    const sessions = demoStore.sessions || [];
    return Promise.resolve({
      me: { display_name: demoStore.name || "Demo User" },
      history: sessions.slice(-10).reverse().map((s: any) => ({ session_id: s.id, task_key: s.task_key, started_at: s.at, validity_status: "valid", metrics: s.metrics })),
      baselines: demoBaselines(), wearables_latest: {}, change_events: [],
      program: (demoStore.plan || []).map((p: any) => ({ activity_key: p.item_key, title: p.title, duration_seconds: 180, href: p.detail })),
      wearable_source: "Demo mode — connect the backend for wearable sync",
    });
  }
  if (path === "/api/v1/reports/latest") {
    return Promise.resolve({ summary: "Demo summary — play games to build your real baseline.", baselines: demoBaselines(), change_events: [], history: [],
      limitations: ["Demo mode runs fully in your browser.", "Connect the backend for persistent history."],
      next_steps: ["Play your 4 baseline games.", "Check today's plan."] });
  }
  if (path === "/api/v1/baselines") return Promise.resolve(demoBaselines());
  if (path.startsWith("/api/v1/baseline/index")) {
    const q = new URLSearchParams(path.split("?")[1] || "");
    return Promise.resolve(demoIndex(q.get("task_key") || "", q.get("metric_key") || ""));
  }
  if (path === "/api/v1/baseline/forecast") {
    const models: Record<string, any> = {};
    const byKey: Record<string, number[]> = {};
    for (const s of demoStore.sessions || []) for (const [k, v] of Object.entries(s.metrics || {})) (byKey[`${s.task_key}.${k}`] = byKey[`${s.task_key}.${k}`] || []).push(v as number);
    for (const [k, vals] of Object.entries(byKey)) {
      const c = median(vals), m = mad(vals, c);
      models[k] = { n: vals.length, median: c, mad: m, forecast: Math.round(vals[vals.length - 1] * 1000) / 1000, band: [0, 0] };
    }
    return Promise.resolve({ models, note: "Demo forecast from this browser session." });
  }
  if (path === "/api/v1/outcomes/instruments") return Promise.resolve({ who5: { questions: ["cheerful", "calm", "active", "rested", "interested"], scale: [0, 1, 2, 3, 4, 5], max: 25 } });
  if (path === "/api/v1/outcomes/submit") {
    demoStore.surveys = [...(demoStore.surveys || []), { instrument: body.instrument, score: (body.answers || []).reduce((a: number, b: number) => a + b, 0), at: new Date().toISOString() }];
    persist();
    const last = demoStore.surveys[demoStore.surveys.length - 1];
    return Promise.resolve({ instrument: body.instrument, score: last.score, max: 25, flag: null, note: "Demo mode." });
  }
  if (path.startsWith("/api/v1/outcomes/history")) return Promise.resolve(demoStore.surveys || []);
  if (path === "/api/v1/outcomes/30day" || path === "/api/v1/outcomes/windows") {
    const who = (demoStore.surveys || []).filter((s: any) => s.instrument === "who5");
    const d = who.length >= 2 ? { baseline: who[0].score, latest: who[who.length - 1].score, delta: who[who.length - 1].score - who[0].score, n: who.length, max: 25 } : null;
    const base: any = { _behavior: { active_days: 1, target_days_met: 1, maintenance_pct: 100 }, _thresholds: {} };
    if (d) base.who5 = d;
    if (path.endsWith("/windows")) { base["30d"] = base; base["90d"] = base; base["180d"] = base; base._design = { arm: "demo" }; }
    return Promise.resolve(base);
  }
  if (path === "/api/v1/behavior/summary") {
    const screens = demoStore.screens || [];
    return Promise.resolve({ n_checkins: screens.length, fruit_veg_servings: null, sugary_drinks: null, alcohol_days_pw: null, active_minutes: null, sleep_hours_self: null, meds_adherence_pct: null, steps_7d: [], sleep_min_7d: [], benchmarks: {} });
  }
  if (path === "/api/v1/safety/flags") return Promise.resolve([]);
  if (path === "/api/v1/referrals" && (!init.method || init.method === "GET")) return Promise.resolve([]);
  if (path === "/api/v1/referrals") { const id = `demo-ref-${Date.now()}`; demoStore.refs = [...(demoStore.refs || []), { id, reason: body.reason, state: "referred", owner: "care-team", history: [] }]; persist(); return Promise.resolve({ id, state: "referred" }); }
  if (path.includes("/transition")) return Promise.resolve({ id: "demo", state: body.state });
  if (path.includes("/nudge")) return Promise.resolve({ id: "demo", channel: body.channel, attempts: 1 });
  if (path.includes("/fhir")) return Promise.resolve({ resourceType: "ServiceRequest", status: "draft" });
  if (path === "/api/v1/referrals/overdue") return Promise.resolve([]);
  if (path === "/api/v1/model-card") return Promise.resolve({ model: "Demo mode — no ML running", intended_use: "Demo only.", inputs: "This browser session.", limits: ["No persistence across devices."], versions: "demo", challenge: "Connect the backend." });
  if (path === "/api/v1/consents") return Promise.resolve({ data_category: body.data_category, granted: body.granted });
  if (path === "/api/v1/program/today") return Promise.resolve({ activities: [], note: "Demo mode." });
  if (path === "/api/v1/program/completions") return Promise.resolve({ recorded: body.activity_key });
  if (path === "/api/v1/wearables/sync") return Promise.resolve({ stored: 4, skipped: 0, demo: true });
  if (path === "/api/v1/checkin") return Promise.resolve({ recorded: true, flag: null });
  if (path === "/api/v1/study/assign") return Promise.resolve({ arm: body.arm });
  if (path === "/api/v1/study/export") return Promise.resolve({ n: 1, rows: [], method: "demo" });
  if (path === "/api/v1/me/export") return Promise.resolve({ demo: true });
  return Promise.resolve(null);
}

export interface Trial {
  trial_index: number; stimulus: string; expected_action: "respond" | "withhold";
  actual_action: "respond" | "withhold" | null; reaction_time_ms: number | null;
  correct: boolean; is_practice?: boolean; sway?: number;
}

export async function submitSession(taskKey: string, trials: Trial[]) {
  const s = await req("/api/v1/assessment-sessions", { method: "POST", body: JSON.stringify({ task_key: taskKey, device: { ua: navigator.userAgent } }) });
  if (!s) return null;
  await req(`/api/v1/assessment-sessions/${s.session_id}/trials`, { method: "POST", body: JSON.stringify({ trials }) });
  return req(`/api/v1/assessment-sessions/${s.session_id}/complete`, { method: "POST" });
}

export const getDashboard = () => req("/api/v1/dashboard/summary");
export const getReport = () => req("/api/v1/reports/latest");
export const getInstruments = () => req("/api/v1/outcomes/instruments");
export const submitSurvey = (instrument: string, answers: number[]) =>
  req("/api/v1/outcomes/submit", { method: "POST", body: JSON.stringify({ instrument, answers }) });
export const getOutcomeHistory = (instrument = "") => req(`/api/v1/outcomes/history?instrument=${instrument}`);
export const get30Day = () => req("/api/v1/outcomes/30day");
export const postCheckin = (mood: number, focus: number, note: string, extra: Record<string, any> = {}) =>
  req("/api/v1/checkin", { method: "POST", body: JSON.stringify({ mood, focus, note, ...extra }) });
export const getBehavior = () => req("/api/v1/behavior/summary");
export const getFlags = () => req("/api/v1/safety/flags");
export const createReferral = (reason: string) =>
  req("/api/v1/referrals", { method: "POST", body: JSON.stringify({ reason }) });
export const transitionReferral = (id: string, state: string, note = "") =>
  req(`/api/v1/referrals/${id}/transition`, { method: "POST", body: JSON.stringify({ state, note }) });
export const getReferrals = () => req("/api/v1/referrals");
export const getOverdue = () => req("/api/v1/referrals/overdue");
export const nudgeReferral = (id: string, channel: string) =>
  req(`/api/v1/referrals/${id}/nudge`, { method: "POST", body: JSON.stringify({ channel }) });
export const getReferralFhir = (id: string) => req(`/api/v1/referrals/${id}/fhir`);
export const getWindows = () => req("/api/v1/outcomes/windows");
export const assignArm = (arm: string) =>
  req("/api/v1/study/assign", { method: "POST", body: JSON.stringify({ arm }) });
export const getModelCard = () => req("/api/v1/model-card");
export const setConsent = (data_category: string, granted: boolean) =>
  req("/api/v1/consents", { method: "POST", body: JSON.stringify({ data_category, granted }) });
export const getMe = () => req("/api/v1/me");
export const saveProfile = (p: { name: string; age: number | null; gender: string; country: string; language: string }) =>
  req("/api/v1/me/profile", { method: "POST", body: JSON.stringify(p) });
export const saveDevice = (kind: string, name: string, connected = true) =>
  req("/api/v1/me/devices", { method: "POST", body: JSON.stringify({ kind, name, connected }) });
export const finishOnboarding = () => req("/api/v1/me/onboarding-complete", { method: "POST" });
export const logScreenTime = (screen_minutes: number, doomscroll_minutes: number) =>
  req("/api/v1/screentime", { method: "POST", body: JSON.stringify({ screen_minutes, doomscroll_minutes }) });
export const getScreenTime = () => req("/api/v1/screentime/latest");
export const getAssessmentSet = () => req("/api/v1/baseline/assessment-set");
export const getPlanToday = () => req("/api/v1/plan/today");
export const completePlanItem = (item_key: string, result: Record<string, any> = {}) =>
  req("/api/v1/plan/complete", { method: "POST", body: JSON.stringify({ item_key, result }) });
export const getStreak = () => req("/api/v1/plan/streak");
export const completeActivity = (activity_key: string) =>
  req("/api/v1/program/completions", { method: "POST", body: JSON.stringify({ activity_key, result: {} }) });
export const syncDemoWearables = () => {
  const today = new Date().toISOString().slice(0, 10);
  return req("/api/v1/wearables/sync", { method: "POST", body: JSON.stringify({
    device: "DEMO", source_app: "synthetic",
    records: [
      { record_type: "heart_rate", value: 72, unit: "bpm", start_time: `${today}T08:00:00Z`, source_record_id: `demo-hr-${today}` },
      { record_type: "steps", value: 6420, unit: "count", start_time: `${today}T08:00:00Z`, source_record_id: `demo-steps-${today}` },
      { record_type: "sleep", value: 432, unit: "minutes", start_time: `${today}T00:00:00Z`, source_record_id: `demo-sleep-${today}` },
      { record_type: "spo2", value: 98, unit: "%", start_time: `${today}T08:00:00Z`, source_record_id: `demo-spo2-${today}` },
    ] }) });
};
