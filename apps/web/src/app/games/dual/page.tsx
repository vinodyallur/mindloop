"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="dual" title="Dual Track" intro="Track BOTH: tap GO and count tones." total={25} dur={1400} />;
}

