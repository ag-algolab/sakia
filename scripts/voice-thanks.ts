// Génère le remerciement parlé (« Merci ! Grâce à vous, vos voisins savent combien il a plu. ») dans chaque langue :
// public/audio/thanks-<langue>.mp3. Une seule fois : un fichier déjà présent n'est jamais regénéré (~10 Ko, quelques crédits).
// Lancer : node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/voice-thanks.ts

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ttsWithTimestamps } from "../src/lib/voice/elevenlabs";
import { MODEL_ID, SELECTED_VOICE, THANKS_TEXT } from "../src/lib/voice/voices";

const OUT = join(process.cwd(), "public", "audio");

(async () => {
  mkdirSync(OUT, { recursive: true });
  for (const [lang, text] of Object.entries(THANKS_TEXT)) {
    const file = join(OUT, `thanks-${lang}.mp3`);
    if (existsSync(file)) {
      console.log(`thanks-${lang}.mp3 : déjà présent`);
      continue;
    }
    const { audio, cost } = await ttsWithTimestamps(text, SELECTED_VOICE.id, MODEL_ID);
    writeFileSync(file, audio);
    console.log(`thanks-${lang}.mp3 : ${Math.round(audio.length / 1024)} Ko, ${text.length} caractères, coût déclaré ${cost ?? "n/d"}`);
  }
})();
