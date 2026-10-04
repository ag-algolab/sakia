import type { Metadata } from "next";
import Link from "next/link";
import { REGIONS } from "@/lib/regions";
import metrics from "../../../ml/results/metrics.json";
import LabLive from "./LabLive";

export const metadata: Metadata = {
  title: "Sakia Lab — a satellite-trained second opinion",
  description: "A 43 KB gradient-boosting model trained on satellite evapotranspiration, run in your browser. Protocol published first, results published as they are, failures included.",
};

type Row = { n: number; rmse: number; r2: number; bias: number };
type Diff = { diff: number; ci95: [number, number]; n_cells: number };
type Metrics = {
  n_pixels: Record<string, number>;
  n_cells: Record<string, number>;
  kairouan_test_2024_2025: Record<string, Row>;
  kairouan_test_rmse_diff: { C: Record<string, Diff> };
  kairouan_test_by_season: Record<string, Record<string, Row>>;
  kairouan_test_disagreement: { M1_minus_null_spearman: { diff: number; ci95: [number, number] } };
  kairouan_cell_and_year_holdout_cv: { models: Record<string, Row> };
  transfer: Record<string, { all_years: Record<string, Row> }>;
  m1_trees: number;
};
const m = metrics as unknown as Metrics;

const LABEL: Record<string, string> = {
  C: "Monthly climatology (calendar only)",
  P0: "Water balance, FAO-56 style",
  M1: "CatBoost, weather + calendar (43 KB, runs offline)",
  M1c: "M1 + month as categorical feature",
  H1: "Hybrid: water balance + CatBoost correction",
  M2: "M1 + NDVI (partly circular, not deployable)",
};
const ORDER = ["C", "P0", "M1", "M1c", "H1", "M2"];
const REGION_NAME: Record<string, string> = { sidi_bouzid: "Sidi Bouzid, Tunisia (near)", haouz: "Haouz (Marrakech), Morocco", gezira: "Gezira, Sudan (Sahel)" };

