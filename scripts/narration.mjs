// Voix off des vidéos : lit un script (docs/narration/*.json), fabrique un fichier audio par segment avec la voix clonée d'Anthony (ElevenLabs),
// vérifie que chaque segment tient dans sa fenêtre, assemble une piste complète calée (ffmpeg) et écrit les sous-titres anglais (.srt).
// Lancer : node --env-file=.env.local scripts/narration.mjs docs/narration/01-film-story.json [modèle] [--dry]
//   modèle par défaut : eleven_multilingual_v2 (stable pour une narration) ; autres : eleven_v3, eleven_v4.
// La clé vient de KEY_ELEVENLABS (jamais écrite). Résultats dans videos/voiceover/<script>/<modèle>/ (ignoré par git).
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const file = process.argv[2];
const model = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : "eleven_multilingual_v2";
const dry = process.argv.includes("--dry");
if (!file) throw new Error("usage : node --env-file=.env.local scripts/narration.mjs <script.json> [modèle] [--dry]");
const VOICE = process.env.NARRATOR_VOICE_ID ?? "Ee3tezieCxDocqtnH0ih"; // voix clonée d'Anthony (créée par lui dans son compte)
const SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true };
const GAP = 0.7; // pause entre deux segments quand le script ne donne pas d'instant `at`

const script = JSON.parse(readFileSync(file, "utf8"));
const slug = path.basename(file, ".json");
const out = path.join("videos", "voiceover", slug, model);
mkdirSync(out, { recursive: true });
const key = process.env.KEY_ELEVENLABS;
if (!key && !dry) throw new Error("KEY_ELEVENLABS absente (lancer avec --env-file=.env.local)");

async function tts(text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text, model_id: model, voice_settings: SETTINGS }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  return { audio: Buffer.from(j.audio_base64, "base64"), al: j.alignment, cost: res.headers.get("character-cost") };
}

const srtTime = (s) => {
  const ms = Math.round(s * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

const chars = script.segments.reduce((n, s) => n + s.text.length, 0);
console.log(`${script.title} — ${script.segments.length} segments, ${chars} caractères, modèle ${model}${dry ? " (à blanc : rien n'est fabriqué)" : ""}`);
if (dry) process.exit(0);

let cursor = 0;
let spent = 0;
const rows = [];
const cues = [];
for (const [i, seg] of script.segments.entries()) {
  const { audio, al, cost } = await tts(seg.text);
  spent += Number(cost) || 0;
  const name = `${String(i + 1).padStart(2, "0")}-${seg.id}.mp3`;
  writeFileSync(path.join(out, name), audio);
  const dur = al.character_end_times_seconds.at(-1);
  const at = seg.at ?? cursor;
  cursor = at + dur + GAP;
  rows.push({ name, at, dur, max: seg.max ?? null });
  // sous-titres : une ligne par phrase, instants tirés de l'alignement caractère par caractère
  let from = 0;
  for (const m of seg.text.matchAll(/[^.!?]+[.!?]+\s*/g)) {
    const a = Math.min(al.characters.length - 1, from);
    const b = Math.min(al.characters.length - 1, from + m[0].trimEnd().length - 1);
    cues.push({ start: at + al.character_start_times_seconds[a], end: at + al.character_end_times_seconds[b], text: m[0].trim() });
    from += m[0].length;
  }
  const fit = seg.max == null ? "" : dur <= seg.max ? "tient" : `TROP LONG de ${(dur - seg.max).toFixed(1)} s`;
  console.log(`${name.padEnd(24)} à ${at.toFixed(1).padStart(5)} s  durée ${dur.toFixed(1).padStart(5)} s  ${seg.max != null ? `(fenêtre ${seg.max} s) ` : ""}${fit}`);
}
writeFileSync(path.join(out, "subtitles.srt"), cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n"));
writeFileSync(path.join(out, "placement.txt"), rows.map((r) => `${r.name}  à ${r.at.toFixed(1)} s  (${r.dur.toFixed(1)} s)`).join("\n") + "\n");

// piste complète : chaque segment posé à son instant, sur du silence
const inputs = rows.flatMap((r) => ["-i", path.join(out, r.name)]);
const filters = rows.map((r, i) => `[${i}:a]adelay=${Math.round(r.at * 1000)}|${Math.round(r.at * 1000)}[a${i}]`).join(";") + `;${rows.map((_, i) => `[a${i}]`).join("")}amix=inputs=${rows.length}:normalize=0[mix]`;
try {
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", filters, "-map", "[mix]", "-ar", "44100", "-b:a", "192k", path.join(out, "full.mp3")]);
  const total = rows.at(-1).at + rows.at(-1).dur;
  console.log(`piste complète : ${path.join(out, "full.mp3")} (${total.toFixed(1)} s)`);
} catch (e) {
  console.log("ffmpeg indisponible : les fichiers par segment et placement.txt suffisent pour le montage.");
}
console.log(`crédits dépensés : ${Math.round(spent)}`);
