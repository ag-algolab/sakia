"use client";

import { useLang } from "./LangProvider";

// Bloc d'hypothèses toujours visible (pas de menu à ouvrir).
export default function Assumptions({ items }: { items: string[] }) {
  const { t } = useLang();
  return (
    <section aria-labelledby="assumptions-title" className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-4">
      <h2 id="assumptions-title" className="text-lg font-bold text-sakia-brown">
        {t("assumptions")}
      </h2>
      <p className="mt-1 text-xs text-sakia-brown/80">{t("assumptionsNote")}</p>
      <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-sakia-ink" dir="auto">
        {items.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </section>
  );
}
