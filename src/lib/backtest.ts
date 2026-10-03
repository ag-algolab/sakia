// Backtest : on rejoue des saisons passées (météo réelle ERA5) en comparant
//   - un calendrier fixe (hypothèse : calé sur la demande moyenne, à remplacer par le vrai calendrier),
//   - l'irrigation conseillée par le bilan hydrique,
//   - l'absence d'irrigation (référence pluviale).
// Le rendement relatif utilise la relation FAO-33 (1 - Ya/Ym = Ky (1 - ETa/ETm)) : une ESTIMATION par modèle, pas une mesure.

import type { Crop } from "./crops";
import { cropDaysTotal, defaultPlanting, kcOnDate } from "./crops";
import { effectiveRain, inSeason, simulate, sum } from "./waterBalance";
import type { IrrigationSystem, Policy, SoilName } from "./waterBalance";
import type { Day } from "./weather";

export type PolicyResult = {
  grossMm: number; // eau pompée (mm)
  m3PerHa: number;
  irrigations: number;
  stressDays: number; // jours où Ks < 0,95
  wasteMm: number; // eau perdue par percolation profonde
  etaOverEtc: number; // 1 = aucun manque d'eau
  relYield?: number; // rendement relatif estimé (0-1)
};

export type SeasonResult = {
  year: number; // année du semis (annuelles) ou de la saison (pérennes)
  from: string;
  to: string;
  rainMm: number;
  et0Mm: number;
  fixed: PolicyResult;
  adaptive: PolicyResult;
  none: PolicyResult;
};

export type BacktestResult = {
  cropId: string;
  seasons: SeasonResult[];
  summary: {
    seasons: number;
    meanGrossFixed: number;
    meanGrossAdaptive: number;
    waterSavedPct: number; // économie moyenne d'eau pompée, adaptatif vs fixe
    meanStressDaysFixed: number;
    meanStressDaysAdaptive: number;
    meanRelYieldFixed?: number;
    meanRelYieldAdaptive?: number;
    meanRelYieldNone?: number;
    fixedEveryDays: number;
    fixedNetMm: number;
  };
  assumptions: string[];
};

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Fenêtre de chaque saison : du semis à la récolte (annuelles), ou saison d'irrigation (pérennes).
function seasonWindows(crop: Crop, archive: Day[]): { year: number; from: string; to: string }[] {
  const first = archive[0].date;
  const last = archive[archive.length - 1].date;
  const out: { year: number; from: string; to: string }[] = [];
  const y0 = Number(first.slice(0, 4));
  const y1 = Number(last.slice(0, 4));
  for (let y = y0; y <= y1; y++) {
    if (crop.kind === "perennial") {
      const from = `${y}-${String(crop.irrigationSeason.from).padStart(2, "0")}-01`;
      const to = `${y}-${String(crop.irrigationSeason.to).padStart(2, "0")}-30`;
      if (from >= first && to <= last) out.push({ year: y, from, to });
    } else {
      const planting = defaultPlanting(crop, `${y}-12-31`);
      if (!planting || Number(planting.slice(0, 4)) !== y) continue;
      const to = addDays(planting, cropDaysTotal(crop) - 1);
      if (planting >= first && to <= last) out.push({ year: y, from: planting, to });
    }
  }
  return out;
}

function evaluate(
  crop: Crop,
  days: Day[],
  planting: string | undefined,
  soil: SoilName,
  system: IrrigationSystem,
  policy: Policy,
): PolicyResult {
  const sim = simulate({
    crop,
    days,
    planting,
    soil,
    system,
    initialDepletion: 0,
    policy,
    irrigationSeason: crop.irrigationSeason,
  });
  const etc = sum(sim.map((s) => s.etc));
  const eta = sum(sim.map((s) => s.eta));
  const gross = sum(sim.map((s) => s.irrigGross));
  const ratio = etc > 0 ? eta / etc : 1;
  return {
    grossMm: gross,
    m3PerHa: gross * 10,
    irrigations: sim.filter((s) => s.irrigNet > 0).length,
    stressDays: sim.filter((s) => s.ks < 0.95).length,
    wasteMm: sum(sim.map((s) => s.waste)),
    etaOverEtc: ratio,
    relYield: crop.ky != null ? Math.max(0, 1 - crop.ky * (1 - ratio)) : undefined,
  };
}

