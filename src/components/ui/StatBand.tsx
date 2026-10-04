"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cropName, regionName } from "./catalog";
import { PersonIcon } from "./icons";
import { useLang } from "./LangProvider";
import { CountUp, Reveal } from "./motion";
import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import type { BacktestResult } from "@/lib/backtest";

// « Pourquoi c'est important » : trois chiffres qui racontent le problème et ce que Sakia change.
// Les chiffres du problème viennent de docs/NOTES-chiffres.md, MOT POUR MOT (A1 : Kairouan 27,9 % contre 17,3 % au national,
// INS recensement 2024 ; A2 : plus d'une personne sur quatre ; A8 : la nappe à environ 230 % de son volume renouvelable, presse 2024).
// La baisse d'eau pompée vient en direct du backtest (/api/backtest) pour la région et la culture de la personne, jamais écrite à la main.
// `example` : la personne n'a pas encore choisi ; on montre Kairouan et l'olivier, ÉTIQUETÉS comme exemple.

const KAIROUAN_ILLITERACY = 27.9; // % des 10 ans et plus (INS 2024, rapporté par la presse d'après ce recensement) : seule décimale autorisée
const TUNISIA_ILLITERACY = 17.3; // % national (INS, Flash Éducation, sept. 2025)

export default function StatBand({ region, crop, example }: { region: string; crop: string; example: boolean }) {
  const { lang, t, fmtNum } = useLang();
  // Le résultat porte la clé (région, culture) pour laquelle il a été calculé : on n'affiche jamais celui d'un autre choix.
  const key = `${region}|${crop}`;
  const [result, setResult] = useState<{ key: string; data?: BacktestResult } | null>(null);
  const data = result && result.key === key ? (result.data ?? null) : null;
  const failed = result != null && result.key === key && !result.data; // le calcul n'a pas pu se faire (hors connexion, limite de la météo)

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/backtest?region=${encodeURIComponent(region)}&crop=${encodeURIComponent(crop)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BacktestResult>) : null))
      .then((d) => setResult({ key, data: d ?? undefined }))
      .catch((e) => {
        if (e.name !== "AbortError") setResult({ key });
      });
    return () => ctrl.abort();
  }, [region, crop, key]);

  const saved = data && Number.isFinite(data.summary.waterSavedPct) ? Math.max(0, data.summary.waterSavedPct) : null;
  const cropObj = CROPS.find((c) => c.id === crop);
  const regionObj = REGIONS.find((r) => r.id === region);

  return (
    <section aria-labelledby="why-title" className="relative overflow-hidden bg-sakia-green-deep px-4 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-sakia-sun/10 blur-2xl" />
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 id="why-title" className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {t("statsTitle")}
          </h2>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {/* 1. la nappe de Kairouan */}
          <Reveal delay={80} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="text-sm font-semibold text-white/80">{t("statAquiferLabel")}</p>
            <p className="font-display text-6xl font-extrabold leading-none text-sakia-sun" dir="ltr">
              <CountUp value={230} format={(n) => `${fmtNum(n)} %`} />
            </p>
            <p className="mt-1 text-sm font-semibold text-white/80">{t("statAquiferSub")}</p>
            <div className="mt-4" dir="ltr">
              <div className="relative h-4 overflow-hidden rounded-full bg-white/15">
                <div className="sk-bar-x absolute inset-y-0 left-0 w-[92%] rounded-full bg-gradient-to-r from-sakia-sun to-[#e0642d]" style={{ ["--d" as string]: "250ms" }} />
                <div className="absolute inset-y-0 left-[40%] w-0.5 bg-white" />
              </div>
              <div className="relative mt-1 h-4 text-xs font-bold text-white/80">
                <span className="absolute left-[40%] -translate-x-1/2">100 %</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/65">{t("statAquiferSrc")}</p>
          </Reveal>

          {/* 2. l'eau économisée (vient de l'API) */}
          <Reveal delay={200} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="text-sm font-semibold text-white/80">{saved == null && failed ? t("statWaterRangeLabel") : t("statWaterLabel")}</p>
            <p className="font-display text-6xl font-extrabold leading-none text-[#7fc8f2]" dir="ltr">
              {saved != null ? (
                <CountUp value={saved} format={(n) => `−${fmtNum(n)} %`} />
              ) : failed ? (
                // Le calcul pour cette culture n'a pas répondu : on montre la fourchette de la fiche des données (README), dite telle quelle.
                `${fmtNum(3)}–${fmtNum(27)} %`
              ) : (
                <span className="inline-block h-14 w-28 animate-pulse rounded-xl bg-white/15 align-middle" />
              )}
            </p>
            <div className="mt-4 space-y-2" dir="ltr">
              <div className="h-3.5 rounded-full bg-white/15">
                <div className="sk-bar-x h-3.5 w-full rounded-full bg-sakia-sand-dark" style={{ ["--d" as string]: "350ms" }} />
              </div>
              <div className="h-3.5 rounded-full bg-white/15">
                <div className="sk-bar-x h-3.5 rounded-full bg-[#4aa9e8]" style={{ width: `${saved == null ? 0 : 100 - saved}%`, ["--d" as string]: "600ms" }} />
              </div>
            </div>
            {data && data.summary.meanStressDaysFixed >= 1 && (
              <div className="mt-4 rounded-2xl bg-white/10 p-3">
                <p className="text-xs font-semibold text-white/80">{t("statThirstyLabel")}</p>
                <p className="mt-1 flex items-baseline gap-2 font-display text-3xl font-extrabold leading-none" dir="ltr">
                  <span className="text-sakia-sun">{fmtNum(data.summary.meanStressDaysFixed, data.summary.meanStressDaysFixed < 10 ? 1 : 0)}</span>
                  <span aria-hidden className="text-xl text-white/60">
                    →
                  </span>
                  <span className="text-[#7fc8f2]">{fmtNum(data.summary.meanStressDaysAdaptive, data.summary.meanStressDaysAdaptive < 10 ? 1 : 0)}</span>
                </p>
              </div>
            )}
            {example && cropObj && regionObj && (
              <p className="mt-3 text-xs font-bold text-sakia-sun">{t("statExample", { crop: cropName(cropObj, lang), region: regionName(regionObj, lang) })}</p>
            )}
            <p className={`${example ? "mt-1" : "mt-3"} text-xs text-white/65`}>{t("statWaterSrc", { n: data ? data.summary.seasons : failed ? "11–12" : "…" })}</p>
            <Link href="/backtest" className="mt-2 inline-block min-h-11 content-center text-sm font-bold text-[#7fc8f2] underline underline-offset-2">
              {t("seeProof")}
            </Link>
          </Reveal>

          {/* 3. ceux qui ne lisent pas */}
          <Reveal delay={320} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="font-display text-6xl font-extrabold leading-none text-white" dir="ltr">
              <CountUp value={KAIROUAN_ILLITERACY} format={(n) => `${fmtNum(n, 1)} %`} />
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">{t("statReadLabel")}</p>
            <div className="mt-3 space-y-2" dir="ltr">
              <div className="h-3.5 rounded-full bg-white/15">
                <div className="sk-bar-x h-3.5 rounded-full bg-sakia-sun" style={{ width: `${(KAIROUAN_ILLITERACY / 30) * 100}%`, ["--d" as string]: "350ms" }} />
              </div>
              <div className="h-3.5 rounded-full bg-white/15">
                <div className="sk-bar-x h-3.5 rounded-full bg-sakia-sand-dark" style={{ width: `${(TUNISIA_ILLITERACY / 30) * 100}%`, ["--d" as string]: "600ms" }} />
              </div>
            </div>
            <div className="mt-3 flex gap-2" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <Reveal key={i} pop delay={500 + i * 140}>
                  <PersonIcon className={`h-9 w-9 ${i === 3 ? "text-sakia-sun" : "text-white/35"}`} />
                </Reveal>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold leading-snug text-white/90">{t("statReadMore")}</p>
            <p className="mt-1 text-xs text-white/65">{t("statReadSrc")}</p>
          </Reveal>
        </div>

        {/* la source météo a été vérifiée contre des stations tunisiennes */}
        <Reveal className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-white/85 ring-1 ring-white/15">
          <span>{t("statWeatherCheck")}</span>
          <Link href="/about#data" className="min-h-11 content-center font-bold text-[#7fc8f2] underline underline-offset-2">
            {t("dataCard")}
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
