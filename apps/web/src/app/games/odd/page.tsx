"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="odd" title="Odd One Out" intro="Tap the one item that differs." total={25} dur={1200} />;
}

