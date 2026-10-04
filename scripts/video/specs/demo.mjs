// Partition de la vidéo « Product demo » (≤ 60 s), écrite comme un PITCH calé sur le barème Banque mondiale
// (docs/WB-EXIGENCES.md) : le problème (Noor ne lit pas, la nappe est surexploitée), la solution qui marche de bout en bout
// (le vrai site, filmé, en un seul plan continu), la langue locale nommée, la même réponse par quatre autres chemins dont un
// SANS RÉSEAU, le garde-fou « pas sûr : demander à une personne » (éliminatoire), la preuve chiffrée (simulation), la fin.
// Visuels : chapitres du film /story (problème, preuve), séquences filmées du vrai site, vidéo Telegram d'Anthony.
// La partition se cale sur la voix off (videos/build/takes/demo-vo.json, tts-vo.mjs). Rendu : node scripts/video/compose.mjs scripts/video/specs/demo.mjs
import { existsSync, readFileSync, statSync } from "node:fs";

const X = 150; // colonne des textes
const W = 860;
const PHONE = { x: 1335, y: 540 };
const MAXLEN = 59.5;
const FILM = "C:/Users/antho/Videos/sakia-film";

// ---------------------------------------------------------------- la voix off
export const VO_LINES = [
  "Meet Noor, a farmer near Kairouan, Tunisia.",
  "Like more than one in four here, Noor can't read.",
  "And the aquifer is pumped at more than twice what it renews.",
  "Every morning: irrigate today, or wait?",
  "Sakia answers.",
  "Three taps, with pictures.",
  "Then the answer, spoken in Tunisian Arabic.",
  "Irrigate today: 214 cubic metres per hectare.",
  "The same answer in the app, even offline.",
  "On Telegram.",
  "With a simple phone call.",
  "Or by text message.",
  "When it's not sure, Sakia says so, and asks a person to check.",
  "Simulated over eleven seasons: three to twenty-seven percent less water.",
  "Sakia. One decision a day.",
];
const TAKES = "videos/build/takes/demo-vo.json";
const voRaw = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : null;
const vo = voRaw && voRaw.takes?.length === VO_LINES.length && voRaw.takes.every((t, i) => t.text === VO_LINES[i]) ? voRaw : null;
if (voRaw && !vo) console.log("voix off d'une ancienne version du texte : ignorée (relancer tts-vo.mjs demo)");
const voDur = VO_LINES.map((line, i) => {
  const tk = vo?.takes?.find((t) => t.line === i && t.start != null);
  return tk ? tk.end - tk.start : line.split(/\s+/).length / 2.4 + 0.3;
});

// vidéo Telegram d'Anthony : plan à 15,6 s
const TG = ["C:/Users/antho/Downloads/telegram.mp4", "C:/Users/antho/Videos/sakia-film/rushes/telegram.mp4"].find((f) => existsSync(f));
const TG_PLAN = 15.6;

// ---------------------------------------------------------------- morceaux filmés du site (repères, touches, sons)
const meta = (clip) => {
  const m = JSON.parse(readFileSync(`videos/build/capture/${clip}/meta.json`, "utf8"));
  const f0 = m.frames[0].t;
  const rel = (t) => (t - f0) / 1000;
  return {
    capturedAt: m.capturedAt,
    marks: Object.fromEntries(Object.entries(m.marks).map(([k, t]) => [k, rel(t)])),
    taps: m.taps.map((tp) => rel(tp.t)),
    audio: m.audio.map((a) => ({ ...a, t: rel(a.t), size: statSync(`videos/build/capture/${clip}/${a.file}`).size })),
  };
};
const HOME = meta("home"), CALL = meta("call"), SMS = meta("sms"), OFF = meta("offline"), UNSURE = meta("notsure");
const HOME_VOICE = HOME.audio.find((a) => a.file) ?? { t: HOME.marks.listen + 1.9, file: "audio-01.mp3" };
// Raccord dans le plan filmé du site (relevé image par image sur la prise du 4 oct. 07:04 UTC) : le robot descend de l'accueil
// vers « Your field », puis la page remonte d'un coup (~9,2 s). On coupe pendant la descente à 8,04 s et on reprend à 9,29 s :
// même position de défilement, donc aucune saute visible.
const HERO_TO = 8.04, Q_FROM = 9.294;
if (!HOME.capturedAt?.startsWith("2026-10-04T07:04")) console.log("ATTENTION : nouvelle prise « home » : revérifier HERO_TO / Q_FROM (raccord du défilement)");
const CH_TO = HOME.taps[5] + 0.3; // « Continue » touché
const ADV = CALL.audio.reduce((best, a) => (!best || a.size > best.size ? a : best), null);
const ADV_JSON = existsSync("videos/build/call-advice-cache.json") ? JSON.parse(readFileSync("videos/build/call-advice-cache.json", "utf8")) : null;
const ADV_LINE = ADV_JSON?.lines?.find((l) => l.id === "advice");
const ADV_FROM = (ADV_LINE?.startMs ?? 9760) / 1000;

