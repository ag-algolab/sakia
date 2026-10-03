// Mesure le poids des bulletins de démonstration (audio et JSON d'alignement) pour docs/DATA-CARD.md.
// Lancer : node node_modules/tsx/dist/cli.mjs scripts/voice-sizes.ts

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "public", "audio");
const files = readdirSync(DIR).filter((f) => f.startsWith("demo-") && f !== "demo-index.json");
const kb = (n: number) => (n / 1024).toFixed(1);

const ids = [...new Set(files.map((f) => f.replace(/\.(mp3|json)$/, "")))].sort();
let audio = 0;
let json = 0;
console.log("| Bulletin | Audio (Ko) | JSON d'alignement (Ko) |\n|---|---|---|");
for (const id of ids) {
  let a = 0;
  let j = 0;
  try { a = statSync(join(DIR, `${id}.mp3`)).size; } catch {}
  try { j = statSync(join(DIR, `${id}.json`)).size; } catch {}
  audio += a;
  json += j;
  console.log(`| ${id.replace("demo-", "")} | ${kb(a)} | ${kb(j)} |`);
}
console.log(`\n${ids.length} bulletins : audio ${kb(audio)} Ko au total (moyenne ${kb(audio / ids.length)} Ko), JSON ${kb(json)} Ko au total (moyenne ${kb(json / ids.length)} Ko).`);
