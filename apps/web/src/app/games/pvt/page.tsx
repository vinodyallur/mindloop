"use client";
import RequireProfile from "@/components/RequireProfile";
import { PvtGame } from "@/components/engines";
export default function Page() { return <RequireProfile><PvtGame /></RequireProfile>; }