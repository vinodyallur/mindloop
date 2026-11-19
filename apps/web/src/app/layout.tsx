"use client";
import Link from "next/link";
import "./globals.css";
import { LangProvider, useLang, LANGS, LANG_LABEL, type Lang } from "@/lib/i18n";

function Shell({ children }: { children: React.ReactNode }) {
  const { lang, setLang, t } = useLang();
  const nav = [
    { href: "/", label: t("home") },
    { href: "/baseline", label: t("baseline") },
    { href: "/games", label: t("train") },
    { href: "/outcomes", label: t("outcomes") },
    { href: "/dashboard", label: t("dashboard") },
    { href: "/report", label: t("report") },
    { href: "/safety", label: t("care") },
    { href: "/clinician", label: "Review" },
    { href: "/pilot", label: "Pilot" },
    { href: "/evidence", label: "Evidence" },
    { href: "/settings", label: t("settings") },
  ];
  return (
    <body className="min-h-screen antialiased">
      <header className="sticky top-0 z-40 border-b border-[#e5ddcc] bg-[#f7f4ec]/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] max-w-5xl items-center justify-between gap-2 px-5 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#b3541e] text-sm font-bold text-white">M</span>
            <span className="text-[17px] font-semibold tracking-tight">MindLoop</span>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-[#5c564a] transition hover:bg-[#f1ecdd] hover:text-[#23201a]">
                {n.label}
              </Link>
            ))}
          </nav>
          <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language" className="rounded-full border border-[#e5ddcc] bg-white px-2.5 py-1.5 text-xs font-medium text-[#5c564a] outline-none">
            {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
          </select>
        </div>
      </header>
      <div className="pb-24">{children}</div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e5ddcc] bg-[#fffdf7]/95 backdrop-blur-md sm:hidden" aria-label="Mobile">
        <div className="grid grid-cols-5 px-2 py-2">
          {[
            { href: "/", label: t("home") },
            { href: "/baseline", label: t("baseline") },
            { href: "/games", label: t("train") },
            { href: "/dashboard", label: t("stats") },
            { href: "/settings", label: t("settings") },
          ].map((n) => (
            <Link key={n.href} href={n.href} className="rounded-xl py-2 text-center text-[11px] font-medium text-[#5c564a] active:bg-[#f1ecdd]">
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
      <footer className="border-t border-[#e5ddcc] py-6 text-center text-xs text-[#a39c8c]">
        MindLoop · {t("notDiagnosis")}
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
