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
// Used by Vercel/Replit one-click hosting. Scores locally, no persistence.
const demoStore: Record<string, any> = {};
function demoResponse(path: string, init: RequestInit) {
  const body = (() => { try { return JSON.parse((init.body as string) || "{}"); } catch { return {}; } })();
  if (path === "/api/v1/me") return Promise.resolve({ id: "demo", email: "demo@mindloop.local", display_name: demoStore.name || "Demo User", age_band: "18-25", age: demoStore.age ?? null, gender: demoStore.gender || "", country: demoStore.country || "", language: "en", onboarding_done: !!demoStore.onboarded, devices: demoStore.devices || {}, consents: {}, notice: "Demo mode — runs fully in your browser." });
  if (path === "/api/v1/me/profile") { Object.assign(demoStore, { name: body.name, age: body.age, gender: body.gender, country: body.country }); return Promise.resolve({ saved: true, age_band: "18-25" }); }
  if (path === "/api/v1/me/devices") { demoStore.devices = { ...(demoStore.devices || {}), [body.kind]: { name: body.name, connected: true } }; return Promise.resolve({ devices: demoStore.devices }); }
  if (path === "/api/v1/me/onboarding-complete") { demoStore.onboarded = true; return Promise.resolve({ onboarding_done: true }); }
  if (path === "/api/v1/screentime") { demoStore.screen = body; return Promise.resolve({ day: "today", ...body }); }
  if (path === "/api/v1/screentime/latest") return Promise.resolve(demoStore.screen ? [{ day: "today", screen_minutes: demoStore.screen.screen_minutes, doomscroll_minutes: demoStore.screen.doomscroll_minutes }] : []);
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
  if (path.includes("/trials")) return Promise.resolve({ stored: (body.trials || []).length });
  if (path.includes("/complete")) {
    demoStore.baselineDone = [...new Set([...(demoStore.baselineDone || []), demoStore.lastTask || "pvt"])];
    return Promise.resolve({ session_id: "demo", validity_status: "valid", metrics: { accuracy: 0.85, median_rt_ms: 420 }, change_events: [] });
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
    it.done = true;
    return Promise.resolve({ recorded: body.item_key });
  }
  if (path === "/api/v1/plan/streak") return Promise.resolve({ streak: 0, buddy: { tone: "welcome", text: "Hey, buddy here. Pick just one task to start. 🙂" }, day: "today" });
  if (path === "/api/v1/reports/story") {
    return Promise.resolve({
      headline: "Hey friend! Play your 4 baseline games and I'll write your story here. 🌱",
      trend_line: "", index: null, sessions: 0,
      cards: [
        { title: "🎯 Attention span", level: null, story: "We haven't measured your attention span yet — play Vigilance Tap and I'll tell you all about it! ⚡" },
        { title: "🔎 Focus", level: null, story: "We haven't measured your focus yet — play Steady Response and come back! 🎯" },
        { title: "🤸 Coordination", level: null, story: "We haven't measured your coordination yet — try Hold Steady for 30 seconds! 🤸" },
        { title: "🧠 Memory", level: null, story: "We haven't measured your memory yet — play Remember the Shelf! 🛒" },
      ],
      screen_card: null,
      improvements: [{ emoji: "🎮", text: "Finish your 4 baseline games first — that's the starting line everything is measured from." }],
      note: "Demo mode — connect the backend for your real story. Not a medical report.",
    });
  }
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
