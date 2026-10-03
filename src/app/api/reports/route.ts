// Rapports de pluie des agriculteurs (voir src/lib/reports.ts).
//   POST /api/reports   { regionId, mm, day?, reporter }   → enregistre « il a plu mm ici »
//   GET  /api/reports?region=kairouan                      → synthèse des derniers jours (sans aucune identité)
// `reporter` est un identifiant anonyme choisi par l'appareil ou le canal (jamais affiché ni stocké en clair).

import { getRegion } from "@/lib/regions";
import { loadReports, saveReport, summarize, validDay, validMm, MIN_REPORTERS } from "@/lib/reports";
import { todayInTunisia } from "@/lib/weather";

// Limite simple par adresse (en mémoire, par instance) : 20 rapports par heure et par adresse.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 20;
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "inconnue";
  if (limited(ip)) return Response.json({ error: "trop de rapports, réessayez plus tard" }, { status: 429 });
  let body: { regionId?: unknown; mm?: unknown; day?: unknown; reporter?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON invalide" }, { status: 400 });
  }
  const regionId = typeof body.regionId === "string" ? body.regionId : "";
  const today = todayInTunisia();
  const day = typeof body.day === "string" ? body.day : today;
  const reporter = typeof body.reporter === "string" ? body.reporter.slice(0, 128) : "";
  if (!getRegion(regionId)) return Response.json({ error: "région inconnue" }, { status: 400 });
  if (!validMm(body.mm)) return Response.json({ error: "quantité de pluie invalide (0 à 150 mm)" }, { status: 400 });
  if (!validDay(day, today)) return Response.json({ error: "date invalide (aujourd'hui ou les 3 derniers jours)" }, { status: 400 });
  if (reporter.length < 8) return Response.json({ error: "identifiant anonyme manquant" }, { status: 400 });
  const ok = await saveReport(regionId, day, body.mm, reporter);
  if (!ok) return Response.json({ error: "enregistrement impossible pour le moment" }, { status: 503 });
  return Response.json({ ok: true, minReporters: MIN_REPORTERS });
}

export async function GET(request: Request) {
  const regionId = new URL(request.url).searchParams.get("region") ?? "kairouan";
  if (!getRegion(regionId)) return Response.json({ error: "région inconnue" }, { status: 400 });
  const since = addDays(todayInTunisia(), -3);
  const summary = summarize(await loadReports(regionId, since));
  return Response.json({ regionId, since, minReporters: MIN_REPORTERS, days: summary });
}
