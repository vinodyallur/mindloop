"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="rotate" title="Rotate Fit" intro="Tap SAME if shapes match after rotation." total={20} dur={1500} />;
}

