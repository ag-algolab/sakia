// Partition de la vidéo « Product demo » (≤ 60 s) : le vrai site filmé en format téléphone, texte animé, voix de l'appli,
// la vidéo Telegram d'Anthony et une voix off. Structure : l'accroche, puis « une décision, cinq façons de la recevoir », puis
// les cinq façons l'une après l'autre (site, appli sans réseau, Telegram, appel, SMS) avec une barre qui dit où l'on en est.
// La partition se CALE SUR LA VOIX OFF (videos/build/takes/demo-vo.json : prises d'Anthony ou voix de synthèse, tts-vo.mjs).
// Les instants des morceaux filmés sont lus dans chaque séquence (videos/build/capture/<séquence>/meta.json).
// Rendu : node scripts/video/compose.mjs scripts/video/specs/demo.mjs
import { existsSync, readFileSync, statSync } from "node:fs";

const X = 150; // colonne des textes
const W = 860;
const PHONE = { x: 1335, y: 540 };
const MAXLEN = 59.5;

// ---------------------------------------------------------------- la voix off
export const VO_LINES = [
  "Noor can't read.",
  "Every morning, one question: water today, or wait?",
  "Sakia gives one decision, and five ways to get it.",
  "On the website, Noor chooses with pictures.",
  "Sakia answers out loud, in a Tunisian-accented voice.",
  "Then a seven-day plan, in pictures: irrigate today.",
  "Installed as an app, it even works with no network.",
  "On Telegram, the plan arrives every morning, and Noor can listen to it.",
  "No smartphone? One phone call, a few keys, and the advice.",
  "Or by text message. Both are simulated here.",
  "Sakia. One decision a day.",
];
const TAKES = "videos/build/takes/demo-vo.json";
const voRaw = existsSync(TAKES) ? JSON.parse(readFileSync(TAKES, "utf8")) : null;
// une voix off enregistrée pour un autre texte (ancienne version) est ignorée : on retombe sur les durées estimées
const vo = voRaw && voRaw.takes?.length === VO_LINES.length && voRaw.takes.every((t, i) => t.text === VO_LINES[i]) ? voRaw : null;
if (voRaw && !vo) console.log("voix off d'une ancienne version du texte : ignorée (relancer tts-vo.mjs demo)");
const voDur = VO_LINES.map((line, i) => {
  const tk = vo?.takes?.find((t) => t.line === i && t.start != null);
  return tk ? tk.end - tk.start : line.split(/\s+/).length / 2.6 + 0.3;
});

// vidéo du téléphone d'Anthony (Telegram) : la voix du robot y démarre à 26 s
const DL = "C:/Users/antho/Downloads";
const TG = [`${DL}/telegram.mp4`, "C:/Users/antho/Videos/sakia-film/rushes/telegram.mp4"].find((f) => existsSync(f));
const TG_MENU = [0.5, 15.0], TG_PLAN = 15.6, TG_VOICE = 26.1;

// ---------------------------------------------------------------- morceaux filmés (repères, touches, sons)
const meta = (clip) => {
  const m = JSON.parse(readFileSync(`videos/build/capture/${clip}/meta.json`, "utf8"));
  const f0 = m.frames[0].t;
  const rel = (t) => (t - f0) / 1000;
  return {
    marks: Object.fromEntries(Object.entries(m.marks).map(([k, t]) => [k, rel(t)])),
    taps: m.taps.map((tp) => rel(tp.t)),
    audio: m.audio.map((a) => ({ ...a, t: rel(a.t), size: statSync(`videos/build/capture/${clip}/${a.file}`).size })),
  };
};
const HOME = meta("home"), CALL = meta("call"), SMS = meta("sms"), OFF = meta("offline");
const H_Q = HOME.marks.questions, H_L = HOME.marks.listen;
const HOME_VOICE = HOME.audio.find((a) => a.file) ?? { t: H_L + 1.9, file: "audio-01.mp3" };
const ADV = CALL.audio.reduce((best, a) => (!best || a.size > best.size ? a : best), null); // le conseil = le plus gros son
// la phrase « Our advice: … » : sous-titres de la ligne vocale pour ce même conseil (son et instants du même fichier)
const ADV_JSON = existsSync("videos/build/call-advice-cache.json") ? JSON.parse(readFileSync("videos/build/call-advice-cache.json", "utf8")) : null;
const ADV_LINE = ADV_JSON?.lines?.find((l) => l.id === "advice");
const ADV_FROM = (ADV_LINE?.startMs ?? 9760) / 1000;
const ADV_EN = (ADV_LINE?.en ?? "Our advice: irrigate today").split(",")[0];
const ADV_AR = (ADV_LINE?.text ?? "نصيحتنا: اسقِ اليوم").split("،")[0];
const KEY_LABELS = ["2 · Arabic", "1 · Kairouan", "2 · Vegetables", "2 · Pepper", `${process.env.DEMO_CALL_KEY ?? "3"} · Watered 3 to 5 days ago`];

