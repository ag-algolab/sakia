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
    <section dir={lang === "ar" ? "rtl" : "ltr"} aria-labelledby="rain-title" className="mt-8 border-t border-sakia-sand-dark pt-6">
      <h3 id="rain-title" className="text-lg font-bold text-sakia-green">
        {t.rainTitle} · {regionName}
      </h3>
      <p className="mt-1 text-base text-sakia-ink">{t.rainIntro}</p>
      <p className="mt-1 text-sm font-semibold text-sakia-brown">{t.rainDemo}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label={t.rainDayLabel}>
        <span className="text-base font-bold">{t.rainDayLabel}</span>
        {days.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={offset === i}
            onClick={() => setOffset(i)}
            className={`min-h-11 rounded-lg border-2 px-4 text-base font-semibold ${offset === i ? "border-sakia-green bg-sakia-green text-white" : "border-sakia-sand-dark bg-white text-sakia-ink"}`}
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
            className="min-h-14 rounded-xl border-2 border-sakia-green bg-white px-2 py-3 text-base font-bold text-sakia-green hover:bg-sakia-green hover:text-white"
          >
            <span aria-hidden="true">{["☀️", "🌦️", "🌧️", "🌧️🌧️", "⛈️"][RAIN_LEVELS.indexOf(level)]}</span>
            <span className="block leading-tight">{label[level]}</span>
            <span className="block text-sm font-semibold">≈ {LEVEL_MM[level]} mm</span>
          </button>
        ))}
      </div>

      {entries.length > 0 && (
        <div className="mt-4">
          <h4 className="text-base font-bold">{t.rainQueueTitle}</h4>
          <ul className="mt-1 space-y-1 text-base" aria-live="polite">
            {[...entries].reverse().map((e) => {
              const r = REGIONS.find((x) => x.id === e.regionId);
              return (
                <li key={e.id} className="flex flex-wrap gap-x-2">
                  <span>{e.status === "pending" ? "⏳" : e.status === "sent" ? "✓" : "✗"}</span>
                  <span>
                    {lang === "ar" ? r?.nameAr : r?.nameFr} · {e.day} · {label[e.level]}
                  </span>
                  <span className={e.status === "rejected" ? "font-semibold text-sakia-alert" : "text-sakia-brown"}>
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
