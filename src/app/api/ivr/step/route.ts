// POST /api/ivr/step   { state?: CallState, event?: { type: "key", key } | { type: "silence" } | { type: "tick", ms } | { type: "played" } | { type: "hangup" } }
// → { state, end, say: [{ kind: "prompt", id, lang, text, en, audio } | { kind: "plan", lang, planUrl, ... }] }
//
// C'est la MÊME machine à états que le faux téléphone de /call. Une passerelle téléphonique réelle (ligne SIP, numéro court d'un
// opérateur) appellerait cette route à chaque touche reçue et jouerait les fichiers audio renvoyés. AUCUN appel réel n'est
// branché aujourd'hui : cette route ne fait que calculer la suite du dialogue (aucune écriture, aucun enregistrement d'appel).
// Sans `state` : début d'appel. L'état est renvoyé à l'appelant, rien n'est gardé côté serveur.

import { KEYS, parseState, startCall, step } from "@/lib/ivr/flow";
import type { CallEvent, Key, Say } from "@/lib/ivr/flow";
import { promptEn, promptText, recordingFile } from "@/lib/ivr/prompts";

export const dynamic = "force-dynamic";

function describe(say: Say) {
  if (say.kind === "prompt") {
    return { kind: "prompt", id: say.id, lang: say.lang, text: promptText(say.id, say.lang), en: promptEn(say.id, say.lang), audio: recordingFile(say.id, say.lang) };
  }
  const qs = new URLSearchParams({ region: say.regionId, crop: say.cropId, lang: say.lang, ago: say.ago === null ? "u" : String(say.ago) });
  if (say.detail) qs.set("detail", "1");
  return { kind: "plan", lang: say.lang, regionId: say.regionId, cropId: say.cropId, ago: say.ago, detail: say.detail, planUrl: `/api/ivr/plan-audio?${qs}`, subtitlesUrl: `/api/ivr/plan?${qs}` };
}

function parseEvent(x: unknown): CallEvent | null {
  if (!x || typeof x !== "object") return null;
  const e = x as Record<string, unknown>;
  if (e.type === "key" && typeof e.key === "string" && (KEYS as string[]).includes(e.key)) return { type: "key", key: e.key as Key };
  if (e.type === "tick" && typeof e.ms === "number" && Number.isFinite(e.ms) && e.ms >= 0 && e.ms <= 600_000) return { type: "tick", ms: e.ms };
  if (e.type === "silence" || e.type === "played" || e.type === "hangup") return { type: e.type };
  return null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: "corps trop gros" }, { status: 413 });
  let body: { state?: unknown; event?: unknown } = {};
  if (raw.trim()) {
    try {
      body = JSON.parse(raw);
    } catch {
      return Response.json({ error: "JSON invalide" }, { status: 400 });
    }
  }
  if (body.state === undefined) {
    const r = startCall();
    return Response.json({ state: r.state, end: r.end, say: r.say.map(describe) });
  }
  const state = parseState(body.state);
  if (!state) return Response.json({ error: "état invalide" }, { status: 400 });
  const event = parseEvent(body.event);
  if (!event) return Response.json({ error: "événement invalide" }, { status: 400 });
  const r = step(state, event);
  return Response.json({ state: r.state, end: r.end, say: r.say.map(describe) });
}
