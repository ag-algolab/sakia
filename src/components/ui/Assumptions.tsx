"use client";

import { localizeAssumption } from "./assumptionsText";
import { useLang } from "./LangProvider";

// Bloc d'hypothèses. Le moteur écrit ses phrases en français : elles sont affichées dans la langue de l'écran quand on les reconnaît
// (assumptionsText.ts). La note « en français » n'apparaît que si une phrase est restée en français.
// Page Preuve : toujours visible, sans clic (consigne d'origine du poste). Accueil (`folded`) : replié derrière son titre, une touche
// pour l'ouvrir : le jury ne lit pas huit hypothèses en bas d'une page, mais elles restent à un geste.
export default function Assumptions({ items, folded = false }: { items: string[]; folded?: boolean }) {
  const { lang, t, fmtNum, fmtDate } = useLang();
  const shown = items.map((a) => localizeAssumption(a, { lang, t, fmtNum, fmtDate }));
  const someFrench = lang !== "fr" && shown.some((s) => !s.translated);
  const body = (
    <>
      {someFrench && <p className="mt-1 text-xs text-sakia-brown/80">{t("assumptionsNote")}</p>}
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-sakia-ink" dir="auto">
        {shown.map((s, i) => (
          <li key={i} lang={s.translated ? undefined : "fr"}>
            {s.text}
          </li>
        ))}
      </ul>
    </>
  );
  if (folded) {
    return (
      <details className="group rounded-xl border border-sakia-sand-dark bg-sakia-sand">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
          <h2 className="text-lg font-bold text-sakia-brown">
            {t("assumptions")} <span className="font-semibold text-sakia-brown/75">({shown.length})</span>
          </h2>
          <span aria-hidden className="text-2xl leading-none text-sakia-green transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="px-4 pb-4">{body}</div>
      </details>
    );
  }
  return (
    <section aria-labelledby="assumptions-title" className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-4">
      <h2 id="assumptions-title" className="text-lg font-bold text-sakia-brown">
        {t("assumptions")}
      </h2>
      {body}
    </section>
  );
}
