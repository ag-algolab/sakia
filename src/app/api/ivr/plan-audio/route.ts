// GET /api/ivr/plan-audio?region=kairouan&crop=olivier&lang=en|fr|ar&ago=0..7|u[&asOf=AAAA-MM-JJ][&detail=1]  →  audio/mpeg
// Le plan lu à voix haute, seul (sans sous-titres) : ce qu'une passerelle téléphonique jouerait à l'appelant.
// Même texte, même cache et même budget que /api/ivr/plan. En-têtes : x-ivr-source (live | cache), x-ivr-ask-a-person (true | false).

import { BudgetError, planClip } from "@/lib/ivr/clip";
import { clientIp, parsePlanQuery, tooMany } from "@/lib/ivr/request";
import { buildPlan } from "@/lib/plan";
import { chargeLiveVoice } from "@/lib/usage";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const parsed = parsePlanQuery(request.url);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const { q } = parsed;
  if (tooMany(clientIp(request))) return Response.json({ error: "trop de demandes, réessayez dans une minute" }, { status: 429 });
  try {
    const plan = await buildPlan({ regionId: q.regionId, cropId: q.cropId, asOf: q.asOf, lastIrrigationDaysAgo: q.ago ?? undefined });
    const clip = await planClip(plan, q.lang, q.detail, (chars) => chargeLiveVoice(request, chars));
    return new Response(new Uint8Array(clip.audio), {
      headers: {
        "content-type": clip.mime,
        "content-length": String(clip.audio.length),
        "cache-control": "no-store",
        "x-ivr-source": clip.source,
        "x-ivr-ask-a-person": String(plan.confidence.askAPerson),
      },
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: e instanceof BudgetError ? 503 : 502 });
  }
}
