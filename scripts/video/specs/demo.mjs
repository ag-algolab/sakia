// Partition de la vidéo « Product demo » (≤ 60 s) : le vrai site filmé en format téléphone, texte animé, voix de l'appli,
// et la voix off d'Anthony si elle est enregistrée. La partition se CALE SUR SA VOIX : chaque scène dure le temps de ses
// phrases (prises trouvées par takes.mjs dans videos/build/takes/demo-vo.json), sinon une durée estimée (≈ 2,4 mots/s).
// Les morceaux filmés s'adaptent (accélérés au plus de 50 %). Si le total dépasse 59,5 s, les parties souples rétrécissent.
// Rendu : node scripts/video/compose.mjs scripts/video/specs/demo.mjs
// Instants des morceaux filmés : videos/build/capture/<séquence>/meta.json (repères notés pendant le tournage).
import { existsSync, readFileSync } from "node:fs";

const X = 150; // colonne des textes
const W = 860;
const PHONE = { x: 1335, y: 540 };
const MAXLEN = 59.5;

// ---------------------------------------------------------------- la voix off (texte du prompteur, onglet « Demo »)
export const VO_LINES = [
  "Noor can't read.",
  "Every morning, one question: water today, or wait?",
  "Noor picks the crop and the last watering, with pictures.",
  "Sakia answers out loud, in a Tunisian-accented voice.",
  "Then a seven-day plan, in pictures: wait today, water on Tuesday.",
  "And every morning, the answer comes by itself on Telegram.",
  "No smartphone? Noor calls, and presses a key…",
  "…or gets a text message. Both are simulated here.",
  "No network? The installed app still opens, and recomputes the plan.",
  "Not enough data? Sakia says so: ask a technician.",
  "Sakia. One decision a day.",
];
const TAKES = "videos/build/takes/demo-vo.json";
const vo = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : null;
const voDur = VO_LINES.map((line, i) => {
  const tk = vo?.takes?.find((t) => t.line === i && t.start != null);
  return tk ? tk.end - tk.start : line.split(/\s+/).length / 2.4 + 0.3;
});

// vidéos d'Anthony (téléphone), si elles sont là
const RUSHES = "C:/Users/antho/Videos/sakia-film/rushes";
const TG = [`${RUSHES}/telegram.mp4`, `${RUSHES}/telegram.mov`].find((f) => existsSync(f));
const PLANE = [`${RUSHES}/avion.mp4`, `${RUSHES}/avion.mov`, `${RUSHES}/airplane.mp4`].find((f) => existsSync(f));

// ---------------------------------------------------------------- souplesse : ce qu'on peut raccourcir si c'est trop long
const flex = { appVoice: 3.6, tgAudio: TG ? 2.4 : 0, chooseMin: 5.6, tempo: 1.0, keys: 5 };
function plan() {
  const v = voDur.map((d) => d / flex.tempo);
  const S = {};
  let t = 0;
  const scene = (id, len) => {
    S[id] = { at: t, len };
    t += len;
  };
  scene("hook", Math.max(5.2, 0.4 + v[0] + 0.25 + v[1] + 0.6));
  scene("choose", Math.max(flex.chooseMin, 0.3 + v[2] + 0.9));
  const listenVoiceAt = 0.2 + v[3] + 0.3; // la voix de l'appli démarre après la phrase d'Anthony
  scene("listen", listenVoiceAt + flex.appVoice + 0.25 + v[4] + 0.6);
  S.listen.voiceAt = listenVoiceAt;
  scene("telegram", Math.max(5.0, 0.2 + v[5] + 0.3 + flex.tgAudio + 0.4));
  const keysLen = flex.keys === 5 ? 5.9 : 4.1;
  const adviceAt = Math.max(0.2 + v[6] + 0.3, keysLen);
  scene("call", adviceAt + 3.2 + 0.25 + v[7] + 0.5);
  S.call.adviceAt = adviceAt;
  S.call.keysLen = keysLen;
  scene("offline", Math.max(4.6, 0.2 + v[8] + 0.7));
  scene("notsure", Math.max(4.0, 0.2 + v[9] + 0.6));
  scene("end", Math.max(3.4, 0.3 + v[10] + 1.3));
  return { S, total: t, v };
}
let P = plan();
for (const shrink of [
  () => (flex.appVoice = 2.8),
  () => (flex.keys = 3),
  () => (flex.tgAudio = Math.min(flex.tgAudio, 1.6)),
  () => (flex.chooseMin = 4.8),
  () => (flex.tempo = 1.05),
  () => (flex.tempo = 1.1),
]) {
  if (P.total <= MAXLEN) break;
  shrink();
  P = plan();
}
if (P.total > MAXLEN) console.log(`ATTENTION : la démo dure ${P.total.toFixed(1)} s (> ${MAXLEN}) : raccourcir une phrase de la voix off`);
const { S, v } = P;
const A = (id, dt = 0) => S[id].at + dt; // instant absolu dans une scène
const E = (id) => S[id].at + S[id].len; // fin de scène

