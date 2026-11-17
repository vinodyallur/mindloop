"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="pattern" title="Pattern Complete" intro="Tap the piece that completes the pattern." total={15} dur={2000} />;
}

