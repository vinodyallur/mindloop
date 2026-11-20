"use client";
import RequireProfile from "@/components/RequireProfile";
import { SearchGame } from "@/components/engines";
export default function Page() { return <RequireProfile><SearchGame taskKey="odd" title="Odd One Out" intro="Tap the one item that differs. Tests visual discrimination." kind="odd" /></RequireProfile>; }