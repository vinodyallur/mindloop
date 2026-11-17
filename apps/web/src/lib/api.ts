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
