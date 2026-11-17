"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="nback" title="N-Back" intro="Tap when the letter matches 2 steps back." total={30} dur={1500} />;
}

