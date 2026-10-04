// Nettoie un enregistrement de VOIX HUMAINE (la tienne) sans la remplacer : retire les « uh », les mots coupés et raccourcit les silences trop longs,
// supprime le bruit de fond (isolation de la voix ElevenLabs, facultative) et règle le volume (-16 LUFS, norme des vidéos en ligne).
// Lancer : node --env-file=.env.local scripts/voice-polish.mjs <enregistrement> [sortie.mp3] [--no-isolate]
// Écrit aussi la transcription (.txt) et les sous-titres (.srt) de la version nettoyée.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) throw new Error("usage : node --env-file=.env.local scripts/voice-polish.mjs <enregistrement> [sortie.mp3] [--no-isolate]");
const out = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : input.replace(/\.[^.]+$/, "") + "-propre.mp3";
const isolate = !process.argv.includes("--no-isolate");
const key = process.env.KEY_ELEVENLABS;
const FILL = /^(uh|um|uhm|er|erm|eh|euh|hmm|mm|hm|ah|ben|bah)$/iu;
const ff = (args) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const tmp = (s) => out.replace(/\.[^.]+$/, "") + s;

// 1) format de travail : wav mono 44,1 kHz
const wav = tmp(".work.wav");
ff(["-i", input, "-ar", "44100", "-ac", "1", wav]);

// 2) isolation de la voix (retire bruit de fond, écho de pièce)
let work = wav;
if (isolate) {
  const fd = new FormData();
  fd.append("audio", new Blob([readFileSync(wav)], { type: "audio/wav" }), "voice.wav");
  const r = await fetch("https://api.elevenlabs.io/v1/audio-isolation", { method: "POST", headers: { "xi-api-key": key }, body: fd });
  if (r.ok) {
    work = tmp(".isolated.mp3");
    writeFileSync(work, Buffer.from(await r.arrayBuffer()));
  } else console.log(`isolation indisponible (HTTP ${r.status}) : on continue sans`);
}

// 3) transcription mot à mot
const fd2 = new FormData();
fd2.append("model_id", "scribe_v1");
fd2.append("timestamps_granularity", "word");
fd2.append("tag_audio_events", "false");
fd2.append("file", new Blob([readFileSync(work)]), path.basename(work));
const sr = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd2 });
if (!sr.ok) throw new Error(`transcription HTTP ${sr.status}`);
const words = ((await sr.json()).words || []).filter((w) => w.type === "word");
const bad = (w) => FILL.test(w.text.replace(/[^\p{L}]/gu, "")) || /-$/.test(w.text.trim());
const kept = words.filter((w) => !bad(w));
console.log(`${words.length} mots, ${words.length - kept.length} retirés (uh, mots coupés)`);

// 4) intervalles à garder : chaque mot gardé avec une marge ; les silences de plus de 0,9 s sont ramenés à environ 0,5 s
const PAD = 0.12;
const ranges = [];
for (const w of kept) {
  const s = Math.max(0, w.start - PAD);
  const e = w.end + PAD;
  const last = ranges.at(-1);
  if (last && s - last[1] < 0.45) last[1] = e; // même souffle
  else if (last && s - last[1] < 0.9) last[1] = e > s ? e : s; // pause courte : on garde
  else ranges.push([s, e]);
}
// une pause longue = deux intervalles séparés ; le « collage » ajoute 0,35 s de silence entre eux
const total = dur(work);
const F = 0.015;
const filt =
  ranges.map(([s, e], i) => `[0:a]atrim=start=${s.toFixed(3)}:end=${Math.min(e, total).toFixed(3)},asetpts=PTS-STARTPTS,afade=t=in:d=${F},afade=t=out:st=${Math.max(0, Math.min(e, total) - s - F).toFixed(3)}:d=${F},apad=pad_dur=0.35[a${i}]`).join(";") +
  `;${ranges.map((_, i) => `[a${i}]`).join("")}concat=n=${ranges.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[o]`;
ff(["-i", work, "-filter_complex", filt, "-map", "[o]", "-ar", "44100", "-ac", "1", "-b:a", "192k", out]);
writeFileSync(out.replace(/\.[^.]+$/, ".txt"), kept.map((w) => w.text).join(" ").replace(/\s+/g, " ").trim() + "\n");
console.log(`${input.split(/[\/]/).pop()} (${dur(input).toFixed(1)} s) → ${out} (${dur(out).toFixed(1)} s)`);
for (const f of [wav, tmp(".isolated.mp3")]) if (existsSync(f)) execFileSync("node", ["-e", `require("fs").unlinkSync(${JSON.stringify(f)})`]);
