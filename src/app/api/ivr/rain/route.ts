// POST /api/ivr/rain   { regionId, level, reporter, lang? }   → enregistre « il a plu » signalé au téléphone (touche 7).
// level : none | very_light | light | heavy | very_heavy (touches 1 à 5). reporter : identité anonyme SIGNÉE PAR LE SERVEUR
// (GET /api/reports/token), la même que celle du site : le téléphone dessiné et le site, sur le même appareil, comptent pour UNE
// personne. Le téléphone dessiné tourne dans un navigateur, qui ne choisit donc pas son identité : on applique ici les mêmes garde-fous
// que POST /api/reports (identité émise par le serveur ; au plus 10 rapports et 2 identités par adresse et par jour, donc une seule
// adresse n'atteint jamais seule le nombre minimal de personnes). Une vraie passerelle téléphonique, elle, appellerait saveReport
// avec le haché du numéro de l'appelant. saveReport sale et hache l'identité : aucun nom, aucun numéro, aucune adresse IP n'est gardé.
// Un seul rapport par personne, par région et par jour (src/lib/reports.ts).
// Réponse : { ok, n, counted, minReporters, level, medianMm?, lines, audioBase64? } où `lines` est la phrase « N personnes ont signalé
// aujourd'hui… » (sous-titres calés + audio) ; 503 quand l'enregistrement est impossible (la table n'existe pas encore, par exemple) :
// la page dit alors « je n'ai pas pu enregistrer ». Dans la démonstration les signalements sont FICTIFS.

import { BudgetError, rainCountClip } from "@/lib/ivr/clip";
import { DEFAULT_REGION, OTHER_REGIONS } from "@/lib/ivr/menu";
import { rainCountText } from "@/lib/ivr/rain";
import { clientIp } from "@/lib/ivr/request";
import { LEVEL_MM, MIN_REPORTERS, ipAllowed, isRainLevel, saveReport, summarize, verifyReporterToken } from "@/lib/reports";
import type { ReportRow } from "@/lib/reports";
import { todayInTunisia } from "@/lib/weather";

export const dynamic = "force-dynamic";

// 20 signalements par heure et par adresse (comme la route principale), en mémoire de chaque instance.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 20;
}

// Lecture directe (sans la mémoire de 60 s de loadReports) des signalements du jour : le nombre dit à l'appelant doit inclure
// celui qu'on vient d'enregistrer. Lecture seule ; la déduplication et la médiane restent celles de src/lib/reports.ts (summarize).
async function todaysRows(regionId: string, today: string): Promise<ReportRow[]> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/rain_reports?select=day,mm,level,reporter_hash&region_id=eq.${encodeURIComponent(regionId)}&day=eq.${today}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(2500) },
    );
    if (!res.ok) return [];
    return ((await res.json()) as ReportRow[]).map((r) => ({ day: r.day, mm: Number(r.mm), level: r.level ?? null, reporter_hash: r.reporter_hash }));
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  if (limited(clientIp(request))) return Response.json({ ok: false, error: "too_many_reports" }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 2048) return Response.json({ ok: false, error: "body_too_large" }, { status: 413 });
  let b: { regionId?: unknown; level?: unknown; reporter?: unknown; lang?: unknown };
  try {
    b = JSON.parse(raw);
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  const regionId = typeof b.regionId === "string" ? b.regionId : "";
  const lang = b.lang === "ar" ? "ar" : "fr";
  const reporter = typeof b.reporter === "string" ? b.reporter.slice(0, 100) : "";
  if (![DEFAULT_REGION, ...OTHER_REGIONS].includes(regionId)) return Response.json({ ok: false, error: "unknown_region" }, { status: 400 });
  if (!isRainLevel(b.level)) return Response.json({ ok: false, error: "invalid_level" }, { status: 400 });
  const level = b.level;
  // l'identité doit avoir été émise par le serveur (le navigateur la demande à /api/reports/token et la garde)
  if (!verifyReporterToken(reporter)) return Response.json({ ok: false, error: "invalid_identity" }, { status: 400 });
  if (!ipAllowed(clientIp(request), reporter)) return Response.json({ ok: false, error: "daily_cap" }, { status: 429 });

  const today = todayInTunisia();
  const saved = await saveReport(regionId, today, LEVEL_MM[level], reporter, level);
  if (!saved) return Response.json({ ok: false, error: "save_failed" }, { status: 503 });

  // combien de personnes différentes ont signalé aujourd'hui dans cette région (au moins nous-mêmes)
  const day = summarize(await todaysRows(regionId, today)).find((d) => d.date === today);
  const n = Math.max(1, day?.n ?? 0);
  const body = {
    ok: true,
    n,
    counted: n >= MIN_REPORTERS,
    minReporters: MIN_REPORTERS,
    level,
    medianMm: day?.medianMm,
    countText: rainCountText(n, lang), // phrase écrite, même si la voix est indisponible
    countEn: rainCountText(n, "en"),
  };
  try {
    const clip = await rainCountClip(n, lang);
    return Response.json({ ...body, lines: clip.lines, audioBase64: clip.audio.toString("base64"), mime: clip.mime });
  } catch (e) {
    // voix indisponible (plafond de caractères atteint, service injoignable) : le signalement est enregistré quand même
    return Response.json({ ...body, lines: [], audioError: e instanceof BudgetError ? "budget" : "voice" });
  }
}
