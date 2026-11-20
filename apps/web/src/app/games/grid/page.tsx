"use client";
import RequireProfile from "@/components/RequireProfile";
import { GridRecallGame } from "@/components/engines";
export default function Page() { return <RequireProfile><GridRecallGame /></RequireProfile>; }