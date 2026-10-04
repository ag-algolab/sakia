// Partition de la vidéo « Technical walkthrough » (≤ 60 s) : le film technique /story/tech (chapitres raccourcis à leur
// image stable) + la page /lab filmée en vrai (le petit modèle appris, ses résultats modestes et son échec publié).
// Se CALE SUR LA VOIX OFF d'Anthony si elle existe (videos/build/takes/tech-vo.json, trouvée par takes.mjs) : un chapitre dure
// au moins le temps de ses phrases (l'image stable du film est tenue plus longtemps), et la voix est accélérée au plus de 10 %
// si le total dépasse 59,5 s.
// Rendu : node scripts/video/compose.mjs scripts/video/specs/tech.mjs
// Film source : C:/Users/antho/Videos/sakia-film/tech-00-full-57s.mp4 (scripts/story-export.ts --tech), chapitres TECH_CUTS
// [0, 8, 27, 37, 47, 57], images stables TECH_SETTLED [6.5, 25, 35.5, 45.5, 55.5].
import { existsSync, readFileSync } from "node:fs";

const FILM = "C:/Users/antho/Videos/sakia-film/tech-00-full-57s.mp4";
const MAXLEN = 59.5;

export const VO_LINES = [
  "Under the hood: a farmer speaks, and a fixed calculation answers.",
  "Speech recognition lets Noor talk instead of type. Rules find the crop and the place.",
  "A fixed FAO-56 water balance, on the weather forecast, computes the advice, even inside the browser. A Tunisian-accented voice reads it.",
  "It's small: under 400 kilobytes on a first visit, and it works offline.",
  "Open-Meteo weather, FAO-56, ElevenLabs voices. The limits: no field trial yet.",
  "We also tested a small model on satellite data: a modest gain, a failure in the Sahel. Both published.",
  "The numbers can't hallucinate. And when Sakia isn't sure, it says so.",
  // voix de synthèse : jamais « by me » dans la bouche d'un narrateur qui n'est pas Anthony
  "Built this weekend by Anthony, with an AI coding assistant.",
];
const TAKES = "videos/build/takes/tech-vo.json";
const vo = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : null;
const voDur = VO_LINES.map((line, i) => {
  const tk = vo?.takes?.find((t) => t.line === i && t.start != null);
  return tk ? tk.end - tk.start : line.split(/\s+/).length / 2.5 + 0.3;
});

// chapitres : morceau du film (début, image stable, fin disponible), phrases de la voix off, durée minimale
const CHAPTERS = [
  { id: "intro", film: [0.0, 6.8, 8.0], lines: [0], min: 6.5 },
  { id: "steps", film: [8.0, 25.6, 27.0], lines: [1, 2], min: 17.0 },
  { id: "small", film: [27.0, 35.9, 37.0], lines: [3], min: 8.6 },
  { id: "stack", film: [37.0, 45.9, 47.0], lines: [4], min: 8.6 },
  { id: "lab", lab: true, lines: [5], min: 7.0 },
  { id: "safe", film: [47.0, 56.6, 57.0], lines: [6, 7], min: 8.6 },
];
function layout(tempo) {
  let t = 0;
  const out = [];
  for (const c of CHAPTERS) {
    const speech = c.lines.reduce((s, i) => s + voDur[i] / tempo + 0.3, 0.5);
    const len = Math.max(c.min, vo ? speech : 0);
    out.push({ ...c, at: t, len });
    t += len;
  }
  return { ch: out, total: t };
}
let tempo = 1;
let L = layout(tempo);
while (L.total > MAXLEN && tempo < 1.1) {
  tempo = Math.round((tempo + 0.02) * 100) / 100;
  L = layout(tempo);
}
if (L.total > MAXLEN) console.log(`ATTENTION : la vidéo technique dure ${L.total.toFixed(1)} s : raccourcir une phrase de la voix off`);
const ch = Object.fromEntries(L.ch.map((c) => [c.id, c]));

// phrases de la voix off : posées au début de leur chapitre, l'une après l'autre
const VO_AT = [];
for (const c of L.ch) {
  let t = c.at + 0.5;
  for (const i of c.lines) {
    VO_AT[i] = t;
    t += voDur[i] / tempo + 0.3;
  }
}

const filmSeg = (c) => ({ at: c.at, media: "film", from: c.film[0], to: Math.min(c.film[2], c.film[0] + c.len) });
const LAB = ch.lab;

