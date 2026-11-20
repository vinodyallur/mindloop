"use client";
import RequireProfile from "@/components/RequireProfile";
import { PairsGame } from "@/components/engines";
export default function Page() { return <RequireProfile><PairsGame /></RequireProfile>; }