// instants absolus des phrases de la voix off
const VO_AT = [];
VO_AT[0] = A("hook", 0.4);
VO_AT[1] = VO_AT[0] + v[0] + 0.25;
VO_AT[2] = A("choose", 0.3);
VO_AT[3] = A("listen", 0.2);
const APP_VOICE = A("listen", S.listen.voiceAt);
VO_AT[4] = APP_VOICE + flex.appVoice + 0.25;
VO_AT[5] = A("telegram", 0.2);
VO_AT[6] = A("call", 0.2);
const ADVICE = A("call", S.call.adviceAt);
VO_AT[7] = ADVICE + 3.2 + 0.25;
VO_AT[8] = A("offline", 0.2);
VO_AT[9] = A("notsure", 0.2);
VO_AT[10] = A("end", 0.3);

// le morceau filmé de l'accueil : la voix de l'appli démarre 1,93 s après le début du morceau 12,9 s (toucher « écouter » à 13,33 s,
// voix à 14,83 s) ; on cale le morceau pour que l'écran « en lecture » tombe avec le son
const LISTEN_SEG_AT = APP_VOICE - 1.93;
// l'appel : la sonnerie puis les touches, en accéléré
const keyClips = [
  { from: 7.6, to: 8.5, tap: 8.07, key: 2 },
  { from: 17.1, to: 18.0, tap: 17.59, key: 1 },
  { from: 25.1, to: 26.0, tap: 25.6, key: 2 },
  { from: 32.9, to: 33.8, tap: 33.4, key: 2 },
  { from: 45.4, to: 46.3, tap: 45.91, key: 2 },
].slice(5 - (S.call.keysLen > 5 ? 5 : 3));
const callSegs = [{ at: A("call"), clip: "call", from: 0.8, to: 2.2 }];
let kAt = A("call", 1.4);
const keyStep = (S.call.keysLen - 1.4) / keyClips.length;
const dtmf = [{ file: "videos/build/ring.wav", at: A("call", 0.75), gain: -6 }];
for (const k of keyClips) {
  callSegs.push({ at: kAt, clip: "call", from: k.from, to: k.to, xfade: 0.12, rate: (k.to - k.from) / keyStep });
  dtmf.push({ file: `videos/build/dtmf-${k.key}.wav`, at: kAt + (k.tap - k.from) * ((keyStep) / (k.to - k.from)), gain: -4 });
  kAt += keyStep;
}
callSegs.push({ at: ADVICE, clip: "call", from: 55.0, to: 58.4, xfade: 0.2 });

const fit = (len, avail) => Math.min(1.5, Math.max(1, len / avail)); // accélération d'un morceau filmé pour tenir dans sa scène

const voEvents = vo
  ? vo.takes
      .filter((t) => t.start != null)
      .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.05, rate: flex.tempo !== 1 ? flex.tempo : undefined, filter: "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" }))
  : [];
