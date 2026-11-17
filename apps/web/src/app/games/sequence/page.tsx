"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="sequence" title="Sequence Echo" intro="Watch the flashing order, repeat it." total={20} dur={1200} />;
}

