"use client";

// Q6 evidence dossier: real studies with durable follow-up, honest caveats.
// Every claim links to what was actually shown; near-transfer limits stated.
const STUDIES = [
  { t: "Digital CBT for insomnia — 48-week wellbeing gain (d=0.55)", s: "Luik et al., J Sleep Res 2020 · N=1,711 Sleepio RCT", c: "Durable to 48 weeks; functional health + sleep-related QoL.", u: "https://doi.org/10.1111/jsr.13076" },
  { t: "Fully automated dCBT-I — 2-year follow-up", s: "Vethe et al., Lancet Reg Health Eur 2026 · Norwegian RCT", c: "Longest automated dCBT-I follow-up; cost-effective.", u: "https://www.thelancet.com/journals/lanepe/article/PIIS2666-7762(25)000XX-X/fulltext" },
  { t: "iCBT durability — 154 RCTs, 12+ month follow-up", s: "Meta-analysis, PubMed 39579466", c: "Sustained effects on depression/anxiety/PTSD vs controls.", u: "https://pubmed.ncbi.nlm.nih.gov/39579466/" },
  { t: "Minimally guided iCBT for depression — SMD −0.43", s: "Mamukashvili-Delau et al., JMIR Ment Health 2023", c: "Sustained self-help effect; guidance improves durability.", u: "https://mental.jmir.org/" },
  { t: "txt2stop — verified abstinence 10.7% vs 4.9% at 6 months", s: "Free et al., Lancet 2011 · N=5,800, cotinine-verified, ITT", c: "Gold-standard design: RCT + active control + objective outcome.", u: "https://doi.org/10.1016/S0140-6736(11)60701-0" },
  { t: "Habit automaticity median 66 days (range 18–254)", s: "Lally et al., Eur J Soc Psychol 2010", c: "Why MindLoop plans a long middle stretch, not 30-day miracles.", u: "https://doi.org/10.1002/ejsp.674" },
  { t: "Working-memory training — near-transfer only", s: "Melby-Lervåg et al. 2016; Sala & Gobet 2017/2019", c: "Improvement on trained tasks; no far-transfer to IQ. MindLoop claims practice, not enhancement.", u: "https://doi.org/10.1177/1745691616635612" },
];

export default function Evidence() {
  return (
    <main className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-8">
      <header>
        <p className="text-xs font-medium uppercase tracking-widest text-[#a39c8c]">Q6 — sustained evidence</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Evidence dossier</h1>
        <p className="mt-1 text-sm text-[#5c564a]">What durable digital-health evidence actually shows — and what MindLoop honestly borrows vs still must prove.</p>
      </header>
      {STUDIES.map((s) => (
        <a key={s.t} href={s.u} target="_blank" rel="noreferrer" className="card block p-5 transition hover:-translate-y-0.5">
          <p className="text-sm font-semibold">{s.t}</p>
          <p className="mt-1 text-xs text-[#a39c8c]">{s.s}</p>
          <p className="mt-1 text-[13px] text-[#5c564a]">{s.c}</p>
        </a>
      ))}
      <section className="card p-5">
        <h2 className="text-sm font-semibold">MindLoop durability tracker (this app)</h2>
        <p className="mt-1 text-[13px] text-[#5c564a]">Status: collecting. 30/90/180-day windows + waitlist arm + ITT export are built (<code>/api/v1/outcomes/windows</code>, <code>/api/v1/study/export</code>). No long-term claims until the data exists — see Outcomes → 30-day set.</p>
      </section>
    </main>
  );
}
