// Trouve, dans un enregistrement d'Anthony (vidéo face caméra ou voix off), la meilleure prise de chaque phrase du texte :
// transcription mot à mot (ElevenLabs Scribe), puis pour chaque phrase attendue la DERNIÈRE prise complète (on refait une
// phrase quand la précédente était ratée). Les « euh » et faux départs restent hors des morceaux gardés.
// Lancer : node --env-file=.env.local scripts/video/takes.mjs <fichier vidéo ou audio> <texte.json> [sortie.json]
//   texte.json : ["phrase 1", "phrase 2", ...] (ou { lines: [...] })
// Sortie : { file, words, takes: [{ line, text, start, end, score }] } — instants en secondes dans le fichier source.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const [src, linesPath, outArg] = process.argv.slice(2);
if (!src || !linesPath) throw new Error("usage : node --env-file=.env.local scripts/video/takes.mjs <fichier> <texte.json> [sortie.json]");
const raw = JSON.parse(readFileSync(linesPath, "utf8"));
const LINES = Array.isArray(raw) ? raw : raw.lines;
const out = outArg ?? path.join("videos/build/takes", `${path.basename(src).replace(/\.[^.]+$/, "")}.json`);
mkdirSync(path.dirname(out), { recursive: true });

// 1. transcription (gardée à côté : on ne paie qu'une fois par fichier)
const cache = out.replace(/\.json$/, ".scribe.json");
let words;
if (existsSync(cache)) words = JSON.parse(readFileSync(cache, "utf8"));
else {
  const key = process.env.KEY_ELEVENLABS;
  if (!key) throw new Error("KEY_ELEVENLABS absente (lancer avec --env-file=.env.local)");
  const wav = out.replace(/\.json$/, ".16k.wav");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", src, "-vn", "-ac", "1", "-ar", "16000", wav]);
  const fd = new FormData();
  fd.append("model_id", "scribe_v1");
  fd.append("language_code", "en");
  fd.append("timestamps_granularity", "word");
  fd.append("tag_audio_events", "false");
  fd.append("file", new Blob([readFileSync(wav)], { type: "audio/wav" }), "take.wav");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": key }, body: fd, signal: AbortSignal.timeout(180000) });
  if (!res.ok) throw new Error(`Scribe HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = await res.json();
  words = (j.words ?? []).filter((w) => w.type === "word").map((w) => ({ text: w.text, start: w.start, end: w.end }));
  writeFileSync(cache, JSON.stringify(words));
}

// 2. pour chaque phrase : meilleure fenêtre de mots qui la reproduit (alignement souple), en préférant la dernière
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const FILLER = /^(uh|um|uhm|er|erm|eh|euh|hmm|mm|hm|ah)$/;
const W = words.map((w) => ({ ...w, n: norm(w.text) })).filter((w) => w.n && !FILLER.test(w.n));

function lcs(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  return dp[a.length][b.length];
}

const takes = LINES.map((line, li) => {
  const target = norm(line).split(" ");
  const n = target.length;
  let best = null;
  for (let i = 0; i < W.length; i++) {
    if (W[i].n !== target[0] && W[i].n !== target[1]) continue; // une prise commence par le premier ou le deuxième mot
    for (let len = Math.max(1, n - 3); len <= n + 3 && i + len <= W.length; len++) {
      const win = W.slice(i, i + len).map((w) => w.n);
      const common = lcs(win, target);
      const score = (2 * common) / (win.length + n); // 1 = identique
      // à score presque égal, la prise la plus tardive gagne (la reprise d'une phrase ratée)
      if (!best || score > best.score + 0.02 || (score >= best.score - 0.02 && i > best.i)) best = { i, len, score };
    }
  }
  if (!best || best.score < 0.6) return { line: li, text: line, start: null, end: null, score: best?.score ?? 0 };
  const first = W[best.i], last = W[best.i + best.len - 1];
  return { line: li, text: line, start: Math.max(0, first.start - 0.12), end: last.end + 0.18, score: Math.round(best.score * 100) / 100, heard: W.slice(best.i, best.i + best.len).map((w) => w.text).join(" ") };
});

writeFileSync(out, JSON.stringify({ file: path.resolve(src), words, takes }, null, 1));
for (const t of takes) console.log(`${String(t.line + 1).padStart(2)}. ${t.start == null ? "INTROUVABLE" : `${t.start.toFixed(2)}–${t.end.toFixed(2)} s  (accord ${t.score})`}  ${t.text.slice(0, 70)}`);
console.log(`→ ${out}`);
