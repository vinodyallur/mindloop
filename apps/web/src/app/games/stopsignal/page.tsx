"use client";
import RequireProfile from "@/components/RequireProfile";
import { StopSignalGame } from "@/components/engines";
export default function Page() { return <RequireProfile><StopSignalGame /></RequireProfile>; }