// GET /api/plan?region=kairouan&crop=olivier&soil=limoneux&system=goutte&ago=3&planting=2026-04-01
// Renvoie le plan d'irrigation sur 7 jours (voir src/lib/plan.ts, type Plan).

import { buildPlan } from "@/lib/plan";
import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

const SOILS = ["sableux", "limoneux", "argileux"];
const SYSTEMS = ["goutte", "aspersion", "gravitaire"];

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const regionId = q.get("region") ?? "kairouan";
  const cropId = q.get("crop") ?? "olivier";
  if (!getRegion(regionId)) return Response.json({ error: `région inconnue : ${regionId}` }, { status: 400 });
  if (!getCrop(cropId)) return Response.json({ error: `culture inconnue : ${cropId}` }, { status: 400 });

  const soil = q.get("soil");
  const system = q.get("system");
  const ago = q.get("ago");
  const horizon = q.get("days");
  const asOf = /^\d{4}-\d{2}-\d{2}$/.test(q.get("asOf") ?? "") ? (q.get("asOf") as string) : undefined;
  try {
    const plan = await buildPlan({
      regionId,
      cropId,
      soil: soil && SOILS.includes(soil) ? (soil as SoilName) : undefined,
      system: system && SYSTEMS.includes(system) ? (system as IrrigationSystem) : undefined,
      planting: q.get("planting") ?? undefined,
      asOf,
      lastIrrigationDaysAgo: ago != null && ago !== "" ? Number(ago) : undefined,
      horizonDays: horizon ? Math.min(30, Math.max(1, Number(horizon))) : undefined,
    });
    // Rejeu d'une date passée (la canicule du 17 juillet) : météo observée, le résultat ne bouge plus, le CDN le garde un jour.
    // Le plan du jour, lui, n'est jamais gardé : il suit la prévision et les signalements de pluie.
    if (asOf) return Response.json(plan, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
    return Response.json(plan);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
