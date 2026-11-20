"use client";
import RequireProfile from "@/components/RequireProfile";
import { DigitSpanGame } from "@/components/engines";
export default function Page() { return <RequireProfile><DigitSpanGame /></RequireProfile>; }