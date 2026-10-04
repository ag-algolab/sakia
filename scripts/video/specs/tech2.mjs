// Partition « Technical walkthrough », VERSION 2 (≤ 60 s) : la même voix off, les mêmes faits et les mêmes chiffres que
// tech.mjs, mais une mise en mouvement plus variée (Anthony, 4 oct. : la v1 « c'est toujours la même chose pendant une
// minute », même fond vert, mêmes cartes) : un fond qui change à chaque chapitre (vert nuit, sable, or, encre), de vrais
// téléphones qui montrent le vrai site, une course sur 2G, des compteurs qui montent, des transitions par balayage.
// Règles tenues : AUCUN zoom (ni avancée lente, ni téléphone qui grossit, ni scène qui entre en grandissant ; seuls de petits
// éléments « surgissent ») et AUCUNE image figée (fond qui tourne et ondule, lumière qui dérive, prises jouées jusqu'au bout).
// Rendu : node scripts/video/compose.mjs scripts/video/specs/tech2.mjs --port=9341  →  videos/out/sakia-tech-v2.mp4
// La v1 (scripts/video/specs/tech.mjs → videos/out/sakia-tech.mp4) reste intacte.
import { existsSync, readFileSync } from "node:fs";

const MAXLEN = 59.5;

// ---------------------------------------------------------------- la voix off : EXACTEMENT celle de tech.mjs (mêmes prises)
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

// mêmes chapitres, même calage que tech.mjs : la voix tombe exactement aux mêmes instants (tempo ≤ 1,1)
const CHAPTERS = [
  { id: "intro", lines: [0], min: 5.6 },
  { id: "steps", lines: [1, 2], min: 13.5 },
  { id: "small", lines: [3], min: 8.6 },
  { id: "grounded", lines: [4], min: 8.6 },
  { id: "lab", lines: [5], min: 7.0 },
  { id: "safe", lines: [6], min: 6.5 },
  { id: "credits", lines: [7], min: 5.5 },
];
const LEAD = 0.35;
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
if (L.total > MAXLEN) console.log(`ATTENTION : la vidéo technique v2 dure ${L.total.toFixed(1)} s : raccourcir une phrase de la voix off`);
const ch = Object.fromEntries(L.ch.map((c) => [c.id, c]));
const VO_AT = [];
for (const c of L.ch) {
  let t = c.at + LEAD;
  for (const i of c.lines) {
    VO_AT[i] = t;
    t += voDur[i] / tempo + 0.3;
  }
}
const DUR = Math.round(Math.min(MAXLEN, L.total + 0.2) * 100) / 100;

// ---------------------------------------------------------------- les groupes de mots dans la voix (mesurés sur les prises :
// silences à −35 dB), en secondes depuis le début de chaque prise ; ramenés à la durée réelle si la voix change
const TK = [5.04, 4.6, 9.0, 8.36, 8.28, 8.52, 7.0, 5.64];
const PHR = [
  [[0.0, 0.81], [1.45, 2.53], [2.76, 4.8]], // Under the hood: | a farmer speaks, | and a fixed calculation answers.
  [[0.1, 1.49], [2.13, 4.39]], // Speaking is optional. | Rules find the crop and the place.
  [[0.12, 4.91], [5.21, 6.13], [6.72, 8.76]], // A fixed FAO-56 … into advice, | even in the browser. | A Tunisian-accented voice reads it.
  [[0.11, 0.79], [1.29, 3.8], [4.06, 6.13], [6.65, 8.14]], // It's small: | twenty times lighter … | which did not even open on 2G. | And it works offline.
  [[0.13, 1.07], [1.51, 3.17], [3.7, 4.87], [5.44, 6.64], [7.04, 8.05]], // Open weather data, | checked … | within five percent. | Twenty-four governorates, | eighteen crops.
  [[0.09, 3.62], [4.15, 5.06], [5.48, 6.88], [7.51, 8.35]], // We also tested … data: | a modest gain, | a failure in the Sahel. | Both published.
  [[0.1, 1.62], [2.31, 3.76], [4.06, 4.85], [5.34, 6.75]], // The numbers can't hallucinate. | When Sakia isn't sure, | it says so, | and a person decides.
  [[0.1, 2.11], [2.44, 3.4], [3.67, 5.41]], // Built … by Anthony, | with Claude Code, | on Vercel and Supabase.
];
const vt = (i, s) => VO_AT[i] + (s / TK[i]) * (voDur[i] / tempo);
const P = (i, k) => vt(i, PHR[i][k][0]); // début d'un groupe de mots, dans la vidéo
const PE = (i, k) => vt(i, PHR[i][k][1]); // sa fin
const wordsAt = (text, t0, t1) => {
  const n = text.replace(/\*\*|__/g, "").split(/\s+/).filter(Boolean).length;
  return Array.from({ length: n }, (_, j) => +(t0 + ((t1 - t0) * j) / n).toFixed(3));
};
const f2 = (x) => x.toFixed(2);

// ---------------------------------------------------------------- chiffres mesurés (page /speed), comme tech.mjs
const PERF = JSON.parse(readFileSync("scripts/perf-results-2026-10-04.json", "utf8")).results;
const pf = (site, profile) => PERF.find((r) => r.site === site && r.profile === profile);
const SITES = [["sakia", "Sakia"], ["yrno", "yr.no"], ["meteoblue", "meteoblue"], ["meteotn", "National weather site<small>(meteo.tn)</small>"]];
const MAXKB = Math.max(...SITES.map(([id]) => pf(id, "3G").cold.kb));
const ratio = Math.floor(pf("meteotn", "3G").cold.kb / pf("sakia", "3G").cold.kb);
const SAKIA_2G = Math.round(pf("sakia", "2G").cold.loadSeconds); // 13 s
const NAT_2G = pf("meteotn", "2G").cold; // jamais ouvert : délai de 150 s dépassé
const NAT_TIMEOUT = Math.round(NAT_2G.loadSeconds);
if (NAT_2G.loaded) console.log("ATTENTION : le site national s'est ouvert sur 2G dans les mesures : revoir la course");
if (!pf("sakia", "3G").offline.works || pf("meteotn", "3G").offline.works) console.log("ATTENTION : mesure hors ligne changée : revoir « only Sakia still works »");

