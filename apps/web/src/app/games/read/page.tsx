"use client";
import RequireProfile from "@/components/RequireProfile";
import { ReadGame } from "@/components/engines";
export default function Page() { return <RequireProfile><ReadGame /></RequireProfile>; }