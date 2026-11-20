"use client";
import RequireProfile from "@/components/RequireProfile";
import { ChoiceGame } from "@/components/engines";

export default function Page() {
  return <RequireProfile><ChoiceGame taskKey="choice" title="Choice Rush" intro="LEFT for ◀, RIGHT for ▶ — as fast as you can. Tests choice reaction time." total={30} options={["Left","Right"]} gen={() => { const c = Math.random() < 0.5 ? "◀" : "▶"; return { show: <span className="text-8xl">{c}</span>, correct: c === "◀" ? "Left" : "Right", label: c }; }} />;</RequireProfile>
}