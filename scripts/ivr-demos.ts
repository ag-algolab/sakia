// Enregistre à l'avance des lectures de plan de démonstration pour que la ligne vocale marche SANS réseau :
// public/audio/ivr/demo/<id>.mp3 + <id>.json (sous-titres calés) + index.json.
// Ce sont des REJEUX : météo observée (ERA5) à une date passée, pas la météo du jour. La page le dit en toutes lettres.
//
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-demos.ts          → simulation : textes et coût, ne dépense rien
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-demos.ts --go     → enregistre ce qui manque
//
// Kairouan × 5 cultures × 3 langues (anglais, français, arabe) avec « arrosé hier ou avant-hier » (touche 2), plus le piment avec
// « je ne sais pas » (touche 9) pour montrer le garde-fou « pas sûr » hors connexion, plus le DÉTAIL DE LA SEMAINE (touche 3 du menu
// de fin) pour le piment. Ne regénère jamais un fichier présent ; remet seulement à jour, gratuitement, les sous-titres anglais d'une
// lecture déjà enregistrée quand le texte anglais a changé (le texte dit, lui, ne change pas : scripts/ivr-check.ts le vérifie).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { planClip, planSubtitles } from "../src/lib/ivr/clip";
import type { DemoClipFile, DemoItem } from "../src/lib/ivr/demo";
import { IVR_LANGS } from "../src/lib/ivr/menu";
import type { IvrLang } from "../src/lib/ivr/menu";
import { ivrDetailLines, ivrDetailText, ivrPlanLines, ivrPlanText } from "../src/lib/ivr/script";
import { IVR_CHAR_BUDGET, readLedger } from "../src/lib/ivr/store";
import { buildPlan } from "../src/lib/plan";
import type { Plan } from "../src/lib/plan";
import { subscription } from "../src/lib/voice/elevenlabs";
import { MODEL_ID, SELECTED_VOICE } from "../src/lib/voice/voices";

type DemoSpec = { crop: string; asOf: string; ago: number | null; detail?: boolean };

const HEATWAVE = "2026-07-17"; // canicule : 48 °C à Kairouan (météo observée)
const SPECS: DemoSpec[] = [
  { crop: "piment", asOf: HEATWAVE, ago: 2 },
  { crop: "tomate", asOf: HEATWAVE, ago: 2 },
  { crop: "amandier", asOf: HEATWAVE, ago: 2 },
  { crop: "olivier", asOf: HEATWAVE, ago: 2 },
  { crop: "ble", asOf: "2026-05-20", ago: 2 }, // le blé n'est pas en végétation en juillet : date de saison
  { crop: "piment", asOf: HEATWAVE, ago: null }, // « je ne sais pas » : le plan dit « pas sûr »
  // détail de la semaine (touche 3)
  { crop: "piment", asOf: HEATWAVE, ago: 2, detail: true },
];
const REGION = "kairouan";
const LANGS: IvrLang[] = IVR_LANGS;

const OUT = join(process.cwd(), "public", "audio", "ivr", "demo");
const INDEX = join(OUT, "index.json");
const GO = process.argv.includes("--go");

const idOf = (s: DemoSpec, lang: IvrLang) => `${REGION}-${s.crop}-${lang}-a${s.ago === null ? "u" : s.ago}${s.detail ? "-d" : ""}`;

// Sous-titres anglais actuels d'une lecture déjà enregistrée : rend le fichier corrigé, ou null s'il est déjà à jour.
function refreshedSubtitles(file: DemoClipFile, plan: Plan, detail: boolean): DemoClipFile | null {
  const english = new Map((detail ? ivrDetailLines : ivrPlanLines)(plan, "en").map((l) => [l.id, l.text]));
  const fix = <T extends { id: string; en: string }>(l: T): T => ({ ...l, en: english.get(l.id) ?? l.en });
  const next = { ...file, lines: file.lines.map(fix), subtitles: file.subtitles.map(fix) };
  return JSON.stringify(next) === JSON.stringify(file) ? null : next;
}

