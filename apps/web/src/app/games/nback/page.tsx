"use client";
import RequireProfile from "@/components/RequireProfile";
import { NBackGame } from "@/components/engines";
export default function Page() { return <RequireProfile><NBackGame n={2} /></RequireProfile>; }