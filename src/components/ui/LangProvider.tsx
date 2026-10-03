"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { LOCALES, isArabic, translate } from "./i18n";
import type { Lang } from "./i18n";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  fmtDate: (iso: string, opts?: Intl.DateTimeFormatOptions) => string;
  fmtNum: (n: number, digits?: number) => string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Lecture du choix mémorisé après l'hydratation (évite un écart serveur/navigateur).
  useEffect(() => {
    try {
      // ?lang=aeb dans l'adresse (lien ou QR code remis à un agriculteur) l'emporte sur le choix mémorisé
      const asked = new URLSearchParams(window.location.search).get("lang");
      const saved = asked ?? localStorage.getItem("sakia-lang");
      if (saved === "fr" || saved === "ar" || saved === "en" || saved === "aeb") {
        setLangState(saved);
        if (asked) localStorage.setItem("sakia-lang", saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // la darija porte « ar-TN » : les autres postes (bulletin, téléphone) lisent alors « ar » et restent cohérents
    document.documentElement.lang = lang === "aeb" ? "ar-TN" : lang;
    document.documentElement.dir = isArabic(lang) ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("sakia-lang", l);
    } catch {}
  }, []);

  const value: Ctx = {
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    fmtDate: (iso, opts = { weekday: "short", day: "numeric", month: "short" }) =>
      new Intl.DateTimeFormat(LOCALES[lang], { timeZone: "UTC", ...opts }).format(new Date(`${iso}T00:00:00Z`)),
    fmtNum: (n, digits = 0) =>
      Number.isFinite(n) ? new Intl.NumberFormat(LOCALES[lang], { maximumFractionDigits: digits }).format(n) : "–",
  };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang doit être utilisé dans LangProvider");
  return c;
}