// ---------------------------------------------------------------- outils
const FPS = 30;
const q = (t) => (Math.round(t * FPS) + 0.5) / FPS; // un instant entre deux images : un changement ne tombe jamais SUR une image
const eo = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);
// une valeur qui change (compteur, chronomètre) : une petite couche par valeur, montrée seulement pendant sa tranche de temps
function ticker(steps, end, html) {
  const m = new Map();
  for (const [t, v] of steps) m.set(q(t), v);
  const s = [...m.entries()].sort((a, b) => a[0] - b[0]);
  return s.map(([t, v], i) => {
    const last = i === s.length - 1;
    return { type: "html", start: t, end: last ? end : s[i + 1][0], fadeIn: 0.001, fadeOut: last ? 0.2 : 0.001, fx: "none", html: html(v, last) };
  });
}
// de 0 à n en `dur` secondes, au rythme d'une barre qui pousse (15 valeurs par seconde)
const countUp = (n, t0, dur) => {
  const N = Math.max(1, Math.round(dur * 15));
  return Array.from({ length: N + 1 }, (_, f) => [t0 + (f / N) * dur, Math.round(n * eo(f / N))]);
};
// une prise du vrai site jouée en morceaux contigus [de, à, jusqu'à] : elle bouge tout le temps, le dernier morceau finit
// avec la couche (jamais d'image tenue)
const seq = (clip, start, pieces) => {
  let at = start;
  return pieces.map(([from, to, until], i) => {
    const s = { at: +at.toFixed(3), clip, from, to, rate: +((to - from) / (until - at)).toFixed(4), ...(i ? { xfade: 0.01 } : {}) };
    at = until;
    return s;
  });
};
// transition : une bande de couleur balaie l'écran, le nouveau fond juste derrière (gauche → droite, en biais, ou du haut)
const COVER = 1.15; // une scène est entièrement recouverte 1,15 s après le début du balayage suivant
const BG_IN = 0.75;
const WIPE_END = 1.45;
const SHOW = 0.45; // le contenu d'une scène n'apparaît qu'une fois l'ancienne recouverte par la bande de couleur
const wipe = (start, lead, bg, dir = "") => ({
  type: "html", start, end: start + WIPE_END, fadeIn: 0.001, fadeOut: 0.001, fx: "none",
  html: `<div class="wp ${dir || "h"}"><div class="wp-in" style="background:${lead}" data-at="0" data-fx="grow"></div><div class="wp-in" style="background:${bg}" data-at="0.2" data-fx="grow"></div></div>`,
});
const backdrop = (style, start, end) => ({ type: "bg", style, start, end, fadeIn: 0.3, fadeOut: 0.001 });
// sur le sable, un semis de points qui glisse lentement : la scène vit même quand la prise du site est immobile
const dots = (start, end) => ({ type: "html", start, end, fadeIn: 0.3, fadeOut: 0.001, fx: "none", html: `<div class="dots" data-drift="22"></div>` });

// fonds et couleurs
const GOLD = "#f2b33d";
const SAND = "#f4efe6";
const DARK_BG = "radial-gradient(1400px 900px at 70% 40%, #1d4a33 0%, #11301f 50%, #0a1a12 100%)";
const NIGHT_BG = "radial-gradient(1500px 1000px at 30% 30%, #1a3326 0%, #0f2018 50%, #070f0b 100%)";
const SAND_BG = "radial-gradient(1500px 950px at 28% 22%, #fdfaf3 0%, #f4efe6 48%, #e8dcc2 100%)";
const GOLD_BG = "radial-gradient(1500px 950px at 38% 30%, #f9d27a 0%, #f2b33d 50%, #dc951f 100%)";
const INK_BG = "radial-gradient(1500px 950px at 72% 36%, #1c3d57 0%, #11273b 52%, #08131e 100%)";

