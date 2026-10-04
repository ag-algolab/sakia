// Musique composée par ElevenLabs (Eleven Music) pour les vidéos : un morceau par consigne, instrumental, ~62 s.
// Lancer : node --env-file=.env.local scripts/video/music-eleven.mjs <nom> "<consigne>" [secondes]
// Sortie : videos/build/music-<nom>.mp3 (usage commercial couvert par l'abonnement payant d'ElevenLabs).
import { mkdirSync, writeFileSync } from "node:fs";

const [name, prompt, secs = "62"] = process.argv.slice(2);
if (!name || !prompt) throw new Error('usage : node --env-file=.env.local scripts/video/music-eleven.mjs <nom> "<consigne>" [secondes]');
const res = await fetch("https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192", {
  method: "POST",
  headers: { "xi-api-key": process.env.KEY_ELEVENLABS, "content-type": "application/json" },
  body: JSON.stringify({ prompt, music_length_ms: Math.round(Number(secs) * 1000) }),
  signal: AbortSignal.timeout(300000),
});
if (!res.ok) throw new Error(`ElevenLabs HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
mkdirSync("videos/build", { recursive: true });
const out = `videos/build/music-${name}.mp3`;
writeFileSync(out, Buffer.from(await res.arrayBuffer()));
console.log(`musique : ${out}`);
