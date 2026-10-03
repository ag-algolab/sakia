// GET /api/forecast?region=kairouan
// Renvoie la météo brute (7 jours passés + 16 jours de prévision) : c'est ce que l'appli garde en cache
// pour recalculer le plan HORS CONNEXION avec computePlan (src/lib/planCore.ts).

import { loadForecast } from "@/lib/plan";
import { getRegion } from "@/lib/regions";

export async function GET(request: Request) {
  const regionId = new URL(request.url).searchParams.get("region") ?? "kairouan";
  if (!getRegion(regionId)) return Response.json({ error: `région inconnue : ${regionId}` }, { status: 400 });
  try {
    return Response.json(await loadForecast(regionId));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
