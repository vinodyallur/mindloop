"use client";
import { createContext, useContext, useEffect, useState } from "react";

export const LANGS = ["en", "hi", "kn"] as const;
export type Lang = (typeof LANGS)[number];
export const LANG_LABEL: Record<Lang, string> = { en: "English", hi: "हिन्दी", kn: "ಕನ್ನಡ" };

const S = {
  home: { en: "Home", hi: "होम", kn: "ಮನೆ" },
  baseline: { en: "Baseline", hi: "बेसलाइन", kn: "ಬೇಸ್‌ಲೈನ್" },
  train: { en: "Train", hi: "अभ्यास", kn: "ಅಭ್ಯಾಸ" },
  outcomes: { en: "Outcomes", hi: "परिणाम", kn: "ಫಲಿತಾಂಶ" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  report: { en: "Report", hi: "रिपोर्ट", kn: "ವರದಿ" },
  care: { en: "Care", hi: "देखभाल", kn: "ಆರೈಕೆ" },
  settings: { en: "Settings", hi: "सेटिंग्स", kn: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು" },
  stats: { en: "Stats", hi: "आँकड़े", kn: "ಅಂಕಿಅಂಶ" },
  hero: {
    en: "Know your focus, from your own data.",
    hi: "अपने डेटा से अपना फोकस जानें।",
    kn: "ನಿಮ್ಮ ಡೇಟಾದಿಂದ ನಿಮ್ಮ ಗಮನವನ್ನು ತಿಳಿಯಿರಿ.",
  },
  heroSub: {
    en: "Short tasks build a personal baseline. MindLoop compares you only with your usual pattern - alongside sleep and activity context.",
    hi: "छोटे कार्य आपकी बेसलाइन बनाते हैं। MindLoop आपकी तुलना केवल आपके सामान्य पैटर्न से करता है।",
    kn: "ಸಣ್ಣ ಕಾರ್ಯಗಳು ವೈಯಕ್ತಿಕ ಬೇಸ್‌ಲೈನ್ ನಿರ್ಮಿಸುತ್ತವೆ. MindLoop ನಿಮ್ಮನ್ನು ನಿಮ್ಮ ಸಾಮಾನ್ಯ ಮಾದರಿಯೊಂದಿಗೆ ಮಾತ್ರ ಹೋಲಿಸುತ್ತದೆ.",
  },
  seeBaseline: { en: "See your baseline", hi: "बेसलाइन देखें", kn: "ಬೇಸ್‌ಲೈನ್ ನೋಡಿ" },
  browseTasks: { en: "Browse tasks", hi: "कार्य देखें", kn: "ಕಾರ್ಯಗಳನ್ನು ನೋಡಿ" },
  notDiagnosis: {
    en: "Descriptive self-tracking only - not a diagnosis.",
    hi: "केवल स्व-ट्रैकिंग - यह निदान नहीं है।",
    kn: "ವಿವರಣಾತ್ಮಕ ಸ್ವ-ಟ್ರ್ಯಾಕಿಂಗ್ ಮಾತ್ರ - ರೋಗನಿರ್ಣಯವಲ್ಲ.",
  },
  crisis: {
    en: "If you ever feel unsafe, contact your local emergency number or helpline immediately.",
    hi: "यदि आप असुरक्षित महसूस करें, तो तुरंत स्थानीय आपातकालीन नंबर पर संपर्क करें।",
    kn: "ನೀವು ಅಸುರಕ್ಷಿತರೆಂದು ಅನಿಸಿದರೆ, ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸಂಖ್ಯೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
  start: { en: "Start", hi: "शुरू करें", kn: "ಪ್ರಾರಂಭಿಸಿ" },
  results: { en: "Results", hi: "परिणाम", kn: "ಫಲಿತಾಂಶ" },
  practiceNote: {
    en: "Practice task - compared only with your own baseline. Not a diagnosis.",
    hi: "अभ्यास कार्य - केवल आपकी बेसलाइन से तुलना। निदान नहीं।",
    kn: "ಅಭ್ಯಾಸ ಕಾರ್ಯ - ನಿಮ್ಮ ಬೇಸ್‌ಲೈನ್‌ನೊಂದಿಗೆ ಮಾತ್ರ ಹೋಲಿಕೆ. ರೋಗನಿರ್ಣಯವಲ್ಲ.",
  },
} satisfies Record<string, Record<Lang, string>>;
export type Key = keyof typeof S;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({ lang: "en", setLang: () => {}, t: (k) => S[k].en });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = localStorage.getItem("ml-lang") as Lang | null;
    if (s && (LANGS as readonly string[]).includes(s)) setLangState(s);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem("ml-lang", lang);
  }, [lang]);
  return <Ctx.Provider value={{ lang, setLang: setLangState, t: (k) => S[k][lang] }}>{children}</Ctx.Provider>;
}
export const useLang = () => useContext(Ctx);
