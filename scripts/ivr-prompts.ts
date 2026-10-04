// Enregistre les phrases FIXES de la ligne vocale (anglais + français + arabe) avec la voix Rima M :
// public/audio/ivr/<id>.<langue>.mp3 + public/audio/ivr/manifest.json (texte, sous-titre, empreinte, adresse, taille, durée).
//
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-prompts.ts          → simulation : liste et coût estimé, ne dépense rien
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-prompts.ts --go     → enregistre ce qui manque ou a changé
//
// Ne regénère jamais une phrase dont le texte, la voix et le modèle n'ont pas changé. Plafond : budget de caractères du poste
// (src/lib/ivr/store.ts). Affiche la consommation réelle à la fin (compteur du compte ElevenLabs avant / après).
// Les métadonnées d'une phrase inchangée (adresse avec empreinte, sous-titre anglais) sont remises à jour sans rien réenregistrer.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifest, ManifestItem } from "../src/lib/ivr/demo";
import { allRecordings, recordingFile, recordingPath, textHash } from "../src/lib/ivr/prompts";
import type { Recording } from "../src/lib/ivr/prompts";
import { IVR_CHAR_BUDGET, readLedger, recordCredits, reserveChars } from "../src/lib/ivr/store";
import { subscription, ttsWithTimestamps } from "../src/lib/voice/elevenlabs";
import { MODEL_ID, OUTPUT_FORMAT, SELECTED_VOICE } from "../src/lib/voice/voices";

const OUT = join(process.cwd(), "public", "audio", "ivr");
const MANIFEST = join(OUT, "manifest.json");
const GO = process.argv.includes("--go");

function loadManifest(): Manifest {
  if (existsSync(MANIFEST)) return JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
  return { voiceId: SELECTED_VOICE.id, voiceName: SELECTED_VOICE.name, modelId: MODEL_ID, format: OUTPUT_FORMAT, items: [] };
}

const diskFile = (r: Recording) => join(process.cwd(), "public", recordingPath(r.id, r.lang));

(async () => {
  mkdirSync(OUT, { recursive: true });
  const manifest = loadManifest();
  const sameVoice = manifest.voiceId === SELECTED_VOICE.id && manifest.modelId === MODEL_ID;
  const entry = (r: Recording) => manifest.items.find((i) => i.id === r.id && i.lang === r.lang);
  const upToDate = (r: Recording) => {
    const have = entry(r);
    return !!have && have.hash === textHash(r.text) && sameVoice && existsSync(diskFile(r));
  };
  const todo = allRecordings().filter((r) => !upToDate(r));
  // enregistrement à jour mais adresse ou sous-titre anciens : réécrits gratuitement
  const meta = allRecordings().filter((r) => upToDate(r) && (entry(r)!.file !== recordingFile(r.id, r.lang) || entry(r)!.en !== r.en));
  const chars = todo.reduce((n, r) => n + r.text.length, 0);
  const ledger = readLedger();
  console.log(`${todo.length} phrase(s) à enregistrer sur ${allRecordings().length} : ${chars} caractères.`);
  console.log(`Grand livre : ${ledger.chars}/${IVR_CHAR_BUDGET} caractères déjà utilisés, ${ledger.credits} crédits facturés. Modèle ${MODEL_ID}, voix ${SELECTED_VOICE.name}.`);
  if (meta.length) console.log(`${meta.length} entrée(s) du manifeste à remettre à jour sans réenregistrer (adresse avec empreinte, sous-titre anglais).`);
  if (!GO) {
    for (const r of todo) console.log(`  - ${r.id}.${r.lang} (${r.text.length} car.) ${r.text.slice(0, 70)}${r.text.length > 70 ? "…" : ""}`);
    console.log("Simulation seulement. Relancer avec --go pour enregistrer.");
    return;
  }

  for (const r of meta) {
    const have = entry(r)!;
    have.file = recordingFile(r.id, r.lang);
    have.en = r.en;
  }
  if (meta.length) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  if (todo.length === 0) {
    console.log("Rien à enregistrer.");
    return;
  }
  if (!sameVoice) {
    manifest.items = []; // voix ou modèle changés : tout est à refaire, on ne mélange pas deux voix
    manifest.voiceId = SELECTED_VOICE.id;
    manifest.voiceName = SELECTED_VOICE.name;
    manifest.modelId = MODEL_ID;
  }

  const before = await subscription();
  let credits = 0;
  let sentChars = 0;
  for (const r of todo) {
    const file = diskFile(r);
    reserveChars(r.text.length);
    const { audio, alignment, cost } = await ttsWithTimestamps(r.text, SELECTED_VOICE.id, MODEL_ID);
    recordCredits(cost);
    credits += cost ?? 0;
    sentChars += r.text.length;
    writeFileSync(file, audio);
    const item: ManifestItem = {
      id: r.id,
      lang: r.lang,
      file: recordingFile(r.id, r.lang),
      text: r.text,
      en: r.en,
      hash: textHash(r.text),
      chars: r.text.length,
      bytes: statSync(file).size,
      durationMs: Math.round((alignment.character_end_times_seconds.at(-1) ?? 0) * 1000),
      recordedAt: new Date().toISOString(),
    };
    manifest.items = [...manifest.items.filter((i) => !(i.id === r.id && i.lang === r.lang)), item];
    // le manifeste est réécrit à chaque phrase : une coupure en route ne perd rien
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    console.log(`  ${r.id}.${r.lang}.mp3 : ${(item.bytes / 1024).toFixed(1)} Ko, ${(item.durationMs / 1000).toFixed(1)} s, ${r.text.length} car.${cost != null ? `, ${cost} crédits` : ""}`);
  }
  const after = await subscription();
  const total = manifest.items.reduce((n, i) => n + i.bytes, 0);
  console.log(`\nEnregistré : ${todo.length} phrase(s), ${sentChars} caractères envoyés. Crédits facturés (en-têtes) : ${credits}. Compteur du compte : ${before.used} → ${after.used} (+${after.used - before.used}) sur ${after.limit}.`);
  console.log(`Total des phrases fixes : ${manifest.items.length} fichiers, ${(total / 1024).toFixed(0)} Ko.`);
})().catch((e) => {
  console.error("ERREUR :", (e as Error).message);
  process.exit(1);
});
