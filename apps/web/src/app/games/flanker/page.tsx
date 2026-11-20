"use client";
import RequireProfile from "@/components/RequireProfile";
import { ChoiceGame } from "@/components/engines";

const AR = ["◀","▶"];
export default function Page() {
  return <RequireProfile><ChoiceGame taskKey="flanker" title="Flanker Field" intro="Respond to the CENTER arrow only — ignore the side arrows. ← → keys work. Tests selective attention (Eriksen flanker)." total={24} options={["Left","Right"]} gen={() => { const c = Math.random() < 0.5 ? "◀" : "▶"; const f = Math.random() < 0.5 ? "◀" : "▶"; const cong = Math.random() < 0.5; const side = cong ? c : f; return { show: <span className="text-5xl tracking-widest text-[#a39c8c]">{side}{side}<span className="text-[#23201a]">{c}</span>{side}{side}</span>, correct: c === "◀" ? "Left" : "Right", label: `center-${c}` }; }} />;</RequireProfile>
}