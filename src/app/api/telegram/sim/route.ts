// POST /api/telegram/sim : simulation sans état du bot, pour le chat de la page /telegram (voir src/lib/telegram/sim.ts).
// Corps : { update: <mise à jour Telegram>, subscriber?: <abonné renvoyé par l'appel précédent> | null }
// Réponse : { messages: [{ kind: "send" | "edit" | "answer" | "audio", text, markup?, messageId? }], subscriber }
// N'écrit jamais dans la base et n'appelle jamais Telegram. Erreurs : { error: <code> } avec un statut 4xx, sans trace.

import { clientIp } from "@/lib/ivr/request";
import { logError } from "@/lib/telegram/config";
import { SimTimeout, parseSimBody, readLimitedText, runSimulation, simAllowed } from "@/lib/telegram/sim";

export const maxDuration = 30;

const NO_STORE = { "Cache-Control": "no-store" };
const fail = (status: number, error: string, headers: Record<string, string> = {}) =>
  Response.json({ error }, { status, headers: { ...NO_STORE, ...headers } });

export async function POST(request: Request) {
  const gate = simAllowed(clientIp(request));
  if (!gate.ok) return fail(429, "too_many_requests", { "Retry-After": String(gate.retryAfter) });

  // JSON obligatoire : un autre site ne peut donc pas déclencher l'appel sans contrôle préalable du navigateur (CORS)
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return fail(415, "json_required");
  const body = await readLimitedText(request);
  if (!body.ok) return fail(413, "body_too_large");
  let raw: unknown;
  try {
    raw = JSON.parse(body.text);
  } catch {
    return fail(400, "invalid_json");
  }
  const parsed = parseSimBody(raw);
  if (!parsed.ok) return fail(400, parsed.error);

  try {
    return Response.json(await runSimulation(parsed.value), { headers: NO_STORE });
  } catch (e) {
    if (e instanceof SimTimeout) return fail(504, "timeout");
    logError("simulation", e);
    return fail(500, "server_error");
  }
}
