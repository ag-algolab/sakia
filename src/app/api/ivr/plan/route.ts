// GET /api/ivr/plan?region=kairouan&crop=olivier&lang=en|fr|ar&ago=0..7|u[&asOf=AAAA-MM-JJ][&detail=1]
// Le conseil lu au téléphone : sous-titres calés (langue parlée + anglais), audio mp3 en base64, garde-fou « pas sûr ».
// Les chiffres viennent du moteur (buildPlan). Si la voix est indisponible (budget atteint, pas de réseau vers le service vocal),
// la réponse contient quand même le texte du conseil et `audioError`, pour que la page ne reste jamais muette sans le dire.

import { BudgetError, planClip, planSubtitles } from "@/lib/ivr/clip";
import { clientIp, parsePlanQuery, tooMany } from "@/lib/ivr/request";
import { buildPlan } from "@/lib/plan";
import { chargeLiveVoice } from "@/lib/usage";
import { SELECTED_VOICE } from "@/lib/voice/voices";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = parsePlanQuery(request.url);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { q } = parsed;
  if (tooMany(clientIp(request))) return Response.json({ error: "trop de demandes, réessayez dans une minute" }, { status: 429 });

  let plan;
  try {
    plan = await buildPlan({ regionId: q.regionId, cropId: q.cropId, asOf: q.asOf, lastIrrigationDaysAgo: q.ago ?? undefined });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }

  const common = {
    lang: q.lang,
    regionId: plan.regionId,
    cropId: plan.cropId,
    ago: q.ago,
    detail: q.detail,
    planDate: plan.today,
    replay: plan.replay,
    status: plan.status,
    confidence: plan.confidence,
    dataFetchedAt: plan.dataFetchedAt,
    voiceName: SELECTED_VOICE.name,
  };

  try {
    const clip = await planClip(plan, q.lang, q.detail, (chars) => chargeLiveVoice(request, chars));
    return Response.json({
      ...common,
      source: clip.source,
      lines: clip.lines,
      audioBase64: clip.audio.toString("base64"),
      mime: clip.mime,
      durationMs: clip.durationMs,
      generatedAt: clip.generatedAt,
    });
  } catch (e) {
    const budget = e instanceof BudgetError;
    return Response.json({
      ...common,
      source: "none",
      lines: planSubtitles(plan, q.lang, q.detail).map((l) => ({ ...l, startMs: 0, endMs: 0 })),
      audioError: budget ? "budget" : "voice",
      generatedAt: new Date().toISOString(),
    });
  }
}
