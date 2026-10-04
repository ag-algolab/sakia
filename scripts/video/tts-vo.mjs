// Voix off de synthèse (ElevenLabs) pour la démo ou la vidéo technique : chaque phrase du prompteur est lue séparément
// (avec la phrase d'avant et d'après comme contexte, pour une intonation suivie), puis tout est mis bout à bout dans un
// seul fichier, et les instants de chaque phrase sont écrits au même format que les prises d'Anthony (takes.mjs) :
// la partition se recale toute seule dessus.
// Lancer : node --env-file=.env.local scripts/video/tts-vo.mjs <demo|tech> <voice_id> [modèle] [--only=8,9] [--render]
// --only : ne refait que ces phrases (numéros à partir de 0) ; les autres gardent exactement leur prise précédente.
// Sortie : videos/build/vo/<demo|tech>-<voix>.wav et videos/build/takes/<demo|tech>-vo.json
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [which, voice, modelArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!["demo", "tech"].includes(which) || !voice) throw new Error("usage : node --env-file=.env.local scripts/video/tts-vo.mjs <demo|tech> <voice_id> [modèle] [--render]");
const model = modelArg ?? "eleven_multilingual_v2";
const key = process.env.KEY_ELEVENLABS;
if (!key) throw new Error("KEY_ELEVENLABS absente (lancer avec --env-file=.env.local)");
const specPath = path.resolve(`scripts/video/specs/${which}.mjs`);
const { VO_LINES } = await import(pathToFileURL(specPath).href);
const dir = path.resolve("videos/build/vo", `${which}-${voice}`);
mkdirSync(dir, { recursive: true });
// v3 / v4 : réglages réduits (pas de « style »), et pas de phrase d'avant / d'après (non prise en charge)
const NEW_MODEL = /eleven_v[34]/.test(model);
const SETTINGS = NEW_MODEL ? { stability: Number(process.env.TTS_STABILITY ?? 0.5), similarity_boost: 0.8 } : { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true };

const GAP = 0.5; // silence entre deux phrases dans le fichier mis bout à bout
const fileOf = (i) => path.join(dir, `${String(i).padStart(2, "0")}.mp3`);
const probe = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim());
// --only=8,9 : ne refait que ces phrases ; --only=none : n'en refait aucune (recolle seulement les fichiers existants)
const onlyArg = (process.argv.find((a) => a.startsWith("--only=")) ?? "").slice(7);
const ONLY = onlyArg === "none" ? [-1] : onlyArg.split(",").filter(Boolean).map(Number);
// phrases gardées : début et fin de la parole mesurés dans le son lui-même (silences de tête et de queue), sans dépendre
// d'un ancien fichier de repères
const speechBounds = (file) => {
  const dur = probe(file);
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "silencedetect=n=-42dB:d=0.06", "-f", "null", "-"], { encoding: "utf8" }).stderr ?? "";
  const starts = [...out.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...out.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
  const first = starts.length && starts[0] < 0.02 && ends.length ? ends[0] : 0;
  const lastStart = starts.at(-1);
  const last = lastStart != null && lastStart > first && (ends.length < starts.length || (ends.at(-1) ?? 0) >= dur - 0.02) ? lastStart : dur;
  return { first, last, dur };
};
const kept = [];
if (ONLY.length) for (const [i] of VO_LINES.entries()) if (!ONLY.includes(i)) kept[i] = speechBounds(fileOf(i));

let spent = 0;
const parts = [];
for (const [i, text] of VO_LINES.entries()) {
  if (ONLY.length && !ONLY.includes(i)) {
    parts.push({ i, text, file: fileOf(i), ...kept[i] });
    console.log(`${String(i + 1).padStart(2)}. ${(kept[i].last - kept[i].first).toFixed(2)} s  (gardée)  ${text}`);
    continue;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model, voice_settings: SETTINGS, ...(NEW_MODEL ? {} : { previous_text: VO_LINES[i - 1] ?? undefined, next_text: VO_LINES[i + 1] ?? undefined }) }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  spent += Number(res.headers.get("character-cost")) || 0;
  const j = await res.json();
  const file = fileOf(i);
  writeFileSync(file, Buffer.from(j.audio_base64, "base64"));
  const al = j.alignment;
  const first = al.character_start_times_seconds.find((_, k) => /\S/.test(al.characters[k])) ?? 0;
  const last = al.character_end_times_seconds.at(-1);
  const dur = probe(file);
  parts.push({ i, text, file, first, last, dur });
  console.log(`${String(i + 1).padStart(2)}. ${(last - first).toFixed(2)} s  ${text}`);
}

// bout à bout, avec 0,5 s de silence entre deux phrases (la partition place chaque phrase à son instant)
const wav = path.resolve("videos/build/vo", `${which}-${voice}.wav`);
const inputs = parts.flatMap((p) => ["-i", p.file]);
const silence = `anullsrc=r=44100:cl=stereo`;
const chain = parts.map((p, k) => `[${k}:a]aformat=sample_rates=44100:channel_layouts=stereo,apad=pad_dur=${GAP}[p${k}]`).join(";") + `;${parts.map((_, k) => `[p${k}]`).join("")}concat=n=${parts.length}:v=0:a=1[out]`;
void silence;
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", chain, "-map", "[out]", wav]);
let offset = 0;
const takes = parts.map((p) => {
  const t = { line: p.i, text: p.text, start: Math.max(0, offset + p.first - 0.04), end: offset + Math.min(p.dur, p.last + 0.12), score: 1 };
  offset += p.dur + GAP;
  return t;
});
mkdirSync("videos/build/takes", { recursive: true });
writeFileSync(`videos/build/takes/${which}-vo.json`, JSON.stringify({ file: wav.replace(/\\/g, "/"), voice, model, synthetic: true, takes }, null, 1));
console.log(`voix off : ${wav} (${offset.toFixed(1)} s, ${Math.round(spent)} crédits)`);
if (process.argv.includes("--render")) execFileSync("node", ["scripts/video/compose.mjs", specPath], { stdio: "inherit" });
