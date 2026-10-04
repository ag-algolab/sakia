// Assemble les prises de ta VRAIE voix (déjà nettoyées par voice-polish.mjs) en une piste calée sur la vidéo, comme le fait narration.mjs pour la voix de synthèse.
// Les fichiers s'appellent <NN>-<id>.mp3 selon le script (ex. 01-open.mp3) et sont dans le dossier donné.
// Si une prise dépasse sa fenêtre de moins de 8 %, elle est accélérée très légèrement (inaudible) ; au-delà, le script le dit et la laisse telle quelle.
// Lancer : node scripts/voice-assemble.mjs docs/narration/01-film-story.json videos/prises/01-film-story/propres [sortie-dossier]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [scriptFile, takesDir, outDirArg] = process.argv.slice(2);
if (!scriptFile || !takesDir) throw new Error("usage : node scripts/voice-assemble.mjs <script.json> <dossier des prises propres> [dossier de sortie]");
const script = JSON.parse(readFileSync(scriptFile, "utf8"));
const out = outDirArg ?? path.join(takesDir, "..", "assemblage");
mkdirSync(out, { recursive: true });
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const GAP = 0.7;
let cursor = 0;
const rows = [];
for (const [i, seg] of script.segments.entries()) {
  const name = `${String(i + 1).padStart(2, "0")}-${seg.id}.mp3`;
  const f = path.join(takesDir, name);
  if (!existsSync(f)) { console.log(`MANQUE  ${name}  (« ${seg.text.slice(0, 50)}… »)`); continue; }
  let file = f;
  let d = dur(f);
  const at = seg.at ?? cursor;
  let note = "";
  if (seg.max != null && d > seg.max) {
    const ratio = d / seg.max;
    if (ratio <= 1.08) {
      file = path.join(out, `fit-${name}`);
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", f, "-filter:a", `atempo=${ratio.toFixed(4)}`, file]);
      d = dur(file);
      note = `accélérée de ${((ratio - 1) * 100).toFixed(1)} %`;
    } else note = `TROP LONGUE de ${(d - seg.max).toFixed(1)} s : refaire la prise plus courte`;
  }
  cursor = at + d + GAP;
  rows.push({ file, at, d });
  console.log(`${name.padEnd(24)} à ${at.toFixed(1).padStart(5)} s  durée ${d.toFixed(1).padStart(5)} s ${seg.max != null ? `(fenêtre ${seg.max} s) ` : ""}${note}`);
}
if (rows.length) {
  const inputs = rows.flatMap((r) => ["-i", r.file]);
  const filters = rows.map((r, i) => `[${i}:a]adelay=${Math.round(r.at * 1000)}|${Math.round(r.at * 1000)}[a${i}]`).join(";") + `;${rows.map((_, i) => `[a${i}]`).join("")}amix=inputs=${rows.length}:normalize=0[mix]`;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters, "-map", "[mix]", "-ar", "44100", "-b:a", "192k", path.join(out, "full.mp3")]);
  console.log(`piste complète : ${path.join(out, "full.mp3")} (${(rows.at(-1).at + rows.at(-1).d).toFixed(1)} s)`);
}
writeFileSync(path.join(out, "texte-a-lire.txt"), script.segments.map((s, i) => `${String(i + 1).padStart(2, "0")}-${s.id}${s.max ? `  (≤ ${s.max} s)` : ""}\n${s.text}\n`).join("\n"));
