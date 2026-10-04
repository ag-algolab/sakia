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
  "Speaking is optional. Rules find the crop and the place.",
  "A fixed FAO-56 water balance turns the forecast into advice, even in the browser. A Tunisian-accented voice reads it.",
  "It's small: twenty times lighter than the national weather site, which did not even open on 2G. And it works offline.",
  "Open weather data, checked against Tunisian stations: within five percent. Twenty-four governorates, eighteen crops.",
  // « CatBoost » ne parle à personne : on dit d'abord ce que c'est (décision d'Anthony)
  "We also tested a small machine-learning model on satellite data: a modest gain, a failure in the Sahel. Both published.",
  "The numbers can't hallucinate. When Sakia isn't sure, it says so, and a person decides.",
  // voix de synthèse : jamais « by me » dans la bouche d'un narrateur qui n'est pas Anthony ; les outils nommés (décision d'Anthony)
  "Built during the hackathon by Anthony, with Claude Code, on Vercel and Supabase.",
];
const TAKES = "videos/build/takes/tech-vo.json";
const voRaw = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : null;
const vo = voRaw && voRaw.takes?.length === VO_LINES.length && voRaw.takes.every((t, i) => t.text === VO_LINES[i]) ? voRaw : null;
if (voRaw && !vo) console.log("voix off d'une ancienne version du texte : ignorée (relancer tts-vo.mjs tech)");
const voDur = VO_LINES.map((line, i) => {
  const tk = vo?.takes?.find((t) => t.line === i && t.start != null);
  return tk ? tk.end - tk.start : line.split(/\s+/).length / 2.5 + 0.3;
});

