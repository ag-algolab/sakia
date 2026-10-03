// Enregistre les phrases FIXES de la ligne vocale (français + arabe) avec la voix Rima M :
// public/audio/ivr/<id>.<langue>.mp3 + public/audio/ivr/manifest.json (texte, empreinte, taille, durée).
//
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-prompts.ts          → simulation : liste et coût estimé, ne dépense rien
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/ivr-prompts.ts --go     → enregistre ce qui manque ou a changé
//
// Ne regénère jamais une phrase dont le texte, la voix et le modèle n'ont pas changé. Plafond : budget de caractères du poste
// (src/lib/ivr/store.ts). Affiche la consommation réelle à la fin (compteur du compte ElevenLabs avant / après).

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Manifest, ManifestItem } from "../src/lib/ivr/demo";
import { allRecordings, textHash } from "../src/lib/ivr/prompts";
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

(async () => {
  mkdirSync(OUT, { recursive: true });
  const manifest = loadManifest();
  const todo = allRecordings().filter((r) => {
    const have = manifest.items.find((i) => i.id === r.id && i.lang === r.lang);
    const file = join(OUT, `${r.id}.${r.lang}.mp3`);
    return !(have && have.hash === textHash(r.text) && manifest.voiceId === SELECTED_VOICE.id && manifest.modelId === MODEL_ID && existsSync(file));
  });
  const chars = todo.reduce((n, r) => n + r.text.length, 0);
  const ledger = readLedger();
  console.log(`${todo.length} phrase(s) à enregistrer sur ${allRecordings().length} : ${chars} caractères.`);
  console.log(`Grand livre : ${ledger.chars}/${IVR_CHAR_BUDGET} caractères déjà utilisés, ${ledger.credits} crédits facturés. Modèle ${MODEL_ID}, voix ${SELECTED_VOICE.name}.`);
  if (!GO) {
    for (const r of todo) console.log(`  - ${r.id}.${r.lang} (${r.text.length} car.) ${r.text.slice(0, 70)}${r.text.length > 70 ? "…" : ""}`);
    console.log("Simulation seulement. Relancer avec --go pour enregistrer.");
    return;
  }
  if (todo.length === 0) {
    console.log("Rien à faire.");
    return;
  }
  if (manifest.voiceId !== SELECTED_VOICE.id || manifest.modelId !== MODEL_ID) {
    manifest.items = []; // voix ou modèle changés : tout est à refaire, on ne mélange pas deux voix
    manifest.voiceId = SELECTED_VOICE.id;
    manifest.voiceName = SELECTED_VOICE.name;
    manifest.modelId = MODEL_ID;
  }

  const before = await subscription();
  let credits = 0;
  let sentChars = 0;
  for (const r of allRecordings()) {
    const file = `${r.id}.${r.lang}.mp3`;
    const have = manifest.items.find((i) => i.id === r.id && i.lang === r.lang);
    if (have && have.hash === textHash(r.text) && existsSync(join(OUT, file))) continue;
    reserveChars(r.text.length);
    const { audio, alignment, cost } = await ttsWithTimestamps(r.text, SELECTED_VOICE.id, MODEL_ID);
    recordCredits(cost);
    credits += cost ?? 0;
    sentChars += r.text.length;
    writeFileSync(join(OUT, file), audio);
    const item: ManifestItem = {
      id: r.id,
      lang: r.lang,
      file: `/audio/ivr/${file}`,
      text: r.text,
      en: r.en,
      hash: textHash(r.text),
      chars: r.text.length,
      bytes: statSync(join(OUT, file)).size,
      durationMs: Math.round((alignment.character_end_times_seconds.at(-1) ?? 0) * 1000),
      recordedAt: new Date().toISOString(),
    };
    manifest.items = [...manifest.items.filter((i) => !(i.id === r.id && i.lang === r.lang)), item];
    // le manifeste est réécrit à chaque phrase : une coupure en route ne perd rien
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
    console.log(`  ${file} : ${(item.bytes / 1024).toFixed(1)} Ko, ${(item.durationMs / 1000).toFixed(1)} s, ${r.text.length} car.${cost != null ? `, ${cost} crédits` : ""}`);
  }
  const after = await subscription();
  const total = manifest.items.reduce((n, i) => n + i.bytes, 0);
  console.log(`\nEnregistré : ${sentChars} caractères envoyés. Crédits facturés (en-têtes) : ${credits}. Compteur du compte : ${before.used} → ${after.used} (+${after.used - before.used}) sur ${after.limit}.`);
  console.log(`Total des phrases fixes : ${manifest.items.length} fichiers, ${(total / 1024).toFixed(0)} Ko.`);
})().catch((e) => {
  console.error("ERREUR :", (e as Error).message);
  process.exit(1);
});