// ---------------------------------------------------------------- scènes (durées calées sur la voix)
const flex = { appVoice: 2.6, panel: 2.5, tempo: 1.0, chRate: 1.4 };
function plan() {
  const v = voDur.map((d) => d / flex.tempo);
  const S = {};
  let t = 0;
  const scene = (id, len, extra = {}) => {
    S[id] = { at: t, len, ...extra };
    t += len;
  };
  scene("noor", Math.max(3.6, 0.3 + v[0] + 0.25));
  scene("read", Math.max(3.4, 0.15 + v[1] + 0.25));
  scene("aquifer", Math.max(3.4, 0.15 + v[2] + 0.25));
  scene("question", Math.max(3.4, 0.15 + v[3] + 0.45));
  // le site, un seul plan : l'accueil (« Sakia answers »), les trois touches, « Continue » jusqu'à la voix, la voix, le plan
  const heroLen = Math.max(1.3, 0.2 + v[4] + 0.15);
  const chooseAt = heroLen;
  const listenAt = chooseAt + (CH_TO - Q_FROM) / flex.chRate;
  // « Then the answer… » peut commencer pendant les dernières touches : elle annonce la voix qui suit
  const vo6At = Math.max(chooseAt + 0.3 + v[5] + 0.3, listenAt + (HOME_VOICE.t - CH_TO) / 2.2 - v[6] - 0.15);
  const appVoiceAt = Math.max(listenAt + (HOME_VOICE.t - CH_TO) / 2.2, vo6At + v[6] + 0.15);
  const listenLen = appVoiceAt - listenAt;
  const planAt = appVoiceAt + flex.appVoice;
  scene("web", planAt + v[7] + 0.5, { heroLen, chooseAt, listenAt, listenLen, vo6At, appVoiceAt, planAt });
  // les quatre autres chemins, un téléphone après l'autre
  for (const [id, i] of [["app", 8], ["telegram", 9], ["call", 10], ["sms", 11]]) scene(id, Math.max(flex.panel, 0.15 + v[i] + 0.6));
  scene("unsure", Math.max(3.6, 0.15 + v[12] + 0.4));
  scene("proof", Math.max(4.6, 0.15 + v[13] + 0.5));
  scene("end", Math.max(3.0, 0.3 + v[14] + 0.8));
  return { S, total: t, v };
}
let P = plan();
for (const shrink of [() => (flex.chRate = 1.5), () => (flex.appVoice = 2.0), () => (flex.panel = 2.2), () => (flex.tempo = 1.04), () => (flex.tempo = 1.08)]) {
  if (P.total <= MAXLEN) break;
  shrink();
  P = plan();
}
if (P.total > MAXLEN) console.log(`ATTENTION : la démo dure ${P.total.toFixed(1)} s (> ${MAXLEN}) : raccourcir une phrase`);
const { S, v } = P;
const A = (id, dt = 0) => S[id].at + dt;
const E = (id) => S[id].at + S[id].len;
const WEB = (k) => A("web", S.web[k]);
export const PLAN = { S, VO_AT: [] };

