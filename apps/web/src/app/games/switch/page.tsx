"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="switch" title="Rule Switch" intro="Rule alternates: tap ODD numbers, then EVEN numbers." total={32} dur={1400} />;
}

