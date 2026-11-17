"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="flanker" title="Flanker Field" intro="Respond to the CENTER arrow only, ignore the side arrows." total={30} dur={1100} />;
}

