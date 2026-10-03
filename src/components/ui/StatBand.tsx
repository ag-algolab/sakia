"use client";

import { useEffect, useState } from "react";
import { PersonIcon } from "./icons";
import { useLang } from "./LangProvider";
import { CountUp, Reveal } from "./motion";
import type { BacktestResult } from "@/lib/backtest";

// « Pourquoi c'est important » : trois chiffres qui racontent le problème et ce que Sakia change.
// 230 % (nappe de Kairouan) et 1 adulte sur 4 viennent de docs/DATA-CARD.md (sources affichées sous chaque chiffre) ;
// la baisse d'eau pompée vient en direct du backtest (/api/backtest), jamais écrite à la main.

export default function StatBand({ crop }: { crop: string }) {
  const { t, fmtNum } = useLang();
  const [data, setData] = useState<BacktestResult | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    fetch(`/api/backtest?crop=${encodeURIComponent(crop)}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<BacktestResult>) : null))
      .then((d) => setData(d))
      .catch(() => {});
    return () => ctrl.abort();
  }, [crop]);

  const saved = data && Number.isFinite(data.summary.waterSavedPct) ? Math.max(0, data.summary.waterSavedPct) : null;

  return (
    <section aria-labelledby="why-title" className="relative overflow-hidden bg-sakia-green-deep px-4 py-10 text-white">
      <div aria-hidden className="pointer-events-none absolute -end-16 -top-16 h-56 w-56 rounded-full bg-sakia-sun/10 blur-2xl" />
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <h2 id="why-title" className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            {t("statsTitle")}
          </h2>
        </Reveal>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {/* 1. la nappe */}
          <Reveal delay={80} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="text-sm font-semibold text-white/80">{t("statAquiferLabel")}</p>
            <p className="font-display text-6xl font-extrabold leading-none text-sakia-sun" dir="ltr">
              <CountUp value={230} format={(n) => `${fmtNum(n)} %`} />
            </p>
            <div className="mt-4" dir="ltr">
              <div className="relative h-4 overflow-hidden rounded-full bg-white/15">
                <div className="sk-bar-x absolute inset-y-0 left-0 w-[92%] rounded-full bg-gradient-to-r from-sakia-sun to-[#e0642d]" style={{ ["--d" as string]: "250ms" }} />
                <div className="absolute inset-y-0 left-[40%] w-0.5 bg-white" />
              </div>
              <div className="relative mt-1 h-4 text-[11px] font-bold text-white/80">
                <span className="absolute left-[40%] -translate-x-1/2">100 %</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/65">{t("statAquiferSrc")}</p>
          </Reveal>

          {/* 2. l'eau économisée (vient de l'API) */}
          <Reveal delay={200} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="text-sm font-semibold text-white/80">{t("statWaterLabel")}</p>
            <p className="font-display text-6xl font-extrabold leading-none text-[#7fc8f2]" dir="ltr">
              {saved == null ? (
                <span className="inline-block h-14 w-28 animate-pulse rounded-xl bg-white/15 align-middle" />
              ) : (
                <CountUp value={saved} format={(n) => `−${fmtNum(n)} %`} />
              )}
            </p>
            <div className="mt-4 space-y-2" dir="ltr">
              <div className="h-3.5 rounded-full bg-white/15">
                <div className="sk-bar-x h-3.5 w-full rounded-full bg-sakia-sand-dark" style={{ ["--d" as string]: "350ms" }} />
              </div>
              <div className="h-3.5 rounded-full bg-white/15">
                <div
                  className="sk-bar-x h-3.5 rounded-full bg-[#4aa9e8]"
                  style={{ width: `${saved == null ? 0 : 100 - saved}%`, ["--d" as string]: "600ms" }}
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-white/65">{t("statWaterSrc", { n: data ? data.summary.seasons : "…" })}</p>
          </Reveal>

          {/* 3. lire */}
          <Reveal delay={320} className="rounded-3xl bg-white/[0.07] p-5 ring-1 ring-white/15">
            <p className="text-sm font-semibold text-white/80">&nbsp;</p>
            <p className="font-display text-5xl font-extrabold leading-none text-white">{t("statReadValue")}</p>
            <div className="mt-4 flex gap-2" dir="ltr">
              {[0, 1, 2, 3].map((i) => (
                <Reveal key={i} pop delay={500 + i * 140}>
                  <PersonIcon className={`h-11 w-11 ${i === 3 ? "text-sakia-sun" : "text-white/35"}`} />
                </Reveal>
              ))}
            </div>
            <p className="mt-3 text-sm font-semibold leading-snug">{t("statReadLabel")}</p>
            <p className="mt-1 text-xs text-white/65">{t("statReadSrc")}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
