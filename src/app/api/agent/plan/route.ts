// L'outil get_irrigation_plan de l'agent vocal, côté serveur.
//   GET  /api/agent/plan?region=kairouan&crop=olivier&ago=2&lang=fr|ar
//   POST /api/agent/plan   { "region_id": "kairouan", "crop_id": "olivier", "last_irrigation_days_ago": 2, "language": "fr" }
// Réponse : { ok, spoken_text, english_text, ask_a_person, confidence, ... }. L'agent lit `spoken_text` mot pour mot.
// Même moteur et mêmes phrases que la ligne à touches. Aucune donnée sur l'appelant n'est gardée.
//
// Joignable par ElevenLabs seulement une fois le site en ligne (adresse publique) ; en attendant, la page /call/talk
// appelle cette route elle-même quand l'agent demande l'outil (outil « client »).

import { clientIp, tooMany } from "@/lib/ivr/request";
import { agentPlan } from "@/lib/voiceagent/plan";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (tooMany(clientIp(request), 40)) return Response.json({ error: "too_many_requests" }, { status: 429 });
  const p = new URL(request.url).searchParams;
  const result = await agentPlan({ region: p.get("region") ?? undefined, crop: p.get("crop") ?? undefined, ago: p.get("ago"), lang: p.get("lang") });
  return Response.json(result);
}

export async function POST(request: Request) {
  if (tooMany(clientIp(request), 40)) return Response.json({ error: "too_many_requests" }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: "body_too_large" }, { status: 413 });
  let b: Record<string, unknown> = {};
  try {
    b = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const result = await agentPlan({ region: b.region_id ?? b.region, crop: b.crop_id ?? b.crop, ago: b.last_irrigation_days_ago ?? b.ago, lang: b.language ?? b.lang });
  return Response.json(result);
}
