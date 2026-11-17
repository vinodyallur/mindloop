"use client";
import GenericTask from "@/components/GenericTask";

export default function Page() {
  return <GenericTask taskKey="math" title="Mental Math" intro="Tap TRUE or FALSE for each equation." total={25} dur={1500} />;
}

