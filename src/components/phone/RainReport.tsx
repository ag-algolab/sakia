"use client";

// « Signaler la pluie » : cinq boutons (aucune, très légère, légère, beaucoup, énormément) et le jour. Le rapport part
// tout de suite s'il y a du réseau, sinon il attend dans l'appareil (« en attente ») et part au retour du réseau.

import { useEffect, useMemo, useState } from "react";
import { LEVEL_LABEL, LEVEL_MM, RAIN_LEVELS } from "@/lib/rainLevels";
import { REGIONS } from "@/lib/regions";
import { STRINGS, formatAge } from "./strings";
import { useUiLang } from "./useUiLang";
import { reportDays, useRainReports } from "./useRainReports";

export default function RainReport({ regionId }: { regionId: string }) {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const { entries, submit } = useRainReports();
  const [offset, setOffset] = useState(0);
  const [clock, setClock] = useState(0); // horloge de l'appareil, lue après l'hydratation
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setClock(Date.now());
    const tick = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);
  const days = useMemo(() => reportDays(clock), [clock]);
  const region = REGIONS.find((r) => r.id === regionId);
  const regionName = region ? (lang === "ar" ? region.nameAr : region.nameFr) : regionId;
  const label = LEVEL_LABEL[lang];
  const dayName = (i: number) => (i === 0 ? t.todayOpt : t.daysAgoOpt(i));

  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} aria-labelledby="rain-title" className="mt-8 border-t border-neutral-300 pt-6 dark:border-neutral-700">
      <h3 id="rain-title" className="text-lg font-semibold">
        {t.rainTitle} · {regionName}
      </h3>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{t.rainIntro}</p>
      <p className="mt-1 text-xs font-medium text-[#8a5a2b] dark:text-[#e0b98a]">{t.rainDemo}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={t.rainDayLabel}>
        <span className="text-sm font-medium">{t.rainDayLabel}</span>
        {days.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={offset === i}
            onClick={() => setOffset(i)}
            className={`rounded-md border px-3 py-1 text-sm ${offset === i ? "border-[#2f6b3a] bg-[#2f6b3a] text-white" : "border-neutral-400"}`}
          >
            {dayName(i)}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {RAIN_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => days[offset] && submit(regionId, days[offset], level)}
            className="rounded-lg border-2 border-[#2f6b3a] px-2 py-3 text-sm font-semibold text-[#2f6b3a] hover:bg-[#2f6b3a] hover:text-white dark:border-[#7bb286] dark:text-[#9ccfa6]"
          >
            <span aria-hidden>{["☀️", "🌦️", "🌧️", "🌧️🌧️", "⛈️"][RAIN_LEVELS.indexOf(level)]}</span>
            <span className="block">{label[level]}</span>
            <span className="block text-[11px] font-normal opacity-80">≈ {LEVEL_MM[level]} mm</span>
          </button>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">{t.rainQueueTitle}</h4>
          <ul className="mt-1 space-y-1 text-sm" aria-live="polite">
            {[...entries].reverse().map((e) => {
              const r = REGIONS.find((x) => x.id === e.regionId);
              return (
                <li key={e.id} className="flex flex-wrap gap-x-2">
                  <span>{e.status === "pending" ? "⏳" : e.status === "sent" ? "✓" : "✗"}</span>
                  <span>
                    {lang === "ar" ? r?.nameAr : r?.nameFr} · {e.day} · {label[e.level]}
                  </span>
                  <span className={e.status === "rejected" ? "text-red-700 dark:text-red-400" : "text-neutral-600 dark:text-neutral-400"}>
                    {e.status === "pending" && `${t.rainPending}${e.note ? ` (${e.note})` : ""}`}
                    {e.status === "sent" && (e.n ? t.rainSent(e.n) : t.sentTo)}
                    {e.status === "rejected" && `${t.rainRejected}${e.note ? ` : ${e.note}` : ""}`}
                    {" · "}
                    {formatAge(clock - e.at, lang)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
