"use client";
import RequireProfile from "@/components/RequireProfile";
import { TrailGame } from "@/components/engines";
export default function Page() { return <RequireProfile><TrailGame /></RequireProfile>; }