"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";

const LS_PROFILE = "mindloop-profile-v1";

/** Gate: no assessment without a filled profile form. Friendly redirect, not a dead end.
 * Remembers the profile in the browser — asks once, never again on this device. */
export function saveProfileLocal(profile: { name: string; age: number | null; gender: string; country: string }) {
  try { localStorage.setItem(LS_PROFILE, JSON.stringify({ ...profile, at: Date.now() })); } catch { /* private mode */ }
}
export function hasProfileLocal(): boolean {
  try {
    const raw = localStorage.getItem(LS_PROFILE);
    if (!raw) return false;
    const p = JSON.parse(raw);
    return !!(p.name && p.age && p.country);
  } catch { return false; }
}

export default function RequireProfile({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"loading" | "ok" | "blocked">("loading");
  useEffect(() => {
    if (hasProfileLocal()) { setState("ok"); return; }
    getMe().then((m) => {
      if (!m) { setState("blocked"); return; }
      if (m.onboarding_done) {
        saveProfileLocal({ name: m.display_name || "", age: m.age ?? null, gender: m.gender || "", country: m.country || "" });
        setState("ok");
      } else setState("blocked");
    }).catch(() => setState("blocked"));
  }, []);
  if (state === "loading") return <main className="px-5 py-10 text-sm font-semibold text-[#6b6257]">Checking your profile…</main>;
  if (state === "blocked") {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-5 py-10">
        <section className="card mx-auto max-w-xl space-y-4 p-8 text-center sm:p-10">
          <p className="text-6xl">👋</p>
          <h1 className="text-3xl font-black tracking-tight">Hold on, buddy!</h1>
          <p className="text-sm font-medium leading-relaxed text-[#6b6257]">
            Before any game, tell me <b>who you are</b> — your name, age, and country.
            It takes 30 seconds, and it makes your baseline truly <i>yours</i>.
          </p>
          <Link href="/onboarding" className="btn-primary w-full text-lg">📝 Fill my form first</Link>
          <p className="text-xs text-[#b3a893]">No form, no games — that's the rule, so every score means something.</p>
        </section>
      </main>
    );
  }
  return <>{children}</>;
}
