"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="trace" title="Trace Path" intro="Trace the path steadily with your finger." total={15} dur={1500} />;
}