const voDuck = VO_AT.map((at, i) => ({ from: at - 0.1, to: at + v[i] + 0.1 }));

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
    .hold{position:absolute;left:${PHONE.x - 236}px;top:${PHONE.y - 492}px;width:472px;height:984px;border-radius:74px;background:#121614;display:flex;align-items:center;justify-content:center;text-align:center;color:#9fb5a5;font:600 30px/1.4 Geist,sans-serif;padding:60px;box-sizing:border-box;border:3px dashed #3c5a47}
    .plane{position:absolute;left:${PHONE.x + 170}px;top:${PHONE.y - 470}px;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 26px Geist,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .bubble{position:absolute;left:${X}px;top:610px;width:${W}px;padding:26px 30px;border-radius:28px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12)}
    .bubble b{display:block;font:800 22px Geist,sans-serif;letter-spacing:.08em;color:#f2b33d;margin-bottom:10px}
    .bubble p{margin:0;font:600 34px/1.35 Geist,sans-serif;color:#fff}
    .bubble .ar{font:700 30px/1.6 Cairo,sans-serif;color:#cfe3d0;direction:rtl;margin-top:12px}
  `,
  media: {
    ...(TG ? { tg: { file: TG, scale: "-2:1080" } } : {}),
    ...(PLANE ? { plane: { file: PLANE, scale: "-2:1080" } } : {}),
  },
  layers: [
    { type: "bg", style: "green" },

    // ---------------------------------------------------------------- 1. accroche
    {
      type: "phone", start: 0.15, end: E("choose"), fadeOut: 0, enterFrom: "bottom", ...PHONE,
      segments: [
        { at: 0.15, clip: "home", from: 0.0, to: 3.6, rate: fit(3.6, S.hook.len - 0.15) },
        { at: A("choose"), clip: "home", from: 3.6, to: 12.9, xfade: 0.01, rate: fit(9.3, S.choose.len) },
      ],
    },
    { type: "caption", start: VO_AT[0], end: E("hook") - 0.1, x: X, y: 300, w: W, size: 104, text: "Noor __can't read.__", stagger: 0.12 },
    { type: "caption", start: VO_AT[0] + 0.9, end: E("hook") - 0.1, x: X, y: 440, w: W, cls: "small", text: "Two hectares near Kairouan, in central Tunisia. A well. Every morning, one question:", stagger: 0.05 },
    { type: "caption", start: VO_AT[1] + v[1] * 0.45, end: E("hook") - 0.1, x: X, y: 600, w: W, size: 72, text: "__Water today, or wait?__", stagger: 0.1 },
    { type: "note", start: VO_AT[0] + 0.5, end: E("hook") - 0.1, x: X, y: 960, w: W, text: "In Kairouan, more than 1 person in 4 aged 10 and over cannot read (INS, 2024 census)." },

    // ---------------------------------------------------------------- 2. choisir avec des images
    { type: "chip", start: A("choose"), end: E("listen") - 0.2, x: X, y: 250, text: "WEB APP · REAL", tone: "real" },
    { type: "caption", start: VO_AT[2], end: E("choose") - 0.2, x: X, y: 330, w: W, text: "Noor picks the crop and the last watering, __with pictures.__", stagger: 0.08 },
    { type: "caption", start: VO_AT[2] + 1.4, end: E("choose") - 0.2, x: X, y: 640, w: W, cls: "small", text: "No reading, no typing: Kairouan, pepper, watered on Friday.", stagger: 0.05 },

    // ---------------------------------------------------------------- 3. écouter, puis le plan
    {
      type: "phone", start: A("listen"), end: E("listen"), fadeIn: 0, fadeOut: 0.3,
      x: PHONE.x,
      y: [[VO_AT[4] - 0.1, PHONE.y], [VO_AT[4] + 1.2, PHONE.y - 175]],
      scale: [[VO_AT[4] - 0.1, 1], [VO_AT[4] + 1.2, 1.2]],
      segments: [
        { at: A("listen"), clip: "home", from: 12.9, to: 12.95 },
        { at: Math.max(A("listen") + 0.05, LISTEN_SEG_AT), clip: "home", from: 12.95, to: 23.0, xfade: 0.01 },
      ],
    },
    { type: "caption", start: VO_AT[3], end: VO_AT[4] - 0.15, x: X, y: 330, w: W, text: "Sakia answers __out loud__, in a Tunisian-accented voice.", stagger: 0.08 },
    { type: "caption", start: VO_AT[4], end: E("listen") - 0.2, x: X, y: 330, w: W, text: "Then a seven-day plan, __in pictures.__", stagger: 0.08 },
    { type: "caption", start: VO_AT[4] + 0.9, end: E("listen") - 0.2, x: X, y: 560, w: W, cls: "sub", text: "Wait today. Water on Tuesday: about 225 m³ per hectare.", stagger: 0.05 },
    { type: "note", start: VO_AT[4] + 1.1, end: E("listen") - 0.2, x: X, y: 960, w: W, text: "Real advice of 4 October 2026, Kairouan, from the Open-Meteo forecast and a fixed FAO-56 water balance." },

    // ---------------------------------------------------------------- 4. chaque matin, Telegram (vidéo du téléphone d'Anthony)
    { type: "chip", start: A("telegram"), end: E("telegram") - 0.2, x: X, y: 250, text: "TELEGRAM · REAL", tone: "real" },
    { type: "caption", start: VO_AT[5], end: E("telegram") - 0.2, x: X, y: 330, w: W, text: "And __every morning__, the answer comes by itself on Telegram.", stagger: 0.08 },
    TG
      ? { type: "phone", start: A("telegram"), end: E("telegram") + 0.1, fadeIn: 0.3, fadeOut: 0.3, statusBar: false, taps: false, ...PHONE, segments: [{ at: A("telegram"), media: "tg", from: 0, to: 30 }] }
      : { type: "html", start: A("telegram") + 0.1, end: E("telegram"), fx: "zoom", html: `<div class="hold">Telegram: the morning message, filmed on Anthony's phone (Sunday morning)</div>` },

    // ---------------------------------------------------------------- 5. appel et SMS, simulés
    { type: "chip", start: A("call"), end: E("call") - 0.2, x: X, y: 250, text: "CALL & SMS · SIMULATED", tone: "sim" },
    { type: "caption", start: VO_AT[6], end: ADVICE - 0.1, x: X, y: 330, w: W, text: "No smartphone? Noor __calls__, and presses a key…", stagger: 0.08 },
    { type: "phone", start: A("call"), end: ADVICE + 3.3, fadeOut: 0, enterFrom: "bottom", ...PHONE, segments: callSegs },
    { type: "caption", start: ADVICE, end: ADVICE + 3.1, x: X, y: 330, w: W, text: "…and hears the advice.", stagger: 0.08 },
    {
      type: "html", start: ADVICE + 0.2, end: ADVICE + 3.1, fx: "up",
      html: `<div class="bubble"><b>SAKIA, ON THE LINE · TUNISIAN-ACCENTED ARABIC</b><p>“Our advice: irrigate on Tuesday 6 October, […] which is 225 cubic metres per hectare.”</p><p class="ar">نصيحتنا: اسقِ يوم الثلاثاء ستة أكتوبر، (…) أي مائتان وخمسة وعشرون متر مكعب للهكتار.</p></div>`,
    },
    { type: "caption", start: ADVICE + 3.3, end: E("call") - 0.2, x: X, y: 330, w: W, text: "…or gets a __text message__.", stagger: 0.08 },
    {
      type: "phone", start: ADVICE + 3.3, end: E("call"), fadeIn: 0.2, fadeOut: 0.3, ...PHONE,
      segments: [{ at: ADVICE + 3.3, clip: "sms", from: 10.4, to: 11.4 }],
      zoom: [
        [ADVICE + 3.9, { s: 1, ox: 0.5, oy: 0.5 }],
        [ADVICE + 4.6, { s: 1.3, ox: 0.5, oy: 0.27 }],
      ],
    },
    { type: "note", start: A("call", 0.5), end: E("call") - 0.2, x: X, y: 960, w: W, text: "Simulated in the browser: a real number needs a telephone operator." },

    // ---------------------------------------------------------------- 6. sans réseau
    { type: "chip", start: A("offline"), end: E("offline") - 0.2, x: X, y: 250, text: "NO NETWORK · REAL", tone: "real" },
    { type: "caption", start: VO_AT[8], end: E("offline") - 0.2, x: X, y: 330, w: W, text: "No network? The installed app __still opens__, and recomputes the plan.", stagger: 0.07 },
    PLANE
      ? { type: "phone", start: A("offline"), end: E("offline"), fadeIn: 0.2, fadeOut: 0.2, statusBar: false, taps: false, ...PHONE, segments: [{ at: A("offline"), media: "plane", from: 0, to: 30 }] }
      : { type: "phone", start: A("offline"), end: E("offline"), fadeIn: 0.2, fadeOut: 0.2, offline: true, ...PHONE, segments: [{ at: A("offline"), clip: "offline", from: 0.7, to: 6.7, rate: fit(6.0, S.offline.len) }] },
    { type: "html", start: A("offline", 0.4), end: E("offline") - 0.2, fx: "zoom", html: `<div class="plane">✈ Airplane mode</div>` },

    // ---------------------------------------------------------------- 7. pas sûr
    { type: "chip", start: A("notsure"), end: E("notsure") - 0.2, x: X, y: 250, text: "SAFEGUARD", tone: "info" },
    { type: "caption", start: VO_AT[9], end: E("notsure") - 0.2, x: X, y: 330, w: W, text: "Not enough data? Sakia says so: __ask a technician.__", stagger: 0.08 },
    {
      type: "phone", start: A("notsure"), end: E("notsure") + 0.1, fadeIn: 0.2, fadeOut: 0.4, ...PHONE,
      segments: [{ at: A("notsure"), clip: "notsure", from: 9.2, to: 11.0 }],
      zoom: [
        [A("notsure", 1.6), { s: 1, ox: 0.5, oy: 0.5 }],
        [A("notsure", 2.6), { s: 1.16, ox: 0.5, oy: 0.4 }],
      ],
    },

    // ---------------------------------------------------------------- 8. fin
    {
      type: "html", start: A("end", 0.1), end: E("end"), fadeOut: 0.01, fx: "zoom",
      html: `<div class="end-wrap"><div class="end-logo" data-at="0">{{WHEEL}}</div><div class="end-name" data-at="0.15">Sakia</div><div class="end-tag" data-at="0.4">One decision a day.</div><div class="end-doors" data-at="0.8">Can't read? Listen. No smartphone? Call. No network? It's already on your phone.</div><div class="end-url" data-at="1.3">sakia-opal.vercel.app</div><div class="end-small" data-at="1.6">Call and SMS are simulated in the browser. Web, app and Telegram are real. The advice is indicative: a person decides.</div></div>`,
    },
  ],
  music: {
    file: "videos/build/music-7.wav", gain: vo ? -22 : -19, duckGain: -10, fadeIn: 1.5, fadeOut: 2.5,
    duck: [{ from: APP_VOICE - 0.2, to: APP_VOICE + flex.appVoice + 0.2 }, { from: ADVICE - 0.2, to: ADVICE + 3.4 }, ...(vo ? voDuck : [])],
  },
  audio: [
    // la voix de l'appli (le vrai message du jour, voix à l'accent tunisien), au moment où l'écran passe « en lecture »
    { file: "capture:home/audio-01.mp3", at: APP_VOICE, from: 0, to: flex.appVoice, gain: 0, fadeOut: 0.7 },
    ...dtmf,
    // la phrase du conseil au téléphone (fichier du jour de la ligne vocale, même plan que l'écran)
    { file: "videos/build/call-advice-ar.mp3", at: ADVICE + 0.05, from: 8.08, to: 11.3, gain: 0, fadeOut: 0.6 },
    ...(TG ? [{ file: "media:tg", at: VO_AT[5] + v[5] + 0.3, from: 3.0, to: 3.0 + flex.tgAudio, gain: 0, fadeIn: 0.1, fadeOut: 0.4 }] : []),
    ...voEvents,
  ],
};
console.log(`démo : ${P.total.toFixed(1)} s (${vo ? "voix off d'Anthony" : "durées estimées, sans voix off"} ; voix de l'appli ${flex.appVoice} s, ${keyClips.length} touches, tempo ${flex.tempo})`);