// icônes (traits, 24 × 24)
const IC = {
  mic: `<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
  calc: `<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h.01M12 19h.01M16 19h.01"/>`,
  speaker: `<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>`,
  check: `<path d="M20 6 9 17l-5-5"/>`,
  x: `<path d="M18 6 6 18M6 6l12 12"/>`,
  map: `<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>`,
  sprout: `<path d="M12 21v-9"/><path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6z"/><path d="M12 10c0-3 2.5-5 6-5 0 3.5-2.5 5-6 5z"/>`,
  cloud: `<path d="M17.5 19H8a5 5 0 1 1 1.2-9.86A6 6 0 0 1 20 11.5a3.75 3.75 0 0 1-2.5 7.5z"/>`,
  tower: `<path d="M12 10v12M8 22h8"/><circle cx="12" cy="8" r="2"/><path d="M7.8 4.2a6 6 0 0 0 0 7.6M16.2 4.2a6 6 0 0 1 0 7.6M5 2a10 10 0 0 0 0 12M19 2a10 10 0 0 1 0 12"/>`,
  wifiOff: `<path d="m2 2 20 20"/><path d="M8.5 16.5a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 4.2-2.6M10.7 5.1A15 15 0 0 1 22 8.8M5 12.9a10 10 0 0 1 5.2-2.8M17.2 11.3a10 10 0 0 1 1.8 1.6M12 20h.01"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  plane: `<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>`,
  // les garde-fous : mêmes icônes que tech.mjs
  list: `<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>`,
  warn: `<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>`,
  hand: `<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-6-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>`,
  shield: `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>`,
};
const svg = (name, extra = "") => `<svg class="ic" viewBox="0 0 24 24"${extra}>${IC[name]}</svg>`;
// barre d'état d'un téléphone dessiné (mêmes icônes que les vrais téléphones du montage, à l'échelle 0,7)
const SB_SIGNAL = `<svg viewBox="0 0 18 12" width="13" height="9"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg>`;
const SB_WIFI = `<svg viewBox="0 0 16 12" width="12" height="9"><path fill="#fff" d="M8 11.5 5.6 9a3.4 3.4 0 0 1 4.8 0zM3.4 6.8a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0zM1.2 4.6a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0z"/></svg>`;
const SB_PLANE = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="#fff" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>`;
const SB_BAT = `<svg viewBox="0 0 27 13" width="19" height="9"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".45"/><rect x="2.5" y="2.5" width="16" height="8" rx="2" fill="#fff"/><path d="M24.5 4.5v4a2 2 0 0 0 0-4z" fill="#fff" fill-opacity=".45"/></svg>`;

// les outils, avec leur logo (icônes Simple Icons, CC0, dans videos/assets/logos), sur des tuiles blanches
const logo = (id, color) => {
  const f = `videos/assets/logos/${id}.svg`;
  return existsSync(f) ? readFileSync(f, "utf8").replace(/<title>[^<]*<\/title>/, "").replace("<svg ", `<svg fill="${color}" `) : "";
};
const OPEN_METEO = `<svg viewBox="0 0 24 24"><circle cx="8.5" cy="8.5" r="4.5" fill="#f2b33d"/><path fill="#7fa8c9" d="M18 20H8.5a4.5 4.5 0 1 1 1.1-8.87A5.5 5.5 0 0 1 20 13a3.5 3.5 0 0 1-2 7z"/></svg>`;
const TOOLS = [
  ["claude", "#D97757", "Claude Code", "Coding"],
  ["vercel", "#000000", "Vercel", "Hosting"],
  ["supabase", "#3FCF8E", "Supabase", "Database"],
  ["elevenlabs", "#000000", "ElevenLabs", "Voices"],
  [null, "", "Open-Meteo", "Weather"],
  ["telegram", "#26A5E4", "Telegram", "Bot"],
];

// ---------------------------------------------------------------- les instants des scènes
const W = {
  steps: ch.steps.at - 0.15,
  small: ch.small.at + 0.12,
  race: P(3, 2) - 0.15, // « which did not even open on 2G »
  grounded: ch.grounded.at - 0.08,
  lab: ch.lab.at - 0.08,
  safe: ch.safe.at - 0.08,
  credits: ch.credits.at - 0.08,
};
const layers = [];

// ================================================================ 1. INTRO (vert nuit) : la phrase, mot à mot, et le chemin
// voix → calcul → conseil qui se dessine dessous
{
  const I1 = W.steps + COVER;
  const NY = 812;
  const NODES = [
    [330, "mic", "ai", "AI · CLOUD", "Voice", P(0, 1) + 0.3],
    [960, "calc", "no", "NOT AI", "Fixed calculation", P(0, 2) + 0.55],
    [1590, "speaker", "ai", "AI · CLOUD", "Spoken advice", P(0, 2) + 1.45],
  ];
  const nodes = NODES.map(([x, ic, c, tag, label, t]) => `<div class="nd" style="left:${x}px;top:${NY}px"><div class="nd-tw"><span class="nd-tag ${c}" data-at="${f2(t + 0.12)}" data-fx="pop" data-rot="-8">${tag}</span></div><div class="nd-c ${c}" data-at="${f2(t)}" data-fx="pop">${svg(ic)}</div><div class="nd-lw"><span class="nd-l" data-at="${f2(t + 0.1)}" data-fx="slide">${label}</span></div></div>`).join("");
  const pipes = [0, 1].map((k) => `<div class="nd-pipe" style="left:${NODES[k][0] + 96}px;top:${NY - 5}px;width:${NODES[k + 1][0] - NODES[k][0] - 192}px" data-at="${f2(NODES[k + 1][5] - 0.5)}" data-fx="grow" data-drift="150"></div>`).join("");
  layers.push(
    { type: "bg", style: "t2dark", start: -1, end: I1, fadeIn: 0.001, fadeOut: 0.001 },
    {
      type: "html", start: 0, end: I1, fadeIn: 0.001, fadeOut: 0.001, fx: "none",
      html: `<div class="kick gold" style="left:112px;top:150px" data-at="0.2" data-fx="slide">TECHNICAL WALKTHROUGH</div><div class="tagline" style="left:112px;top:508px" data-at="${f2(PE(0, 2) - 0.55)}" data-fx="slide">AI only where a spreadsheet cannot help.</div>${pipes}${nodes}`,
    },
    // « Under the hood: » s'écrit pendant que la voix le dit, puis laisse la place à « A farmer speaks. »
    { type: "caption", start: 0.25, end: P(0, 1) - 0.12, fadeOut: 0.22, x: 108, y: 206, w: 1760, size: 118, text: "Under the __hood:__", wordsAt: wordsAt("Under the hood:", P(0, 0), PE(0, 0) - 0.1) },
    { type: "caption", start: P(0, 1) - 0.1, end: I1, x: 108, y: 206, w: 1760, size: 118, text: "A farmer __speaks.__", wordsAt: wordsAt("A farmer speaks.", P(0, 1), PE(0, 1)) },
    { type: "caption", start: P(0, 2) - 0.1, end: I1, x: 108, y: 342, w: 1760, size: 118, text: "A __fixed calculation__ answers.", wordsAt: wordsAt("A fixed calculation answers.", P(0, 2), PE(0, 2)) },
  );
}

// ================================================================ 2. LES QUATRE ÉTAPES (sable) : la liste à gauche, le vrai
// site à droite qui montre chaque étape au moment où la voix la nomme
{
  const S0 = W.steps, S1 = W.small + COVER;
  const stT = [P(1, 0), P(1, 1), P(2, 0), P(2, 2)];
  const ROW_Y = [170, 342, 514, 686];
  const STEPS4 = [
    { n: 1, name: "Listen", ai: true, tags: [["AI · CLOUD", "ai"], ["OPTIONAL", "opt"]], icon: "mic", desc: "Speech recognition: Noor can speak instead of typing. French, Arabic, Arabizi.", foot: "Needs the network", fc: "net" },
    { n: 2, name: "Understand", ai: false, tags: [["NOT AI", "no"]], icon: "search", desc: "Crop and place found by rules and fuzzy matching on a fixed list.", foot: "Runs on our server, no model", fc: "ok" },
    { n: 3, name: "Calculate", ai: false, tags: [["NOT AI", "no"]], icon: "calc", desc: "FAO-56 water balance on the weather forecast. Same input, same answer.", foot: "Also runs in the browser, offline", fc: "ok" },
    { n: 4, name: "Speak", ai: true, tags: [["AI · CLOUD", "ai"]], icon: "speaker", desc: "Fixed sentences, numbers filled in, read in a Tunisian-accented voice.", foot: "Needs the network. Recorded copy plays offline", fc: "net" },
  ];
  const rel = (t) => f2(t - S0);
  const rows = STEPS4.map((s, i) => {
    const tags = s.tags.map(([txt, c]) => (c === "opt" ? `<span class="st-tag opt" data-at="${rel(stT[0] + 0.55)}" data-fx="pop" data-rot="-10">${txt}</span>` : `<span class="st-tag ${c}">${txt}</span>`)).join("");
    // « Also runs in the browser » arrive quand la voix dit « even in the browser »
    const footAt = i === 2 ? rel(P(2, 1)) : rel(stT[i] + 0.35);
    return `<div class="st-row" style="top:${ROW_Y[i]}px" data-at="${rel(stT[i])}" data-fx="slide"><div class="st-disc ${s.ai ? "ai" : "no"}" data-at="${rel(stT[i] + 0.05)}" data-fx="pop">${svg(s.icon)}</div><div class="st-txt"><div class="st-name">${s.n}. ${s.name}${tags}</div><div class="st-desc">${s.desc}</div><div class="st-foot ${s.fc}" data-at="${footAt}" data-fx="slide">${s.foot}</div></div></div>`;
  }).join("");
  layers.push(wipe(S0, GOLD, SAND_BG), backdrop("t2sand", S0 + BG_IN, S1), dots(S0 + BG_IN, S1));
  // le fil qui relie les étapes : des tirets qui coulent vers le bas
  layers.push({ type: "html", start: stT[0] - 0.2, end: S1, fadeIn: 0.4, fadeOut: 0.001, fx: "none", html: `<div class="st-line" style="top:${ROW_Y[0] + 60}px;height:${ROW_Y[3] - ROW_Y[0]}px" data-drift="40"></div>` });
  // l'étape dont parle la voix s'éclaire
  STEPS4.forEach((s, i) => layers.push({ type: "html", start: stT[i] - 0.12, end: i < 3 ? stT[i + 1] + 0.2 : S1, fadeIn: 0.3, fadeOut: i < 3 ? 0.35 : 0.001, fx: "none", html: `<div class="st-hl ${s.ai ? "ai" : "no"}" style="top:${ROW_Y[i] - 14}px"></div>` }));
  layers.push({
    type: "html", start: S0, end: S1, fadeIn: 0.001, fadeOut: 0.001, fx: "none",
    html: `${rows}<div class="st-ban" style="left:110px;top:866px;width:1160px" data-at="${rel(stT[3] + 0.4)}" data-fx="slide">The AI is at both ends. The middle can be checked: <b>it cannot hallucinate.</b></div><div class="st-note" style="left:110px;top:984px;width:1160px" data-at="${rel(stT[0] + 0.3)}" data-fx="slide">Optional voice agent: a language model told to read our server’s answer. An instruction, not a guarantee: 15 of 15 plan answers were read word for word on 20 typed test phrases.</div>`,
  });
  layers.push({ type: "caption", cls: "ink", start: S0 + SHOW, end: S1, x: 108, y: 52, w: 1200, size: 64, text: "Four steps, from __voice to advice__", stagger: 0.06 });
  // le vrai site : « Talk to Sakia » (écouter) → la région et la culture dans une liste fixe (comprendre) → « Water today »
  // (calculer) → la voix et ses sous-titres (parler)
  layers.push({
    type: "phone", start: S0 + SHOW + 0.1, end: S1, fadeIn: 0.2, fadeOut: 0.001, enterFrom: "bottom", x: 1532, y: 556, scale: 0.9,
    segments: seq("home", S0 + SHOW + 0.1, [[3.6, 9.35, stT[1]], [9.35, 17.55, stT[2]], [17.55, 22.55, stT[3]], [22.55, 29.5, S1]]),
  });
}

// ================================================================ 3a. PETIT (vert nuit) : le poids des pages, barres et compteurs
{
  const A0 = W.small, A1 = W.race + COVER;
  const BAR_X = 560, BAR_MAX = 1000, BAR_Y = 292, BAR_P = 106;
  const barT = [Math.max(A0 + SHOW + 0.05, P(3, 0) + 0.05), P(3, 1) - 0.15, P(3, 1) + 0.15, P(3, 1) + 0.5];
  const barW = (kb) => Math.max(12, Math.round((kb / MAXKB) * BAR_MAX));
  const cls = (id) => (id === "sakia" ? " me" : id === "meteotn" ? " bad" : "");
  const H0 = A0 + SHOW;
  const rel = (t) => f2(Math.max(0, t - H0));
  const bars = SITES.map(([id, name], i) => `<div class="bz-row${cls(id)}" style="top:${BAR_Y + i * BAR_P}px"><div class="bz-n" data-at="${rel(barT[i] - 0.15)}" data-fx="slide">${name}</div><div class="bz-bar" style="left:${BAR_X}px;width:${barW(pf(id, "3G").cold.kb)}px" data-at="${rel(barT[i])}" data-fx="grow"></div></div>`).join("");
  layers.push(wipe(A0, GOLD, DARK_BG, "d"), backdrop("t2dark", A0 + BG_IN, A1));
  layers.push({
    type: "html", start: H0, end: A1, fadeIn: 0.2, fadeOut: 0.001, fx: "none",
    html: `<div class="kick gold" style="left:112px;top:56px" data-at="0.05" data-fx="slide">FIRST VISIT, THROTTLED 3G · MEASURED 4 OCTOBER 2026</div>${bars}<div class="x20" style="left:104px;top:722px"><b data-at="${rel(P(3, 1) + 0.25)}" data-fx="slide">${ratio}×</b><span data-at="${rel(P(3, 1) + 0.55)}" data-fx="slide">lighter than the national weather site</span></div><div class="t2-note" style="left:112px;top:1012px">One run per site, real browser, processor slowed 4×. Method and raw results: sakia-opal.vercel.app/speed</div>`,
  });
  layers.push({ type: "caption", start: H0, end: A1, x: 108, y: 94, w: 1700, size: 82, text: "Small enough for a __weak connection__", wordsAt: wordsAt("Small enough for a weak connection", Math.max(H0, P(3, 0) - 0.1), P(3, 0) + 0.85) });
  // le nombre de Ko monte avec sa barre
  SITES.forEach(([id], i) => {
    const kb = pf(id, "3G").cold.kb;
    layers.push(...ticker(countUp(kb, barT[i], 0.9), A1, (v) => `<div class="bz-kb${cls(id)}" style="left:${BAR_X + barW(kb) + 20}px;top:${BAR_Y + i * BAR_P + 11}px">${v.toLocaleString("en-GB")} KB</div>`));
  });
}

// ================================================================ 3b. LA COURSE SUR 2G (nuit) : le vrai Sakia s'ouvre à 13 s,
// le site national charge encore à 150 s ; puis plus de réseau du tout : seul Sakia marche encore
{
  const R0 = W.race, R1 = W.grounded + COVER;
  const AX = 1130, BX = 1610, PY = 590, PS = 0.7;
  const PW = 472 * PS, PH = 984 * PS, PAD = 16 * PS, SBH = 40 * PS; // téléphone à l'échelle 0,7
  // chronomètre : 0 → 13 s en 0,7 s, puis 13 → 150 s en 0,85 s ; « never opened » tombe avec « … open on 2G »
  const CLK0 = Math.max(R0 + SHOW + 0.17, P(3, 2) + 0.3), OPEN_T = CLK0 + 0.7, END_T = OPEN_T + 0.85, OFF_T = P(3, 3) + 0.05;
  const clockAt = (s) => (s <= SAKIA_2G ? CLK0 + (s / SAKIA_2G) * (OPEN_T - CLK0) : OPEN_T + ((s - SAKIA_2G) / (NAT_TIMEOUT - SAKIA_2G)) * (END_T - OPEN_T));
  const screenL = (x) => x - PW / 2 + PAD, screenT = PY - PH / 2 + PAD;
  const H0 = R0 + SHOW, P0 = H0 + 0.05;
  const rel = (t) => f2(Math.max(0, t - H0));
  layers.push(wipe(R0, SAND, NIGHT_BG, "v"), backdrop("t2night", R0 + BG_IN, R1));
  layers.push({
    type: "html", start: H0, end: R1, fadeIn: 0.2, fadeOut: 0.001, fx: "none",
    html: `<div class="kick gold" style="left:112px;top:56px" data-at="0.05" data-fx="slide">THROTTLED 2G · FIRST VISIT · MEASURED 4 OCTOBER 2026</div><div class="r-big" style="left:104px;top:118px" data-at="0.1" data-fx="slide">On 2G</div><div class="r-line" style="left:112px;top:340px" data-at="${rel(OPEN_T)}" data-fx="slide"><i class="ok">${svg("check")}</i><span>Sakia opens in <b>${SAKIA_2G} s</b></span></div><div class="r-line" style="left:112px;top:438px" data-at="${rel(END_T)}" data-fx="slide"><i class="bad">${svg("x")}</i><span>The national site <b>never opened</b> (${NAT_TIMEOUT} s)</span></div><div class="r-chip" style="left:112px;top:640px" data-at="${rel(OFF_T + 0.15)}" data-fx="pop" data-rot="-3">${svg("plane")}<span>No network at all:<br><b>only Sakia still works</b></span></div><div class="t2-note" style="left:112px;top:1016px">Measured load times, replayed faster. Method and raw results: sakia-opal.vercel.app/speed</div><div class="r-lab me" style="left:${AX - 300}px;top:178px" data-at="0.15" data-fx="slide">Sakia</div><div class="r-lab" style="left:${BX - 300}px;top:182px" data-at="0.25" data-fx="slide">National weather site (meteo.tn)</div>`,
  });
  // A : le vrai site (accueil), caché sous un écran de chargement jusqu'à « 13 s »
  layers.push({ type: "phone", start: P0, end: OFF_T + 0.3, fadeIn: 0.3, fadeOut: 0.3, x: AX, y: PY, scale: PS, taps: false, segments: [{ at: P0, clip: "home", from: 0.2, to: 0.2 + (OFF_T + 0.3 - P0), rate: 1 }] });
  layers.push({
    type: "html", start: P0, end: OPEN_T, fadeIn: 0.3, fadeOut: 0.15, fx: "none",
    html: `<div class="ld" style="left:${screenL(AX)}px;top:${screenT + SBH}px"><div class="mk-bar"><i data-drift="320"></i></div><div class="mk-sk" style="height:150px"></div><div class="mk-sk" style="height:24px;width:72%"></div><div class="mk-sk" style="height:24px;width:86%"></div><div class="mk-sk" style="height:200px"></div><div class="mk-sh" data-drift="380"></div></div>`,
  });
  // A' : sans réseau (mode avion), la même appli marche encore (prise « offline » du vrai site)
  layers.push({ type: "phone", start: OFF_T, end: R1, fadeIn: 0.3, fadeOut: 0.001, x: AX, y: PY, scale: PS, offline: true, taps: false, segments: [{ at: OFF_T, clip: "offline", from: 0.62, to: Math.min(10.6, 0.62 + (R1 - OFF_T) * 1.4), rate: +((Math.min(10.6, 0.62 + (R1 - OFF_T) * 1.4) - 0.62) / (R1 - OFF_T)).toFixed(4) }] });
  // B : le site national, dessiné : il charge, il charge…
  layers.push({
    type: "html", start: P0, end: R1, fadeIn: 0.3, fadeOut: 0.001, fx: "none",
    html: `<div class="mk" style="left:${BX - PW / 2}px;top:${PY - PH / 2}px"><div class="mk-scr"><div class="mk-sb"><span>9:41</span><span class="mk-ic">${SB_SIGNAL}${SB_WIFI}${SB_BAT}</span></div><div class="mk-url">www.meteo.tn</div><div class="mk-bar"><i data-drift="320"></i></div><div class="mk-sk" style="height:150px"></div><div class="mk-sk" style="height:24px;width:72%"></div><div class="mk-sk" style="height:24px;width:86%"></div><div class="mk-sk" style="height:200px"></div><div class="mk-sh" data-drift="380"></div></div><div class="mk-notch"></div></div>`,
  });
  // … et sans réseau, plus rien
  layers.push({
    type: "html", start: OFF_T, end: R1, fadeIn: 0.3, fadeOut: 0.001, fx: "none",
    html: `<div class="mk-off" style="left:${screenL(BX)}px;top:${screenT}px"><div class="mk-sb"><span>9:41</span><span class="mk-ic">${SB_PLANE}${SB_BAT}</span></div><div class="mk-offc">${svg("wifiOff")}<b>No connection</b><span>www.meteo.tn</span></div></div><div class="mk-notch2" style="left:${BX}px;top:${PY - PH / 2 + 16.8}px"></div>`,
  });
  // les deux chronomètres (secondes de 2G, accélérées)
  const tm = (x, inner) => `<div class="tmw" style="left:${x - 260}px;top:952px">${inner}</div>`;
  const sA = Array.from({ length: SAKIA_2G + 1 }, (_, s) => [clockAt(s), s]);
  const sB = [...sA, ...Array.from({ length: Math.floor((NAT_TIMEOUT - 20) / 10) + 1 }, (_, k) => [clockAt(20 + 10 * k), 20 + 10 * k])];
  if (sB.at(-1)[1] !== NAT_TIMEOUT) sB.push([clockAt(NAT_TIMEOUT), NAT_TIMEOUT]);
  layers.push(...ticker(sA, R1, (v, last) => tm(AX, last ? `<span class="tm ok">${svg("check")}Opened in ${v} s</span>` : `<span class="tm">${svg("clock")}${v} s</span>`)));
  layers.push(...ticker(sB, R1, (v, last) => tm(BX, last ? `<span class="tm bad">${svg("x")}${v} s · never opened</span>` : `<span class="tm">${svg("clock")}${v} s</span>`)));
}

// ================================================================ 4. LES DONNÉES VÉRIFIÉES ET L'ÉCHELLE (or)
{
  const G0 = W.grounded, G1 = W.lab + COVER;
  const H0 = G0 + SHOW;
  const rel = (t) => f2(Math.max(0, t - H0));
  layers.push(wipe(G0, SAND, GOLD_BG), backdrop("t2gold", G0 + BG_IN, G1));
  layers.push({
    type: "html", start: H0, end: G1, fadeIn: 0.2, fadeOut: 0.001, fx: "none",
    html: `<div class="kick brown" style="left:112px;top:56px" data-at="0.05" data-fx="slide">OPEN DATA · CHECKED AGAINST TUNISIAN STATIONS</div><div class="gd-row" style="left:110px;top:226px"><span class="gd-pill" data-at="${rel(P(4, 0))}" data-fx="slide">${svg("cloud")}Open weather data · Open-Meteo</span><span class="gd-vs" data-at="${rel(P(4, 1))}" data-fx="pop" data-rot="-6">checked against</span><span class="gd-pill" data-at="${rel(P(4, 1) + 0.25)}" data-fx="slide">${svg("tower")}Tunisian stations · DGACTA &amp; NOAA</span></div><div class="gd-stat" style="left:110px;top:352px" data-at="${rel(P(4, 2))}" data-fx="slide"><b>within 5 %</b><span>evapotranspiration, against two Tunisian stations</span></div><div class="gd-div" style="left:952px;top:372px;height:250px" data-at="${rel(P(4, 2) + 0.3)}" data-fx="slide"></div><div class="gd-stat" style="left:1010px;top:352px" data-at="${rel(P(4, 2) + 0.65)}" data-fx="slide"><b>0.6 °C</b><span>temperature bias at Kairouan, over 1,664 days</span></div><div class="t2-note dk" style="left:112px;top:1012px">Our own analysis, 3 October 2026: Open-Meteo against DGACTA and NOAA stations. Details: sakia-opal.vercel.app/about</div>`,
  });
  layers.push({ type: "caption", cls: "ink2", start: H0, end: G1, x: 108, y: 92, w: 1700, size: 80, text: "Grounded, and __ready to scale__", stagger: 0.07, delay: 0.1 });
  // 24 gouvernorats, 18 cultures : des compteurs qui montent quand la voix les dit
  const BLK = [[110, "map", "governorates", 24, P(4, 3)], [1010, "sprout", "crops", 18, P(4, 4)]];
  for (const [x, ic, label, n, t] of BLK) {
    layers.push({ type: "html", start: t - 0.2, end: G1, fadeIn: 0.25, fadeOut: 0.001, fx: "none", html: `<div class="gd-blk" style="left:${x}px;top:690px">${svg(ic)}<span class="gd-lbl">${label}</span></div>` });
    layers.push(...ticker(countUp(n, t, 0.75), G1, (v) => `<div class="gd-num" style="left:${x + 130}px;top:722px">${v}</div>`));
  }
}

// ================================================================ 5. LE LABO (encre) : le petit modèle appris, la page /lab filmée
{
  const L0 = W.lab, L1 = W.safe + COVER;
  const H0 = L0 + SHOW;
  const rel = (t) => f2(Math.max(0, t - H0));
  const BXc = 1382, BYc = 612, BS = 0.74, BW = 1312 * BS, BH = 752 * BS;
  layers.push(wipe(L0, "#7fc4ee", INK_BG, "v"), backdrop("t2ink", L0 + BG_IN, L1));
  layers.push({
    type: "html", start: H0, end: L1, fadeIn: 0.2, fadeOut: 0.001, fx: "none",
    html: `<div class="kick cyan" style="left:112px;top:56px" data-at="0.05" data-fx="slide">RESEARCH · SHADOW MODE · DOES NOT CHANGE THE ADVICE</div><div class="lb-kb" style="left:104px;top:112px" data-at="${rel(P(5, 0) + 0.8)}" data-fx="slide">43 KB</div><div class="lb-m" style="left:112px;top:318px;width:750px" data-at="${rel(P(5, 0) + 1.25)}" data-fx="slide">machine-learning model <em>(CatBoost)</em></div><div class="lb-s" style="left:112px;top:462px;width:740px" data-at="${rel(P(5, 0) + 2.3)}" data-fx="slide">trained on free satellite data, runs in your browser.</div><div class="lb-r" style="left:112px;top:618px" data-at="${rel(P(5, 1))}" data-fx="slide"><i class="ok">${svg("check")}</i>A modest gain over a calendar</div><div class="lb-r" style="left:112px;top:712px" data-at="${rel(P(5, 2))}" data-fx="slide"><i class="bad">${svg("x")}</i>A failure in the Sahel</div><div class="lb-pub" style="left:112px;top:842px" data-at="${rel(P(5, 3))}" data-fx="pop" data-rot="-6">Both published.</div>`,
  });
  layers.push({ type: "html", start: H0 + 0.05, end: L1, fadeIn: 0.3, fadeOut: 0.001, fx: "none", html: `<div class="bb2" style="left:${BXc - BW / 2}px;top:${BYc - BH / 2 - 36}px;width:${BW}px"><i></i><i></i><i></i><span>sakia-opal.vercel.app/lab</span></div>` });
  layers.push({
    type: "phone", desktop: true, start: H0 + 0.05, end: L1, fadeIn: 0.3, fadeOut: 0.001, x: BXc, y: BYc, scale: BS, taps: false,
    segments: seq("lab", H0 + 0.05, [[3.6, 9.7, P(5, 1)], [9.7, 19.15, L1]]),
  });
}

// ================================================================ 6. LES GARDE-FOUS (sable) : quatre tuiles, et le vrai « pas sûr »
{
  const F0 = W.safe, F1 = W.credits + COVER;
  const H0 = F0 + SHOW;
  const rel = (t) => f2(Math.max(0, t - H0));
  const SAFE_CARDS = [
    ["list", "#2f7d4a", "Fixed sentences", "Replies come from a fixed list, with the numbers filled in."],
    ["warn", "#d4761f", "Not sure? It says so", "Weather older than 12 h: not sure. Older than 48 h: no advice."],
    ["hand", "#2b6cb0", "A person decides", "Indicative advice. A technician (CRDA) is always the fallback."],
    ["shield", "#12301f", "Little data", "A pseudonymous chat ID, the governorate and a few settings. No name, no phone number."],
  ];
  const tT = [P(6, 0) + 0.05, P(6, 1), P(6, 3), P(6, 3) + 0.4];
  const tiles = SAFE_CARDS.map(([ic, c, title, text], i) => `<div class="sf-t" style="left:${110 + (i % 2) * 540}px;top:${222 + Math.floor(i / 2) * 362}px" data-at="${rel(tT[i])}" data-fx="slide"><div class="sf-i" style="background:${c}" data-at="${rel(tT[i] + 0.15)}" data-fx="pop">${svg(ic)}</div><b>${title}</b><span>${text}</span></div>`).join("");
  layers.push(wipe(F0, GOLD, SAND_BG, "d"), backdrop("t2sand", F0 + BG_IN, F1), dots(F0 + BG_IN, F1));
  layers.push({ type: "html", start: H0, end: F1, fadeIn: 0.2, fadeOut: 0.001, fx: "none", html: `<div class="kick rust" style="left:112px;top:56px" data-at="0.05" data-fx="slide">RESPONSIBLE BY DESIGN</div>${tiles}` });
  layers.push({ type: "caption", cls: "ink", start: H0, end: F1, x: 108, y: 92, w: 1250, size: 66, text: "Built so __a person__ stays in charge", stagger: 0.06 });
  // le vrai site : « Don't know » touché, puis « I am not sure: please ask an agricultural technician (CRDA) »
  layers.push({
    type: "phone", start: H0 + 0.1, end: F1, fadeIn: 0.2, fadeOut: 0.001, enterFrom: "bottom", x: 1532, y: 560, scale: 0.9,
    segments: seq("notsure", H0 + 0.1, [[7.0, 9.45, P(6, 1) + 0.1], [9.45, 12.15, P(6, 2)], [12.15, 15.55, F1]]),
  });
}

// ================================================================ 7. FAIT PENDANT LE HACKATHON (vert, grande roue qui tourne)
{
  const C0 = W.credits, C1 = DUR + 0.5;
  const H0 = C0 + SHOW;
  const rel = (t) => f2(Math.max(0, t - H0));
  const tiles = TOOLS.map(([id, color, name, role], i) => `<span data-at="${rel(P(7, 1) + i * 0.24)}" data-fx="pop" data-rot="-6">${id ? logo(id, color) : OPEN_METEO}<b>${name}</b><small>${role}</small></span>`).join("");
  layers.push(wipe(C0, GOLD, DARK_BG), backdrop("t2cred", C0 + BG_IN, C1));
  layers.push({
    type: "html", start: H0, end: C1, fadeIn: 0.2, fadeOut: 0.001, fx: "none",
    // Anthony et Claude Code dans la même couleur (décision d'Anthony)
    html: `<div class="cr2-wheel" data-at="0.05" data-fx="pop">{{WHEEL}}</div><div class="cr2-logos">${tiles}</div><div class="cr2-urlw"><span class="cr2-url" data-at="${rel(P(7, 2) + 0.4)}" data-fx="slide">sakia-opal.vercel.app · github.com/ag-algolab/sakia</span></div>`,
  });
  layers.push({ type: "caption", start: H0, end: C1, x: 160, y: 262, w: 1600, size: 76, align: "center", text: "Built during the hackathon by __Anthony__, with __Claude Code__", wordsAt: [...wordsAt("Built during the hackathon by Anthony,", P(7, 0), PE(7, 0)), ...wordsAt("with Claude Code", P(7, 1), PE(7, 1))] });
  if (vo?.synthetic) layers.push({ type: "note", start: C0 + 0.6, end: C1, x: 112, y: 1030, w: 1700, text: "Narration: synthetic voice (ElevenLabs)." });
}

// une lumière douce qui dérive sur toute la vidéo : aucune image n'est jamais figée
layers.push({ type: "glow", start: 0, end: DUR + 0.5, fadeIn: 0.01, fadeOut: 0.01, opacity: 0.09 });

export default {
  name: "sakia-tech-v2",
  fps: FPS,
  duration: DUR,
  css: `
    .kick{position:absolute;font:800 25px Geist,sans-serif;letter-spacing:.15em;white-space:nowrap}
    .kick.gold{color:#f2b33d}.kick.rust{color:#a8480a}.kick.brown{color:#5a3a06}.kick.cyan{color:#7fc4ee}
    .ic{fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .t2-note{position:absolute;font:500 22px Geist,sans-serif;color:rgba(244,239,230,.72)}
    .t2-note.dk{color:rgba(42,29,5,.78)}
    .caption.ink{color:#12301f}.caption.ink .accent{color:#b4520c}
    .caption.ink2{color:#1d1405}.caption.ink2 .accent{color:#12301f}
    /* transitions */
    .wp{position:absolute;left:0;top:0;width:1920px;height:1080px}
    .wp-in{position:absolute;inset:0}
    .wp.h{width:2700px}
    .wp.d{left:-500px;top:-760px;width:2920px;height:2600px;transform:rotate(14deg)}
    .wp.v{left:-142px;top:-562px;width:2204px;height:2204px;transform:rotate(90deg)}
    /* fonds qui bougent (couche bg : roue qui tourne, vagues qui défilent) */
    .bg-t2dark{background:${DARK_BG}}
    .bg-t2dark .bg-wheel{color:#f2b33d;opacity:.07;left:82%;top:44%;width:1150px;height:1150px}
    .bg-t2night{background:${NIGHT_BG}}
    .bg-t2night .bg-wheel{color:#f2b33d;opacity:.06;left:14%;top:84%;width:1200px;height:1200px}
    .bg-t2sand{background:${SAND_BG}}
    .bg-t2sand .bg-wheel{color:#275233;opacity:.07;left:90%;top:16%;width:1100px;height:1100px}
    .bg-t2sand .bg-lines{opacity:.34}
    .dots{position:absolute;inset:0;background:radial-gradient(circle,rgba(39,82,51,.17) 2.4px,rgba(39,82,51,0) 2.9px) 0 0/38px 38px}
    .bg-t2gold{background:${GOLD_BG}}
    .bg-t2gold .bg-wheel{color:#6b4307;opacity:.1;left:88%;top:62%;width:1250px;height:1250px}
    .bg-t2gold .bg-lines{opacity:.18;filter:brightness(.25)}
    .bg-t2ink{background:${INK_BG}}
    .bg-t2ink .bg-wheel{color:#7fc4ee;opacity:.06;left:10%;top:90%;width:1200px;height:1200px}
    .bg-t2cred{background:${DARK_BG}}
    .bg-t2cred .bg-wheel{color:#f2b33d;opacity:.09;left:50%;top:52%;width:1500px;height:1500px}
    /* 1. intro */
    .tagline{position:absolute;font:800 50px Geist,sans-serif;color:#f2b33d;white-space:nowrap}
    .nd{position:absolute;width:0;height:0}
    .nd-c{position:absolute;left:-78px;top:-78px;width:156px;height:156px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.07);border:6px solid;box-sizing:border-box;color:#fff;box-shadow:0 0 0 16px rgba(255,255,255,.035)}
    .nd-c.ai{border-color:#4aa3e8}.nd-c.no{border-color:#46c178}
    .nd-c svg{width:68px;height:68px}
    .nd-tw{position:absolute;left:-200px;width:400px;top:-142px;text-align:center}
    .nd-tag{display:inline-block;font:800 21px Geist,sans-serif;letter-spacing:.1em;padding:7px 15px;border-radius:999px}
    .nd-tag.ai{background:#2b74c6;color:#fff}.nd-tag.no{background:#2f9a5a;color:#fff}
    .nd-lw{position:absolute;left:-240px;width:480px;top:100px;text-align:center}
    .nd-l{display:inline-block;font:800 34px Geist,sans-serif;color:#f4efe6}
    .nd-pipe{position:absolute;height:10px;border-radius:5px;background:linear-gradient(90deg,#f2b33d 0 22px,rgba(242,179,61,0) 22px 40px) 0 0/40px 10px}
    /* 2. étapes */
    .st-line{position:absolute;left:157px;width:6px;background:linear-gradient(180deg,#c3b28c 0 12px,rgba(195,178,140,0) 12px 24px) 0 0/6px 24px}
    .st-hl{position:absolute;left:84px;width:1186px;height:168px;border-radius:28px;background:#fff;box-shadow:0 16px 36px rgba(60,45,10,.13);box-sizing:border-box}
    .st-hl.ai{border-left:9px solid #2b74c6}.st-hl.no{border-left:9px solid #2f7d4a}
    .st-row{position:absolute;left:110px;width:1150px;height:150px}
    .st-disc{position:absolute;left:0;top:12px;width:100px;height:100px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 10px 24px rgba(18,48,31,.25)}
    .st-disc.ai{background:#2b74c6}.st-disc.no{background:#2f7d4a}
    .st-disc svg{width:50px;height:50px}
    .st-txt{position:absolute;left:130px;top:0;width:1010px}
    .st-name{display:flex;align-items:center;gap:14px;font:900 46px/1.1 Fraunces,serif;color:#12301f}
    .st-tag{display:inline-block;font:800 19px Geist,sans-serif;letter-spacing:.08em;padding:6px 13px;border-radius:999px}
    .st-tag.ai{background:#d9e9fa;color:#1b5ea6}.st-tag.no{background:#dcefe0;color:#1f6337}.st-tag.opt{background:#f2b33d;color:#2a1d05;box-shadow:0 6px 14px rgba(120,80,0,.25)}
    .st-desc{margin-top:6px;font:600 27px/1.28 Geist,sans-serif;color:#2c3b31}
    .st-foot{margin-top:5px;font:800 23px Geist,sans-serif}
    .st-foot.net{color:#1b5ea6}.st-foot.ok{color:#1f6337}
    .st-ban{position:absolute;font:800 36px/1.25 Geist,sans-serif;color:#12301f}
    .st-ban b{color:#b4520c}
    .st-note{position:absolute;font:500 20px/1.35 Geist,sans-serif;color:rgba(18,48,31,.68)}
    /* 3a. poids des pages */
    .bz-row{position:absolute;left:0;width:1920px;height:76px}
    .bz-n{position:absolute;left:110px;top:0;width:420px;height:76px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;font:700 34px/1.1 Geist,sans-serif;color:#d6e6d2}
    .bz-n small{font-size:25px;color:#9fb5a5}
    .bz-row.me .bz-n{color:#fff;font-weight:900}
    .bz-bar{position:absolute;top:6px;height:64px;border-radius:14px;background:#5d6f64}
    .bz-row.me .bz-bar{background:linear-gradient(90deg,#2f9a5a,#46c178);box-shadow:0 0 26px rgba(70,193,120,.55)}
    .bz-row.bad .bz-bar{background:linear-gradient(90deg,#b8390b,#e2531d)}
    .bz-kb{position:absolute;font:800 40px Geist,sans-serif;color:#fff;white-space:nowrap}
    .bz-kb.me{color:#7ad48f}.bz-kb.bad{color:#ffb38a}
    .x20{position:absolute;display:flex;align-items:baseline;gap:30px;white-space:nowrap}
    .x20 b{display:inline-block;font:900 172px/1 Fraunces,serif;color:#f2b33d;letter-spacing:-.02em}
    .x20 span{display:inline-block;font:800 54px Geist,sans-serif;color:#fff}
    /* 3b. course 2G */
    .r-big{position:absolute;font:900 156px/1 Fraunces,serif;color:#f2b33d;letter-spacing:-.02em}
    .r-line{position:absolute;display:flex;align-items:flex-start;gap:18px;width:790px;font:800 44px/1.2 Geist,sans-serif;color:#fff}
    .r-line i{flex:none;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:-2px}
    .r-line i svg{width:32px;height:32px;stroke-width:3}
    .r-line i.ok{background:#2f9a5a}.r-line i.bad{background:#c2410c}
    .r-line b{color:#f2b33d}
    .r-chip{position:absolute;display:flex;align-items:flex-start;gap:16px;max-width:740px;padding:20px 28px;border-radius:24px;background:#fff;color:#14231a;font:800 38px/1.25 Geist,sans-serif;box-shadow:0 16px 36px rgba(0,0,0,.45)}
    .r-chip svg{flex:none;width:44px;height:44px;margin-top:2px;color:#2b74c6;stroke-width:1.8}
    .r-chip b{color:#2f7d4a}
    .r-lab{position:absolute;width:600px;text-align:center;font:800 26px Geist,sans-serif;color:#d6e6d2;white-space:nowrap}
    .r-lab.me{font:900 34px Geist,sans-serif;color:#fff}
    .mk{position:absolute;width:${472 * 0.7}px;height:${984 * 0.7}px;border-radius:52px;background:linear-gradient(150deg,#3a403c 0%,#151916 40%,#0a0c0b 100%);box-shadow:0 42px 84px rgba(0,0,0,.55),0 0 0 1.4px rgba(255,255,255,.07) inset,0 0 0 6px #050605 inset;padding:11.2px;box-sizing:border-box}
    .mk-scr{position:relative;width:308px;height:666.4px;border-radius:40.6px;overflow:hidden;background:#fff}
    .mk-sb{height:28px;background:#0e2418;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:4px 24px 0 28px;box-sizing:border-box;font:700 12px Geist,sans-serif}
    .mk-ic{display:flex;align-items:center;gap:4px}
    .mk-notch{position:absolute;top:16.8px;left:50%;transform:translateX(-50%);width:77px;height:21px;border-radius:14px;background:#070807}
    .mk-notch2{position:absolute;transform:translateX(-50%);width:77px;height:21px;border-radius:14px;background:#070807}
    .mk-url{margin:10px 12px 0;height:32px;border-radius:10px;background:#eef0f2;display:flex;align-items:center;padding:0 14px;font:600 15px Geist,sans-serif;color:#5b6570}
    .mk-bar{position:relative;margin:8px 12px 0;height:5px;border-radius:3px;background:#e3e7ea;overflow:hidden}
    .mk-bar i{position:absolute;left:0;top:0;width:100%;height:100%;background:linear-gradient(90deg,rgba(43,116,198,0) 0,#2b74c6 60px,rgba(43,116,198,0) 120px) 0 0/240px 5px}
    .mk-sk{margin:16px 12px 0;border-radius:12px;background:#eceff2}
    .mk-sh{position:absolute;left:0;right:0;top:70px;bottom:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0,rgba(255,255,255,.8) 90px,rgba(255,255,255,0) 180px) 0 0/460px 100%}
    .ld{position:absolute;width:308px;height:638.4px;border-radius:0 0 40.6px 40.6px;overflow:hidden;background:#f6efe0}
    .ld .mk-sk{background:#ebe2cf}
    .ld .mk-sh{top:0;background:linear-gradient(90deg,rgba(246,239,224,0) 0,rgba(255,252,244,.85) 90px,rgba(246,239,224,0) 180px) 0 0/460px 100%}
    .mk-off{position:absolute;width:308px;height:666.4px;border-radius:40.6px;overflow:hidden;background:#fff}
    .mk-offc{display:flex;flex-direction:column;align-items:center;justify-content:center;height:600px;gap:14px;color:#8a949c}
    .mk-offc svg{width:70px;height:70px}
    .mk-offc b{font:800 26px Geist,sans-serif;color:#3c4650}
    .mk-offc span{font:600 16px Geist,sans-serif}
    .tmw{position:absolute;width:520px;text-align:center}
    .tm{display:inline-flex;align-items:center;gap:10px;padding:10px 24px;border-radius:999px;background:rgba(255,255,255,.13);color:#fff;font:800 32px Geist,sans-serif;white-space:nowrap}
    .tm svg{width:28px;height:28px;stroke-width:2.6}
    .tm.ok{background:#2f9a5a}.tm.bad{background:#c2410c}
    /* 4. données */
    .gd-row{position:absolute;display:flex;align-items:center;gap:22px}
    .gd-pill{display:inline-flex;align-items:center;gap:14px;padding:16px 28px;border-radius:999px;background:#12301f;color:#f4efe6;font:800 32px Geist,sans-serif;box-shadow:0 12px 28px rgba(80,50,0,.28)}
    .gd-pill svg{width:36px;height:36px;color:#f2b33d}
    .gd-vs{display:inline-block;font:800 26px Geist,sans-serif;letter-spacing:.06em;color:#3b2a06;padding:10px 18px;border:3px dashed rgba(59,42,6,.55);border-radius:999px}
    .gd-stat{position:absolute;width:830px}
    .gd-stat b{display:block;font:900 152px/1 Fraunces,serif;color:#12301f;letter-spacing:-.015em;white-space:nowrap}
    .gd-stat span{display:block;margin-top:18px;font:700 36px/1.25 Geist,sans-serif;color:#3b2a06}
    .gd-div{position:absolute;width:4px;border-radius:2px;background:rgba(59,42,6,.3)}
    .gd-blk{position:absolute;width:800px;height:200px;border-radius:32px;background:#12301f;box-shadow:0 18px 40px rgba(80,50,0,.32)}
    .gd-blk svg{position:absolute;left:44px;top:58px;width:84px;height:84px;color:#f2b33d}
    .gd-lbl{position:absolute;left:350px;top:62px;font:800 60px Geist,sans-serif;color:#f4efe6}
    .gd-num{position:absolute;width:190px;text-align:right;font:900 136px/1 Fraunces,serif;color:#f2b33d}
    /* 5. labo */
    .lb-kb{position:absolute;font:900 190px/1 Fraunces,serif;color:#f2b33d;letter-spacing:-.02em;white-space:nowrap}
    .lb-m{position:absolute;font:800 54px/1.12 Geist,sans-serif;color:#fff}
    .lb-m em{font-style:normal;color:#7fc4ee}
    .lb-s{position:absolute;font:600 36px/1.3 Geist,sans-serif;color:#cfe0ea}
    .lb-r{position:absolute;display:flex;align-items:center;gap:18px;font:800 42px Geist,sans-serif;color:#fff;white-space:nowrap}
    .lb-r i{width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center}
    .lb-r i svg{width:34px;height:34px;color:#fff;stroke-width:3}
    .lb-r i.ok{background:#2f9a5a}.lb-r i.bad{background:#d9531e}
    .lb-pub{position:absolute;padding:16px 32px;border-radius:22px;background:#f2b33d;color:#2a1d05;font:900 64px/1 Fraunces,serif;box-shadow:0 16px 36px rgba(0,0,0,.45);white-space:nowrap}
    .bb2{position:absolute;height:36px;border-radius:14px 14px 0 0;background:#1d2420;display:flex;align-items:center;gap:8px;padding:0 16px;box-sizing:border-box}
    .bb2 i{width:12px;height:12px;border-radius:50%;background:#3b4440;display:block}
    .bb2 span{margin-left:14px;font:600 17px Geist,sans-serif;color:#9fb5a5}
    /* 6. garde-fous */
    .sf-t{position:absolute;width:510px;height:332px;padding:28px 32px;border-radius:28px;background:#fff;box-shadow:0 18px 40px rgba(60,45,10,.14);box-sizing:border-box}
    .sf-i{width:74px;height:74px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
    .sf-i svg{width:40px;height:40px}
    .sf-t b{display:block;margin-top:18px;font:900 40px/1.1 Fraunces,serif;color:#12301f}
    .sf-t span{display:block;margin-top:12px;font:600 27px/1.32 Geist,sans-serif;color:#33443a}
    /* 7. fin */
    .cr2-wheel{position:absolute;left:905px;top:118px;width:110px;height:110px;color:#f4efe6}
    .cr2-wheel svg{width:100%;height:100%}
    .cr2-logos{position:absolute;left:0;top:556px;width:1920px;display:flex;justify-content:center;gap:24px}
    .cr2-logos span{display:flex;flex-direction:column;align-items:center;gap:12px;width:200px;padding:28px 8px 22px;border-radius:26px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.35);box-sizing:border-box}
    .cr2-logos svg{width:64px;height:64px}
    .cr2-logos b{font:800 28px Geist,sans-serif;color:#14231a}
    .cr2-logos small{font:600 21px Geist,sans-serif;color:#5b6b60;letter-spacing:.04em}
    .cr2-urlw{position:absolute;left:0;top:846px;width:1920px;text-align:center}
    .cr2-url{display:inline-block;padding:16px 36px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.22);font:700 34px Geist,sans-serif;color:#fff}
  `,
  media: {},
  layers,
  // même musique, même mélange que tech.mjs (darbouka, oud) : audible sous la voix, ≈ 13 dB dessous
  music: { file: ["videos/build/music-tunis.mp3", "videos/build/music-cine-5.wav"].find(existsSync), gain: vo ? -14 : -12, duckGain: -7, fadeIn: 1.0, fadeOut: 2.5, duck: vo ? VO_AT.map((at, i) => ({ from: at - 0.1, to: at + voDur[i] / tempo + 0.1 })) : [] },
  audio: vo
    ? vo.takes
        .filter((t) => t.start != null)
        .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.05, rate: tempo !== 1 ? tempo : undefined, filter: vo.synthetic ? undefined : "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" }))
    : [],
};
console.log(`technique v2 : ${L.total.toFixed(1)} s, ${layers.length} couches (${vo ? `voix off ${vo.synthetic ? "de synthèse" : "d'Anthony"}, tempo ${tempo}` : "sans voix off"})`);
