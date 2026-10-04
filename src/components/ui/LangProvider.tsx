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
  // « : » selon la langue : le français met une espace insécable avant, l'anglais et l'arabe collent le deux-points au mot.
  colon: string;
};

const LangContext = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [storedRead, setStoredRead] = useState(false);

  // Lecture du choix mémorisé après l'hydratation (évite un écart serveur/navigateur).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- l'adresse et le stockage n'existent que dans le navigateur : lecture APRÈS l'hydratation, volontaire */
    try {
      // ?lang=aeb dans l'adresse (lien ou QR code remis à un agriculteur) l'emporte sur le choix mémorisé
      const asked = new URLSearchParams(window.location.search).get("lang");
      const saved = asked ?? localStorage.getItem("sakia-lang");
      if (saved === "fr" || saved === "ar" || saved === "en" || saved === "aeb") {
        setLangState(saved); // lu après l'hydratation : le serveur ne connaît pas le choix de la personne
        if (asked) localStorage.setItem("sakia-lang", saved);
      }
    } catch {}
    setStoredRead(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // La langue gardée est appliquée au document (rendu fait) : on lève le masque posé par le script de layout.tsx.
  useEffect(() => {
    if (storedRead) document.documentElement.removeAttribute("data-lang-pending");
  }, [storedRead]);

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
    // Un ?lang= dans l'adresse l'emporte au chargement : une fois la langue choisie à la main, on l'ôte de l'adresse, sinon un
    // rechargement ramènerait la langue du lien (celle d'un QR code, par exemple) au lieu du choix de la personne.
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has("lang")) {
        u.searchParams.delete("lang");
        window.history.replaceState(window.history.state, "", u);
      }
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
    colon: lang === "fr" ? "\u00A0:" : ":",
  };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("useLang doit être utilisé dans LangProvider");
  return c;
}
