// Plan d'irrigation côté serveur : charge la météo réelle (Open-Meteo) puis appelle le calcul pur de planCore.ts.
// Au-delà de la prévision (16 jours), la suite est une estimation climatologique, signalée comme telle.

import { getCrop } from "./crops";
import { getRegion } from "./regions";
import { addDays, computePlan } from "./planCore";
import type { Plan, PlanRequest } from "./planCore";
import { fetchForecast, fetchArchive, climatology } from "./weather";
import type { Day, Forecast } from "./weather";

export type { Plan, PlanDay, PlanRequest, Confidence, ConfidenceReason } from "./planCore";
export { computePlan } from "./planCore";

// Prolonge la prévision avec la climatologie quand l'horizon dépasse les 16 jours de prévision.
async function extendWithClimatology(
  days: Day[],
  lat: number,
  lon: number,
  until: string,
): Promise<{ days: Day[]; estimatedFrom?: string }> {
  const last = days[days.length - 1].date;
  if (last >= until) return { days };
  const archive = await fetchArchive(lat, lon, "2015-01-01", addDays(last, -1).slice(0, 4) + "-12-31");
  const clim = climatology(archive);
  const out = [...days];
  let d = addDays(last, 1);
  const estimatedFrom = d;
  while (d <= until) {
    const c = clim.get(d.slice(5));
    if (c) out.push({ date: d, et0: c.et0, rain: c.rain, tmax: NaN, tmin: NaN });
    d = addDays(d, 1);
  }
  return { days: out, estimatedFrom };
}

// Prévision brute d'une région (aussi servie par /api/forecast pour le cache hors connexion de l'appli).
export async function loadForecast(regionId: string, asOf?: string, horizon = 7): Promise<Forecast> {
  const region = getRegion(regionId);
  if (!region) throw new Error(`Région inconnue : ${regionId}`);
  if (asOf) {
    // rejeu : 7 jours avant la date choisie et l'horizon qui suit, météo observée
    const archive = await fetchArchive(region.lat, region.lon, addDays(asOf, -7), addDays(asOf, horizon + 1));
    return { days: archive, today: asOf, fetchedAt: new Date().toISOString(), source: "open-meteo" };
  }
  return fetchForecast(region.lat, region.lon);
}

export async function buildPlan(req: PlanRequest, forecastOverride?: Forecast): Promise<Plan> {
  const region = getRegion(req.regionId);
  if (!region) throw new Error(`Région inconnue : ${req.regionId}`);
  if (!getCrop(req.cropId)) throw new Error(`Culture inconnue : ${req.cropId}`);
  const horizon = req.horizonDays ?? 7;

  const fc = forecastOverride ?? (await loadForecast(req.regionId, req.asOf, horizon));
  const today = req.asOf ?? fc.today;
  const { days, estimatedFrom } = await extendWithClimatology(fc.days, region.lat, region.lon, addDays(today, horizon - 1));
  return computePlan(req, { ...fc, days }, { estimatedFrom });
}
