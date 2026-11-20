"use client";
import Link from "next/link";
import "./globals.css";
import { LangProvider, useLang, LANGS, LANG_LABEL, type Lang } from "@/lib/i18n";

const NAV_COLORS = ["#ff4d6d", "#f97316", "#ffb020", "#22c55e", "#0ea5a4", "#3b82f6", "#c026d3"];

function Shell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useLang();
  const nav = [
    { href: "/", label: t("home") },
    { href: "/today", label: "Today" },
    { href: "/baseline", label: t("baseline") },
    { href: "/games", label: t("train") },
    { href: "/outcomes", label: t("outcomes") },
    { href: "/dashboard", label: t("dashboard") },
    { href: "/report", label: t("report") },
    { href: "/report/story", label: "Story" },
    { href: "/safety", label: t("care") },
    { href: "/clinician", label: "Review" },
    { href: "/pilot", label: "Pilot" },
    { href: "/evidence", label: "Evidence" },
    { href: "/settings", label: t("settings") },
  ];
  return (
    <body className="min-h-screen antialiased">
      <div className="rainbow-bar" />
      <header className="sticky top-0 z-40 border-b-2 border-[#f0e3cd] bg-[#fff8ef]/92 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 px-5 py-3">
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ff4d6d] text-lg font-black text-white shadow-[0_4px_0_#e13a5a] transition group-hover:rotate-6">M</span>
            <span className="text-xl font-black tracking-tight">Mind<span className="text-[#ff4d6d]">Loop</span></span>
          </Link>
          <nav className="hidden items-center gap-1 overflow-x-auto lg:flex" aria-label="Primary">
            {nav.map((n, i) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-bold text-[#6b6257] transition hover:-translate-y-0.5 hover:text-white" style={{ background: "transparent" }} onMouseEnter={(e) => { e.currentTarget.style.background = NAV_COLORS[i % NAV_COLORS.length]; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                {n.label}
              </Link>
            ))}
          </nav>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language" className="rounded-full border-2 border-[#f0e3cd] bg-white px-3 py-1.5 text-xs font-bold text-[#26221c] outline-none">
            {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
          </select>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto px-4 pb-2 lg:hidden" aria-label="Primary mobile">
          {nav.map((n, i) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold text-white" style={{ background: NAV_COLORS[i % NAV_COLORS.length] }}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="anim-rise pb-24">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#f0e3cd] bg-white/95 backdrop-blur-md sm:hidden" aria-label="Mobile">
        <div className="grid grid-cols-5 px-2 py-2">
          {[
            { href: "/", label: t("home"), c: "#ff4d6d" },
            { href: "/today", label: "Today", c: "#f97316" },
            { href: "/baseline", label: t("baseline"), c: "#0ea5a4" },
            { href: "/games", label: t("train"), c: "#22c55e" },
            { href: "/dashboard", label: t("stats"), c: "#3b82f6" },
            { href: "/settings", label: t("settings"), c: "#c026d3" },
          ].map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl py-2 text-center text-[11px] font-black" style={{ color: n.c }}>
              <span className="mx-auto mb-0.5 block h-1.5 w-8 rounded-full" style={{ background: n.c }} />
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
      <footer className="border-t-2 border-[#f0e3cd] bg-white py-6 text-center text-xs font-semibold text-[#b3a893]">
        Made for curious minds · MindLoop · {t("notDiagnosis")}
      </footer>
    </body>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <LangProvider>
        <Shell>{children}</Shell>
      </LangProvider>
    </html>
  );
}
