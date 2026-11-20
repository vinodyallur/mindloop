"use client";
import RequireProfile from "@/components/RequireProfile";
import { SimonGame } from "@/components/engines";
export default function Page() { return <RequireProfile><SimonGame /></RequireProfile>; }