"use client";
import RequireProfile from "@/components/RequireProfile";
import { ChoiceGame } from "@/components/engines";

export default function Page() {
  const SH = ["●","▲","■","★","◆","⬢","◉","✚"];
  return <RequireProfile><ChoiceGame taskKey="pattern" title="Pattern Complete" intro="Which piece completes the 3-item pattern? Tests matrix reasoning." total={15} options={["A","B"]} gen={() => { const i = Math.floor(Math.random()*6); const seq = [SH[i],SH[i+1],"?"]; const ans = Math.random()<0.5?"A":"B"; const opts = ans==="A"?[SH[i+2],SH[(i+4)%8]]:[SH[(i+4)%8],SH[i+2]]; return { show: <span className="text-center"><span className="text-5xl tracking-widest">{seq.join(" ")}</span><br/><span className="text-3xl">A:{opts[0]} B:{opts[1]}</span></span>, correct: ans, label: seq.join("") }; }} />;</RequireProfile>
}