const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : NaN);

export function backtest(
  crop: Crop,
  archive: Day[],
  opts: { soil?: SoilName; system?: IrrigationSystem; fixedEveryDays?: number } = {},
): BacktestResult {
  const soil = opts.soil ?? "limoneux";
  const system = opts.system ?? "goutte";
  const everyDays = opts.fixedEveryDays ?? 7;
  const windows = seasonWindows(crop, archive);
  const byDate = new Map(archive.map((d) => [d.date, d]));
  const slice = (from: string, to: string) => archive.filter((d) => d.date >= from && d.date <= to);

  // Calendrier fixe SAISONNIER : une irrigation tous les everyDays jours, dose calée sur la demande nette
  // moyenne du MOIS (ETc - pluie utile, partie positive) observée sur toutes les saisons. C'est une référence
  // volontairement exigeante : un calendrier qui ignore la saison serait trop facile à battre.
  const dailyNeeds: number[] = [];
  const byMonth: number[][] = Array.from({ length: 12 }, () => []);
  for (const w of windows) {
    const planting = crop.kind === "annual" ? w.from : undefined;
    for (const d of slice(w.from, w.to)) {
      const kc = kcOnDate(crop, d.date, planting);
      if (kc == null || !inSeason(d.date, crop.irrigationSeason)) continue;
      const need = Math.max(0, kc * d.et0 - effectiveRain(d.rain, d.et0));
      dailyNeeds.push(need);
      byMonth[Number(d.date.slice(5, 7)) - 1].push(need);
    }
  }
  const fixedNetMm = mean(dailyNeeds) * everyDays;
  const netMmByMonth = byMonth.map((v) => (v.length ? mean(v) * everyDays : fixedNetMm));

  const seasons: SeasonResult[] = windows.map((w) => {
    const days = slice(w.from, w.to);
    const planting = crop.kind === "annual" ? w.from : undefined;
    const run = (policy: Policy) => evaluate(crop, days, planting, soil, system, policy);
    return {
      year: w.year,
      from: w.from,
      to: w.to,
      rainMm: sum(days.map((d) => d.rain)),
      et0Mm: sum(days.map((d) => d.et0)),
      fixed: run({ type: "fixed", everyDays, netMm: fixedNetMm, netMmByMonth }),
      adaptive: run({ type: "adaptive", trigger: 1 }),
      none: run({ type: "fixed", everyDays: 100000, netMm: 0 }),
    };
  });

  const gF = mean(seasons.map((s) => s.fixed.grossMm));
  const gA = mean(seasons.map((s) => s.adaptive.grossMm));
  const yield_ = (k: "fixed" | "adaptive" | "none") => {
    const v = seasons.map((s) => s[k].relYield).filter((x): x is number => x != null);
    return v.length ? mean(v) : undefined;
  };
  void byDate;
  return {
    cropId: crop.id,
    seasons,
    summary: {
      seasons: seasons.length,
      meanGrossFixed: gF,
      meanGrossAdaptive: gA,
      waterSavedPct: gF > 0 ? ((gF - gA) / gF) * 100 : NaN,
      meanStressDaysFixed: mean(seasons.map((s) => s.fixed.stressDays)),
      meanStressDaysAdaptive: mean(seasons.map((s) => s.adaptive.stressDays)),
      meanRelYieldFixed: yield_("fixed"),
      meanRelYieldAdaptive: yield_("adaptive"),
      meanRelYieldNone: yield_("none"),
      fixedEveryDays: everyDays,
      fixedNetMm,
    },
    assumptions: [
      "Météo observée ERA5 (Open-Meteo) du chef-lieu (pas des prévisions passées), saisons rejouées depuis 2015.",
      `Calendrier fixe saisonnier : une irrigation tous les ${everyDays} jours, dose calée sur la demande moyenne du mois sur toutes les saisons (référence volontairement exigeante). HYPOTHÈSE à remplacer par le calendrier réel de l'administration.`,
      "Rendement relatif : relation FAO-33, estimation par modèle et non mesure ; fiable pour des déficits modérés seulement.",
      crop.status === "a_verifier"
        ? "Coefficients de culture FAO-56, certaines valeurs ajustées ou interpolées : résultats indicatifs."
        : "Coefficients de culture FAO-56 lus tels quels.",
    ],
  };
}
