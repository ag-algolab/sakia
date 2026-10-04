// Assemble la vidéo Banque mondiale (2 à 5 min) à partir des vidéos déjà faites, avec des fondus d'une demi-seconde :
// équipe → énoncé « Because of Sakia… » → démo → technique → « localiser l'IA » (si filmé) → limites, suite, code.
// Lancer : node scripts/video/wb.mjs   (après compose.mjs de wb-cards, et des vidéos équipe, démo, technique)
// Sortie : videos/out/sakia-worldbank.mp4
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const OUT = "videos/out";
const XF = 0.5;
const parts = [
  { file: `${OUT}/sakia-team.mp4` },
  { file: `${OUT}/sakia-wb-cards.mp4`, from: 0, to: 30 },
  { file: `${OUT}/sakia-demo.mp4` },
  { file: `${OUT}/sakia-tech.mp4` },
  { file: `${OUT}/sakia-local.mp4`, optional: true },
  { file: `${OUT}/sakia-wb-cards.mp4`, from: 30, to: 46 },
].filter((p) => {
  if (existsSync(p.file)) return true;
  if (!p.optional) throw new Error(`manque : ${p.file}`);
  console.log(`(absent, sauté : ${p.file})`);
  return false;
});
const dur = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim());
const inputs = [];
const lens = [];
for (const p of parts) {
  if (p.from != null) inputs.push("-ss", String(p.from), "-t", String(p.to - p.from));
  inputs.push("-i", p.file);
  lens.push(p.from != null ? p.to - p.from : dur(p.file));
}
// chaîne de fondus : image (xfade) et son (acrossfade)
const f = [];
let v = "[0:v]", a = "[0:a]";
let acc = lens[0];
for (let i = 1; i < parts.length; i++) {
  const off = (acc - XF).toFixed(3);
  f.push(`${v}[${i}:v]xfade=transition=fade:duration=${XF}:offset=${off},format=yuv420p[v${i}]`);
  f.push(`${a}[${i}:a]acrossfade=d=${XF}[a${i}]`);
  v = `[v${i}]`;
  a = `[a${i}]`;
  acc += lens[i] - XF;
}
const out = `${OUT}/sakia-worldbank.mp4`;
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", f.join(";"), "-map", v, "-map", a, "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out], { stdio: "inherit" });
const total = dur(out);
console.log(`vidéo Banque mondiale : ${out} (${Math.floor(total / 60)} min ${Math.round(total % 60)} s)`);
if (total < 120 || total > 300) console.log("ATTENTION : la Banque mondiale demande entre 2 et 5 minutes");
