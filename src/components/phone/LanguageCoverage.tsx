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
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 pb-8">
      <h2 className="text-xl font-bold text-sakia-green">{t.languagesTitle}</h2>
      <p className="mt-1 text-base text-sakia-ink">{t.languagesBody}</p>
      <p className="mt-2 text-base font-semibold">
        {t.measured(score.ok, score.total)} ·{" "}
        {Object.entries(score.byGroup)
          .map(([g, v]) => `${g} ${v.ok}/${v.total}`)
          .join(" · ")}
      </p>
      <p className="mt-1 text-sm text-sakia-brown">{t.measuredCaveat}</p>
      <details className="mt-3 text-base">
        <summary className="flex min-h-11 cursor-pointer select-none items-center font-semibold">{score.total}</summary>
        <ul className="mt-2 space-y-1">
          {score.results.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span aria-label={r.ok ? "ok" : "non"}>{r.ok ? "✓" : "✗"}</span>
              <span dir="auto">{r.case.text}</span>
              <span className="text-sakia-brown">· {r.case.group}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
