// GET /api/lab/m1?region=kairouan : les 12 variables d'entrée du petit modèle CatBoost (ml/README.md) pour les 8 prochains jours.
// Le modèle lui-même (43 Ko) est rejoué DANS LE NAVIGATEUR (src/lib/ml/catboost.ts) : ce serveur ne fait que rassembler la météo
// (même source qu'en production : Open-Meteo) et calculer, comme à l'entraînement, des fenêtres qui ne regardent QUE vers le passé et la période.
// Rien n'est dépensé (pas de voix, pas de base de données). Recherche, mode « second avis » : cela ne change aucun conseil d'irrigation.

import { getRegion } from "@/lib/regions";
import { fetchArchive, fetchForecast } from "@/lib/weather";
import type { Day } from "@/lib/weather";

export const dynamic = "force-dynamic";

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

export async function GET(request: Request) {
  const regionId = new URL(request.url).searchParams.get("region") ?? "kairouan";
  const region = getRegion(regionId);
  if (!region) return Response.json({ error: `région inconnue : ${regionId}` }, { status: 400 });
  try {
    const fc = await fetchForecast(region.lat, region.lon);
    const start = fc.today;
    const end = iso(ms(start) + 7 * DAY); // période de 8 jours : aujourd'hui + 7
    const firstFc = fc.days[0].date;
    // l'historique plus ancien que la prévision (qui remonte à 7 jours) vient de l'archive ; on garde la prévision en cas de recouvrement
    const arch = await fetchArchive(region.lat, region.lon, iso(ms(start) - 60 * DAY), iso(ms(firstFc) - DAY));
    const byDate = new Map<string, Day>();
    for (const d of arch) byDate.set(d.date, d);
    for (const d of fc.days) byDate.set(d.date, d);

    const win = (from: number, to: number): Day[] => {
      const out: Day[] = [];
      for (let t = from; t <= to; t += DAY) {
        const d = byDate.get(iso(t));
        if (!d || !Number.isFinite(d.tmax) || !Number.isFinite(d.tmin)) throw new Error(`météo incomplète autour du ${iso(t)}`);
        out.push(d);
      }
      return out;
    };
    const s = ms(start);
    const e = ms(end);
    const seg = win(s, e);
    const prev = win(s - 8 * DAY, s - DAY);
    const p30 = win(e - 29 * DAY, e);
    const p60 = win(e - 59 * DAY, e);
    const mid = new Date(s + 3 * DAY); // même repère qu'à l'entraînement : jour de l'année du milieu de la période
    const doy = Math.floor((Date.UTC(mid.getUTCFullYear(), mid.getUTCMonth(), mid.getUTCDate()) - Date.UTC(mid.getUTCFullYear(), 0, 0)) / DAY);
    const rain30 = sum(p30.map((d) => d.rain));
    const et030 = sum(p30.map((d) => d.et0));
    const features = {
      et0_day: mean(seg.map((d) => d.et0)),
      rain_day: mean(seg.map((d) => d.rain)),
      tmax: mean(seg.map((d) => d.tmax)),
      tmin: mean(seg.map((d) => d.tmin)),
      et0_prev: mean(prev.map((d) => d.et0)),
      rain_prev: mean(prev.map((d) => d.rain)),
      rain_30: rain30,
      rain_60: sum(p60.map((d) => d.rain)),
      et0_30: et030,
      deficit_30: et030 - rain30,
      doy_sin: Math.sin((2 * Math.PI * doy) / 365.25),
      doy_cos: Math.cos((2 * Math.PI * doy) / 365.25),
    };
    return Response.json(
      { region: region.id, start, end, month: new Date(s + 3 * DAY).getUTCMonth() + 1, features, fetchedAt: fc.fetchedAt },
      { headers: { "cache-control": "public, max-age=600" } },
    );
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
