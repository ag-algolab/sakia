"use client";

import { isArabic } from "./i18n";
import { DropIcon, HandIcon, RainIcon, SunIcon } from "./icons";
import { useLang } from "./LangProvider";
import { Reveal } from "./motion";
import type { Plan, PlanDay } from "@/lib/plan";

// La semaine en un coup d'œil, SANS répéter sept fois « attendre ».
//  - sept TUBES d'eau, un par jour : le niveau d'eau que le sol garde pour la culture (plein = beaucoup ; presque vide = la culture
//    commence à souffrir). Quand un tube approche du vide, Sakia dit « arrosez » juste avant : on le voit venir ;
//  - la météo de chaque jour (soleil ou pluie, température) ;
//  - une goutte au-dessus des jours d'arrosage ;
//  - dessous, des cartes SEULEMENT pour les jours d'arrosage (avec la dose), ou un seul message « pas d'arrosage cette semaine ».
// Niveau du tube = 1 - épuisement / seuil (dr et raw du plan : rien d'inventé). Bas du tube = seuil où la culture commence à souffrir.

const reserveOf = (d: PlanDay) => (d.raw > 0 ? Math.max(0, Math.min(1, 1 - d.dr / d.raw)) : 1);

// Couleur du tube : bleu = beaucoup d'eau ; ambre = ça se dessèche ; orange = presque vide (Sakia conseille d'arroser).
function tubeTone(r: number) {
  if (r <= 0.12) return { fill: "from-[#c2410c] to-[#f08a3c]", border: "border-[#d2552a]", text: "text-[#8a2f06]" };
  if (r <= 0.3) return { fill: "from-[#d98a1c] to-[#f6c453]", border: "border-[#e0a02a]", text: "text-[#6b3f02]" };
  return { fill: "from-[#1d74b6] to-[#62b6ee]", border: "border-sakia-water/45", text: "text-sakia-water-deep" };
}

