"use client";
import { ChoiceGame } from "@/components/engines";

export default function Page() {
  return <ChoiceGame taskKey="math" title="Mental Math" intro="Is the equation TRUE or FALSE? Answer fast. Tests processing speed." total={25} options={["True","False"]} gen={() => { const a = 2 + Math.floor(Math.random()*8), b = 2 + Math.floor(Math.random()*8); const ok = Math.random() < 0.5; const shown = ok ? a+b : a+b+(Math.random()<0.5?-1:1); return { show: <span className="text-5xl font-semibold tabular-nums">{a} + {b} = {shown}</span>, correct: ok ? "True" : "False", label: `${a}+${b}=${shown}` }; }} />;
}