"use client";

// Nomme les langues comprises par le SMS et montre ce qui a été mesuré (phrases du jeu de test, calcul fait dans la page).
// Le chiffre vient de src/lib/sms/testset.ts : phrases écrites à la main, pas recueillies sur le terrain.

import { useMemo } from "react";
import { scoreTestset } from "@/lib/sms/testset";
import { STRINGS } from "./strings";
import { useUiLang } from "./useUiLang";

export default function LanguageCoverage() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const score = useMemo(() => scoreTestset(), []);
  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 pb-12">
      <h2 className="text-xl font-semibold">{t.languagesTitle}</h2>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{t.languagesBody}</p>
      <p className="mt-2 text-sm font-medium">
        {t.measured(score.ok, score.total)} ·{" "}
        {Object.entries(score.byGroup)
          .map(([g, v]) => `${g} ${v.ok}/${v.total}`)
          .join(" · ")}
      </p>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t.measuredCaveat}</p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer select-none font-medium">{score.total}</summary>
        <ul className="mt-2 space-y-1">
          {score.results.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-label={r.ok ? "ok" : "non"}>{r.ok ? "✓" : "✗"}</span>
              <span dir="auto">{r.case.text}</span>
              <span className="text-neutral-500">· {r.case.group}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
