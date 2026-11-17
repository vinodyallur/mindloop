"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="grid" title="Grid Recall" intro="Memorize highlighted cells, tap them back." total={20} dur={1300} />;
}

