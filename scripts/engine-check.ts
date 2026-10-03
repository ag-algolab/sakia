// Vérification du moteur sur la météo réelle : backtest de toutes les cultures et plans de rejeu pour Kairouan.
// Lancer : npx tsx scripts/engine-check.ts

import { CROPS } from "../src/lib/crops";
import { getRegion } from "../src/lib/regions";
import { buildPlan } from "../src/lib/plan";
import { backtest } from "../src/lib/backtest";
import { fetchArchive } from "../src/lib/weather";

const f1 = (n: number | undefined) => (n == null || !Number.isFinite(n) ? "  n/a" : n.toFixed(1).padStart(5));

async function main() {
  const region = getRegion("kairouan")!;
  const archive = await fetchArchive(region.lat, region.lon, "2015-01-01", "2026-09-30");

  console.log(`\nBacktest à ${region.nameFr} (goutte-à-goutte, sol limoneux, calendrier fixe tous les 7 jours)`);
  console.log("culture          saisons  eau fixe  eau conseillée  économie  stress fixe  stress conseillé  rendement fixe / conseillé / sans irrigation");
  for (const crop of CROPS) {
    const s = backtest(crop, archive).summary;
    console.log(
      `${crop.id.padEnd(16)} ${String(s.seasons).padStart(7)} ${f1(s.meanGrossFixed)}mm ${f1(s.meanGrossAdaptive)}mm      ${f1(s.waterSavedPct)}%    ${f1(s.meanStressDaysFixed)}j        ${f1(s.meanStressDaysAdaptive)}j        ${f1(s.meanRelYieldFixed)} / ${f1(s.meanRelYieldAdaptive)} / ${f1(s.meanRelYieldNone)}`,
    );
  }

  for (const [cropId, asOf] of [["olivier", "2026-07-17"], ["tomate", "2026-07-17"], ["piment", "2026-07-17"]] as const) {
    const plan = await buildPlan({ regionId: "kairouan", cropId, asOf, lastIrrigationDaysAgo: 6 });
    console.log(`\n=== Rejeu ${asOf} : ${cropId} (statut ${plan.status}) ===`);
    for (const d of plan.days) {
      console.log(
        `${d.date} Tmax=${f1(d.tmax)} ETc=${f1(d.etc)} Dr=${f1(d.dr)}/${f1(d.raw)} -> ${d.action}` +
          (d.action === "irriguer" ? ` ${f1(d.grossMm)} mm bruts (${f1(d.m3PerHa)} m3/ha${d.litersPerTree ? `, ${f1(d.litersPerTree)} L/arbre` : ""})` : ""),
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
