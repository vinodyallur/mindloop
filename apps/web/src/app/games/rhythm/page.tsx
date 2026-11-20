"use client";
import RequireProfile from "@/components/RequireProfile";
import { RhythmGame } from "@/components/engines";
export default function Page() { return <RequireProfile><RhythmGame /></RequireProfile>; }