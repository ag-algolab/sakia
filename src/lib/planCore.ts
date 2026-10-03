// Cœur du plan d'irrigation : calcul PUR, sans appel réseau, utilisable côté serveur ET dans le navigateur
// (c'est ce qui permet à l'appli de recalculer hors connexion à partir de la dernière prévision gardée en cache).
// Le chargement de la météo est dans plan.ts (serveur).

import { getCrop } from "./crops";
import { getRegion } from "./regions";
import { EFFICIENCY, SOILS, simulate, sum } from "./waterBalance";
import type { IrrigationSystem, SimDay, SoilName } from "./waterBalance";
import type { Day, Forecast } from "./weather";

export type PlanRequest = {
  regionId: string;
  cropId: string;
  soil?: SoilName;
  system?: IrrigationSystem;
  planting?: string; // date de semis (annuelles)
  lastIrrigationDaysAgo?: number; // 0 à 7
  horizonDays?: number; // 7 par défaut
  // rejeu : calcule le plan « comme si on était à cette date » avec la météo observée (ERA5), pas une prévision
  asOf?: string;
};

export type PlanDay = {
  date: string;
  etc: number;
  rain: number;
  rainProb?: number;
  tmax: number;
  ks: number;
  dr: number;
  raw: number;
  action: "irriguer" | "attendre";
  netMm: number;
  grossMm: number;
  m3PerHa: number;
  litersPerTree?: number;
  estimated: boolean; // true = estimation climatologique, pas une prévision
};

// Garde-fou « pas sûr : demandez à une personne » (critère éliminatoire du jury) :
// l'outil dit quand il ne peut pas donner une réponse fiable, au lieu de deviner.
export type ConfidenceReason =
  | "very_stale_data" // météo de plus de 48 h : aucun conseil
  | "stale_data" // météo de plus de 12 h
  | "unknown_last_irrigation" // le dernier arrosage change la réponse et n'est pas connu
  | "analogy_coefficients" // coefficients de culture pris par analogie (non publiés pour cette culture)
  | "uncertain_rain" // pluie possible dans les 3 jours (probabilité entre 30 et 70 %)
  | "short_horizon"; // la prévision disponible ne couvre pas tout l'horizon demandé

export type Confidence = {
  level: "ok" | "low" | "none"; // none = aucun conseil donné
  askAPerson: boolean;
  reasons: ConfidenceReason[];
};

export type Plan = {
  regionId: string;
  cropId: string;
  today: string;
  generatedAt: string;
  dataFetchedAt: string;
  dataAgeHours: number;
  // "hors_vegetation" : la culture n'est pas en végétation à cette date (aucun plan d'irrigation)
  status: "ok" | "hors_vegetation";
  replay: boolean; // true = rejeu d'une date passée avec la météo observée
  confidence: Confidence;
  days: PlanDay[];
  summary: {
    nextIrrigation?: string;
    irrigationCount: number;
    totalGrossMm: number;
    totalM3PerHa: number;
    rainExpectedMm: number;
    tmaxMax: number;
    stressRisk: "faible" | "moyen" | "eleve";
    daysSinceLastIrrigation: number | null;
  };
  assumptions: string[];
};

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Cultures dont les coefficients sont pris par analogie (absents de FAO-56).
const ANALOGY_CROPS = new Set(["grenadier", "figuier"]);

export type ComputeOptions = {
  now?: Date; // horloge de l'appareil (hors connexion : l'âge des données grandit)
  today?: string; // date du jour de l'appareil ; sinon celle de la prévision
  estimatedFrom?: string; // première date issue de la climatologie, si la série a été prolongée
};