export default function LabPage() {
  const k = m.kairouan_test_2024_2025;
  const max = Math.max(...ORDER.map((id) => k[id].rmse));
  const regions = REGIONS.map((r) => ({ id: r.id, name: r.nameFr }));
  const dis = m.kairouan_test_disagreement.M1_minus_null_spearman;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 px-4 py-8" lang="en" dir="ltr">
      <header className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-sakia-green">Research · shadow mode · does not change any advice</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight text-sakia-ink sm:text-4xl">Sakia Lab: can a small learned model add anything to the physics?</h1>
        <p className="text-lg text-sakia-brown">
          The irrigation advice comes from a transparent FAO-56 water balance. Here we asked a harder question, in public: does a <strong>{m.m1_trees}-tree CatBoost model</strong> (43 KB), trained on
          free satellite evapotranspiration of Kairouan cropland, track the satellite <em>better than a calendar</em>, and does it carry over to other places in Africa? The protocol was written
          before the full run; every later change is logged. The answers below include the ones we did not hope for.
        </p>
      </header>

      <section aria-labelledby="live" className="space-y-3">
        <h2 id="live" className="font-display text-2xl font-extrabold text-sakia-ink">Run it yourself, in your browser</h2>
        <LabLive regions={regions} />
      </section>

      <section aria-labelledby="results" className="space-y-3">
        <h2 id="results" className="font-display text-2xl font-extrabold text-sakia-ink">How close to the satellite? (Kairouan, held-out years 2024–2025)</h2>
        <p className="text-sakia-brown">
          Error against satellite evapotranspiration, in mm/day (shorter is better). {m.n_pixels.kairouan} cropland pixels in {m.n_cells.kairouan} weather cells. Intervals resample weather cells, because
          pixels in one cell share the same weather.
        </p>
        <ul className="space-y-2 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          {ORDER.map((id) => {
            const d = m.kairouan_test_rmse_diff.C[id];
            return (
              <li key={id} className="grid grid-cols-[minmax(0,12rem)_1fr] items-center gap-3 text-sm sm:grid-cols-[18rem_1fr]">
                <span className={`font-semibold ${id === "M1" ? "text-sakia-green-deep" : "text-sakia-ink"}`}>{LABEL[id]}</span>
                <span className="flex items-center gap-2">
                  <span className="h-4 rounded-full" style={{ width: `${(k[id].rmse / max) * 100}%`, background: id === "M1" ? "var(--color-sakia-green, #2f7d4a)" : "var(--color-sakia-sand-dark, #cdbf9f)" }} aria-hidden />
                  <span className="whitespace-nowrap font-bold text-sakia-ink">{k[id].rmse.toFixed(3)}</span>
                  {d && (
                    <span className="whitespace-nowrap text-sakia-brown">
                      ({d.diff >= 0 ? "+" : "−"}
                      {Math.abs(d.diff).toFixed(3)} vs calendar; 95 %: {d.ci95[0].toFixed(3)} to {d.ci95[1].toFixed(3)})
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-sakia-brown">
          <strong>Reading:</strong> weather alone brings a <strong>modest</strong> gain over the calendar (about 9 %; R² {k.C.r2.toFixed(2)} → {k.M1.r2.toFixed(2)}), clearly better than the crude water balance, and
          the learned model is tiny. By season the gain is in autumn ({m.kairouan_test_by_season.autumn.M1.rmse.toFixed(3)} vs {m.kairouan_test_by_season.autumn.C.rmse.toFixed(3)}) and winter, and{" "}
          <strong>zero in spring</strong> ({m.kairouan_test_by_season.spring.M1.rmse.toFixed(3)} vs {m.kairouan_test_by_season.spring.C.rmse.toFixed(3)}), when cereals green up and weather alone does not know the crop calendar.
          Adding NDVI (M2) helps a lot, but it shares its sensor with the label, so we do not count it.
        </p>
      </section>

      <section aria-labelledby="failed" className="space-y-3">
        <h2 id="failed" className="font-display text-2xl font-extrabold text-sakia-ink">What did not work, on purpose published</h2>
        <ul className="list-disc space-y-2 ps-6 text-sakia-brown">
          <li><strong>Month as a categorical feature adds nothing</strong> ({k.M1c.rmse.toFixed(3)} against {k.M1.rmse.toFixed(3)}): a cyclical day-of-year is enough, and the numeric-only model is the one that fits in a browser.</li>
          <li><strong>The hybrid (physics + learned correction) is no better than the pure model</strong> ({k.H1.rmse.toFixed(3)}).</li>
          <li>
            <strong>The “not sure” safeguard rule was not met.</strong> The disagreement between the model and the water balance tracks the water balance's error (within-month rank correlation about 0.5), but only
            {" "}{dis.diff.toFixed(3)} better than a naive disagreement (95 %: {dis.ci95[0].toFixed(3)} to {dis.ci95[1].toFixed(3)}), below the 0.10 we had fixed in advance. So it is information only, and it never triggers
            “ask a technician”.
          </li>
          <li><strong>No irrigated pixel in the Kairouan sample</strong> (most cropland there is rainfed): this study says little about irrigated fields.</li>
        </ul>
      </section>

      <section aria-labelledby="travel" className="space-y-3">
        <h2 id="travel" className="font-display text-2xl font-extrabold text-sakia-ink">Does it travel? The pipeline does; the trained model only partly</h2>
        <p className="text-sakia-brown">
          Every ingredient (MODIS, Open-Meteo, ESA WorldCover) covers all of Africa, so another region means changing one box in the code. We applied the Kairouan model, unchanged, to three other regions. Error in mm/day;
          “local calendar” is each region's own monthly average computed on its own data (optimistic for the calendar).
        </p>
        <div className="overflow-x-auto rounded-xl border border-sakia-sand-dark bg-white" role="region" aria-label="Transfer to other regions" tabIndex={0}>
          <table className="w-full text-sm">
            <thead className="bg-sakia-sand text-start">
              <tr>
                <th className="p-2 text-start">Region</th>
                <th className="p-2 text-start">Pixels / weather cells</th>
                <th className="p-2 text-start">Local calendar</th>
                <th className="p-2 text-start">Kairouan model</th>
                <th className="p-2 text-start">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(m.transfer).map(([id, t]) => {
                const a = t.all_years;
                const better = a.M1.rmse < a.C_local.rmse;
                return (
                  <tr key={id} className="border-t border-sakia-sand-dark">
                    <td className="p-2 font-semibold">{REGION_NAME[id] ?? id}</td>
                    <td className="p-2">{m.n_pixels[id]} / {m.n_cells[id]}</td>
                    <td className="p-2">{a.C_local.rmse.toFixed(3)}</td>
                    <td className="p-2 font-bold">{a.M1.rmse.toFixed(3)}</td>
                    <td className={`p-2 font-semibold ${better ? "text-sakia-green-deep" : "text-sakia-alert"}`}>{better ? "Carries over" : "Fails: needs local training"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-sakia-brown">
          <strong>What we conclude:</strong> a model trained in one climate regime does not carry to another (the Sahelian rainy-season regime is not Kairouan's). The honest way to extend Sakia across Africa is to train one small model per
          regime, which this pipeline does with about 90 minutes of free public data per region. Sidi Bouzid has only 4 weather cells, so its apparent success is fragile.
        </p>
      </section>

      <section aria-labelledby="how" className="space-y-2">
        <h2 id="how" className="font-display text-2xl font-extrabold text-sakia-ink">How to check us</h2>
        <p className="text-sakia-brown">
          Protocol, amendment log, every number and the code are public:{" "}
          <a className="font-semibold text-sakia-water underline underline-offset-2" href="https://github.com/ag-algolab/sakia/tree/main/ml">github.com/ag-algolab/sakia/tree/main/ml</a>. The satellite label is itself a model product, so we only ever
          say “closer to the satellite”, never “more accurate”. <Link className="font-semibold text-sakia-water underline underline-offset-2" href="/about">What the AI does elsewhere in Sakia</Link>. Also measured: <Link className="font-semibold text-sakia-water underline underline-offset-2" href="/speed">Sakia on a weak connection, against five other sites</Link>.
        </p>
      </section>
    </main>
  );
}
