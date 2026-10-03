// Rapports de pluie des agriculteurs (voir src/lib/reports.ts).
//   GET  /api/reports/token                               → identité anonyme signée par le serveur (navigateurs)
//   POST /api/reports   { regionId, level, day?, reporter } → enregistre « il a plu : degré »
//   GET  /api/reports?region=kairouan                      → synthèse des derniers jours (sans aucune identité)
// `reporter` est un identifiant anonyme choisi par l'appareil ou le canal (jamais affiché ni stocké en clair).

import { getRegion } from "@/lib/regions";
import { LEVEL_MM, MIN_REPORTERS, ipAllowed, isRainLevel, loadReports, saveReport, summarize, validDay, validMm, verifyReporterToken } from "@/lib/reports";
import type { RainLevel } from "@/lib/reports";
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
  let body: { regionId?: unknown; mm?: unknown; level?: unknown; day?: unknown; reporter?: unknown };
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
  // Le plus simple pour un agriculteur : `level` (échelle qualitative). `mm` reste accepté pour les cas où on sait.
  let level: RainLevel | undefined;
  let mm: number;
  if (body.level !== undefined) {
    if (!isRainLevel(body.level)) return Response.json({ error: "niveau de pluie invalide (none, very_light, light, heavy, very_heavy)" }, { status: 400 });
    level = body.level;
    mm = LEVEL_MM[level];
  } else {
    if (!validMm(body.mm)) return Response.json({ error: "indiquez level ou mm (0 à 150)" }, { status: 400 });
    mm = body.mm;
  }
  if (!validDay(day, today)) return Response.json({ error: "date invalide (aujourd'hui ou les 3 derniers jours)" }, { status: 400 });
  // L'identité doit avoir été émise par le serveur (GET /api/reports/token) : un navigateur ne la choisit pas.
  if (!verifyReporterToken(reporter)) return Response.json({ error: "identité anonyme invalide : demandez-en une à /api/reports/token" }, { status: 400 });
  if (!ipAllowed(ip, reporter)) return Response.json({ error: "plafond de rapports atteint pour aujourd'hui" }, { status: 429 });
  const ok = await saveReport(regionId, day, mm, reporter, level);
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
