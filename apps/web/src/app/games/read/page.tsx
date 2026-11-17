"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="read" title="Deep Read" intro="10-minute offline reading timer." total={10} dur={1000} />;
}

