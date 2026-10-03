"use client";

// Bandeau « Hors connexion · dernier plan mis à jour il y a X h », visible seulement quand l'appareil n'a plus internet.
// À importer par le poste UI dans layout.tsx : <OfflineBanner />. La langue suit le choix de l'en-tête (clé « sakia-lang »).

import { STRINGS, formatAge } from "./strings";
import { useUiLang } from "./useUiLang";
import { useOnline, usePlanAge } from "./offline";

export default function OfflineBanner() {
  const lang = useUiLang();
  const online = useOnline();
  const { loaded, ageMs } = usePlanAge();
  if (online) return null;
  const t = STRINGS[lang];
  return (
    <div
      role="status"
      aria-live="polite"
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="w-full bg-[#8a5a2b] px-4 py-2 text-center text-sm font-medium text-white"
    >
      {t.offline} · {!loaded ? "…" : ageMs == null ? t.noPlan : `${t.lastPlan} ${formatAge(ageMs, lang)}`}
    </div>
  );
}
