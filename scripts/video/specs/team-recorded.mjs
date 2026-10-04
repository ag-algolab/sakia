// Les prises gardées dans la vidéo face caméra d'Anthony du 4 oct. (Downloads/video.mp4, 3 min 53, une quinzaine d'essais,
// texte en partie improvisé) : choisies à la main sur la transcription mot à mot (videos/build/takes/team.scribe.json),
// coupées dans les silences, jamais au milieu d'un mot. Le texte est celui réellement dit (sans les « uh »), pour les sous-titres.
// Lancer : node scripts/video/specs/team-recorded.mjs  → réécrit videos/build/takes/team.json (puis team-build.mjs)
import { readFileSync, writeFileSync } from "node:fs";

export const TAKES = [
  { line: 0, start: 4.52, end: 5.95, text: "Hi, I'm Anthony Gocmen." },
  { line: 1, start: 5.95, end: 13.5, text: "I'm a French entrepreneur. With my company, AG Algo Lab, I build SaaS products. So I build this, this, this, this, and also this." },
  { line: 2, start: 13.5, end: 22.35, text: "I'm also a student in the second year of master's degree at University Paris-Dauphine. I'm an ambassador, by the way, for my university." },
  { line: 3, start: 49.86, end: 61.65, text: "I'm also a chess player, and in chess, resources are limited. And in Tunisia, the resource that is limited for farmers, for agriculture, is water. This is why I decided to create Sakia." },
  { line: 4, start: 71.6, end: 75.62, text: "A friend's family decided to stop farming because water got too expensive." },
  // (« The water is very unfair » retiré : il ne le précise pas, et les agriculteurs décident de leur irrigation — Anthony)
  { line: 5, start: 117.55, end: 124.08, text: "As soon as the hackathon started, I decided to call her, and she gave me all the information about the current situation here in Tunis." },
  { line: 6, start: 215.58, end: 229.05, text: "My grandfather was also a farmer, and wherever he is right now, I'm pretty sure he would be really proud of me if I'm just trying to help farming industry. Because I know that he cared a lot about this." },
];

// où Anthony pointe du doigt pendant « So I build this, this, this, this, and also this » (instants dans la vidéo source,
// relevés image par image) : en haut à droite, en bas à droite, en bas à gauche, puis en haut à gauche et au milieu presque
// ensemble. Un projet surgit à chaque endroit montré.
export const POINTS = [
  { t: 11.3, pos: "tr" },
  { t: 11.75, pos: "br" },
  { t: 12.15, pos: "bl" },
  { t: 12.45, pos: "tl" },
  { t: 12.62, pos: "c" },
];

// le son nettoyé du vent par ElevenLabs (scripts/video/isolate-voice.mjs), même ligne de temps que la vidéo
export const VOICE = "videos/build/takes/team.voice.mp3";

if (process.argv[1]?.endsWith("team-recorded.mjs")) {
  const scribe = JSON.parse(readFileSync("videos/build/takes/team.scribe.json", "utf8"));
  const words = (Array.isArray(scribe) ? scribe : scribe.words).filter((w) => w.type !== "spacing");
  writeFileSync(
    "videos/build/takes/team.json",
    JSON.stringify({ file: "C:/Users/antho/Downloads/video.mp4", words, takes: TAKES.map((t) => ({ ...t, score: 0.95 })) }, null, 1),
  );
  console.log(`prises : ${TAKES.length}, ${TAKES.reduce((s, t) => s + t.end - t.start, 0).toFixed(1)} s de parole`);
}
