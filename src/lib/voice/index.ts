// synthesizeBulletin : texte du plan -> audio mp3 + sous-titres calés ligne par ligne.
// SIGNATURE FIGÉE (le poste Telegram l'importe) : ne pas la changer sans le noter dans docs/NOTES-bulletin.md.
// `lang` accepte fr | ar | en (type Lang de messages.ts), ko et aeb (darija) ; `options` (sol, système, semis) est facultatif :
// élargissements compatibles, voir NOTES-bulletin.md.

import type { Plan } from "../plan";
import { cacheKey, readCache, reserveCredits, writeCache } from "./cache";
import type { PlanParams } from "./cache";
import type { TimedLine } from "./cache";
import { ttsWithTimestamps } from "./elevenlabs";
import type { VoiceLang } from "./langs";
import { bulletinScriptFor } from "./script";
import type { SoilChoice } from "./soil";
import type { Alignment } from "./elevenlabs";
import { MODEL_ID, SELECTED_VOICE } from "./voices";

export { BudgetError } from "./cache";

export type BulletinLineOut = { id: string; text: string; en: string; startMs: number; endMs: number };
export type SynthesizedBulletin = { audio: Buffer; mime: string; lines: BulletinLineOut[] };
export type SynthesizedMeta = SynthesizedBulletin & { generatedAt: string; source: "live" | "cache"; voiceId: string; modelId: string };

const MIME = "audio/mpeg";
const MAX_CHARS = 1500; // garde-fou : un bulletin normal fait ~500 caractères

// Les lignes du bulletin sont jointes par une espace ; on retrouve la fenêtre de chaque ligne
// dans l'alignement caractère par caractère renvoyé par ElevenLabs.
export function timeLines(lines: { id: string; text: string }[], al: Alignment): TimedLine[] {
  const joined = lines.map((l) => l.text).join(" ");
  const n = al.characters.length;
  const ratio = n === joined.length ? 1 : n / joined.length; // alignement de longueur différente : répartition proportionnelle
  const at = (i: number) => Math.min(n - 1, Math.max(0, Math.floor(i * ratio)));
  let pos = 0;
  return lines.map((l) => {
    const from = at(pos);
    const to = at(pos + Math.max(0, l.text.length - 1));
    pos += l.text.length + 1;
    return {
      id: l.id,
      text: l.text,
      startMs: Math.round(al.character_start_times_seconds[from] * 1000),
      endMs: Math.round(al.character_end_times_seconds[to] * 1000),
    };
  });
}

// Version détaillée (source, date de génération) utilisée par la route et les scripts.
// `options` : les paramètres avec lesquels le plan a été construit (comme /api/plan). Ils servent à nommer le sol et le
// système dans la voix et entrent dans la clé de cache. Absents : valeurs par défaut du moteur.
export async function synthesizeBulletinMeta(plan: Plan, lang: VoiceLang, options?: PlanParams): Promise<SynthesizedMeta> {
  const choice = options as Partial<SoilChoice> | undefined;
  const spoken = bulletinScriptFor(plan, lang, choice);
  const english = new Map(bulletinScriptFor(plan, "en", choice).map((l) => [l.id, l.text]));
  const text = spoken.map((l) => l.text).join(" ");
  if (text.length > MAX_CHARS) throw new Error(`texte trop long (${text.length} caractères)`);

  const voiceId = SELECTED_VOICE.id;
  const key = cacheKey(text, voiceId, MODEL_ID, options);
  let hit = readCache(key);
  const source: "live" | "cache" = hit ? "cache" : "live";
  if (!hit) {
    reserveCredits(text.length, MODEL_ID); // refuse si le budget serait dépassé
    const { audio, alignment } = await ttsWithTimestamps(text, voiceId, MODEL_ID);
    hit = {
      mime: MIME,
      generatedAt: new Date().toISOString(),
      voiceId,
      modelId: MODEL_ID,
      lines: timeLines(spoken, alignment),
      audioBase64: audio.toString("base64"),
    };
    writeCache(key, hit);
  }
  return {
    audio: Buffer.from(hit.audioBase64, "base64"),
    mime: hit.mime,
    lines: hit.lines.map((l) => ({ ...l, en: english.get(l.id) ?? l.text })),
    generatedAt: hit.generatedAt,
    source,
    voiceId: hit.voiceId,
    modelId: hit.modelId,
  };
}

export async function synthesizeBulletin(plan: Plan, lang: VoiceLang, options?: PlanParams): Promise<SynthesizedBulletin> {
  const { audio, mime, lines } = await synthesizeBulletinMeta(plan, lang, options);
  return { audio, mime, lines };
}
