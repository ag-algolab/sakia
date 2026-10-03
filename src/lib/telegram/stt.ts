// Reconnaissance vocale : le message vocal de l'agriculteur devient du texte (ElevenLabs Scribe).
// Le texte n'alimente qu'un analyseur de mots-clés (src/lib/sms/parse.ts) : aucune IA générative ne répond,
// le conseil vient uniquement du moteur de calcul. La clé vient de KEY_ELEVENLABS, jamais écrite ni affichée.

import type { Lang } from "../messages";

export type Transcript = { text: string; language?: Lang };
export type Stt = (audio: Buffer, mime: string) => Promise<Transcript>;

// Scribe renvoie un code ISO 639-3 (« ara », « fra », « eng ») ; le tunisien peut sortir en « aeb ».
function toLang(code: unknown): Lang | undefined {
  const c = typeof code === "string" ? code.toLowerCase() : "";
  if (/^(ar|aeb)/.test(c)) return "ar";
  if (c.startsWith("fr")) return "fr";
  if (c.startsWith("en")) return "en";
  return undefined;
}

export const transcribe: Stt = async (audio, mime) => {
  const key = process.env.KEY_ELEVENLABS;
  if (!key) throw new Error("KEY_ELEVENLABS absente");
  const form = new FormData();
  form.set("model_id", "scribe_v1");
  form.set("tag_audio_events", "false");
  form.set("file", new Blob([new Uint8Array(audio)], { type: mime }), "voice.ogg");
  let res: Response;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: { "xi-api-key": key },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
  } catch {
    throw new Error("reconnaissance vocale injoignable");
  }
  if (!res.ok) throw new Error(`reconnaissance vocale : réponse ${res.status}`);
  const data = (await res.json()) as { text?: string; language_code?: string };
  return { text: (data.text ?? "").trim(), language: toLang(data.language_code) };
};
