// Cache disque des synthèses, clé = hash (texte + voix + modèle + format).
// Un même texte n'est jamais synthétisé deux fois. Lecture : public/audio/cache (livré avec le dépôt)
// puis le dossier temporaire ; écriture : le premier des deux qui l'accepte (Vercel n'écrit que dans /tmp).
// Le « grand livre » compte les crédits dépensés par l'appli : au-delà du budget, plus aucune génération.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUDGET_CREDITS, MODEL_ID, OUTPUT_FORMAT } from "./voices";

export type TimedLine = { id: string; text: string; startMs: number; endMs: number };

export type CachedSynthesis = {
  mime: string;
  generatedAt: string;
  voiceId: string;
  modelId: string;
  lines: TimedLine[];
  audioBase64: string;
};

const DIRS = [join(process.cwd(), "public", "audio", "cache"), join(tmpdir(), "sakia-voice")];

// Paramètres du plan qui peuvent changer ce que dit la voix. Quand ils sont fournis ils entrent dans la clé (la voix ne
// doit jamais contredire l'écran) ; quand aucun n'est fourni la clé est celle d'avant (le cache existant reste valable).
export type PlanParams = { soil?: string; system?: string; planting?: string };

export function cacheKey(text: string, voiceId: string, modelId: string = MODEL_ID, params?: PlanParams): string {
  const parts: unknown[] = [text, voiceId, modelId, OUTPUT_FORMAT];
  if (params && (params.soil || params.system || params.planting)) parts.push({ soil: params.soil ?? null, system: params.system ?? null, planting: params.planting ?? null });
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex").slice(0, 32);
}

export function readCache(key: string): CachedSynthesis | null {
  for (const dir of DIRS) {
    const file = join(dir, `${key}.json`);
    if (existsSync(file)) {
      try {
        return JSON.parse(readFileSync(file, "utf8")) as CachedSynthesis;
      } catch {
        // fichier abîmé : on l'ignore
      }
    }
  }
  return null;
}

function writableDir(): string {
  for (const dir of DIRS) {
    try {
      mkdirSync(dir, { recursive: true });
      const probe = join(dir, ".probe");
      writeFileSync(probe, "");
      unlinkSync(probe);
      return dir;
    } catch {
      // essai suivant
    }
  }
  throw new Error("aucun dossier de cache accessible en écriture");
}

export function writeCache(key: string, value: CachedSynthesis): void {
  writeFileSync(join(writableDir(), `${key}.json`), JSON.stringify(value));
}

// --- budget de crédits -----------------------------------------------------------------------

function ledgerPath(): string {
  return join(writableDir(), "ledger.json");
}

export function creditsSpent(): number {
  for (const dir of DIRS) {
    const file = join(dir, "ledger.json");
    if (existsSync(file)) {
      try {
        return (JSON.parse(readFileSync(file, "utf8")) as { spent: number }).spent;
      } catch {
        // ignoré
      }
    }
  }
  return 0;
}

export class BudgetError extends Error {}

// À appeler AVANT une synthèse : refuse si le budget serait dépassé.
export function reserveCredits(chars: number): void {
  const spent = creditsSpent();
  if (spent + chars > BUDGET_CREDITS) {
    throw new BudgetError(`budget de crédits vocaux atteint (${spent}/${BUDGET_CREDITS})`);
  }
  writeFileSync(ledgerPath(), JSON.stringify({ spent: spent + chars, updatedAt: new Date().toISOString() }));
}
