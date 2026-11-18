import Link from "next/link";
import "./globals.css";

const nav = [
  { href: "/", label: "Home" },
  { href: "/baseline", label: "Baseline" },
  { href: "/games", label: "Train" },
  { href: "/outcomes", label: "Outcomes" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/report", label: "Report" },
  { href: "/safety", label: "Care" },
  { href: "/settings", label: "Settings" },
];

export const metadata = {
  title: "MindLoop — Attention & Wellbeing",
  description: "Track attention-task performance vs your personal baseline. Not a diagnostic device.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-[#fafafa]/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">M</span>
              <span className="text-[17px] font-semibold tracking-tight">MindLoop</span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Primary">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-neutral-500 transition hover:bg-neutral-200/60 hover:text-neutral-900">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <div className="pb-24">{children}</div>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200/70 bg-white/90 backdrop-blur-md sm:hidden">
          <div className="grid grid-cols-5 px-2 py-2">
            {[
              { href: "/", label: "Home" },
              { href: "/baseline", label: "Baseline" },
              { href: "/games", label: "Train" },
              { href: "/dashboard", label: "Stats" },
              { href: "/settings", label: "Settings" },
            ].map((n) => (
              <Link key={n.href} href={n.href} className="rounded-xl py-2 text-center text-[11px] font-medium text-neutral-500 active:bg-neutral-100">
                {n.label}
              </Link>
            ))}
          </div>
        </nav>
        <footer className="border-t border-neutral-200/70 py-6 text-center text-xs text-neutral-400">
          MindLoop · descriptive self-tracking only · not a diagnostic device
        </footer>
      </body>
    </html>
  );
}
