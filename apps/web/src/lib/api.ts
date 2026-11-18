const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const KEY = process.env.NEXT_PUBLIC_API_KEY || "demo-key-change-me";

async function req(path: string, init: RequestInit = {}) {
  try {
    const r = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "x-api-key": KEY, ...(init.headers || {}) },
    });
    return r.ok ? await r.json() : null;
  } catch { return null; }
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
export const postCheckin = (mood: number, focus: number, note: string) =>
  req("/api/v1/checkin", { method: "POST", body: JSON.stringify({ mood, focus, note }) });
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
