"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="breathe" title="Breath Pace" intro="Follow the pacer: inhale, hold, exhale." total={8} dur={4000} />;
}

