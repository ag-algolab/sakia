// Appels ElevenLabs. La clé vient de KEY_ELEVENLABS (jamais écrite, jamais affichée).

import { OUTPUT_FORMAT, VOICE_SETTINGS } from "./voices";

const BASE = "https://api.elevenlabs.io/v1";

export type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

function key(): string {
  const k = process.env.KEY_ELEVENLABS;
  if (!k) throw new Error("KEY_ELEVENLABS absente de l'environnement");
  return k;
}

// Message d'erreur sans jamais recopier la clé.
async function fail(res: Response, what: string): Promise<never> {
  const body = (await res.text()).slice(0, 300);
  throw new Error(`ElevenLabs ${what} : HTTP ${res.status} ${body}`);
}

export async function ttsWithTimestamps(
  text: string,
  voiceId: string,
  modelId: string,
): Promise<{ audio: Buffer; alignment: Alignment; cost: number | null }> {
  const res = await fetch(`${BASE}/text-to-speech/${voiceId}/with-timestamps?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: modelId, voice_settings: VOICE_SETTINGS }),
  });
  if (!res.ok) await fail(res, "synthèse");
  const j = (await res.json()) as { audio_base64: string; alignment: Alignment | null };
  if (!j.alignment) throw new Error("ElevenLabs n'a pas renvoyé d'alignement");
  // en-tête « character-cost » : crédits réellement facturés pour cet appel (absent selon les modèles)
  const header = res.headers.get("character-cost");
  const cost = header != null && header !== "" && Number.isFinite(Number(header)) ? Number(header) : null;
  return { audio: Buffer.from(j.audio_base64, "base64"), alignment: j.alignment, cost };
}

// Crédits déjà utilisés / disponibles sur le compte (vérité du fournisseur).
export async function subscription(): Promise<{ used: number; limit: number }> {
  const res = await fetch(`${BASE}/user/subscription`, { headers: { "xi-api-key": key() } });
  if (!res.ok) await fail(res, "abonnement");
  const j = (await res.json()) as { character_count: number; character_limit: number };
  return { used: j.character_count, limit: j.character_limit };
}

export async function listMyVoices(): Promise<{ voice_id: string; name: string }[]> {
  const res = await fetch(`${BASE}/voices`, { headers: { "xi-api-key": key() } });
  if (!res.ok) await fail(res, "liste des voix");
  return ((await res.json()) as { voices: { voice_id: string; name: string }[] }).voices;
}

// Ajoute une voix de la bibliothèque publique au compte (nécessaire avant de l'utiliser).
export async function addSharedVoice(publicOwnerId: string, voiceId: string, newName: string): Promise<void> {
  const res = await fetch(`${BASE}/voices/add/${publicOwnerId}/${voiceId}`, {
    method: "POST",
    headers: { "xi-api-key": key(), "content-type": "application/json" },
    body: JSON.stringify({ new_name: newName }),
  });
  if (!res.ok) await fail(res, "ajout de voix");
}