(async () => {
  mkdirSync(OUT, { recursive: true });
  const index: DemoItem[] = existsSync(INDEX) ? JSON.parse(readFileSync(INDEX, "utf8")) : [];

  // simulation : texte et nombre de caractères de chaque lecture
  let chars = 0;
  const todo: { spec: DemoSpec; lang: IvrLang; text: string }[] = [];
  const subs: { id: string; json: string; file: DemoClipFile }[] = [];
  for (const spec of SPECS) {
    const plan = await buildPlan({ regionId: REGION, cropId: spec.crop, asOf: spec.asOf, lastIrrigationDaysAgo: spec.ago ?? undefined });
    for (const lang of LANGS) {
      const id = idOf(spec, lang);
      if (existsSync(join(OUT, `${id}.mp3`)) && index.some((i) => i.id === id)) {
        const json = join(OUT, `${id}.json`);
        const fixed = existsSync(json) ? refreshedSubtitles(JSON.parse(readFileSync(json, "utf8")) as DemoClipFile, plan, !!spec.detail) : null;
        if (fixed) subs.push({ id, json, file: fixed });
        continue;
      }
      const text = (spec.detail ? ivrDetailText : ivrPlanText)(plan, lang);
      chars += text.length;
      todo.push({ spec, lang, text });
      if (!GO) console.log(`  - ${id} (${text.length} car.) ${text}`);
    }
  }
  const ledger = readLedger();
  console.log(`${todo.length} lecture(s) à enregistrer : ${chars} caractères. Grand livre : ${ledger.chars}/${IVR_CHAR_BUDGET}. Modèle ${MODEL_ID}, voix ${SELECTED_VOICE.name}.`);
  if (subs.length) console.log(`Sous-titres anglais à remettre à jour (sans réenregistrer) : ${subs.map((s) => s.id).join(", ")}.`);
  if (!GO) {
    console.log("Simulation seulement. Relancer avec --go pour enregistrer.");
    return;
  }
  for (const s of subs) writeFileSync(s.json, JSON.stringify(s.file, null, 1));
  if (todo.length === 0) return;

  const before = await subscription();
  for (const { spec, lang } of todo) {
    const id = idOf(spec, lang);
    const plan = await buildPlan({ regionId: REGION, cropId: spec.crop, asOf: spec.asOf, lastIrrigationDaysAgo: spec.ago ?? undefined });
    const clip = await planClip(plan, lang, !!spec.detail);
    writeFileSync(join(OUT, `${id}.mp3`), clip.audio);
    writeFileSync(
      join(OUT, `${id}.json`),
      JSON.stringify({ lines: clip.lines, subtitles: planSubtitles(plan, lang, !!spec.detail), durationMs: clip.durationMs } satisfies DemoClipFile, null, 1),
    );
    const item: DemoItem = {
      id,
      region: REGION,
      crop: spec.crop,
      lang,
      ago: spec.ago,
      detail: !!spec.detail,
      asOf: spec.asOf,
      file: `/audio/ivr/demo/${id}.mp3`,
      json: `/audio/ivr/demo/${id}.json`,
      bytes: clip.audio.length,
      durationMs: clip.durationMs,
      level: plan.confidence.level,
      askAPerson: plan.confidence.askAPerson,
      reasons: plan.confidence.reasons,
      status: plan.status,
      voiceId: clip.voiceId,
      modelId: clip.modelId,
      recordedAt: clip.generatedAt,
    };
    index.splice(0, index.length, ...index.filter((i) => i.id !== id), item);
    writeFileSync(INDEX, JSON.stringify(index, null, 1));
    console.log(`  ${id} : ${(item.bytes / 1024).toFixed(1)} Ko, ${(item.durationMs / 1000).toFixed(1)} s, ${clip.source}`);
  }
  const after = await subscription();
  const l2 = readLedger();
  console.log(`\nCaractères envoyés : ${l2.chars - ledger.chars}. Crédits facturés (en-têtes) : ${l2.credits - ledger.credits}. Compteur du compte : ${before.used} → ${after.used} (+${after.used - before.used}) sur ${after.limit}.`);
  const total = index.reduce((n, i) => n + i.bytes, 0);
  console.log(`Total des démonstrations : ${index.length} fichiers, ${(total / 1024).toFixed(0)} Ko.`);
})().catch((e) => {
  console.error("ERREUR :", (e as Error).message);
  process.exit(1);
});
