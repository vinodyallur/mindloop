"use client";
import RequireProfile from "@/components/RequireProfile";
import { SwitchGame } from "@/components/engines";
export default function Page() { return <RequireProfile><SwitchGame /></RequireProfile>; }