// chapitres : morceau du film (début, image stable, fin disponible), phrases de la voix off, durée minimale
const CHAPTERS = [
  // intro et étapes : le film peut être un peu accéléré (≤ ×1,25) pour atteindre son image stable à la fin du chapitre
  { id: "intro", film: [0.0, 6.8, 8.0], lines: [0], min: 5.6 },
  { id: "steps", film: [8.0, 25.6, 27.0], lines: [1, 2], min: 13.5 },
  { id: "small", film: [27.0, 35.9, 37.0], lines: [3], min: 8.6 },
  // à la place du chapitre « stack and limits » du film : données vérifiées sur le terrain et passage à l'échelle (barème :
  // « data grounding » 15 %, « scalability » 10 %)
  { id: "grounded", lines: [4], min: 8.6 },
  { id: "lab", lab: true, lines: [5], min: 7.0 },
  // à la place du dernier chapitre du film : les garde-fous (cartes assez grandes pour leur texte) puis les outils, avec leurs logos
  { id: "safe", lines: [6], min: 6.5 },
  { id: "credits", lines: [7], min: 5.5 },
];
const LEAD = 0.35; // silence en tête de chapitre, avant sa première phrase
function layout(tempo) {
  let t = 0;
  const out = [];
  for (const c of CHAPTERS) {
    const speech = c.lines.reduce((s, i) => s + voDur[i] / tempo + 0.3, LEAD);
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
  let t = c.at + LEAD;
  for (const i of c.lines) {
    VO_AT[i] = t;
    t += voDur[i] / tempo + 0.3;
  }
}

const PERF = JSON.parse(readFileSync("scripts/perf-results-2026-10-04.json", "utf8")).results;
const pf = (site, profile) => PERF.find((r) => r.site === site && r.profile === profile);
const SITES = [["sakia", "Sakia"], ["yrno", "yr.no"], ["meteoblue", "meteoblue"], ["meteotn", "National weather site (meteo.tn)"]];
const MAXKB = Math.max(...SITES.map(([id]) => pf(id, "3G").cold.kb));
const SMALL = ch.small;
const ratio = Math.floor(pf("meteotn", "3G").cold.kb / pf("sakia", "3G").cold.kb);
// un chapitre du film ; xfade : fondu enchaîné depuis le chapitre précédent (le film saute sa propre transition)
const filmSeg = (c, xfade) => {
  const rate = Math.min(1.3, Math.max(1, (c.film[1] - c.film[0]) / c.len));
  return { at: c.at, media: "film", from: c.film[0], to: Math.min(c.film[2], c.film[0] + c.len * rate), rate, xfade };
};
const LAB = ch.lab;
const GR = ch.grounded;
const grAt = (k) => (LEAD + k * voDur[4] / tempo).toFixed(2); // instant (dans la scène) d'un mot de la phrase 4, à proportion
const SAFE = ch.safe, CRED = ch.credits;

// garde-fous : mêmes textes que le film /story/tech, dans des cartes à leur taille
const ICON = {
  list: `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
  warn: `<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>`,
  hand: `<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`,
};
const SAFE_CARDS = [
  ["list", "Fixed sentences", "Replies come from a fixed list, with the numbers filled in."],
  ["warn", "Not sure? It says so", "Weather older than 12 h: not sure. Older than 48 h: no advice."],
  ["hand", "A person decides", "Indicative advice. A technician (CRDA) is always the fallback."],
  ["shield", "Little data", "A pseudonymous chat ID, the governorate and a few settings. No name, no phone number."],
];
// les outils, avec leur logo (icônes Simple Icons, CC0, copiées dans videos/assets/logos ; sans fichier : le nom seul)
const logo = (id, color) => {
  const f = `videos/assets/logos/${id}.svg`;
  return existsSync(f) ? readFileSync(f, "utf8").replace(/<title>[^<]*<\/title>/, "").replace("<svg ", `<svg fill="${color}" `) : "";
};
// (ils arrivent tous dès le titre, l'un après l'autre : la voix les nomme ensuite, ils ont le temps d'être vus)
const TOOLS = [
  ["claude", "#D97757", "Claude Code", "Coding"],
  ["vercel", "#FFFFFF", "Vercel", "Hosting"],
  ["supabase", "#3FCF8E", "Supabase", "Database"],
  ["elevenlabs", "#FFFFFF", "ElevenLabs", "Voices"],
  [null, "", "Open-Meteo", "Weather"],
  ["telegram", "#26A5E4", "Telegram", "Bot"],
];

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
    .opt{position:absolute;left:368px;top:254px;padding:8px 16px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 22px Geist,sans-serif;letter-spacing:.08em;box-shadow:0 8px 20px rgba(0,0,0,.35)}
    .cmp-title{position:absolute;left:96px;top:96px;font:900 76px/1.05 Fraunces,serif;color:#fff}
    .cmp-rows{position:absolute;left:96px;top:250px;width:1728px;display:flex;flex-direction:column;gap:22px}
    .cmp-row{display:grid;grid-template-columns:430px 1fr;align-items:center;gap:24px}
    .cmp-row .n{font:700 30px Geist,sans-serif;color:#d6e6d2;text-align:right}
    .cmp-row .barwrap{display:flex;align-items:center;gap:16px}.cmp-row .bar{display:block;height:46px;border-radius:12px;background:#5d6f64}.cmp-row .kb{font:800 28px Geist,sans-serif;color:#fff;white-space:nowrap}
    .cmp-row.me .n{color:#fff;font-weight:900}.cmp-row.me .bar{background:#2f9a5a}.cmp-row.me .kb{color:#7ad48f}
    .cmp-row.bad .bar{background:#c2410c}
    .cmp-chips{position:absolute;left:96px;top:640px;display:flex;flex-direction:column;gap:18px}
    .cmp-chips span{display:inline-block;align-self:flex-start;padding:14px 26px;border-radius:20px;background:rgba(255,255,255,.95);color:#14231a;font:800 36px Geist,sans-serif;box-shadow:0 14px 32px rgba(0,0,0,.35)}
    .cmp-chips span b{color:#2f7d4a}.cmp-chips span.bad b{color:#c2410c}
    .cmp-note{position:absolute;left:96px;top:1000px;font:500 22px Geist,sans-serif;color:rgba(244,239,230,.7)}
    .gr-cards{position:absolute;left:96px;top:270px;display:flex;gap:36px}
    .gr-card{width:780px;padding:34px 40px;border-radius:28px;background:rgba(255,255,255,.95);color:#14231a;box-shadow:0 18px 40px rgba(0,0,0,.35);box-sizing:border-box}
    .gr-card b{display:block;font:900 100px/1 Fraunces,serif;color:#2f7d4a}
    .gr-card span{display:block;margin-top:16px;font:700 32px/1.3 Geist,sans-serif}
    .gr-scale{position:absolute;left:96px;top:660px;display:flex;gap:22px}
    .gr-scale span{display:inline-flex;align-items:center;gap:12px;padding:16px 28px;border-radius:20px;background:#f2b33d;color:#2a1d05;font:800 42px Geist,sans-serif;box-shadow:0 14px 32px rgba(0,0,0,.35)}
    .sf-cards{position:absolute;left:96px;top:250px;width:1728px;display:grid;grid-template-columns:repeat(4,1fr);gap:28px}
    .sf-card{padding:34px 32px 38px;border-radius:26px;border:2px solid rgba(244,239,230,.55);background:rgba(255,255,255,.05);box-sizing:border-box;min-height:440px}
    .sf-card svg{width:58px;height:58px;stroke:#f2b33d;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .sf-card b{display:block;margin-top:22px;font:900 44px/1.1 Fraunces,serif;color:#fff}
    .sf-card span{display:block;margin-top:18px;font:600 30px/1.35 Geist,sans-serif;color:#d6e6d2}
    .cr-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .cr-wheel{width:110px;height:110px;color:#f4efe6}.cr-wheel svg{width:100%;height:100%}
    .cr-title{font:900 64px/1.15 Fraunces,serif;color:#fff;margin-top:22px}.cr-title em{font-style:normal;color:#f2b33d}
    .cr-logos{display:flex;gap:22px;margin-top:54px}
    .cr-logos span{display:flex;flex-direction:column;align-items:center;gap:12px;width:220px;padding:26px 10px 22px;border-radius:24px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)}
    .cr-logos span svg{width:64px;height:64px}
    .cr-logos span i{font-style:normal;font-size:56px;line-height:64px}
    .cr-logos span b{font:800 30px Geist,sans-serif;color:#fff}
    .cr-logos span small{font:600 22px Geist,sans-serif;color:#9fb5a5;letter-spacing:.04em}
    .cr-url{font:700 28px Geist,sans-serif;color:#d6e6d2;margin-top:46px}
  `,
  media: { film: { file: FILM } },
  layers: [
    // ------------------------------------------------ le film technique, chapitres 1 et 2 (fondu enchaîné entre les deux)
    { type: "video", start: 0, end: SMALL.at + 0.4, fadeIn: 0.001, fadeOut: 0.01, x: 0, y: 0, w: 1920, h: 1080, segments: [filmSeg(ch.intro), filmSeg(ch.steps, 0.6)] },

    // ------------------------------------------------ « parler » est facultatif : étiquette sur l'étape 1 du film
    { type: "html", start: ch.steps.at + 2.2, end: ch.steps.at + ch.steps.len - 0.1, fx: "none", fadeOut: 0.2, html: `<div class="opt" data-at="0" data-fx="pop" data-rot="6">OPTIONAL</div>` },

    // ------------------------------------------------ petit : comparaison mesurée avec les sites qui existent (page /speed)
    {
      type: "html", start: SMALL.at, end: SMALL.at + SMALL.len + 0.1, fadeIn: 0.3, fadeOut: 0.3, fx: "none",
      html: `<div class="bg-tech"></div><div class="lab-kicker">FIRST VISIT, THROTTLED 3G · MEASURED 4 OCTOBER 2026</div><div class="cmp-title" data-at="0.1">Small enough for a weak connection</div><div class="cmp-rows">${SITES.map(([id, name], i) => { const kb = pf(id, "3G").cold.kb; const w = Math.max(8, Math.round((kb / MAXKB) * 1150)); return `<div class="cmp-row${id === "sakia" ? " me" : id === "meteotn" ? " bad" : ""}"><span class="n">${name}</span><span class="barwrap"><span class="bar" data-at="${(0.5 + i * 0.35).toFixed(2)}" data-fx="grow" style="width:${w}px"></span><span class="kb" data-at="${(0.9 + i * 0.35).toFixed(2)}">${kb.toLocaleString("en-GB")} KB</span></span></div>`; }).join("")}</div><div class="cmp-chips"><span data-at="2.4" data-fx="pop" data-rot="-4"><b>${ratio}× lighter</b> than the national weather site</span><span class="bad" data-at="3.6" data-fx="pop" data-rot="3">On 2G: Sakia opens in <b>${Math.round(pf("sakia", "2G").cold.loadSeconds)} s</b>, the national site <b>never opened</b> (150 s)</span><span data-at="4.8" data-fx="pop" data-rot="-3">No network at all: <b>only Sakia still works</b></span></div><div class="cmp-note">One run per site, real browser, processor slowed 4×. Method and raw results: sakia-opal.vercel.app/speed</div>`,
    },

    // ------------------------------------------------ données vérifiées sur le terrain, et passage à l'échelle (chiffres : page /about, section D)
    {
      type: "html", start: GR.at, end: GR.at + GR.len + 0.1, fadeIn: 0.3, fadeOut: 0.3, fx: "none",
      html: `<div class="bg-tech"></div><div class="lab-kicker">OPEN DATA · CHECKED AGAINST TUNISIAN STATIONS</div><div class="cmp-title" data-at="0.1">Grounded, and ready to scale</div><div class="gr-cards"><div class="gr-card" data-at="${grAt(0.12)}" data-fx="pop" data-rot="-4"><b>within 5 %</b><span>evapotranspiration, against two Tunisian stations</span></div><div class="gr-card" data-at="${grAt(0.3)}" data-fx="pop" data-rot="3"><b>0.6 °C</b><span>temperature bias at Kairouan, over 1,664 days</span></div></div><div class="gr-scale"><span data-at="${grAt(0.66)}" data-fx="pop" data-rot="-5">🗺️ 24 governorates</span><span data-at="${grAt(0.84)}" data-fx="pop" data-rot="4">🌱 18 crops</span></div><div class="cmp-note">Our own analysis, 3 October 2026: Open-Meteo against DGACTA and NOAA stations. Details: sakia-opal.vercel.app/about</div>`,
    },

    // ------------------------------------------------ la page Lab, filmée sur le vrai site
    { type: "html", start: LAB.at, end: LAB.at + LAB.len + 0.2, fadeIn: 0.25, fadeOut: 0.25, fx: "none", html: `<div class="bg-tech"></div><div class="lab-kicker">RESEARCH · SHADOW MODE · DOES NOT CHANGE THE ADVICE</div>` },
    { type: "caption", start: LAB.at + 0.15, end: LAB.at + LAB.len * 0.5, x: 96, y: 100, w: 1700, size: 54, text: "A __43 KB machine-learning model__ (CatBoost), trained on free satellite data, runs in your browser.", stagger: 0.05 },
    { type: "caption", start: LAB.at + LAB.len * 0.5 + 0.1, end: LAB.at + LAB.len, x: 96, y: 100, w: 1700, size: 54, text: "A modest gain over a calendar. A __failure in the Sahel.__ Both published.", stagger: 0.05 },
    { type: "html", start: LAB.at + 0.1, end: LAB.at + LAB.len, fadeIn: 0.3, fx: "none", html: `<div class="browser-bar"><i></i><i></i><i></i><span>sakia-opal.vercel.app/lab</span></div>` },
    {
      type: "phone", desktop: true, start: LAB.at + 0.1, end: LAB.at + LAB.len, fadeIn: 0.3, fadeOut: 0.2, x: 960, y: 650, scale: 0.94, taps: false,
      segments: [
        { at: LAB.at + 0.1, clip: "lab", from: 3.6, to: 3.6 + LAB.len * 0.5 },
        { at: LAB.at + LAB.len * 0.5 + 0.1, clip: "lab", from: 15.0, to: 15.0 + LAB.len * 0.5, xfade: 0.3 },
      ],
    },

    // ------------------------------------------------ les garde-fous : une personne reste aux commandes
    {
      type: "html", start: SAFE.at, end: SAFE.at + SAFE.len + 0.1, fadeIn: 0.3, fadeOut: 0.3, fx: "none",
      html: `<div class="bg-tech"></div><div class="lab-kicker">RESPONSIBLE BY DESIGN</div><div class="cmp-title" data-at="0.1">Built so a person stays in charge</div><div class="sf-cards">${SAFE_CARDS.map(([ic, title, text], i) => `<div class="sf-card" data-at="${(0.5 + i * 0.45).toFixed(2)}" data-fx="pop" data-rot="${i % 2 ? 3 : -3}"><svg viewBox="0 0 24 24">${ICON[ic]}</svg><b>${title}</b><span>${text}</span></div>`).join("")}</div>`,
    },

    // ------------------------------------------------ fait pendant le hackathon : les outils, avec leurs logos
    {
      type: "html", start: CRED.at, end: L.total + 0.2, fadeIn: 0.3, fadeOut: 0.01, fx: "zoom",
      html: `<div class="bg-tech"></div><div class="cr-wrap"><div class="cr-wheel" data-at="0">{{WHEEL}}</div><div class="cr-title" data-at="0.15">Built during the hackathon by Anthony,<br>with <em>Claude Code</em></div><div class="cr-logos">${TOOLS.map(([id, color, name, role], i) => `<span data-at="${(0.8 + i * 0.28).toFixed(2)}" data-fx="pop" data-rot="-4">${id ? logo(id, color) : "<i>⛅</i>"}<b>${name}</b><small>${role}</small></span>`).join("")}</div><div class="cr-url" data-at="2.6">sakia-opal.vercel.app · github.com/ag-algolab/sakia</div></div>`,
    },
    ...(vo?.synthetic ? [{ type: "note", start: CRED.at + 0.5, end: L.total + 0.2, x: 96, y: 1030, w: 1700, text: "Narration: synthetic voice (ElevenLabs)." }] : []),
  ],
  // musique d'ElevenLabs (darbouka, oud) à −13 LUFS, voix off à −20 : audible sous la voix, ≈ 13 dB dessous
  music: { file: ["videos/build/music-tunis.mp3", "videos/build/music-cine-5.wav"].find(existsSync), gain: vo ? -14 : -12, duckGain: -7, fadeIn: 1.0, fadeOut: 2.5, duck: vo ? VO_AT.map((at, i) => ({ from: at - 0.1, to: at + voDur[i] / tempo + 0.1 })) : [] },
  audio: vo
    ? vo.takes
        .filter((t) => t.start != null)
        .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.05, rate: tempo !== 1 ? tempo : undefined, filter: vo.synthetic ? undefined : "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" }))
    : [],
};
console.log(`technique : ${L.total.toFixed(1)} s (${vo ? `voix off ${vo.synthetic ? "de synthèse" : "d'Anthony"}, tempo ${tempo}` : "sans voix off"})`);
