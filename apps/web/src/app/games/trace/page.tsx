"use client";
import RequireProfile from "@/components/RequireProfile";
import { TraceGame } from "@/components/engines";
export default function Page() { return <RequireProfile><TraceGame /></RequireProfile>; }