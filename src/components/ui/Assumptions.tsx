"use client";

import { localizeAssumption } from "./assumptionsText";
import { useLang } from "./LangProvider";

// Bloc d'hypothèses toujours visible (pas de menu à ouvrir). Le moteur écrit ses phrases en français : elles sont affichées dans la langue
// de l'écran quand on les reconnaît (assumptionsText.ts). La note « en français » n'apparaît que si une phrase est restée en français.
export default function Assumptions({ items }: { items: string[] }) {
  const { lang, t, fmtNum, fmtDate } = useLang();
  const shown = items.map((a) => localizeAssumption(a, { lang, t, fmtNum, fmtDate }));
  const someFrench = lang !== "fr" && shown.some((s) => !s.translated);
  return (
    <section aria-labelledby="assumptions-title" className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-4">
      <h2 id="assumptions-title" className="text-lg font-bold text-sakia-brown">
        {t("assumptions")}
      </h2>
      {someFrench && <p className="mt-1 text-xs text-sakia-brown/80">{t("assumptionsNote")}</p>}
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-sakia-ink" dir="auto">
        {shown.map((s, i) => (
          <li key={i} lang={s.translated ? undefined : "fr"}>
            {s.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
