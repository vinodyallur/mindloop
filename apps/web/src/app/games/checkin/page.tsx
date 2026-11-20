"use client";
import RequireProfile from "@/components/RequireProfile";
import { CheckinGame } from "@/components/engines";
export default function Page() { return <RequireProfile><CheckinGame /></RequireProfile>; }