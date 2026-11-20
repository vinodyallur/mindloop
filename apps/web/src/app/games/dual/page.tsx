"use client";
import RequireProfile from "@/components/RequireProfile";
import { DualGame } from "@/components/engines";
export default function Page() { return <RequireProfile><DualGame /></RequireProfile>; }