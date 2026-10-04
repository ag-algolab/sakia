// Fabrique la partition de la vidéo « Team introduction » à partir de la vidéo face caméra d'Anthony :
// les meilleures prises de chaque phrase (takes.mjs), mises bout à bout, avec ses photos et les images générées en
// incrustation, des sous-titres mot à mot, son nom et ses titres, et une fin « réel / simulé ».
// Lancer : node scripts/video/team-build.mjs <vidéo face caméra> [dossier d'images] → videos/build/specs/team.mjs
//   puis : node scripts/video/compose.mjs videos/build/specs/team.mjs
// Prérequis : node --env-file=.env.local scripts/video/takes.mjs <vidéo> scripts/video/specs/team-lines.json videos/build/takes/team.json
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// --profile=local : le passage « localiser l'IA » de la vidéo Banque mondiale (même chaîne, autres incrustations : la méthode en
// six temps et le résultat Kairouan → Maroc / Sahel), prises dans videos/build/takes/local.json.
const PROFILE = (process.argv.find((a) => a.startsWith("--profile=")) ?? "--profile=team").slice(10);
const [video, imagesDir = "C:/Users/antho/Videos/sakia-film/images"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!video) throw new Error("usage : node scripts/video/team-build.mjs <vidéo face caméra> [dossier d'images] [--profile=local]");
const takes = JSON.parse(readFileSync(`videos/build/takes/${PROFILE}.json`, "utf8"));
const LINES = JSON.parse(readFileSync(`scripts/video/specs/${PROFILE}-lines.json`, "utf8"));
void LINES;
const MAX = PROFILE === "local" ? 50 : 59.5;

