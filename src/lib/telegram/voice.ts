// Pont vers le bulletin vocal du poste Bulletin (src/lib/voice, synthesizeBulletin).
// Le cache et le budget de crédits sont gérés là-bas : une erreur (budget atteint, réseau) fait retomber le bot sur le texte.

import type { Lang } from "../messages";
import type { Plan } from "../plan";
import { synthesizeBulletin } from "../voice";

export type VoiceResult = { audio: Buffer; mime: string };
export type Synthesizer = (plan: Plan, lang: Lang) => Promise<VoiceResult | null>;

export const synthesize: Synthesizer = async (plan, lang) => {
  const out = await synthesizeBulletin(plan, lang);
  return { audio: out.audio, mime: out.mime };
};