export function computePlan(req: PlanRequest, fc: Forecast, opts: ComputeOptions = {}): Plan {
  const region = getRegion(req.regionId);
  const crop = getCrop(req.cropId);
  if (!region) throw new Error(`Région inconnue : ${req.regionId}`);
  if (!crop) throw new Error(`Culture inconnue : ${req.cropId}`);
  const soil: SoilName = req.soil ?? "limoneux";
  const system: IrrigationSystem = req.system ?? "goutte";
  const horizon = req.horizonDays ?? 7;
  const now = opts.now ?? new Date();
  const replay = !!req.asOf;

  const today = req.asOf ?? opts.today ?? fc.today;
  const until = addDays(today, horizon - 1);
  const days: Day[] = fc.days;
  const estimatedFrom = opts.estimatedFrom;

  // point de départ de la simulation : dernier arrosage connu, sinon 7 jours en arrière
  const ago = req.lastIrrigationDaysAgo;
  const startDate = ago != null ? addDays(today, -Math.min(7, Math.max(0, ago))) : addDays(today, -7);
  const series = days.filter((d) => d.date >= startDate && d.date <= until);

  const sim = simulate({
    crop,
    days: series,
    planting: req.planting,
    soil,
    system,
    initialDepletion: ago != null ? 0 : 0.5,
    policy: { type: "adaptive", trigger: 1 },
    irrigationSeason: crop.irrigationSeason,
  });
  const planned = sim.filter((s) => s.date >= today);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const areaPerTree = crop.treesPerHa ? 10000 / crop.treesPerHa : undefined; // m² par arbre
  const planDays: PlanDay[] = planned.map((s: SimDay) => {
    const w = byDate.get(s.date)!;
    return {
      date: s.date,
      etc: s.etc,
      rain: s.rain,
      rainProb: w.rainProb,
      tmax: w.tmax,
      ks: s.ks,
      dr: s.dr,
      raw: s.raw,
      action: s.irrigNet > 0 ? "irriguer" : "attendre",
      netMm: s.irrigNet,
      grossMm: s.irrigGross,
      m3PerHa: s.irrigGross * 10,
      litersPerTree: areaPerTree ? s.irrigGross * areaPerTree : undefined,
      estimated: estimatedFrom != null && s.date >= estimatedFrom,
    };
  });

  const irrig = planDays.filter((d) => d.action === "irriguer");
  const status: Plan["status"] = planDays.length === 0 ? "hors_vegetation" : "ok";
  const minKs = Math.min(...planDays.map((d) => d.ks), 1);
  const maxDrRatio = Math.max(...planDays.map((d) => d.dr / d.raw), 0);
  const stressRisk = minKs < 0.8 ? "eleve" : minKs < 0.95 || maxDrRatio > 0.9 ? "moyen" : "faible";
  const lastIrrigSim = sim.filter((s) => s.date < today && s.irrigNet > 0).pop();
  const daysSince =
    ago != null
      ? ago
      : lastIrrigSim
        ? Math.round((Date.parse(today) - Date.parse(lastIrrigSim.date)) / 86400000)
        : null;

  // ---- garde-fou : quand l'outil ne doit pas deviner ----
  const dataAgeHours = Math.max(0, (now.getTime() - Date.parse(fc.fetchedAt)) / 3600000);
  const reasons: ConfidenceReason[] = [];
  if (!replay && dataAgeHours > 48) reasons.push("very_stale_data");
  else if (!replay && dataAgeHours > 12) reasons.push("stale_data");
  if (status === "ok" && ago == null) reasons.push("unknown_last_irrigation");
  if (ANALOGY_CROPS.has(crop.id)) reasons.push("analogy_coefficients");
  if (planDays.slice(0, 3).some((d) => d.rainProb != null && d.rainProb >= 30 && d.rainProb <= 70)) reasons.push("uncertain_rain");
  const covered = planDays.filter((d) => !d.estimated).length;
  if (status === "ok" && covered < Math.min(horizon, 7)) reasons.push("short_horizon");

  const level: Confidence["level"] = reasons.includes("very_stale_data") ? "none" : reasons.length > 0 ? "low" : "ok";
  const confidence: Confidence = { level, askAPerson: level !== "ok", reasons };

  const tmaxs = planDays.map((d) => d.tmax).filter((t) => Number.isFinite(t));
  return {
    regionId: req.regionId,
    cropId: req.cropId,
    today,
    generatedAt: now.toISOString(),
    dataFetchedAt: fc.fetchedAt,
    dataAgeHours,
    status,
    replay,
    confidence,
    days: level === "none" ? [] : planDays,
    summary: {
      nextIrrigation: level === "none" ? undefined : irrig[0]?.date,
      irrigationCount: level === "none" ? 0 : irrig.length,
      totalGrossMm: level === "none" ? 0 : sum(irrig.map((d) => d.grossMm)),
      totalM3PerHa: level === "none" ? 0 : sum(irrig.map((d) => d.m3PerHa)),
      rainExpectedMm: sum(planDays.map((d) => d.rain)),
      tmaxMax: tmaxs.length ? Math.max(...tmaxs) : NaN,
      stressRisk,
      daysSinceLastIrrigation: daysSince,
    },
    assumptions: [
      replay
        ? `REJEU du ${req.asOf} : météo observée ERA5 (Open-Meteo, chef-lieu de ${region.nameFr}), pas une prévision.`
        : `Météo réelle Open-Meteo (point du chef-lieu de ${region.nameFr}), mise à jour toutes les 3 h environ.`,
      `${SOILS[soil].nameFr} (eau utile indicative), irrigation ${system} (efficience ${Math.round(EFFICIENCY[system] * 100)} %).`,
      `Coefficients de culture FAO-56${crop.status === "a_verifier" ? " (certaines valeurs ajustées ou interpolées : voir la fiche de la culture)" : ""}.`,
      "Pluie utile (règle FAO-56) : ignorée si inférieure à 0,2 × ET0, comptée entièrement sinon ; ruissellement non modélisé.",
      crop.treesPerHa ? `Densité supposée : ${crop.treesPerHa} arbres/ha (à ajuster).` : "Besoins exprimés en mm et en m³/ha.",
      estimatedFrom
        ? `À partir du ${estimatedFrom}, météo estimée par la climatologie 2015-2025 (pas une prévision).`
        : "Horizon couvert par la prévision météo.",
      "Conseil indicatif : une personne décide. À valider auprès de l'administration agricole régionale.",
    ],
  };
}
