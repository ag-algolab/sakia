// Pose la voix off d'Anthony sur une vidéo, en une commande : trouve la meilleure prise de chaque phrase du prompteur
// (takes.mjs), recale la partition sur ses durées, puis refait la vidéo.
// Lancer : node --env-file=.env.local scripts/video/vo.mjs <demo|tech> <enregistrement> [--no-render]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const [which, rec] = process.argv.slice(2);
if (!["demo", "tech"].includes(which) || !rec) throw new Error("usage : node --env-file=.env.local scripts/video/vo.mjs <demo|tech> <enregistrement> [--no-render]");
const specPath = path.resolve(`scripts/video/specs/${which}.mjs`);
const { VO_LINES } = await import(pathToFileURL(specPath).href);
mkdirSync("videos/build/takes", { recursive: true });
const linesFile = `videos/build/takes/${which}-vo-lines.json`;
writeFileSync(linesFile, JSON.stringify(VO_LINES));
execFileSync("node", ["scripts/video/takes.mjs", rec, linesFile, `videos/build/takes/${which}-vo.json`], { stdio: "inherit", env: process.env });
if (!process.argv.includes("--no-render")) execFileSync("node", ["scripts/video/compose.mjs", specPath], { stdio: "inherit" });
