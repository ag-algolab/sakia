"use client";

import { useMemo } from "react";
import { todayInTunisia } from "@/components/phone/usePlan";
import { DropIcon, QuestionIcon } from "./icons";
import { useLang } from "./LangProvider";

// « Dernier arrosage » en calendrier de gouttes, pour quelqu'un qui ne lit pas : huit pastilles (aujourd'hui, hier, puis les
// jours de la semaine, jusqu'à il y a 7 jours). La goutte est grande et vive pour aujourd'hui, de plus en plus petite et pâle
// pour un arrosage ancien : on voit « il y a longtemps ». Les noms de jours viennent des vraies dates (le calendrier de
// l'agriculteur, pas « il y a 3 jours »). Dernière pastille : « je ne sais pas » (le plan est alors signalé « pas sûr »).
// Dessiné dans le code : aucun téléchargement, marche sans internet. Valeur : "" = inconnu, "0" à "7" = il y a N jours.

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

function dayMinus(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function AgoPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t, fmtDate } = useLang();
  // la date du jour est celle de la Tunisie ; calculée après l'hydratation pour éviter un écart serveur/navigateur
  const today = useMemo(() => todayInTunisia(new Date()), []);

  return (
    <div role="radiogroup" aria-label={t("lastWatering")} className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {DAYS.map((n) => {
          const on = value === String(n);
          const label = n === 0 ? t("today") : n === 1 ? t("yesterday") : fmtDate(dayMinus(today, n), { weekday: "short" });
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={n === 0 ? t("today") : t("daysAgo", { n })}
              onClick={() => onChange(String(n))}
              className={`sk-press flex min-h-[5.25rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 ${
                on ? "border-sakia-water bg-sakia-water text-white shadow-md" : "border-sakia-sand-dark bg-white text-sakia-ink hover:border-sakia-water"
              }`}
            >
              <span className="grid h-9 place-items-center">
                <DropIcon
                  className={`${on ? "text-white" : "text-sakia-water"} ${n === 0 ? "h-9 w-9" : n < 3 ? "h-8 w-8" : n < 5 ? "h-7 w-7" : "h-6 w-6"}`}
                  style={{ opacity: on ? 1 : Math.max(0.35, 1 - n * 0.09) }}
                />
              </span>
              <span className="text-xs font-bold leading-tight first-letter:uppercase">{label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        role="radio"
        aria-checked={value === ""}
        onClick={() => onChange("")}
        className={`sk-press flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 px-3 text-base font-bold ${
          value === "" ? "border-sakia-alert bg-sakia-alert text-white shadow-md" : "border-sakia-sand-dark bg-white text-sakia-ink hover:border-sakia-alert"
        }`}
      >
        <QuestionIcon className="h-7 w-7" />
        <span className="first-letter:uppercase">{t("unknown")}</span>
      </button>
    </div>
  );
}
