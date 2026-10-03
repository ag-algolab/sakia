// Minutes de conversation réellement utilisées par l'agent (vérité d'ElevenLabs), à comparer au budget de 30 minutes.
import { agentId } from "../src/lib/voiceagent/api";
(async () => {
  const res = await fetch(`https://api.elevenlabs.io/v1/convai/conversations?agent_id=${agentId()}&page_size=100`, { headers: { "xi-api-key": process.env.KEY_ELEVENLABS ?? "" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as { conversations: { call_duration_secs: number; start_time_unix_secs: number; status: string }[] };
  const total = j.conversations.reduce((n, c) => n + (c.call_duration_secs ?? 0), 0);
  console.log(`${j.conversations.length} conversations, ${total} s au total = ${(total / 60).toFixed(1)} minutes (budget : 30 minutes).`);
})().catch((e) => { console.error("ERREUR :", (e as Error).message); process.exit(1); });
