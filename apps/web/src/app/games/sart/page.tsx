"use client";
import RequireProfile from "@/components/RequireProfile";
import { SartGame } from "@/components/engines";
export default function Page() { return <RequireProfile><SartGame /></RequireProfile>; }