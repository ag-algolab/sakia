// Cache et budget des voix de la ligne vocale (SERVEUR SEULEMENT : fichiers).
//
//  - Cache des lectures de plan : dans le dossier temporaire (jamais dans le dépôt). Clé = hash du texte lu + voix + modèle +
//    format : un même texte n'est jamais synthétisé deux fois. Sur Vercel, le cache repart de zéro à chaque démarrage à froid.
//  - Grand livre des caractères : public/audio/ivr/ledger.json (en local) ; budget du poste = 15 000 caractères
//    (variable IVR_CHAR_BUDGET). Au-delà, plus aucune génération : BudgetError. Il compte aussi les crédits réellement facturés
//    (en-tête « character-cost » d'ElevenLabs) pour annoncer la vraie consommation.
//  - Ce module n'écrit jamais dans src/lib/voice ni dans public/audio/cache (propriété du poste Bulletin).

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MODEL_ID, OUTPUT_FORMAT } from "../voice/voices";
import type { TimedLine } from "../voice/cache";

export const IVR_CHAR_BUDGET = Number(process.env.IVR_CHAR_BUDGET || 15000);

export class BudgetError extends Error {}

export type CachedClip = {
  mime: string;
  generatedAt: string;
  voiceId: string;
  modelId: string;
  text: string;
  lines: TimedLine[];
  audioBase64: string;
};

const CACHE_DIR = join(tmpdir(), "sakia-ivr");
const LEDGER_DIRS = [join(process.cwd(), "public", "audio", "ivr"), join(tmpdir(), "sakia-ivr")];

export function clipKey(text: string, voiceId: string, modelId: string = MODEL_ID): string {
  return createHash("sha256").update(JSON.stringify(["ivr", text, voiceId, modelId, OUTPUT_FORMAT])).digest("hex").slice(0, 32);
}

export function readClip(key: string): CachedClip | null {
  const file = join(CACHE_DIR, `${key}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as CachedClip;
  } catch {
    return null; // fichier abîmé : on le régénère
  }
}

export function writeClip(key: string, clip: CachedClip): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(clip));
}

// ---------- grand livre ----------

export type Ledger = { chars: number; credits: number; calls: number; updatedAt: string };

function writableLedgerDir(): string {
  for (const dir of LEDGER_DIRS) {
    try {
      mkdirSync(dir, { recursive: true });
      const probe = join(dir, ".probe");
      writeFileSync(probe, "");
      unlinkSync(probe);
      return dir;
    } catch {
      // essai suivant (Vercel : seul le dossier temporaire accepte l'écriture)
    }
  }
  throw new Error("aucun dossier accessible en écriture pour le grand livre");
}

export function readLedger(): Ledger {
  for (const dir of LEDGER_DIRS) {
    const file = join(dir, "ledger.json");
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, "utf8")) as Ledger;
      } catch {
        // ignoré
      }
    }
  }
  return { chars: 0, credits: 0, calls: 0, updatedAt: new Date(0).toISOString() };
}

function saveLedger(l: Ledger): void {
  writeFileSync(join(writableLedgerDir(), "ledger.json"), JSON.stringify({ ...l, updatedAt: new Date().toISOString() }, null, 1));
}

// À appeler AVANT une synthèse : refuse si le budget de caractères serait dépassé.
export function reserveChars(chars: number): void {
  const l = readLedger();
  if (l.chars + chars > IVR_CHAR_BUDGET) throw new BudgetError(`budget de la ligne vocale atteint (${l.chars}/${IVR_CHAR_BUDGET} caractères)`);
  saveLedger({ ...l, chars: l.chars + chars, calls: l.calls + 1 });
}

// À appeler APRÈS une synthèse réussie avec les crédits réellement facturés (null si le fournisseur ne les donne pas).
export function recordCredits(cost: number | null): void {
  if (cost == null) return;
  const l = readLedger();
  saveLedger({ ...l, credits: l.credits + cost });
}