export default {
  name: "sakia-tech",
  fps: 30,
  duration: Math.round(Math.min(MAXLEN, L.total + 0.2) * 100) / 100,
  css: `
    .bg-tech{position:absolute;inset:0;background:linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(180deg, #0b1b14 0%, #10281d 55%, #183024 100%)}
    .lab-kicker{position:absolute;left:96px;top:58px;font:800 26px Geist,sans-serif;letter-spacing:.14em;color:#f2b33d}
    .browser-bar{position:absolute;left:${960 - 617}px;top:${650 - 353 - 34}px;width:1234px;height:34px;border-radius:14px 14px 0 0;background:#1d2420;display:flex;align-items:center;gap:8px;padding:0 16px;box-sizing:border-box}
    .browser-bar i{width:12px;height:12px;border-radius:50%;background:#3b4440;display:block}
    .browser-bar span{margin-left:14px;font:600 16px Geist,sans-serif;color:#9fb5a5}
  `,
  media: { film: { file: FILM } },
  layers: [
    // ------------------------------------------------ le film technique, chapitres 1 à 4
    { type: "video", start: 0, end: LAB.at + 0.25, fadeIn: 0.001, fadeOut: 0.25, x: 0, y: 0, w: 1920, h: 1080, segments: ["intro", "steps", "small", "stack"].map((id) => filmSeg(ch[id])) },

    // ------------------------------------------------ la page Lab, filmée sur le vrai site
    { type: "html", start: LAB.at, end: LAB.at + LAB.len + 0.2, fadeIn: 0.25, fadeOut: 0.25, fx: "none", html: `<div class="bg-tech"></div><div class="lab-kicker">RESEARCH · SHADOW MODE · DOES NOT CHANGE THE ADVICE</div>` },
    { type: "caption", start: LAB.at + 0.15, end: LAB.at + LAB.len * 0.5, x: 96, y: 100, w: 1700, size: 54, text: "A __43 KB__ CatBoost model, trained on free satellite data, runs in your browser.", stagger: 0.05 },
    { type: "caption", start: LAB.at + LAB.len * 0.5 + 0.1, end: LAB.at + LAB.len, x: 96, y: 100, w: 1700, size: 54, text: "A modest gain over a calendar. A __failure in the Sahel.__ Both published.", stagger: 0.05 },
    { type: "html", start: LAB.at + 0.1, end: LAB.at + LAB.len, fadeIn: 0.3, fx: "none", html: `<div class="browser-bar"><i></i><i></i><i></i><span>sakia-opal.vercel.app/lab</span></div>` },
    {
      type: "phone", desktop: true, start: LAB.at + 0.1, end: LAB.at + LAB.len, fadeIn: 0.3, fadeOut: 0.2, x: 960, y: 650, scale: 0.94, taps: false,
      segments: [
        { at: LAB.at + 0.1, clip: "lab", from: 3.6, to: 3.6 + LAB.len * 0.5 },
        { at: LAB.at + LAB.len * 0.5 + 0.1, clip: "lab", from: 15.0, to: 15.0 + LAB.len * 0.5, xfade: 0.3 },
      ],
    },

    // ------------------------------------------------ le film, dernier chapitre (une personne reste aux commandes)
    { type: "video", start: ch.safe.at, end: ch.safe.at + ch.safe.len + 0.2, fadeIn: 0.25, fadeOut: 0.6, x: 0, y: 0, w: 1920, h: 1080, segments: [filmSeg(ch.safe)] },
    ...(vo?.synthetic ? [{ type: "note", start: Math.max(0, L.total - 4.2), end: L.total + 0.2, x: 96, y: 1030, w: 1700, text: "Narration: synthetic voice (ElevenLabs)." }] : []),
  ],
  music: { file: "videos/build/music-11.wav", gain: vo ? -24 : -21, duckGain: -8, fadeIn: 1.5, fadeOut: 2.5, duck: vo ? VO_AT.map((at, i) => ({ from: at - 0.1, to: at + voDur[i] / tempo + 0.1 })) : [] },
  audio: vo
    ? vo.takes
        .filter((t) => t.start != null)
        .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.05, rate: tempo !== 1 ? tempo : undefined, filter: "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" }))
    : [],
};
console.log(`technique : ${L.total.toFixed(1)} s (${vo ? `voix off ${vo.synthetic ? "de synthèse" : "d'Anthony"}, tempo ${tempo}` : "sans voix off"})`);
