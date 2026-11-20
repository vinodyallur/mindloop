"use client";
import RequireProfile from "@/components/RequireProfile";
import { BreatheGame } from "@/components/engines";
export default function Page() { return <RequireProfile><BreatheGame /></RequireProfile>; }