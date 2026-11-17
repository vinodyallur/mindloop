"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="choice" title="Choice Rush" intro="LEFT for ◀, RIGHT for ▶, as fast as possible." total={30} dur={1100} />;
}