// ---------------------------------------------------------------- durées des scènes (souplesse si c'est trop long)
const flex = { appVoice: 3.4, tgVoice: 2.2, chooseMin: 8.2, tempo: 1.0, keys: 5 };
function plan() {
  const v = voDur.map((d) => d / flex.tempo);
  const S = {};
  let t = 0;
  const scene = (id, len, extra = {}) => {
    S[id] = { at: t, len, ...extra };
    t += len;
  };
  scene("hook", Math.max(5.2, 0.4 + v[0] + 0.25 + v[1] + 0.6));
  scene("ways", Math.max(3.2, 0.2 + v[2] + 0.6));
  scene("choose", Math.max(flex.chooseMin, 0.3 + v[3] + 0.8));
  const voiceAt = 0.2 + v[4] + 0.3;
  scene("listen", voiceAt + flex.appVoice + 0.25 + v[5] + 0.6, { voiceAt });
  scene("app", Math.max(4.0, 0.2 + v[6] + 0.6));
  const tgMenu = 2.6, tgPlan = 2.4;
  const tgVoiceAt = Math.max(0.2 + v[7] + 0.25, tgMenu + tgPlan);
  scene("telegram", tgVoiceAt + flex.tgVoice + 0.3, { tgMenu, tgPlan, tgVoiceAt });
  const keysLen = flex.keys === 5 ? 5.9 : 4.1;
  const adviceAt = Math.max(0.2 + v[8] + 0.25, keysLen);
  scene("call", adviceAt + 3.2 + 0.4, { keysLen, adviceAt });
  scene("sms", Math.max(4.2, 0.2 + v[9] + 0.6));
  scene("end", Math.max(3.2, 0.3 + v[10] + 0.9));
  return { S, total: t, v };
}
let P = plan();
for (const shrink of [() => (flex.appVoice = 2.8), () => (flex.keys = 3), () => (flex.tgVoice = 1.5), () => (flex.chooseMin = 7.6), () => (flex.tempo = 1.05), () => (flex.tempo = 1.1)]) {
  if (P.total <= MAXLEN) break;
  shrink();
  P = plan();
}
if (P.total > MAXLEN) console.log(`ATTENTION : la démo dure ${P.total.toFixed(1)} s (> ${MAXLEN}) : raccourcir une phrase de la voix off`);
const { S, v } = P;
const A = (id, dt = 0) => S[id].at + dt;
const E = (id) => S[id].at + S[id].len;
const fit = (len, avail) => Math.min(1.6, Math.max(1, len / avail));

// instants absolus des phrases de la voix off
const VO_AT = [];
VO_AT[0] = A("hook", 0.4);
VO_AT[1] = VO_AT[0] + v[0] + 0.25;
VO_AT[2] = A("ways", 0.2);
VO_AT[3] = A("choose", 0.3);
VO_AT[4] = A("listen", 0.2);
const APP_VOICE = A("listen", S.listen.voiceAt);
VO_AT[5] = APP_VOICE + flex.appVoice + 0.25;
VO_AT[6] = A("app", 0.2);
VO_AT[7] = A("telegram", 0.2);
VO_AT[8] = A("call", 0.2);
const ADVICE = A("call", S.call.adviceAt);
VO_AT[9] = A("sms", 0.2);
VO_AT[10] = A("end", 0.3);

