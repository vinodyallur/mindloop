"use client";
import RequireProfile from "@/components/RequireProfile";
import { SearchGame } from "@/components/engines";
export default function Page() { return <RequireProfile><SearchGame taskKey="search" title="Visual Search" intro="Tap the T hidden among L distractors. Tests selective attention (Treisman)." kind="search" /></RequireProfile>; }