// images : on reconnaît les vraies photos d'Anthony à leur nom, les autres sont des illustrations générées (étiquetées)
const imgs = existsSync(imagesDir) ? readdirSync(imagesDir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const find = (...keys) => imgs.find((f) => keys.some((k) => f.toLowerCase().includes(k)));
const P = (f) => (f ? path.resolve(imagesDir, f).replace(/\\/g, "/") : null);
const real = {
  grandpa: P(find("grand", "papy", "papi", "jedd", "farmer-photo")),
  campus: P(find("dauphine", "campus", "master")),
  me: P(find("moi", "anthony", "me.", "portrait")),
  farm: P(find("ferme-amie", "friend", "amie")),
};
const ai = {
  wheat: P(find("04", "ble", "wheat")),
  harissa: P(find("01", "harissa")),
  chilies: P(find("02", "piment", "chili")),
  jars: P(find("03", "bocal", "jar")),
  field: P(find("05", "champ", "aerial", "drone")),
  well: P(find("06", "puits", "well")),
  olive: P(find("07", "olivier", "olive")),
  phone: P(find("08", "telephone", "phone")),
  stopped: P(find("09", "arret", "abandon")),
  morning: P(find("10", "matin", "sunrise")),
};

// enchaînement des prises (avec une respiration de 0,12 s), en coupant si l'on dépasse la minute
const GAP = 0.12;
let t = 0.3;
const segs = [];
for (const tk of takes.takes) {
  if (tk.start == null) {
    console.log(`phrase ${tk.line + 1} introuvable dans la vidéo : « ${tk.text.slice(0, 50)} » (elle sera absente)`);
    continue;
  }
  const len = tk.end - tk.start;
  if (t + len > MAX - 3.2) {
    console.log(`phrase ${tk.line + 1} retirée : la vidéo dépasserait 60 s`);
    continue;
  }
  segs.push({ line: tk.line, at: t, from: tk.start, to: tk.end, len, text: tk.text });
  t += len + GAP;
}
const END_AT = t + 0.2;
const DURATION = Math.min(MAX, END_AT + 3.4);

// sous-titres posés sur la ligne de temps du montage. Si la prise suit le texte (accord ≥ 0,9), on écrit le TEXTE (noms bien
// orthographiés) avec le rythme des mots entendus ; sinon on écrit ce qui a été dit, noms propres corrigés.
const GLOSSARY = [
  [/\bgo(?:c|ck|ch|k|kh)m(?:a|e)n\b/gi, "Gocmen"],
  [/\b(?:A\.?\s?G\.?\s?)?Algo\s?Lab\b/gi, "AG Algo Lab"],
  [/\bdolphin(?:e)?\b|\bdauphin\b/gi, "Dauphine"],
  [/\bsak(?:k)?ia\b|\bsaqia\b|\bsakiya\b/gi, "Sakia"],
];
const fix = (s) => GLOSSARY.reduce((acc, [re, to]) => acc.replace(re, to), s);
const words = takes.words;
const subLayers = segs.map((s) => {
  const ws = words.filter((w) => w.start >= s.from - 0.05 && w.end <= s.to + 0.05 && !/^(uh|um|erm|euh)$/i.test(w.text.replace(/[^a-z]/gi, "")));
  const score = takes.takes.find((x) => x.line === s.line)?.score ?? 0;
  const scriptWords = s.text.split(/\s+/);
  let tokens, times;
  if (score >= 0.9 && ws.length) {
    tokens = scriptWords;
    times = scriptWords.map((_, k) => ws[Math.round((k * (ws.length - 1)) / Math.max(1, scriptWords.length - 1))].start);
  } else if (ws.length) {
    // correction sur la phrase entière (un nom peut tenir sur deux mots), puis rythme réparti sur les mots entendus
    tokens = fix(ws.map((w) => w.text).join(" ")).split(/\s+/);
    times = tokens.map((_, k) => ws[Math.round((k * (ws.length - 1)) / Math.max(1, tokens.length - 1))].start);
  } else {
    tokens = scriptWords;
    times = scriptWords.map((_, k) => s.from + (k * s.len) / scriptWords.length);
  }
  return { type: "caption", start: s.at, end: s.at + s.len, fadeOut: 0.12, x: 260, y: 900, w: 1400, cls: "subtitle", align: "center", text: tokens.join(" "), wordsAt: times.map((x) => s.at + (x - s.from)) };
});

// incrustations par phrase (image plein écran par-dessus la vidéo, la voix continue)
const broll = [];
const over = (line, list, label) => {
  const s = segs.find((x) => x.line === line);
  if (!s) return;
  const files = list.filter(Boolean);
  if (!files.length) return;
  const part = s.len / files.length;
  files.forEach((f, i) => {
    const isAi = Object.values(ai).includes(f);
    broll.push({ type: "image", start: s.at + i * part, end: s.at + (i + 1) * part + 0.15, fadeIn: i === 0 ? 0.25 : 0.2, fadeOut: 0.2, src: "file:///" + f, kenburns: { from: [1.04, 0.5, 0.5], to: [1.14, 0.5 + (i % 2 ? 0.04 : -0.04), 0.45] } });
    if (isAi || label) broll.push({ type: "note", start: s.at + i * part + 0.1, end: s.at + (i + 1) * part, x: 1620, y: 40, cls: "ai-tag", text: isAi ? "AI illustration" : label });
  });
};
const LOCAL = PROFILE === "local";
// filmé à la verticale ? (téléphone tenu droit) : la vidéo est montrée entière sur un fond flou plutôt que coupée
const dims = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation", "-of", "json", video]).toString();
const st = JSON.parse(dims).streams?.[0] ?? {};
const rot = Math.abs(Number(st.side_data_list?.find((d) => d.rotation != null)?.rotation ?? 0));
const portrait = rot === 90 || rot === 270 ? st.width > st.height : st.height > st.width;
if (portrait) console.log("vidéo verticale : montrée entière sur fond flou (pour la prochaine fois : téléphone à l'horizontale)");
if (!LOCAL) {
  over(0, [real.grandpa ?? ai.wheat], real.grandpa ? "My grandfather" : null);
  over(2, [real.campus, ai.harissa, ai.chilies].filter(Boolean).slice(0, 2));
  over(3, [real.farm ?? ai.stopped, ai.olive].filter(Boolean));
  over(5, [ai.morning ?? ai.field]);
}

const name = segs.find((s) => s.line === (LOCAL ? 0 : 1));
const team = LOCAL ? null : segs.find((s) => s.line === 6);
const last = segs.find((s) => s.line === 7);
// « localiser l'IA » : le résultat qui fonde la position (phrase 3), puis la méthode en six temps (phrases 6 à 8)
const proof = LOCAL ? segs.find((s) => s.line === 2) : null;
const method = LOCAL ? segs.find((s) => s.line === 5) : null;
const methodEnd = LOCAL ? END_AT : 0;
const localLayers = LOCAL
  ? [
      ...(proof ? [{ type: "html", start: proof.at + 0.4, end: proof.at + proof.len + 2.5, fx: "up", html: `<div class="proofcard"><span>Same small model, trained in Kairouan</span><p data-at="0.3"><b class="ok">✓</b> Central Tunisia</p><p data-at="0.7"><b class="ok">✓</b> Morocco (Haouz)</p><p data-at="1.1"><b class="ko">✗</b> Sudan (Sahel)</p><small data-at="1.5">Error against satellite evapotranspiration, published with the protocol: github.com/ag-algolab/sakia/tree/main/ml</small></div>` }] : []),
      ...(method ? [{ type: "html", start: method.at, end: methodEnd, fx: "up", html: `<div class="method"><span>OUR METHOD</span><ol><li data-at="0.2">Free global data</li><li data-at="1.6">Checked against local reality</li><li data-at="${(segs.find((s) => s.line === 6)?.at ?? method.at + 6) - method.at}">Test written before the run</li><li data-at="${(segs.find((s) => s.line === 6)?.at ?? method.at + 6) - method.at + 1.6}">One small model per climate</li><li data-at="${(last?.at ?? method.at + 10) - method.at}">Failures published</li><li data-at="${(last?.at ?? method.at + 10) - method.at + 1.4}">A technician in the loop</li></ol></div>` }] : []),
    ]
  : [];

const spec = {
  name: LOCAL ? "sakia-local" : "sakia-team",
  fps: 30,
  duration: Math.round((LOCAL ? END_AT + 0.3 : DURATION) * 10) / 10,
  css: `
    .subtitle{font:700 44px/1.25 Geist,sans-serif!important;color:#fff!important;text-shadow:0 2px 12px rgba(0,0,0,.7),0 0 2px rgba(0,0,0,.9);letter-spacing:0!important}
    .lower{position:absolute;left:90px;bottom:200px;padding:22px 30px;border-radius:22px;background:rgba(11,27,20,.82);border-left:8px solid #f2b33d}
    .lower b{display:block;font:900 54px/1.05 Fraunces,serif;color:#fff}
    .lower span{display:block;font:600 28px/1.35 Geist,sans-serif;color:#d6e6d2;margin-top:8px}
    .ai-tag{font:600 20px Geist,sans-serif!important;color:#fff!important;background:rgba(0,0,0,.45);padding:6px 12px;border-radius:8px}
    .teamchip{position:absolute;right:90px;top:90px;padding:16px 26px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 28px Geist,sans-serif;letter-spacing:.06em}
    .endcard{position:absolute;inset:0;background:radial-gradient(1300px 900px at 50% 45%,#1f4a33 0%,#12301f 50%,#0b1b14 100%);display:flex;flex-direction:column;align-items:center;justify-content:center}
    .endcard .logo{width:130px;height:130px;color:#f4efe6}.endcard .logo svg{width:100%;height:100%}
    .endcard b{font:900 110px/1 Fraunces,serif;color:#fff;margin-top:20px}
    .endcard i{font:800 54px Fraunces,serif;font-style:normal;color:#f2b33d;margin-top:14px}
    .endcard .chips{display:flex;gap:18px;margin-top:40px}
    .endcard .chips span{padding:12px 24px;border-radius:999px;font:800 26px Geist,sans-serif;letter-spacing:.08em}
    .endcard .r{background:#2f7d4a;color:#fff}.endcard .s{background:#f2b33d;color:#2a1d05}
    .endcard small{font:600 26px Geist,sans-serif;color:#d6e6d2;margin-top:34px}
    .proofcard{position:absolute;right:80px;top:120px;width:560px;padding:28px 32px;border-radius:26px;background:rgba(11,27,20,.86);border:2px solid rgba(255,255,255,.14)}
    .proofcard span{display:block;font:800 22px Geist,sans-serif;letter-spacing:.08em;color:#f2b33d;margin-bottom:12px;text-transform:uppercase}
    .proofcard p{margin:10px 0;font:700 38px Geist,sans-serif;color:#fff}
    .proofcard .ok{color:#7ad48f;margin-right:14px}.proofcard .ko{color:#ff8a65;margin-right:14px}
    .proofcard small{display:block;margin-top:16px;font:500 18px/1.35 Geist,sans-serif;color:rgba(244,239,230,.7)}
    .method{position:absolute;right:80px;top:110px;width:560px;padding:28px 32px;border-radius:26px;background:rgba(11,27,20,.86);border:2px solid rgba(255,255,255,.14)}
    .method span{display:block;font:800 22px Geist,sans-serif;letter-spacing:.12em;color:#f2b33d}
    .method ol{margin:14px 0 0;padding-left:36px}
    .method li{font:700 32px/1.5 Geist,sans-serif;color:#fff}
  `,
  media: { face: { file: path.resolve(video).replace(/\\/g, "/") } },
  layers: [
    { type: "bg", style: "night" },
    { type: "video", start: 0, end: END_AT, fadeIn: 0.3, fadeOut: 0.3, x: 0, y: 0, w: 1920, h: 1080, ...(portrait ? { fit: "contain" } : {}), segments: segs.map((s) => ({ at: s.at, media: "face", from: s.from, to: s.to })) },
    ...broll,
    ...(name
      ? [{ type: "html", start: name.at + 0.3, end: name.at + name.len, fx: "up", html: LOCAL ? `<div class="lower"><b>Localizing AI</b><span>Anthony Gocmen · living in Tunisia</span></div>` : `<div class="lower"><b>Anthony Gocmen</b><span>Founder, AG Algo Lab · Ambassador, Université Paris Dauphine – PSL<br>Living in Tunisia · master's at the Dauphine campus in Tunis</span></div>` }]
      : []),
    ...(team ? [{ type: "html", start: team.at + 0.2, end: team.at + team.len + 0.6, fx: "zoom", html: `<div class="teamchip">TEAM: 1 HUMAN + 1 AI CODING ASSISTANT</div>` }] : []),
    ...localLayers,
    ...subLayers,
    ...(LOCAL ? [] : [{ type: "html", start: END_AT - 0.1, end: DURATION, fadeIn: 0.4, fadeOut: 0.01, fx: "zoom", html: `<div class="endcard"><div class="logo" data-at="0">{{WHEEL}}</div><b data-at="0.15">Sakia</b><i data-at="0.35">One decision a day.</i><div class="chips" data-at="0.7"><span class="r">● REAL: web, app, Telegram</span><span class="s">● SIMULATED: call, SMS</span></div><small data-at="1.1">sakia-opal.vercel.app · github.com/ag-algolab/sakia</small></div>` }]),
  ],
  music: { file: "videos/build/music-23.wav", gain: -26, duckGain: -8, fadeIn: 1.0, fadeOut: 2.0, duck: segs.map((s) => ({ from: s.at - 0.1, to: s.at + s.len + 0.1 })) },
  audio: segs.map((s) => ({ file: "media:face", at: s.at, from: s.from, to: s.to, gain: 0, fadeIn: 0.03, fadeOut: 0.06, filter: "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" })),
};
if (last) void last;
mkdirSync("videos/build/specs", { recursive: true });
writeFileSync(`videos/build/specs/${PROFILE}.mjs`, `// généré par scripts/video/team-build.mjs — ne pas modifier à la main\nexport default ${JSON.stringify(spec, null, 1)};\n`);
console.log(`partition : videos/build/specs/${PROFILE}.mjs — ${segs.length} phrases, ${DURATION.toFixed(1)} s ; images : ${broll.filter((b) => b.type === "image").length} (photos réelles : ${Object.entries(real).filter(([, v]) => v).map(([k]) => k).join(", ") || "aucune"})`);
