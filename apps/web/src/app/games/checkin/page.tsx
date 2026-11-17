"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="checkin" title="Daily Check-in" intro="Rate focus, mood, sleep." total={5} dur={1000} />;
}