// l'appel : « appeler », puis chaque touche (avec son sens écrit à côté), puis le conseil parlé
const LISTEN_SEG_AT = APP_VOICE - (HOME_VOICE.t - H_L);
const allKeys = CALL.taps.slice(1, 6).map((tap, i) => ({ from: tap - 0.47, to: tap + 0.43, tap, label: KEY_LABELS[i], key: KEY_LABELS[i][0] }));
const keyClips = S.call.keysLen > 5 ? allKeys : allKeys.slice(2);
const callSegs = [{ at: A("call"), clip: "call", from: CALL.taps[0] - 0.7, to: CALL.taps[0] + 0.7 }];
let kAt = A("call", 1.4);
const keyStep = (S.call.keysLen - 1.4) / keyClips.length;
const dtmf = [{ file: "videos/build/ring.wav", at: A("call", 0.75), gain: -6 }];
const keyTimes = [];
for (const k of keyClips) {
  callSegs.push({ at: kAt, clip: "call", from: k.from, to: k.to, xfade: 0.12, rate: (k.to - k.from) / keyStep });
  const tTap = kAt + (k.tap - k.from) * (keyStep / (k.to - k.from));
  dtmf.push({ file: `videos/build/dtmf-${k.key === "1" ? 1 : 2}.wav`, at: tTap, gain: -4 });
  keyTimes.push({ t: tTap, label: k.label });
  kAt += keyStep;
}
callSegs.push({ at: ADVICE, clip: "call", from: ADV.t + ADV_FROM + 0.2, to: ADV.t + ADV_FROM + 3.6, xfade: 0.2 });

// le choix sur le site : chaque toucher écrit à côté (région, culture, dernier arrosage), au rythme du morceau filmé
const CH_FROM = H_Q - 0.2;
const CH_RATE = Math.min(1.25, Math.max(1, (H_L - CH_FROM) / S.choose.len));
const chT = (tap) => A("choose") + (tap - CH_FROM) / CH_RATE;
const STEPS = [
  [HOME.taps[1], "1", "Region: Kairouan"],
  [HOME.taps[3], "2", "Crop: pepper"],
  [HOME.taps[4], "3", "Last watering: 4 days ago"],
].filter(([t]) => t != null);

// barre des cinq façons : laquelle on regarde
const WAYS = [
  ["web", "🌐", "Website"],
  ["app", "📲", "App"],
  ["telegram", "✈️", "Telegram"],
  ["call", "📞", "Call"],
  ["sms", "💬", "SMS"],
];
const bar = (active) =>
  `<div class="waybar">${WAYS.map(([id, ic, label], i) => `<span class="${id === active ? "on" : i < WAYS.findIndex((w) => w[0] === active) ? "done" : ""}"><i>${ic}</i>${i + 1} · ${label}</span>`).join("")}</div>`;
const barLayer = (active, start, end) => ({ type: "html", start, end, fx: "none", fadeIn: 0.2, fadeOut: 0.15, html: bar(active) });

