"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="stopsignal" title="Stop Signal" intro="GO on green, STOP yourself if it turns red." total={30} dur={1100} />;
}