const VO_AT = PLAN.VO_AT;
VO_AT[0] = A("noor", 0.3);
VO_AT[1] = A("read", 0.15);
VO_AT[2] = A("aquifer", 0.15);
VO_AT[3] = A("question", 0.15);
VO_AT[4] = A("web", 0.2);
VO_AT[5] = WEB("chooseAt") + 0.3;
const APP_VOICE = WEB("appVoiceAt");
VO_AT[6] = WEB("vo6At");
VO_AT[7] = WEB("planAt");
VO_AT[8] = A("app", 0.15);
VO_AT[9] = A("telegram", 0.15);
VO_AT[10] = A("call", 0.15);
VO_AT[11] = A("sms", 0.15);
VO_AT[12] = A("unsure", 0.15);
VO_AT[13] = A("proof", 0.15);
VO_AT[14] = A("end", 0.3);

// ---------------------------------------------------------------- le site, en un seul plan continu (vitesse variable, sans saute)
const webSegs = [
  { at: A("web"), clip: "home", from: HERO_TO - S.web.heroLen, to: HERO_TO },
  { at: WEB("chooseAt"), clip: "home", from: Q_FROM, to: CH_TO, rate: flex.chRate, xfade: 0.12 },
  { at: WEB("listenAt"), clip: "home", from: CH_TO, to: HOME_VOICE.t, rate: (HOME_VOICE.t - CH_TO) / S.web.listenLen, xfade: 0.01 },
  { at: APP_VOICE, clip: "home", from: HOME_VOICE.t, to: HOME_VOICE.t + 14, xfade: 0.01 },
];
const chT = (tap) => WEB("chooseAt") + (tap - Q_FROM) / flex.chRate;
const STEPS = [
  [HOME.taps[1], "1", "Region: Kairouan"],
  [HOME.taps[3], "2", "Crop: pepper"],
  [HOME.taps[4], "3", "Last watered: 4 days ago"],
];

// d'un chemin à l'autre, le téléphone glisse (entre par la droite, sort par la gauche), toujours au même endroit ;
// les deux bougent ensemble (même fenêtre de 0,45 s) : il y a toujours un téléphone à l'écran
const SW0 = 0.3, SW1 = 0.15;
const swipeIn = (id) => [[A(id) - SW0, PHONE.x + 900], [A(id) + SW1, PHONE.x]];
const swipeOut = (id) => [[E(id) - SW0, PHONE.x], [E(id) + SW1, PHONE.x - 1500]];
const swipe = (id) => ({ x: [...swipeIn(id), ...swipeOut(id)] });
const WAYS = [
  ["web", "🌐", "Website"],
  ["app", "📲", "App"],
  ["telegram", "✈️", "Telegram"],
  ["call", "📞", "Call"],
  ["sms", "💬", "SMS"],
];
const bar = (active) =>
  `<div class="waybar">${WAYS.map(([id, ic, label], i) => `<span class="${id === active ? "on" : i < WAYS.findIndex((w) => w[0] === active) ? "done" : ""}"><i>${ic}</i>${label}</span>`).join("")}</div>`;
const barLayer = (active, start, end) => ({ type: "html", start, end, fx: "none", fadeIn: 0.2, fadeOut: 0.15, html: bar(active) });
// un chapitre du film en plein écran ; le suivant s'ouvre par-dessus
const filmLayer = (media, start, end, from, rate = 1) => ({ type: "video", start, end, fadeIn: 0.35, fadeOut: 0.01, x: 0, y: 0, w: 1920, h: 1080, segments: [{ at: start, media, from, to: from + (end - start) * rate + 0.5, rate }] });
const NOOR_Q = 7.7; // dans 01-meet-noor : « Irrigate today… or wait? » remplace « Meet Noor. » (chapitre de 11,0 s)

const voEvents = vo
  ? vo.takes
      .filter((t) => t.start != null)
      .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.06, rate: flex.tempo !== 1 ? flex.tempo : undefined }))
  : [];
const voDuck = VO_AT.map((at, i) => ({ from: at - 0.1, to: at + v[i] + 0.1 }));
const MUSIC = ["videos/build/music-emotion.mp3", "videos/build/music-cine-3.wav"].find((f) => existsSync(f));

