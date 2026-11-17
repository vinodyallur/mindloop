"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="rhythm" title="Rhythm Tap" intro="Tap in time with the pulse." total={30} dur={1000} />;
}

