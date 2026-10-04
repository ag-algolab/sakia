// Partition de la vidéo « Product demo » (≤ 60 s), écrite comme un PITCH calé sur le barème Banque mondiale
// (docs/WB-EXIGENCES.md) : le problème (Noor ne lit pas, la nappe est surexploitée), la solution qui marche de bout en bout
// (le vrai site, filmé, en un seul plan continu), la langue locale nommée, la même réponse sur quatre autres téléphones dont un
// SANS RÉSEAU, le garde-fou « pas sûr : demander à une personne » (éliminatoire), la preuve chiffrée (simulation), la fin.
// Règles d'Anthony (4 oct., 09 h 20 et 09 h 40) : peu de choses à l'écran, chacune assez longtemps pour être vue ; AUCUN zoom
// (ni avancée lente sur le film, ni recadrage dans un téléphone, ni entrée en grossissant : « le zoom, c'est moche »). Visuels : chapitres du film /story (tenus sur leur image clé), séquences filmées du vrai site, vidéo
// Telegram d'Anthony. La partition se cale sur la voix off (videos/build/takes/demo-vo.json, tts-vo.mjs).
// Rendu : node scripts/video/compose.mjs scripts/video/specs/demo.mjs
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
  // hors ligne APRÈS installation (l'appli a besoin du réseau une première fois) : rien qui ressemble à de la publicité mensongère
  "Once installed, the app gives the same answer, even offline.",
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

// vidéo Telegram d'Anthony (4 oct., 07:24) : question « dernier arrosage » à 11,5 s, plan à 15,6 s, « Voice bulletin » touché
// à 18 s, message vocal arrivé à 26 s puis lu
const TG = ["C:/Users/antho/Downloads/telegram.mp4", "C:/Users/antho/Videos/sakia-film/rushes/telegram.mp4"].find((f) => existsSync(f));

// ---------------------------------------------------------------- morceaux filmés du site (repères, touches, sons)
const meta = (clip) => {
  const m = JSON.parse(readFileSync(`videos/build/capture/${clip}/meta.json`, "utf8"));
  const f0 = m.frames[0].t;
  const rel = (t) => (t - f0) / 1000;
  return {
    capturedAt: m.capturedAt,
    end: rel(m.frames.at(-1).t),
    marks: Object.fromEntries(Object.entries(m.marks).map(([k, t]) => [k, rel(t)])),
    taps: m.taps.map((tp) => rel(tp.t)),
    audio: m.audio.map((a) => ({ ...a, t: rel(a.t), size: statSync(`videos/build/capture/${clip}/${a.file}`).size })),
  };
};
const HOME = meta("home"), CALL = meta("call"), SMS = meta("sms"), OFF = meta("offline"), UNSURE = meta("notsure");
const HOME_VOICE = HOME.audio.find((a) => a.file) ?? { t: HOME.marks.listen + 1.9, file: "audio-01.mp3" };
// Le site en un seul plan, sans coupe (accueil du 4 oct., PR n° 10/11 : le champ est déjà rempli, « Change » ouvre les questions).
// Les touches à vitesse lisible, les ouvertures et fermetures de fenêtres plus vite : morceaux contigus, donc aucune saute.
const M = HOME.marks;
const H_Q = M.questions; // l'accueil vient de descendre sur « Your field »
const CH_TO = M.continued + 0.3; // « Continue » touché
const choosePieces = (r) => [
  [H_Q - 0.1, M.tapChange + 1.2, 1.8], // « Change » : les trois questions s'ouvrent
  [M.tapChange + 1.2, M.tapKairouan + 0.35, r], // la région, en images
  [M.tapKairouan + 0.35, M.tapKairouan + 1.15, 2], // la fenêtre se ferme
  [M.tapKairouan + 1.15, M.tapPepper + 0.35, r], // la culture, en images
  [M.tapPepper + 0.35, M.tapLast + 0.3, r], // le dernier arrosage
  [M.tapLast + 0.3, CH_TO, 2], // « Continue »
];
const piecesLen = (ps) => ps.reduce((s, [a, b, rate]) => s + (b - a) / rate, 0);
// appel : la question « quand avez-vous arrosé ? », la touche 3, puis « Irrigation advice for Kairouan, crop: Pepper. » ;
// on s'arrête avant le chiffre (la tranche « 3 à 5 jours » compte 5 jours à l'appel, 4 jours sur les autres canaux)
const CALL_KEY = CALL.taps.at(-1);