export default function WeekView({ plan }: { plan: Plan }) {
  const { lang, t, fmtDate, fmtNum } = useLang();
  const days = plan.days;
  if (days.length === 0) return null;
  const watering = days.filter((d) => d.action === "irriguer");
  const last = days[days.length - 1];
  const lastPct = Math.round(reserveOf(last) * 100);
  const dayShort = (iso: string) => {
    const label = fmtDate(iso, { weekday: "short" });
    return isArabic(lang) ? label.replace(/^ال/, "") : label;
  };

  return (
    <div className="space-y-4">
      <Reveal>
        <figure className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-black/5 sm:p-5">
          <figcaption>
            <h3 className="font-display text-xl font-bold text-sakia-green-deep sm:text-2xl">{t("weekTitle")}</h3>
            <p className="mt-1 text-sm leading-snug text-sakia-brown">{t("weekHint")}</p>
          </figcaption>

          <ol className="mt-4 grid gap-0.5 sm:gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => {
              const irr = d.action === "irriguer";
              const r = reserveOf(d);
              const tone = tubeTone(r);
              const rainy = d.rain >= 1;
              const scorching = Number.isFinite(d.tmax) && d.tmax >= 40;
              const pct = Math.round(r * 100);
              return (
                <li
                  key={d.date}
                  aria-label={`${fmtDate(d.date)} · ${Number.isFinite(d.tmax) ? `${fmtNum(d.tmax)} °C · ` : ""}${t("soilWater")} ${fmtNum(pct)} %${irr ? ` · ${t("irrigate")}` : ""}`}
                  className={`flex flex-col items-center gap-1 rounded-2xl px-0.5 py-2 text-center ${
                    irr ? "bg-sakia-water-light ring-2 ring-sakia-water/60" : i === 0 ? "bg-sakia-green-light" : "bg-sakia-sand/50"
                  }`}
                >
                  <span className="whitespace-nowrap text-xs font-bold leading-tight tracking-tight text-sakia-ink first-letter:uppercase">{dayShort(d.date)}</span>

                  {/* météo du jour */}
                  <span className={rainy ? "text-sakia-water" : scorching ? "text-sakia-alert" : "text-sakia-sun-deep"}>
                    {rainy ? <RainIcon className="h-7 w-7" /> : <SunIcon className={`h-7 w-7 ${scorching ? "sk-spin" : ""}`} />}
                  </span>
                  <span className={`text-sm font-extrabold leading-none ${scorching ? "text-sakia-alert" : "text-sakia-ink"}`} dir="ltr">
                    {Number.isFinite(d.tmax) ? `${fmtNum(d.tmax)}°` : "–"}
                  </span>
                  <span className="h-4 text-xs font-semibold leading-none text-sakia-water-deep" dir="ltr">
                    {d.rain >= 0.5 ? `${fmtNum(d.rain, d.rain < 10 ? 1 : 0)} ${t("mm")}` : ""}
                  </span>

                  {/* goutte les jours d'arrosage */}
                  <span className="grid h-6 place-items-center">
                    {irr && <DropIcon className="sk-sway h-6 w-6 text-sakia-water" />}
                  </span>

                  {/* le tube d'eau du sol */}
                  <span
                    className={`relative block h-24 w-7 overflow-hidden rounded-full border-2 bg-white sm:h-28 sm:w-9 ${tone.border}`}
                    role="img"
                    aria-label={`${t("soilWater")} ${fmtNum(pct)} %`}
                  >
                    <span
                      className={`sk-bar-y absolute inset-x-0 bottom-0 block bg-gradient-to-t ${tone.fill}`}
                      style={{ height: `${Math.max(4, pct)}%`, ["--d" as string]: `${i * 70}ms` }}
                    />
                  </span>
                  <span className={`text-xs font-extrabold leading-none ${tone.text}`} dir="ltr">
                    {fmtNum(pct)}%
                  </span>
                </li>
              );
            })}
          </ol>

          {/* légende : trois couleurs, trois mots */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-semibold text-sakia-brown">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#1d74b6]" />
              {t("tubeFull")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#e0a02a]" />
              {t("tubeLow")}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#d2552a]" />
              {t("tubeEmpty")}
            </span>
          </div>
        </figure>
      </Reveal>

      {/* jours d'arrosage : une carte chacun, avec la dose ; ou un seul message */}
      {watering.length > 0 ? (
        <section aria-label={t("wateringDays")} className="space-y-3">
          <h3 className="font-display text-xl font-bold text-sakia-green-deep sm:text-2xl">{t("wateringDays")}</h3>
          <ul className="grid gap-3 lg:grid-cols-2">
            {watering.map((d, i) => (
              <Reveal as="li" key={d.date} delay={i * 80} className="overflow-hidden rounded-3xl border-2 border-sakia-water bg-sakia-water-light">
                <div className="flex items-center gap-3 p-4 sm:gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sakia-water text-white sm:h-14 sm:w-14">
                    <DropIcon className="h-7 w-7 sm:h-8 sm:w-8" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold leading-tight text-sakia-ink first-letter:uppercase sm:text-lg">{fmtDate(d.date)}</p>
                    <p className="font-display text-xl font-extrabold leading-tight text-sakia-water-deep sm:text-2xl">
                      {d.litersPerTree != null ? t("perTree", { n: fmtNum(d.litersPerTree) }) : t("perHa", { n: fmtNum(d.m3PerHa) })}
                    </p>
                    {d.litersPerTree != null && <p className="text-sm font-medium text-sakia-brown">({t("perHa", { n: fmtNum(d.m3PerHa) })})</p>}
                  </div>
                </div>
                {d.estimated && <p className="bg-white/60 px-4 pb-3 text-xs font-semibold text-sakia-alert">{t("estimated")}</p>}
              </Reveal>
            ))}
          </ul>
        </section>
      ) : (
        <Reveal className="flex items-center gap-4 rounded-3xl bg-sakia-sand p-4 text-sakia-brown">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/70">
            <HandIcon className="h-8 w-8" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-tight">{t("noWateringTitle")}</p>
            <p className="mt-1 text-sm font-medium leading-snug">{t("noWateringBody", { day: fmtDate(last.date, { weekday: "long" }), pct: fmtNum(lastPct) })}</p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
