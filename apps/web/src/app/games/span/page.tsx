"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="span" title="Digit Span" intro="Watch digits, then type them back in order." total={20} dur={1200} />;
}

