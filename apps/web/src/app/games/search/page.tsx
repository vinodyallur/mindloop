"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="search" title="Visual Search" intro="Tap the target T among L distractors." total={25} dur={1500} />;
}

