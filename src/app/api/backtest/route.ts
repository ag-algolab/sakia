// GET /api/backtest?region=kairouan&crop=olivier&every=7&soil=limoneux&system=goutte
// Rejoue les saisons 2015-2025 sur la météo réelle (voir src/lib/backtest.ts, type BacktestResult).

import { backtest } from "@/lib/backtest";
import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { fetchArchive, todayInTunisia } from "@/lib/weather";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

const SOILS = ["sableux", "limoneux", "argileux"];
const SYSTEMS = ["goutte", "aspersion", "gravitaire"];

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const region = getRegion(q.get("region") ?? "kairouan");
  const crop = getCrop(q.get("crop") ?? "olivier");
  if (!region) return Response.json({ error: "région inconnue" }, { status: 400 });
  if (!crop) return Response.json({ error: "culture inconnue" }, { status: 400 });

  const soil = q.get("soil");
  const system = q.get("system");
  const every = Number(q.get("every") ?? 7);
  try {
    const archive = await fetchArchive(region.lat, region.lon, "2015-01-01", todayInTunisia());
    const result = backtest(crop, archive, {
      soil: soil && SOILS.includes(soil) ? (soil as SoilName) : undefined,
      system: system && SYSTEMS.includes(system) ? (system as IrrigationSystem) : undefined,
      fixedEveryDays: Number.isFinite(every) && every >= 2 && every <= 21 ? every : 7,
    });
    // Onze saisons passées : le même calcul sert tout le monde 12 h depuis le CDN de Vercel, puis se refait en arrière-plan
    // (chaque calcul demande l'archive, que le quota gratuit d'Open-Meteo compte pour environ 150 appels).
    return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
