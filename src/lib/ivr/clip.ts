// Lecture en audio : texte du moteur (script.ts) → voix Rima M (ElevenLabs) → mp3 + sous-titres calés.
// SERVEUR SEULEMENT. Un même texte n'est jamais synthétisé deux fois (cache), et le budget de caractères du poste plafonne tout.

import type { Plan } from "../plan";
import { timeLines } from "../voice";
import { ttsWithTimestamps } from "../voice/elevenlabs";
import { MODEL_ID, SELECTED_VOICE } from "../voice/voices";
import type { IvrLang } from "./menu";
import { rainCountText } from "./rain";
import { ivrDetailLines, ivrPlanLines } from "./script";
import { BudgetError, clipKey, readClip, recordCredits, reserveChars, writeClip } from "./store";

export { BudgetError };

const MAX_CHARS = 700; // garde-fou : une lecture normale fait 130 à 350 caractères

export type ClipLine = { id: string; text: string; en: string; startMs: number; endMs: number };
export type PlanClip = {
  audio: Buffer;
  mime: string;
  lines: ClipLine[];
  generatedAt: string;
  source: "cache" | "live";
  voiceId: string;
  modelId: string;
  durationMs: number;
};

type SpokenLine = { id: string; text: string };

// Texte et sous-titres SANS voix (utile quand la synthèse est indisponible : l'écran montre quand même le conseil).
export function planSubtitles(plan: Plan, lang: IvrLang, detail = false): { id: string; text: string; en: string }[] {
  const linesOf = detail ? ivrDetailLines : ivrPlanLines;
  const spoken = linesOf(plan, lang);
  const english = new Map(linesOf(plan, "en").map((l) => [l.id, l.text]));
  return spoken.map((l) => ({ ...l, en: english.get(l.id) ?? l.text }));
}

// Synthétise des lignes de texte (avec cache et plafond de caractères) et rend l'audio et les sous-titres calés.
// `charge` : en ligne, les plafonds persistants du jour (par visiteur et commun, voir chargeLiveVoice) ; sans lui (scripts
// locaux), le registre de caractères du dossier. Le registre suivi dans le dépôt ne peut pas servir en ligne : il est en
// lecture seule et garde le total des essais faits avant la mise en ligne (il bloquait toute voix nouvelle).
export async function linesClip(spoken: SpokenLine[], english: Map<string, string>, charge?: (chars: number) => Promise<boolean>): Promise<PlanClip> {
  const text = spoken.map((l) => l.text).join(" ");
  if (text.length > MAX_CHARS) throw new Error(`texte trop long (${text.length} caractères)`);

  const voiceId = SELECTED_VOICE.id;
  const key = clipKey(text, voiceId, MODEL_ID);
  let hit = readClip(key);
  const source: "cache" | "live" = hit ? "cache" : "live";
  if (!hit) {
    if (charge) {
      if (!(await charge(text.length))) throw new BudgetError("plafond de voix du jour atteint");
    } else reserveChars(text.length); // refuse si le budget serait dépassé
    const { audio, alignment, cost } = await ttsWithTimestamps(text, voiceId, MODEL_ID);
    recordCredits(cost);
    hit = {
      mime: "audio/mpeg",
      generatedAt: new Date().toISOString(),
      voiceId,
      modelId: MODEL_ID,
      text,
      lines: timeLines(spoken, alignment),
      audioBase64: audio.toString("base64"),
    };
    writeClip(key, hit);
  }
  const lines = hit.lines.map((l) => ({ ...l, en: english.get(l.id) ?? l.text }));
  return {
    audio: Buffer.from(hit.audioBase64, "base64"),
    mime: hit.mime,
    lines,
    generatedAt: hit.generatedAt,
    source,
    voiceId: hit.voiceId,
    modelId: hit.modelId,
    durationMs: lines.length ? lines[lines.length - 1].endMs : 0,
  };
}

export async function planClip(plan: Plan, lang: IvrLang, detail = false, charge?: (chars: number) => Promise<boolean>): Promise<PlanClip> {
  const linesOf = detail ? ivrDetailLines : ivrPlanLines;
  return linesClip(linesOf(plan, lang), new Map(linesOf(plan, "en").map((l) => [l.id, l.text])), charge);
}

// « N personnes ont signalé aujourd'hui… » dit après la confirmation d'un signalement de pluie.
export const rainCountLines = (n: number, lang: IvrLang) => ({
  spoken: [{ id: "count", text: rainCountText(n, lang) }],
  english: new Map([["count", rainCountText(n, "en")]]),
});

export async function rainCountClip(n: number, lang: IvrLang, charge?: (chars: number) => Promise<boolean>): Promise<PlanClip> {
  const { spoken, english } = rainCountLines(n, lang);
  return linesClip(spoken, english, charge);
}