const voEvents = vo
  ? vo.takes
      .filter((t) => t.start != null)
      .map((t) => ({ file: vo.file, at: VO_AT[t.line], from: t.start, to: t.end, gain: 0, fadeIn: 0.02, fadeOut: 0.05, rate: flex.tempo !== 1 ? flex.tempo : undefined, filter: vo.synthetic ? undefined : "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" }))
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
    .waybar{position:absolute;left:${X}px;top:150px;display:flex;gap:10px}
    .waybar span{display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:999px;border:2px solid rgba(255,255,255,.22);color:rgba(244,239,230,.55);font:700 21px Geist,sans-serif;white-space:nowrap}
    .waybar span i{font-style:normal;font-size:20px}
    .waybar span.done{color:rgba(244,239,230,.75);border-color:rgba(242,179,61,.5)}
    .waybar span.on{background:#f4efe6;border-color:#f4efe6;color:#12301f;transform:scale(1.08)}
    .ways{position:absolute;left:0;right:0;top:470px;display:flex;justify-content:center;gap:26px}
    .way{width:250px;padding:24px 16px 20px;border-radius:30px;background:rgba(255,255,255,.95);text-align:center;box-shadow:0 20px 44px rgba(0,0,0,.35)}
    .way i{display:block;font-style:normal;font-size:76px;line-height:1.1}
    .way b{display:block;font:900 34px/1.1 Fraunces,serif;color:#14231a;margin-top:10px}
    .way em{display:inline-block;margin-top:12px;padding:6px 14px;border-radius:999px;font:800 17px Geist,sans-serif;font-style:normal;letter-spacing:.08em}
    .way em.r{background:#2f7d4a;color:#fff}.way em.s{background:#f2b33d;color:#2a1d05}
    .keys{position:absolute;left:${X}px;top:560px;width:${W}px;display:flex;flex-direction:column;gap:12px}
    .keys span{display:inline-flex;align-self:flex-start;align-items:center;gap:14px;padding:12px 22px;border-radius:18px;background:rgba(255,255,255,.95);color:#14231a;font:800 32px Geist,sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.3);transform-origin:left center}
    .keys span b{display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:12px;background:#12301f;color:#fff;font:900 28px Geist,sans-serif}
    .plane{position:absolute;left:${PHONE.x + 170}px;top:${PHONE.y - 470}px;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 26px Geist,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    .bubble{position:absolute;left:${X}px;top:560px;width:${W}px;padding:26px 30px;border-radius:28px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.12)}
    .bubble b{display:block;font:800 22px Geist,sans-serif;letter-spacing:.08em;color:#f2b33d;margin-bottom:10px}
    .bubble p{margin:0;font:600 38px/1.35 Geist,sans-serif;color:#fff}
    .bubble .ar{font:700 34px/1.6 Cairo,sans-serif;color:#cfe3d0;direction:rtl;margin-top:12px}
    .tgtag{position:absolute;left:${PHONE.x + 150}px;top:${PHONE.y + 410}px;padding:10px 18px;border-radius:999px;background:rgba(0,0,0,.55);color:#fff;font:700 20px Geist,sans-serif}
  `,
  media: TG ? { tg: { file: TG, scale: "-2:1296" } } : {},
  layers: [
    { type: "bg", style: "green" },

    // ---------------------------------------------------------------- 1. accroche
    { type: "phone", start: 0.15, end: E("hook") + 0.05, fadeOut: 0.35, enterFrom: "bottom", ...PHONE, segments: [{ at: 0.15, clip: "home", from: 0.0, to: H_Q, rate: fit(H_Q, S.hook.len - 0.15) }] },
    { type: "caption", start: VO_AT[0], end: E("hook") - 0.1, x: X, y: 300, w: W, size: 104, text: "Noor __can't read.__", stagger: 0.12 },
    { type: "caption", start: VO_AT[0] + 0.9, end: E("hook") - 0.1, x: X, y: 440, w: W, cls: "small", text: "Two hectares near Kairouan, in central Tunisia. A well. Every morning, one question:", stagger: 0.05 },
    { type: "caption", start: VO_AT[1] + v[1] * 0.45, end: E("hook") - 0.1, x: X, y: 600, w: W, size: 72, text: "__Water today, or wait?__", stagger: 0.1 },
    { type: "note", start: VO_AT[0] + 0.5, end: E("hook") - 0.1, x: X, y: 960, w: W, text: "In Kairouan, more than 1 person in 4 aged 10 and over cannot read (INS, 2024 census)." },

    // ---------------------------------------------------------------- 2. une décision, cinq façons
    { type: "caption", start: A("ways", 0.1), end: E("ways") - 0.1, x: 0, y: 230, w: 1920, size: 92, align: "center", text: "One decision. __Five ways__ to get it.", stagger: 0.09 },
    {
      type: "html", start: A("ways", 0.3), end: E("ways") - 0.05, fx: "none", fadeOut: 0.2,
      html: `<div class="ways">${WAYS.map(([id, ic, label], i) => `<div class="way" data-at="${(0.35 + i * 0.22).toFixed(2)}" data-fx="pop" data-rot="${i % 2 ? 8 : -8}"><i>${ic}</i><b>${label}</b><em class="${id === "call" || id === "sms" ? "s" : "r"}">${id === "call" || id === "sms" ? "SIMULATED" : "REAL"}</em></div>`).join("")}</div>`,
    },

    // ---------------------------------------------------------------- 3. le site : choisir avec des images, écouter, le plan
    barLayer("web", A("choose"), E("listen")),
    { type: "chip", start: A("choose"), end: E("listen") - 0.2, x: X, y: 240, text: "REAL", tone: "real" },
    { type: "phone", start: A("choose"), end: E("choose") + 0.02, fadeIn: 0.3, fadeOut: 0, enterFrom: "bottom", ...PHONE, segments: [{ at: A("choose"), clip: "home", from: H_Q - 0.2, to: H_L, rate: CH_RATE }] },
    { type: "caption", start: VO_AT[3], end: E("choose") - 0.2, x: X, y: 320, w: W, text: "On the website, Noor chooses __with pictures.__", stagger: 0.07 },
    { type: "html", start: A("choose", 0.2), end: E("choose") - 0.1, fx: "none", fadeOut: 0.2, html: `<div class="keys">${STEPS.map(([t, n, label]) => `<span data-at="${(chT(t) - A("choose", 0.2)).toFixed(2)}" data-fx="pop" data-rot="-5"><b>${n}</b>${label}</span>`).join("")}</div>` },
    {
      type: "phone", start: A("listen"), end: E("listen"), fadeIn: 0, fadeOut: 0.3,
      x: PHONE.x,
      y: [[VO_AT[5] - 0.1, PHONE.y], [VO_AT[5] + 1.2, PHONE.y - 175]],
      scale: [[VO_AT[5] - 0.1, 1], [VO_AT[5] + 1.2, 1.2]],
      segments: [
        { at: A("listen"), clip: "home", from: H_L, to: H_L + 0.05 },
        { at: Math.max(A("listen") + 0.05, LISTEN_SEG_AT), clip: "home", from: H_L + 0.05, to: H_L + 10.1, xfade: 0.01 },
      ],
    },
    { type: "caption", start: VO_AT[4], end: VO_AT[5] - 0.15, x: X, y: 320, w: W, text: "Sakia answers __out loud__, in a Tunisian-accented voice.", stagger: 0.08 },
    { type: "caption", start: VO_AT[5], end: E("listen") - 0.2, x: X, y: 320, w: W, text: "Then a seven-day plan, __in pictures.__", stagger: 0.08 },
    { type: "caption", start: VO_AT[5] + 0.9, end: E("listen") - 0.2, x: X, y: 560, w: W, cls: "sub", text: "Today: irrigate, 214 m³ per hectare.", stagger: 0.05 },
    { type: "note", start: VO_AT[5] + 1.1, end: E("listen") - 0.2, x: X, y: 960, w: W, text: "Real advice of 4 October 2026, Kairouan, from the Open-Meteo forecast and a fixed FAO-56 water balance." },

    // ---------------------------------------------------------------- 4. l'appli, sans réseau
    barLayer("app", A("app"), E("app")),
    { type: "chip", start: A("app"), end: E("app") - 0.2, x: X, y: 240, text: "REAL · NO NETWORK", tone: "real" },
    { type: "caption", start: VO_AT[6], end: E("app") - 0.2, x: X, y: 320, w: W, text: "Installed as an app, it even works __with no network.__", stagger: 0.07 },
    { type: "phone", start: A("app"), end: E("app"), fadeIn: 0.2, fadeOut: 0.2, offline: true, ...PHONE, segments: [{ at: A("app"), clip: "offline", from: OFF.marks.reopened + 0.1, to: OFF.marks.reopened + 6.1, rate: fit(6.0, S.app.len) }] },
    { type: "html", start: A("app", 0.4), end: E("app") - 0.2, fx: "zoom", html: `<div class="plane">✈ No network</div>` },

    // ---------------------------------------------------------------- 5. Telegram (vidéo du téléphone d'Anthony : vrai menu, vrai plan, vraie voix)
    barLayer("telegram", A("telegram"), E("telegram")),
    { type: "chip", start: A("telegram"), end: E("telegram") - 0.2, x: X, y: 240, text: "REAL", tone: "real" },
    { type: "caption", start: VO_AT[7], end: E("telegram") - 0.2, x: X, y: 320, w: W, text: "On __Telegram__, the plan arrives every morning, and Noor can listen to it.", stagger: 0.07 },
    ...(TG
      ? [
          {
            type: "phone", start: A("telegram"), end: E("telegram") + 0.05, fadeIn: 0.25, fadeOut: 0.25, statusBar: false, taps: false, ...PHONE,
            segments: [
              { at: A("telegram"), media: "tg", from: TG_MENU[0], to: TG_MENU[1], rate: (TG_MENU[1] - TG_MENU[0]) / S.telegram.tgMenu },
              { at: A("telegram", S.telegram.tgMenu), media: "tg", from: TG_PLAN, to: TG_PLAN + S.telegram.tgPlan + 0.5, xfade: 0.15 },
              { at: A("telegram", S.telegram.tgVoiceAt), media: "tg", from: TG_VOICE, to: TG_VOICE + flex.tgVoice + 0.4, xfade: 0.15 },
            ],
          },
          { type: "note", start: A("telegram", 0.4), end: E("telegram") - 0.2, x: PHONE.x + 120, y: PHONE.y + 420, cls: "tgtag", text: "Anthony's phone, 4 Oct" },
        ]
      : []),

    // ---------------------------------------------------------------- 6. l'appel (simulé) : un seul appel, quelques touches, le conseil
    barLayer("call", A("call"), E("call")),
    { type: "chip", start: A("call"), end: E("call") - 0.2, x: X, y: 240, text: "SIMULATED", tone: "sim" },
    { type: "caption", start: VO_AT[8], end: ADVICE - 0.1, x: X, y: 320, w: W, text: "No smartphone? __One phone call,__ a few keys…", stagger: 0.07 },
    { type: "html", start: A("call", 1.2), end: ADVICE - 0.05, fx: "none", fadeOut: 0.2, html: `<div class="keys">${keyTimes.map((k) => `<span data-at="${(k.t - A("call", 1.2)).toFixed(2)}" data-fx="pop" data-rot="-6"><b>${k.label.split(" · ")[0]}</b>${k.label.split(" · ")[1]}</span>`).join("")}</div>` },
    { type: "phone", start: A("call"), end: E("call"), fadeOut: 0.3, enterFrom: "bottom", ...PHONE, segments: callSegs },
    { type: "caption", start: ADVICE, end: E("call") - 0.2, x: X, y: 320, w: W, text: "…and hears the advice.", stagger: 0.08 },
    { type: "html", start: ADVICE + 0.2, end: E("call") - 0.2, fx: "up", html: `<div class="bubble"><b>SAKIA, ON THE LINE · TUNISIAN-ACCENTED ARABIC</b><p>“${ADV_EN} […]”</p><p class="ar">${ADV_AR} (…)</p></div>` },
    { type: "note", start: A("call", 0.5), end: E("call") - 0.2, x: X, y: 960, w: W, text: "Simulated in the browser: a real number needs a telephone operator." },

    // ---------------------------------------------------------------- 7. le SMS (simulé)
    barLayer("sms", A("sms"), E("sms")),
    { type: "chip", start: A("sms"), end: E("sms") - 0.2, x: X, y: 240, text: "SIMULATED", tone: "sim" },
    { type: "caption", start: VO_AT[9], end: E("sms") - 0.2, x: X, y: 320, w: W, text: "Or by __text message.__", stagger: 0.08 },
    {
      type: "phone", start: A("sms"), end: E("sms"), fadeIn: 0.25, fadeOut: 0.3, ...PHONE,
      segments: [{ at: A("sms"), clip: "sms", from: SMS.marks.read - 0.76, to: SMS.marks.read + 0.24 }],
      zoom: [
        [A("sms", 0.7), { s: 1, ox: 0.5, oy: 0.5 }],
        [A("sms", 1.4), { s: 1.3, ox: 0.5, oy: 0.27 }],
      ],
    },
    { type: "note", start: A("sms", 0.5), end: E("sms") - 0.2, x: X, y: 960, w: W, text: "Call and SMS are simulated in the browser: a real line needs a telephone operator." },

    // ---------------------------------------------------------------- 9. fin
    {
      type: "html", start: A("end", 0.1), end: E("end"), fadeOut: 0.01, fx: "zoom",
      html: `<div class="end-wrap"><div class="end-logo" data-at="0">{{WHEEL}}</div><div class="end-name" data-at="0.15">Sakia</div><div class="end-tag" data-at="0.4">One decision a day.</div><div class="end-doors" data-at="0.8">Can't read? Listen. No smartphone? Call. No network? It's already on your phone.</div><div class="end-url" data-at="1.3">sakia-opal.vercel.app</div><div class="end-small" data-at="1.6">Call and SMS are simulated in the browser. Web, app and Telegram are real. The advice is indicative: a person decides.${vo?.synthetic ? " Narration: synthetic voice (ElevenLabs)." : ""}</div></div>`,
    },
  ],
  music: {
    file: "videos/build/music-7.wav", gain: vo ? -22 : -19, duckGain: -10, fadeIn: 1.5, fadeOut: 2.5,
    duck: [{ from: APP_VOICE - 0.2, to: APP_VOICE + flex.appVoice + 0.2 }, { from: ADVICE - 0.2, to: ADVICE + 3.4 }, ...(TG ? [{ from: A("telegram", S.telegram.tgVoiceAt) - 0.2, to: A("telegram", S.telegram.tgVoiceAt) + flex.tgVoice + 0.2 }] : []), ...(vo ? voDuck : [])],
  },
  audio: [
    // la voix de l'appli (le vrai message du jour), au moment où l'écran passe « en lecture »
    { file: `capture:home/${HOME_VOICE.file}`, at: APP_VOICE, from: 0, to: flex.appVoice, gain: 0, fadeOut: 0.7 },
    ...dtmf,
    // la phrase du conseil au téléphone (fichier du jour de la ligne vocale, calé sur ses sous-titres)
    { file: existsSync("videos/build/call-advice-ar.mp3") ? "videos/build/call-advice-ar.mp3" : `capture:call/${ADV.file}`, at: ADVICE + 0.05, from: ADV_FROM, to: ADV_FROM + 3.2, gain: 0, fadeOut: 0.6 },
    // la voix du robot Telegram, enregistrée sur le téléphone d'Anthony
    ...(TG ? [{ file: "media:tg", at: A("telegram", S.telegram.tgVoiceAt), from: TG_VOICE, to: TG_VOICE + flex.tgVoice, gain: 2, fadeIn: 0.08, fadeOut: 0.35 }] : []),
    ...voEvents,
  ],
};
console.log(`démo : ${P.total.toFixed(1)} s (${vo ? (vo.synthetic ? "voix off de synthèse" : "voix off d'Anthony") : "durées estimées, sans voix off"} ; voix de l'appli ${flex.appVoice} s, ${keyClips.length} touches, voix Telegram ${flex.tgVoice} s, tempo ${flex.tempo})`);