// ---------------------------------------------------------------- scènes (durées calées sur la voix)
const flex = { appVoice: 2.6, panel: 2.5, tempo: 1.0, chRate: 1.25 };
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
  const listenAt = chooseAt + piecesLen(choosePieces(flex.chRate));
  // « Then the answer… » peut commencer pendant les dernières touches : elle annonce la voix qui suit
  const vo6At = Math.max(chooseAt + 0.3 + v[5] + 0.3, listenAt + (HOME_VOICE.t - CH_TO) / 2.2 - v[6] - 0.15);
  const appVoiceAt = Math.max(listenAt + (HOME_VOICE.t - CH_TO) / 2.2, vo6At + v[6] + 0.15);
  const listenLen = appVoiceAt - listenAt;
  const planAt = appVoiceAt + flex.appVoice;
  scene("web", planAt + v[7] + 0.5, { heroLen, chooseAt, listenAt, listenLen, vo6At, appVoiceAt, planAt });
  // les quatre autres téléphones, côte à côte : chacun arrive quand la voix le nomme, et reste
  for (const [id, i] of [["app", 8], ["telegram", 9], ["call", 10], ["sms", 11]]) scene(id, Math.max(flex.panel, 0.15 + v[i] + 0.6));
  scene("unsure", Math.max(3.6, 0.15 + v[12] + 0.4));
  scene("proof", Math.max(4.6, 0.15 + v[13] + 0.5));
  scene("end", Math.max(3.0, 0.3 + v[14] + 0.8));
  return { S, total: t, v };
}
let P = plan();
for (const shrink of [() => (flex.appVoice = 2.2), () => (flex.panel = 2.3), () => (flex.chRate = 1.35), () => (flex.tempo = 1.04), () => (flex.tempo = 1.08)]) {
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
const PIECES = choosePieces(flex.chRate);
const webSegs = [
  // l'accueil (« Kairouan · today »), puis la descente vers « Your field »
  { at: A("web"), clip: "home", from: H_Q - 2.3, to: H_Q - 0.1, rate: 2.2 / S.web.heroLen },
  ...PIECES.map(([a, b, rate], i) => ({ at: WEB("chooseAt") + piecesLen(PIECES.slice(0, i)), clip: "home", from: a, to: b, rate, xfade: 0.01 })),
  { at: WEB("listenAt"), clip: "home", from: CH_TO, to: HOME_VOICE.t, rate: (HOME_VOICE.t - CH_TO) / S.web.listenLen, xfade: 0.01 },
  { at: APP_VOICE, clip: "home", from: HOME_VOICE.t, to: HOME_VOICE.t + 14, xfade: 0.01 },
];
// instant, dans la vidéo, d'un moment de la séquence filmée pendant le choix
const chT = (src) => {
  let t = WEB("chooseAt");
  for (const [a, b, rate] of PIECES) {
    if (src <= b) return t + Math.max(0, src - a) / rate;
    t += (b - a) / rate;
  }
  return t;
};
// « The answer, spoken. » s'affiche une fois la 3e touche faite (la voix, elle, l'annonce un peu avant)
const ANSWER_CAP = Math.max(VO_AT[6], chT(M.tapLast) + 0.4);
const STEPS = [
  [M.tapKairouan, "1", "Region: Kairouan"],
  [M.tapPepper, "2", "Crop: pepper"],
  [M.tapLast, "3", "Last watered: 4 days ago"],
];

// ---------------------------------------------------------------- les quatre téléphones, côte à côte, entiers (aucun zoom)
const GRID = { y: 600, scale: 0.84, xs: [255, 725, 1195, 1665] };
const G_END = E("sms"); // tous restent jusqu'à la fin de la scène
const gridPhone = (i, id, extra) => ({ type: "phone", start: A(id), end: G_END + 0.3, fadeIn: 0.2, fadeOut: 0.3, enterFrom: "bottom", x: GRID.xs[i], y: GRID.y, scale: GRID.scale, ...extra });
const GRID_LABELS = [
  ["app", "📲", "Installed app, offline", "REAL"],
  ["telegram", "✈️", "Telegram", "REAL"],
  ["call", "📞", "Phone call", "SIMULATED"],
  ["sms", "💬", "SMS", "SIMULATED"],
];
// Telegram : le dernier arrosage choisi, le plan, « Voice bulletin », le message vocal qui arrive et se lit (accéléré, sans saute,
// et jusqu'au bout de son temps à l'écran, fondu de sortie compris)
const span = (id) => G_END + 0.3 - A(id); // temps à l'écran d'un téléphone de la rangée
const TG_V0 = 2.9, TG_W = 1.6; // message vocal (25,5 → 29,5 s à ×1,4) ; attente « sending audio » (19 → 25,5 s à ×4)
const TG_A = Math.max(1.5, span("telegram") - TG_V0 - TG_W);
const tgSegs = [
  { at: A("telegram"), media: "tg", from: 11.5, to: 19.0, rate: 7.5 / TG_A },
  { at: A("telegram") + TG_A, media: "tg", from: 19.0, to: 25.5, rate: 6.5 / TG_W, xfade: 0.01 },
  { at: A("telegram") + TG_A + TG_W, media: "tg", from: 25.5, to: 29.5, rate: 4.0 / TG_V0, xfade: 0.01 },
];

// un chapitre du film en plein écran, joué du début à la fin de la couche sans JAMAIS s'arrêter (une image tenue fige le
// soleil et la roue : interdit) ; ralenti s'il le faut, pour finir pile sur `to` (moins de texte à l'écran)
const filmLayer = (media, start, end, from, to) => ({
  type: "video", start, end, fadeIn: 0.35, fadeOut: 0.01, x: 0, y: 0, w: 1920, h: 1080,
  segments: [{ at: start, media, from, to, rate: (to - from) / (end - start) }],
});
// un téléphone qui joue sa séquence filmée jusqu'au bout de son temps à l'écran (aucune image tenue)
const fill = (from, to, span) => ({ from, to, rate: (to - from) / span });

// 27,9 % : le film va de 0,3 s à READ_TO ; le 4e personnage devient jaune à 2,53 s (film), au moment où la voix dit « Noor »
const READ_SPAN = E("read") + 0.4 - (A("read") - 0.15);
const READ_RATE = (2.53 - 0.3) / Math.min(READ_SPAN - 0.8, VO_AT[1] + 0.65 * v[1] - (A("read") - 0.15));
const READ_TO = 0.3 + READ_SPAN * READ_RATE;
const READ_YELLOW = A("read") - 0.15 + (2.53 - 0.3) / READ_RATE;

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
    .end-logo{width:170px;height:170px;color:#f4efe6;margin-bottom:28px}
    .end-logo svg{width:100%;height:100%}
    .end-name{font:900 132px/1 Fraunces,serif;letter-spacing:-.02em;color:#fff}
    .end-tag{font:800 72px/1.1 Fraunces,serif;color:#f2b33d;margin-top:20px}
    .end-url{font:700 36px Geist,sans-serif;color:#fff;margin-top:48px;padding:14px 32px;border-radius:999px;background:rgba(255,255,255,.1)}
    .end-small{font:500 22px/1.4 Geist,sans-serif;color:rgba(244,239,230,.7);margin-top:40px;max-width:1300px}
    .keys{position:absolute;left:${X}px;top:520px;width:${W}px;display:flex;flex-direction:column;gap:12px}
    .keys span{display:inline-flex;align-self:flex-start;align-items:center;gap:14px;padding:12px 22px;border-radius:18px;background:rgba(255,255,255,.95);color:#14231a;font:800 32px Geist,sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.3);transform-origin:left center}
    .keys span b{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:#12301f;color:#fff;font:900 28px Geist,sans-serif}
    .lang{position:absolute;left:${X}px;top:520px;display:inline-flex;align-items:center;gap:14px;padding:14px 26px;border-radius:20px;background:#f2b33d;color:#2a1d05;font:800 34px Geist,sans-serif;box-shadow:0 14px 32px rgba(0,0,0,.35);transform-origin:left center}
    .glabel{position:absolute;top:118px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;white-space:nowrap;font:800 26px Geist,sans-serif;color:#fff}
    .glabel i{font-style:normal;font-size:26px}
    .glabel em{font-style:normal;font:800 15px Geist,sans-serif;letter-spacing:.08em;padding:5px 10px;border-radius:999px}
    .glabel em.r{background:#2f9a5a;color:#fff}.glabel em.s{background:#f2b33d;color:#2a1d05}
    .noor-tag{position:absolute;left:1740px;top:418px;transform:translateX(-50%);padding:10px 26px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:900 40px Fraunces,serif;box-shadow:0 12px 30px rgba(0,0,0,.4)}
    .pr-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
    .pr-tag{font:800 26px Geist,sans-serif;letter-spacing:.12em;color:#2a1d05;background:#f2b33d;padding:10px 22px;border-radius:999px}
    .pr-big{font:900 230px/1 Fraunces,serif;color:#f2b33d;margin-top:34px;letter-spacing:-.02em}
    .pr-sub{font:700 54px/1.2 Geist,sans-serif;color:#fff;margin-top:22px}
  `,
  media: {
    noor: { file: `${FILM}/01-meet-noor.mp4` },
    read: { file: `${FILM}/02a-problem-literacy.mp4` },
    aquifer: { file: `${FILM}/02b-problem-aquifer.mp4` },
    ...(TG ? { tg: { file: TG, scale: "-2:1296" } } : {}),
  },
  layers: [
    { type: "bg", style: "green" },

    // ---------------------------------------------------------------- 1. le problème : chapitres du film, tenus sur leur image clé
    // (« Meet Noor. 38 years old. » ; « 27.9 % », le 4e personnage devenu jaune ; « 230 % » ; « Irrigate today… or wait? »,
    // pris après la disparition du bloc « Meet Noor » pour qu'il ne repasse pas pendant le fondu)
    // (ralentis : « Meet Noor. » puis ses deux premières lignes ; 27,9 % jusqu'au bulletin barré ; 230 % avant la phrase suivante ;
    // la question jusqu'à la fin du chapitre)
    filmLayer("noor", 0, E("noor") + 0.4, 2.85, 5.45),
    filmLayer("read", A("read") - 0.15, E("read") + 0.4, 0.3, READ_TO),
    // le personnage devenu jaune, c'est Noor : son nom surgit dessous à ce moment-là
    { type: "html", start: READ_YELLOW, end: E("read") + 0.3, fx: "none", fadeIn: 0.01, fadeOut: 0.3, html: `<div class="noor-tag" data-at="0" data-fx="pop" data-rot="-6">Noor</div>` },
    filmLayer("aquifer", A("aquifer") - 0.15, E("aquifer") + 0.4, 0.3, 4.05),
    { ...filmLayer("noor", A("question") - 0.15, E("question"), 8.1, 10.95), fadeOut: 0.35 },

    // ---------------------------------------------------------------- 2. la solution, sur le vrai site (un seul plan continu)
    { type: "chip", start: A("web", 0.3), end: E("web") - 0.2, x: X, y: 240, text: "REAL · WORKS END TO END", tone: "real" },
    { type: "caption", start: VO_AT[4], end: WEB("chooseAt") - 0.05, x: X, y: 320, w: W, size: 96, text: "__Sakia__ answers.", stagger: 0.12 },
    { type: "caption", start: VO_AT[5], end: ANSWER_CAP - 0.05, x: X, y: 320, w: W, text: "Three taps, __with pictures.__", stagger: 0.08 },
    { type: "html", start: WEB("chooseAt"), end: WEB("listenAt") + 0.3, fx: "none", fadeOut: 0.25, html: `<div class="keys">${STEPS.map(([t, n, label]) => `<span data-at="${Math.max(0.1, chT(t) - WEB("chooseAt")).toFixed(2)}" data-fx="pop" data-rot="-5"><b>${n}</b>${label}</span>`).join("")}</div>` },
    { type: "caption", start: ANSWER_CAP, end: VO_AT[7] - 0.05, x: X, y: 320, w: W, text: "The answer, __spoken.__", stagger: 0.1 },
    { type: "html", start: APP_VOICE - 0.3, end: VO_AT[7] - 0.05, fx: "none", fadeOut: 0.2, html: `<div class="lang" data-at="0" data-fx="pop" data-rot="-4">🔊 AI voice · Tunisian Arabic</div>` },
    {
      type: "phone", start: A("web"), end: E("web") + 0.1, fadeIn: 0.2, fadeOut: 0.35, enterFrom: "bottom", ...PHONE,
      segments: webSegs,
    },
    { type: "caption", start: VO_AT[7], end: E("web") - 0.2, x: X, y: 320, w: W, text: "Irrigate __today:__ 214 m³ per hectare.", stagger: 0.07 },

    // ---------------------------------------------------------------- 3. la même réponse sur quatre autres téléphones, qui restent à l'écran
    { type: "caption", start: VO_AT[8], end: G_END, x: 0, y: 26, w: 1920, align: "center", size: 64, text: "The same answer, __on every phone.__", stagger: 0.07 },
    ...GRID_LABELS.map(([id, ic, name, tag], i) => ({
      type: "html", start: A(id), end: G_END + 0.3, fx: "none", fadeIn: 0.2, fadeOut: 0.3,
      html: `<div class="glabel" style="left:${GRID.xs[i]}px" data-at="0.1" data-fx="pop" data-rot="-4"><i>${ic}</i>${name}<em class="${tag === "REAL" ? "r" : "s"}">${tag}</em></div>`,
    })),
    // (l'appli : rouverte sans réseau, puis la voix lancée hors ligne, jusqu'à la fin de la prise)
    gridPhone(0, "app", { offline: true, segments: [{ at: A("app"), clip: "offline", ...fill(OFF.marks.reopened + 0.3, OFF.end, span("app")) }] }),
    ...(TG ? [gridPhone(1, "telegram", { statusBar: false, taps: false, segments: tgSegs })] : []),
    gridPhone(2, "call", { segments: [{ at: A("call"), clip: "call", ...fill(CALL_KEY - 1.5, CALL_KEY - 1.5 + span("call"), span("call")) }] }),
    gridPhone(3, "sms", { segments: [{ at: A("sms"), clip: "sms", ...fill(SMS.end - span("sms"), SMS.end, span("sms")) }] }),

    // ---------------------------------------------------------------- 4. le garde-fou (éliminatoire dans le barème)
    { type: "chip", start: A("unsure", 0.1), end: E("unsure") - 0.1, x: X, y: 240, text: "SAFEGUARD", tone: "info" },
    { type: "caption", start: VO_AT[12], end: E("unsure") - 0.1, x: X, y: 320, w: W, text: "Not sure? Sakia __says so__, and asks a person to check.", stagger: 0.07 },
    { type: "phone", start: A("unsure"), end: E("unsure") + 0.3, fadeIn: 0.2, fadeOut: 0.3, enterFrom: "bottom", ...PHONE, segments: [{ at: A("unsure"), clip: "notsure", ...fill(UNSURE.end - (E("unsure") + 0.3 - A("unsure")), UNSURE.end, E("unsure") + 0.3 - A("unsure")) }] },

    // ---------------------------------------------------------------- 5. la preuve : un seul chiffre
    {
      type: "html", start: A("proof"), end: E("proof"), fadeIn: 0.35, fadeOut: 0.3, fx: "none",
      html: `<div class="pr-wrap"><div class="pr-tag" data-at="0.15">SIMULATION · 11 SEASONS OF OBSERVED WEATHER · KAIROUAN</div><div class="pr-big" data-at="${(0.15 + 0.38 * v[13]).toFixed(2)}" data-fx="pop" data-rot="-3">3 to 27 %</div><div class="pr-sub" data-at="${(0.15 + 0.62 * v[13]).toFixed(2)}">less water pumped, depending on the crop</div></div>`,
    },

    // une lumière douce qui dérive sur toute la vidéo : aucune image n'est jamais figée (même pendant une pause du film)
    { type: "glow", start: 0, end: E("end"), fadeIn: 0.01, fadeOut: 0.01, opacity: 0.07 },

    // ---------------------------------------------------------------- 6. fin
    {
      type: "html", start: A("end", 0.05), end: E("end"), fadeIn: 0.4, fadeOut: 0.01, fx: "none",
      html: `<div class="end-wrap"><div class="end-logo" data-at="0">{{WHEEL}}</div><div class="end-name" data-at="0.15">Sakia</div><div class="end-tag" data-at="0.4">One decision a day.</div><div class="end-url" data-at="0.9">sakia-opal.vercel.app</div><div class="end-small" data-at="1.2">Call and SMS simulated in the browser · Noor is a persona from the challenge brief · Indicative advice: a person decides${vo?.synthetic ? " · Synthetic narration (ElevenLabs)" : ""}</div></div>`,
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
