"use client";
import { ChoiceGame } from "@/components/engines";

function gen() {
  const same = Math.random() < 0.5;
  const ang = Math.floor(Math.random() * 6) * 30;
  const flip = same ? -1 : 1;
  return {
    show: (
      <span className="flex items-center gap-8 text-6xl">
        <span style={{ transform: `rotate(${ang}deg)`, display: "inline-block" }}>⊏</span>
        <span style={{ transform: `scaleX(${flip}) rotate(${ang + 40}deg)`, display: "inline-block" }}>⊏</span>
      </span>
    ),
    correct: same ? "Same" : "Different",
    label: same ? "same" : "diff",
  };
}

export default function Page() {
  return (
    <ChoiceGame
      taskKey="rotate"
      title="Rotate Fit"
      intro="SAME if the shapes match after rotation, DIFFERENT if mirrored. Tests mental rotation (Shepard-Metzler)."
      total={20}
      options={["Same", "Different"]}
      gen={gen}
    />
  );
}
