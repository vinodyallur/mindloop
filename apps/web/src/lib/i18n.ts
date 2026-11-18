// Q5: EN + Hindi + Kannada UI strings (plain language, grade 6-8).
// RTL-ready: layout uses logical properties; dir can switch via <html dir>.
export const LANGS = ["en", "hi", "kn"] as const;
export type Lang = (typeof LANGS)[number];

const S = {
  baseline: { en: "Baseline", hi: "बेसलाइन", kn: "ಬೇಸ್‌ಲೈನ್" },
  train: { en: "Train", hi: "अभ्यास", kn: "ಅಭ್ಯಾಸ" },
  outcomes: { en: "Outcomes", hi: "परिणाम", kn: "ಫಲಿತಾಂಶ" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್" },
  care: { en: "Care", hi: "देखभाल", kn: "ಆರೈಕೆ" },
  notDiagnosis: {
    en: "Descriptive self-tracking only — not a diagnosis.",
    hi: "केवल स्व-ट्रैकिंग — यह निदान नहीं है।",
    kn: "ವಿವರಣಾತ್ಮಕ ಸ್ವ-ಟ್ರ್ಯಾಕಿಂಗ್ ಮಾತ್ರ — ರೋಗನಿರ್ಣಯವಲ್ಲ.",
  },
  crisis: {
    en: "If you ever feel unsafe, contact your local emergency number or helpline immediately.",
    hi: "यदि आप असुरक्षित महसूस करें, तो तुरंत स्थानीय आपातकालीन नंबर पर संपर्क करें।",
    kn: "ನೀವು ಅಸುರಕ್ಷಿತರೆಂದು ಅನಿಸಿದರೆ, ತಕ್ಷಣ ಸ್ಥಳೀಯ ತುರ್ತು ಸಂಖ್ಯೆಯನ್ನು ಸಂಪರ್ಕಿಸಿ.",
  },
} satisfies Record<string, Record<Lang, string>>;

let current: Lang = "en";
export const setLang = (l: Lang) => { current = l; };
export const t = (k: keyof typeof S): string => S[k][current];