export default {
  name: "sakia-demo",
  fps: 30,
  duration: Math.round(P.total * 100) / 100,
  css: `
    .end-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .end-logo{width:150px;height:150px;color:#f4efe6;margin-bottom:26px}
    .end-logo svg{width:100%;height:100%}
    .end-name{font:900 120px/1 Fraunces,serif;letter-spacing:-.02em;color:#fff}
    .end-tag{font:800 64px/1.1 Fraunces,serif;color:#f2b33d;margin-top:18px}
    .end-doors{font:600 38px/1.35 Geist,sans-serif;color:#d6e6d2;margin-top:34px;max-width:1300px}
    .end-url{font:700 34px Geist,sans-serif;color:#fff;margin-top:40px;padding:14px 30px;border-radius:999px;background:rgba(255,255,255,.1)}
    .end-small{font:500 22px/1.4 Geist,sans-serif;color:rgba(244,239,230,.7);margin-top:34px;max-width:1250px}
    .waybar{position:absolute;left:${X}px;top:150px;display:flex;gap:10px}
    .waybar span{display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;border:2px solid rgba(255,255,255,.22);color:rgba(244,239,230,.55);font:700 21px Geist,sans-serif;white-space:nowrap}
    .waybar span i{font-style:normal;font-size:20px}
    .waybar span.done{color:rgba(244,239,230,.75);border-color:rgba(242,179,61,.5)}
    .waybar span.on{background:#f4efe6;border-color:#f4efe6;color:#12301f;transform:scale(1.08)}
    .keys{position:absolute;left:${X}px;top:520px;width:${W}px;display:flex;flex-direction:column;gap:12px}
    .keys span{display:inline-flex;align-self:flex-start;align-items:center;gap:14px;padding:12px 22px;border-radius:18px;background:rgba(255,255,255,.95);color:#14231a;font:800 32px Geist,sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.3);transform-origin:left center}
    .keys span b{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:#12301f;color:#fff;font:900 28px Geist,sans-serif}
    .lang{position:absolute;left:${X}px;top:520px;display:inline-flex;align-items:center;gap:14px;padding:14px 26px;border-radius:20px;background:#f2b33d;color:#2a1d05;font:800 34px Geist,sans-serif;box-shadow:0 14px 32px rgba(0,0,0,.35);transform-origin:left center}
    .plane{position:absolute;left:${PHONE.x + 170}px;top:${PHONE.y - 470}px;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 26px Geist,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .note.tgtag{padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.45);color:#fff;font:700 20px Geist,sans-serif;width:auto}
  `,
  media: {
    noor: { file: `${FILM}/01-meet-noor.mp4` },
    read: { file: `${FILM}/02a-problem-literacy.mp4` },
    aquifer: { file: `${FILM}/02b-problem-aquifer.mp4` },
    proof: { file: `${FILM}/06-proof.mp4` },
    ...(TG ? { tg: { file: TG, scale: "-2:1296" } } : {}),
  },
  layers: [
    { type: "bg", style: "green" },

    // ---------------------------------------------------------------- 1. le problème : chapitres du film (Noor, la lecture, la nappe, la question)
    filmLayer("noor", 0, E("noor") + 0.4, 2.85),
    filmLayer("read", A("read") - 0.15, E("read") + 0.4, 0.3),
    filmLayer("aquifer", A("aquifer") - 0.15, E("aquifer") + 0.4, 0.3),
    { ...filmLayer("noor", A("question") - 0.15, E("question"), NOOR_Q, Math.min(1, (11.0 - NOOR_Q) / (S.question.len + 0.15))), fadeOut: 0.35 },

    // ---------------------------------------------------------------- 2. la solution, sur le vrai site (un seul plan continu)
    barLayer("web", A("web", 0.3), E("web")),
    { type: "chip", start: A("web", 0.3), end: E("web") - 0.2, x: X, y: 240, text: "REAL · WORKS END TO END", tone: "real" },
    { type: "caption", start: VO_AT[4], end: WEB("chooseAt") - 0.05, x: X, y: 320, w: W, size: 96, text: "__Sakia__ answers.", stagger: 0.12 },
    { type: "caption", start: VO_AT[5], end: VO_AT[6] - 0.05, x: X, y: 320, w: W, text: "Three taps, __with pictures.__", stagger: 0.08 },
    { type: "html", start: WEB("chooseAt"), end: WEB("listenAt") + 0.3, fx: "none", fadeOut: 0.25, html: `<div class="keys">${STEPS.map(([t, n, label]) => `<span data-at="${Math.max(0.1, chT(t) - WEB("chooseAt")).toFixed(2)}" data-fx="pop" data-rot="-5"><b>${n}</b>${label}</span>`).join("")}</div>` },
    { type: "caption", start: VO_AT[6], end: VO_AT[7] - 0.05, x: X, y: 320, w: W, text: "The answer, __spoken.__", stagger: 0.1 },
    { type: "html", start: APP_VOICE - 0.3, end: VO_AT[7] - 0.05, fx: "none", fadeOut: 0.2, html: `<div class="lang" data-at="0" data-fx="pop" data-rot="-4">🔊 AI voice · Tunisian Arabic</div>` },
    {
      type: "phone", start: A("web"), end: E("web") + SW1, fadeIn: 0.2, fadeOut: 0.01, enterFrom: "bottom",
      y: PHONE.y,
      x: swipeOut("web"),
      zoom: [[VO_AT[7] - 0.1, { s: 1, ox: 0.5, oy: 0.5 }], [VO_AT[7] + 0.9, { s: 1.3, ox: 0.5, oy: 0.6 }]],
      segments: webSegs,
    },
    { type: "caption", start: VO_AT[7], end: E("web") - 0.2, x: X, y: 320, w: W, text: "Irrigate __today:__ 214 m³ per hectare.", stagger: 0.07 },
    { type: "note", start: VO_AT[7] + 0.5, end: E("web") - 0.2, x: X, y: 960, w: W, text: "Real advice of 4 October 2026, Kairouan: Open-Meteo forecast and a fixed FAO-56 water balance." },

    // ---------------------------------------------------------------- 3. la même réponse, quatre autres chemins
    barLayer("app", A("app"), E("app")),
    { type: "chip", start: A("app"), end: E("app") - 0.1, x: X, y: 240, text: "REAL · NO NETWORK", tone: "real" },
    { type: "caption", start: VO_AT[8], end: E("app") - 0.1, x: X, y: 320, w: W, text: "The same answer in the app, __even offline.__", stagger: 0.07 },
    { type: "phone", start: A("app") - SW0, end: E("app") + SW1, fadeIn: 0.01, fadeOut: 0.01, offline: true, y: PHONE.y, ...swipe("app"), segments: [{ at: A("app"), clip: "offline", from: OFF.marks.reopened + 0.4, to: OFF.marks.reopened + 0.4 + S.app.len + 0.5 }] },
    { type: "html", start: A("app", 0.4), end: E("app") - 0.2, fx: "zoom", html: `<div class="plane">✈ No network</div>` },

    barLayer("telegram", A("telegram"), E("telegram")),
    { type: "chip", start: A("telegram"), end: E("telegram") - 0.1, x: X, y: 240, text: "REAL", tone: "real" },
    { type: "caption", start: VO_AT[9], end: E("telegram") - 0.1, x: X, y: 320, w: W, size: 96, text: "On __Telegram.__", stagger: 0.12 },
    ...(TG
      ? [
          { type: "phone", start: A("telegram") - SW0, end: E("telegram") + SW1, fadeIn: 0.01, fadeOut: 0.01, statusBar: false, taps: false, y: PHONE.y, ...swipe("telegram"), segments: [{ at: A("telegram"), media: "tg", from: TG_PLAN, to: TG_PLAN + S.telegram.len + 0.5 }] },
          { type: "note", start: A("telegram", 0.4), end: E("telegram") - 0.1, x: X, y: 520, cls: "tgtag", text: "Filmed on Anthony's phone, 4 October" },
        ]
      : []),

    barLayer("call", A("call"), E("call")),
    { type: "chip", start: A("call"), end: E("call") - 0.1, x: X, y: 240, text: "SIMULATED", tone: "sim" },
    { type: "caption", start: VO_AT[10], end: E("call") - 0.1, x: X, y: 320, w: W, text: "With a __simple phone call.__", stagger: 0.08 },
    { type: "phone", start: A("call") - SW0, end: E("call") + SW1, fadeIn: 0.01, fadeOut: 0.01, y: PHONE.y, ...swipe("call"), zoom: { s: 1.3, ox: 0.5, oy: 0.39 }, segments: [{ at: A("call"), clip: "call", from: ADV.t + ADV_FROM - 0.2, to: ADV.t + ADV_FROM - 0.2 + S.call.len + 0.5 }] },

    barLayer("sms", A("sms"), E("sms")),
    { type: "chip", start: A("sms"), end: E("sms") - 0.1, x: X, y: 240, text: "SIMULATED", tone: "sim" },
    { type: "caption", start: VO_AT[11], end: E("sms") - 0.1, x: X, y: 320, w: W, text: "Or by __text message.__", stagger: 0.08 },
    { type: "phone", start: A("sms") - SW0, end: E("sms") + SW1, fadeIn: 0.01, fadeOut: 0.01, y: PHONE.y, ...swipe("sms"), segments: [{ at: A("sms"), clip: "sms", from: SMS.marks.read - 0.2, to: SMS.marks.read + 0.3 }], zoom: [[A("sms", 0.5), { s: 1, ox: 0.5, oy: 0.5 }], [A("sms", 1.1), { s: 1.3, ox: 0.5, oy: 0.27 }]] },
    { type: "note", start: A("call", 0.4), end: E("sms") - 0.1, x: X, y: 960, w: W, text: "Call and SMS are simulated in the browser: a real line needs a telephone operator." },

    // ---------------------------------------------------------------- 4. le garde-fou (éliminatoire dans le barème)
    { type: "chip", start: A("unsure"), end: E("unsure") - 0.1, x: X, y: 240, text: "SAFEGUARD", tone: "info" },
    { type: "caption", start: VO_AT[12], end: E("unsure") - 0.1, x: X, y: 320, w: W, text: "Not sure? Sakia __says so__, and asks a person to check.", stagger: 0.07 },
    { type: "phone", start: A("unsure") - SW0, end: E("unsure") + 0.4, fadeIn: 0.01, fadeOut: 0.01, y: PHONE.y, x: swipeIn("unsure"), segments: [{ at: A("unsure"), clip: "notsure", from: UNSURE.marks.notsure - 0.3, to: UNSURE.marks.notsure + 1.0 }], zoom: [[A("unsure", 0.4), { s: 1, ox: 0.5, oy: 0.5 }], [A("unsure", 1.2), { s: 1.18, ox: 0.5, oy: 0.42 }]] },

    // ---------------------------------------------------------------- 5. la preuve (chapitre du film : simulation sur la météo observée)
    filmLayer("proof", A("proof") - 0.1, E("proof") + 0.4, 0.6),

    // ---------------------------------------------------------------- 6. fin
    {
      type: "html", start: A("end", 0.05), end: E("end"), fadeIn: 0.4, fadeOut: 0.01, fx: "zoom",
      html: `<div class="end-wrap"><div class="end-logo" data-at="0">{{WHEEL}}</div><div class="end-name" data-at="0.15">Sakia</div><div class="end-tag" data-at="0.4">One decision a day.</div><div class="end-doors" data-at="0.8">Can't read? Listen. No smartphone? Call. No network? It's already on your phone.</div><div class="end-url" data-at="1.2">sakia-opal.vercel.app</div><div class="end-small" data-at="1.5">Call and SMS are simulated in the browser. Web, app and Telegram are real. Noor is a persona from the challenge brief. The advice is indicative: a person decides.${vo?.synthetic ? " Narration: synthetic voice (ElevenLabs)." : ""}</div></div>`,
    },
  ],
  music: {
    // musique d'ElevenLabs à −12 LUFS, voix off à −20 : la musique reste audible sous la voix (≈ 13 dB dessous)
    file: MUSIC, gain: vo ? -14 : -12, duckGain: -7, fadeIn: 0.8, fadeOut: 2.0,
    duck: [{ from: APP_VOICE - 0.2, to: APP_VOICE + flex.appVoice + 0.2 }, ...(vo ? voDuck : [])],
  },
  audio: [
    // la voix de l'appli (le vrai message du jour, en arabe tunisien), au moment où l'écran passe « en lecture »
    { file: `capture:home/${HOME_VOICE.file}`, at: APP_VOICE, from: 0, to: flex.appVoice, gain: 1, fadeOut: 0.5 },
    ...voEvents,
  ],
};
console.log(`démo : ${P.total.toFixed(1)} s (${vo ? "voix off" : "durées estimées"} ; tempo ${flex.tempo}, touches ×${flex.chRate}, voix de l'appli ${flex.appVoice} s)`);
