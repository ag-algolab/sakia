// Retire le vent et les bruits d'un enregistrement d'Anthony avec l'isolation de voix d'ElevenLabs (Voice Isolator) :
// le son est extrait de la vidéo, envoyé tel quel, et la voix seule revient, sur la même ligne de temps (les prises
// choisies dans la vidéo restent valables).
// Lancer : node --env-file=.env.local scripts/video/isolate-voice.mjs <vidéo ou son> <sortie.mp3>
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error("usage : node --env-file=.env.local scripts/video/isolate-voice.mjs <vidéo ou son> <sortie.mp3>");
const key = process.env.KEY_ELEVENLABS;
if (!key) throw new Error("KEY_ELEVENLABS absente (lancer avec --env-file=.env.local)");
mkdirSync(path.dirname(out), { recursive: true });
const tmp = out.replace(/\.[^.]+$/, ".source.mp3");
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "192k", tmp]);
const form = new FormData();
form.append("audio", new Blob([readFileSync(tmp)], { type: "audio/mpeg" }), path.basename(tmp));
const res = await fetch("https://api.elevenlabs.io/v1/audio-isolation", { method: "POST", headers: { "xi-api-key": key }, body: form, signal: AbortSignal.timeout(600000) });
if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
console.log(`voix isolée : ${out} (${dur(out).toFixed(1)} s, source ${dur(tmp).toFixed(1)} s)`);
