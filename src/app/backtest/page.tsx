"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { CropSelect, useCatalog } from "@/components/ui/catalog";
import { useLang } from "@/components/ui/LangProvider";
import type { BacktestResult } from "@/lib/backtest";

export default function BacktestPage() {
  const { t, fmtNum } = useLang();
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5">
      {/* Bandeau permanent : toujours visible, jamais masqué par un état de chargement. */}
      <div role="note" className="rounded-xl border-2 border-sakia-alert bg-sakia-alert-light p-3 text-base font-bold text-sakia-alert">
        {t("proofBanner")}
      </div>

      <h1 className="text-2xl font-extrabold text-sakia-green">{t("proofTitle", { n: s ? s.seasons : "" })}</h1>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <CropSelect catalog={catalog} value={crop} onChange={setCrop} />
      </div>

      {loading && !data && <p className="py-8 text-center text-base text-sakia-brown">{t("loading")}</p>}

      {failed && (
        <div role="alert" className="rounded-xl border border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
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
        <div className={loading ? "space-y-4 opacity-60" : "space-y-4"} aria-busy={loading}>
          {data.seasons.length === 0 ? (
            <p className="rounded-xl bg-sakia-sand p-4 text-sakia-brown">{t("noSeasons")}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Tile
                  tone="green"
                  label={t("waterSaved")}
                  value={Number.isFinite(s.waterSavedPct) ? `${fmtNum(s.waterSavedPct)} %` : "–"}
                  sub={`${t("waterSavedSub")} · ${s.seasons} ${t("seasons")}`}
                />
                <Tile
                  tone="water"
                  label={t("stressDays")}
                  value={`${fmtNum(s.meanStressDaysFixed, 1)} → ${fmtNum(s.meanStressDaysAdaptive, 1)}`}
                  sub={t("stressSub")}
                />
                {s.meanRelYieldAdaptive != null && s.meanRelYieldFixed != null && (
                  <Tile
                    tone="brown"
                    label={t("relYield")}
                    value={`${fmtNum(s.meanRelYieldFixed * 100)} → ${fmtNum(s.meanRelYieldAdaptive * 100)} %`}
                    sub={`${t("fixedLabel")} → ${t("adaptiveLabel")} · ${t("relYieldSub")}`}
                  />
                )}
              </div>

              <section aria-labelledby="chart-title" className="rounded-xl bg-white p-4 shadow-sm">
                <h2 id="chart-title" className="text-lg font-bold text-sakia-brown">
                  {t("chartTitle")}
                </h2>
                <div className="mt-2 flex gap-4 text-sm">
                  <Legend color="bg-sakia-sand-dark" label={t("fixedLabel")} />
                  <Legend color="bg-sakia-green" label={t("adaptiveLabel")} />
                </div>
                <ul className="mt-3 space-y-3">
                  {data.seasons.map((x) => (
                    <li key={x.year} className="grid grid-cols-[3rem_1fr] items-center gap-2" dir="ltr">
                      <span className="text-sm font-semibold text-sakia-ink">{x.year}</span>
                      <div className="space-y-1">
                        <Bar value={x.fixed.grossMm} max={maxMm} color="bg-sakia-sand-dark" unit={t("mm")} fmt={fmtNum} />
                        <Bar value={x.adaptive.grossMm} max={maxMm} color="bg-sakia-green" unit={t("mm")} fmt={fmtNum} />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <p className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-3 text-sm font-medium text-sakia-brown">
                {t("fixedAssumption", { n: s.fixedEveryDays })}
              </p>
            </>
          )}
          <Assumptions items={data.assumptions} />
        </div>
      )}

      <Link
        href="/"
        className="flex min-h-12 items-center justify-center rounded-xl bg-sakia-green px-4 text-base font-bold text-white"
      >
        {t("seeAdvice")}
      </Link>
    </main>
  );
}

function Tile({ tone, label, value, sub }: { tone: "green" | "water" | "brown"; label: string; value: string; sub: string }) {
  const tones = {
    green: "bg-sakia-green text-white",
    water: "bg-sakia-water text-white",
    brown: "bg-sakia-brown text-white",
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <p className="text-sm font-semibold text-white/90">{label}</p>
      <p className="mt-1 text-3xl font-extrabold leading-tight" dir="ltr">
        {value}
      </p>
      <p className="mt-1 text-xs text-white/85">{sub}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-sakia-ink">
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
}: {
  value: number;
  max: number;
  color: string;
  unit: string;
  fmt: (n: number, d?: number) => string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 flex-1 rounded bg-sakia-sand/60">
        <div className={`h-4 rounded ${color}`} style={{ width: `${Math.max(1, (value / max) * 100)}%` }} />
      </div>
      <span className="w-16 text-end text-xs text-sakia-ink">
        {fmt(value)} {unit}
      </span>
    </div>
  );
}
