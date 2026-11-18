"use client";
import Link from "next/link";
import { GAMES } from "@/lib/games";
import { useLang } from "@/lib/i18n";

export default function Home() {
  const { t } = useLang();
  return (
    <main className="mx-auto max-w-5xl space-y-14 px-5 py-10">
      <section className="pt-8 text-center">
        <p className="inline-block rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-medium text-neutral-500">{t("notDiagnosis")}</p>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          {t("hero")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-neutral-500">
          {t("heroSub")}
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/baseline" className="btn-primary">{t("seeBaseline")}</Link>
          <Link href="/games" className="btn-ghost">{t("browseTasks")} · {GAMES.length}</Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          ["1 · Do", "A 2–4 minute task. Trial-level timing is recorded."],
          ["2 · Baseline", "Median of your valid sessions becomes your index."],
          ["3 · Notice", "Repeated drift from your band surfaces gently."],
        ].map(([title, d]) => (
          <div key={title} className="card p-5">
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{d}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Start anywhere</h2>
          <Link href="/games" className="text-sm text-neutral-500 underline underline-offset-4">All {GAMES.length} →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.slice(0, 6).map((g) => (
            <Link key={g.key} href={g.href} className="card group p-5 transition hover:-translate-y-0.5">
              <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600">{g.domain} · {g.minutes} min</span>
              <h3 className="mt-3 font-semibold tracking-tight">{g.title}</h3>
              <p className="mt-1 text-[13px] text-neutral-500">{g.mechanic}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-6 text-sm leading-relaxed text-neutral-500">
        <p className="font-semibold text-neutral-800">Grounded, not hyped.</p>
        <p className="mt-1">Training evidence shows near-transfer to similar tasks, not IQ gains (Melby-Lervåg 2016; Sala &amp; Gobet 2017). Wearable signals are context only. Phone steadiness is exploratory. Nothing here diagnoses any condition.</p>
      </section>
    </main>
  );
}
