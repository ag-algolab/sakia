// GET /api/agent/session → { signedUrl, maxSeconds }
// Adresse WebSocket signée (valable quelques minutes) pour parler à l'agent vocal depuis le navigateur.
// La clé ElevenLabs reste ici : le navigateur ne reçoit jamais que cette adresse signée.
// Chaque conversation dure 2 minutes au plus (réglé dans l'agent). Limites : 6 sessions par minute et par adresse,
// et un plafond de sessions par instance du serveur (AGENT_MAX_SESSIONS, 60 par défaut) pour protéger les minutes de voix.

import { clientIp, tooMany } from "@/lib/ivr/request";
import { AGENT_MAX_SECONDS } from "@/lib/voiceagent/prompt";
import { agentId, signedUrl } from "@/lib/voiceagent/api";

export const dynamic = "force-dynamic";

let sessions = 0;
const MAX_SESSIONS = Number(process.env.AGENT_MAX_SESSIONS || 60);

export async function GET(request: Request) {
  if (tooMany(clientIp(request), 6)) return Response.json({ error: "too_many_requests" }, { status: 429 });
  const id = agentId();
  if (!id) return Response.json({ error: "no_agent", message: "L'agent vocal n'est pas encore créé (scripts/agent-create.ts)." }, { status: 503 });
  if (sessions >= MAX_SESSIONS) return Response.json({ error: "session_cap", message: "Plafond de conversations de la démonstration atteint." }, { status: 503 });
  try {
    const { signed_url } = await signedUrl(id);
    sessions++;
    return Response.json({ signedUrl: signed_url, maxSeconds: AGENT_MAX_SECONDS });
  } catch (e) {
    // le message d'erreur ne contient jamais la clé (voir src/lib/voiceagent/api.ts)
    return Response.json({ error: "provider_error", message: (e as Error).message.slice(0, 300) }, { status: 502 });
  }
}
