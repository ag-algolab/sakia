"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { CropSelect, cropName, useCatalog } from "@/components/ui/catalog";
import { DropIcon, WaterBarIcon } from "@/components/ui/icons";
import { useLang } from "@/components/ui/LangProvider";
import { CountUp, Reveal } from "@/components/ui/motion";
import Plant from "@/components/ui/Plant";
import type { BacktestResult } from "@/lib/backtest";

export default function BacktestPage() {
  const { lang, t, fmtNum } = useLang();
  const catalog = useCatalog();
  const [crop, setCrop] = useState("olivier");
  const [data, setData] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setFailed(false);
    fetch(`/api/backtest?crop=${encodeURIComponent(crop)}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as BacktestResult;
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setFailed(true);
        setLoading(false);
      });
    return () => ctrl.abort();
  }, [crop, reload]);

  const s = data?.summary;
  const maxMm = data ? Math.max(1, ...data.seasons.flatMap((x) => [x.fixed.grossMm, x.adaptive.grossMm])) : 1;
  const cropLabel = catalog?.crops.find((c) => c.id === crop);
  const stressFixed = s?.meanStressDaysFixed ?? 0;
  const stressAdaptive = s?.meanStressDaysAdaptive ?? 0;

  return (
    <>
      {/* Bandeau permanent : toujours visible, jamais masqué par un état de chargement. */}
      <div role="note" className="bg-sakia-alert-light px-4 py-3 text-center text-base font-extrabold text-sakia-alert">
        {t("proofBanner")}
      </div>

      {/* ---------- en-tête ---------- */}
      <section className="sk-hero-sky relative overflow-hidden px-4 pb-16 pt-8 text-white">
        <div aria-hidden className="pointer-events-none absolute -end-10 top-4 h-44 w-44 rounded-full bg-sakia-sun/25 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <h1 className="font-display max-w-xl text-4xl font-bold leading-[1.05] sm:text-6xl">{t("proofHeadline")}</h1>
          <p className="mt-3 max-w-lg text-base leading-snug text-white/90 sm:text-lg">{t("proofSub")}</p>
        </div>
      </section>

      <main className="relative z-10 mx-auto -mt-10 w-full max-w-4xl flex-1 space-y-6 px-4 pb-10">
        <div className="rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5">
          <CropSelect catalog={catalog} value={crop} onChange={setCrop} />
        </div>

        {loading && !data && <p className="py-10 text-center text-base text-sakia-brown">{t("loading")}</p>}

        {failed && (
          <div role="alert" className="rounded-2xl border border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
            <p className="font-semibold">{t("error")}</p>
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="mt-2 min-h-11 rounded-lg bg-sakia-alert px-4 font-semibold text-white"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {data && s && (
          <div className={loading ? "space-y-6 opacity-60" : "space-y-6"} aria-busy={loading} key={crop}>
            {data.seasons.length === 0 ? (
              <p className="rounded-2xl bg-sakia-sand p-4 text-sakia-brown">{t("noSeasons")}</p>
            ) : (
              <>
                {/* ---------- l'eau économisée ---------- */}
                <Reveal className="relative overflow-hidden rounded-3xl bg-sakia-green-deep p-6 text-white shadow-md">
                  <DropIcon className="sk-sway pointer-events-none absolute -end-6 -top-6 h-44 w-44 text-white/[0.07]" />
                  <p className="relative text-sm font-semibold text-white/80">{cropLabel ? cropName(cropLabel, lang) : ""}</p>
                  <p className="font-display relative text-[5.5rem] font-extrabold leading-none text-[#7fc8f2] sm:text-[7rem]" dir="ltr">
                    {Number.isFinite(s.waterSavedPct) ? <CountUp value={Math.max(0, s.waterSavedPct)} format={(n) => `−${fmtNum(n)} %`} /> : "–"}
                  </p>
                  <p className="relative mt-1 text-lg font-bold">{t("waterSaved")}</p>
                  <p className="relative text-sm text-white/70">{t("waterSavedSub")} · {s.seasons} {t("seasons")}</p>
                  <div className="relative mt-5 space-y-2" dir="ltr">
                    <div className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-semibold text-white/75">{t("fixedLabel")}</span>
                      <div className="h-4 flex-1 rounded-full bg-white/10">
                        <div className="sk-bar-x h-4 w-full rounded-full bg-sakia-sand-dark" />
                      </div>
                      <span className="w-14 shrink-0 text-end text-xs font-bold">{fmtNum(s.meanGrossFixed)} {t("mm")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs font-semibold text-white/75">{t("adaptiveLabel")}</span>
                      <div className="h-4 flex-1 rounded-full bg-white/10">
                        <div
                          className="sk-bar-x h-4 rounded-full bg-[#4aa9e8]"
                          style={{ width: `${s.meanGrossFixed > 0 ? (s.meanGrossAdaptive / s.meanGrossFixed) * 100 : 0}%`, ["--d" as string]: "250ms" }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-end text-xs font-bold">{fmtNum(s.meanGrossAdaptive)} {t("mm")}</span>
                    </div>
                  </div>
                </Reveal>

                {/* ---------- les jours de stress : deux plantes ---------- */}
                <Reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("stressDays")}</h2>
                  <p className="text-sm text-sakia-brown">{t("stressSub")}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-sakia-alert-light p-3 text-center text-sakia-alert">
                      <Plant wilted className="mx-auto h-28 w-28" />
                      <p className="font-display text-4xl font-extrabold leading-none" dir="ltr">
                        <CountUp value={stressFixed} format={(n) => fmtNum(n, 1)} />
                      </p>
                      <p className="mt-1 text-xs font-bold">{t("fixedLabel")}</p>
                    </div>
                    <div className="rounded-2xl bg-sakia-green-light p-3 text-center text-sakia-green">
                      <Plant wilted={false} className="mx-auto h-28 w-28" />
                      <p className="font-display text-4xl font-extrabold leading-none" dir="ltr">
                        <CountUp value={stressAdaptive} format={(n) => fmtNum(n, 1)} />
                      </p>
                      <p className="mt-1 text-xs font-bold">{t("adaptiveLabel")}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-sm font-semibold text-sakia-brown">
                    {stressAdaptive < 0.5 ? t("plantNone") : t("plantStress", { n: fmtNum(stressAdaptive, 1) })}
                  </p>
                </Reveal>

                {/* ---------- rendement relatif estimé (si publié pour cette culture) ---------- */}
                {s.meanRelYieldAdaptive != null && s.meanRelYieldFixed != null && (
                  <Reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                    <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("relYield")}</h2>
                    <p className="text-sm text-sakia-brown">{t("relYieldSub")}</p>
                    <div className="mt-4 space-y-3" dir="ltr">
                      {[
                        { label: t("fixedLabel"), v: s.meanRelYieldFixed, color: "bg-sakia-sand-dark", d: 0 },
                        { label: t("adaptiveLabel"), v: s.meanRelYieldAdaptive, color: "bg-[#4aa263]", d: 250 },
                      ].map((b) => (
                        <div key={b.label} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-xs font-semibold text-sakia-brown">{b.label}</span>
                          <div className="h-5 flex-1 rounded-full bg-sakia-sand">
                            <div className={`sk-bar-x h-5 rounded-full ${b.color}`} style={{ width: `${Math.max(2, b.v * 100)}%`, ["--d" as string]: `${b.d}ms` }} />
                          </div>
                          <span className="w-12 shrink-0 text-end text-sm font-extrabold">{fmtNum(b.v * 100)} %</span>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                )}

                {/* ---------- eau pompée, saison par saison ---------- */}
                <section aria-labelledby="chart-title" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center gap-2">
                    <WaterBarIcon className="h-6 w-6 text-sakia-water" />
                    <h2 id="chart-title" className="font-display text-2xl font-bold text-sakia-green-deep">
                      {t("chartTitle")}
                    </h2>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <Legend color="bg-sakia-sand-dark" label={t("fixedLabel")} />
                    <Legend color="bg-[#2b8fd6]" label={t("adaptiveLabel")} />
                  </div>
                  <ul className="mt-4 space-y-3">
                    {data.seasons.map((x, i) => (
                      <Reveal as="li" key={x.year} delay={Math.min(i, 6) * 40} className="grid grid-cols-[3rem_1fr] items-center gap-2">
                        <span className="text-sm font-bold text-sakia-ink" dir="ltr">
                          {x.year}
                        </span>
                        <div className="space-y-1" dir="ltr">
                          <Bar value={x.fixed.grossMm} max={maxMm} color="bg-sakia-sand-dark" unit={t("mm")} fmt={fmtNum} />
                          <Bar value={x.adaptive.grossMm} max={maxMm} color="bg-[#2b8fd6]" unit={t("mm")} fmt={fmtNum} delay={150} />
                        </div>
                      </Reveal>
                    ))}
                  </ul>
                </section>

                <p className="rounded-2xl border border-sakia-sand-dark bg-sakia-sand p-4 text-sm font-semibold leading-relaxed text-sakia-brown">
                  {t("fixedAssumption", { n: s.fixedEveryDays })}
                </p>
              </>
            )}
            <Assumptions items={data.assumptions} />
          </div>
        )}

        <Link
          href="/"
          className="sk-press flex min-h-14 items-center justify-center rounded-2xl bg-sakia-green px-4 text-lg font-bold text-white shadow-md"
        >
          {t("seeAdvice")}
        </Link>
      </main>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-semibold text-sakia-ink">
      <span className={`inline-block h-3 w-3 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function Bar({
  value,
  max,
  color,
  unit,
  fmt,
  delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  unit: string;
  fmt: (n: number, d?: number) => string;
  delay?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 flex-1 rounded-full bg-sakia-sand/70">
        <div className={`sk-bar-x h-4 rounded-full ${color}`} style={{ width: `${Math.max(1, (value / max) * 100)}%`, ["--d" as string]: `${delay}ms` }} />
      </div>
      <span className="w-16 text-end text-xs font-semibold text-sakia-ink">
        {fmt(value)} {unit}
      </span>
    </div>
  );
}
