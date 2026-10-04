// Fabrique la partition de la vidéo « Team introduction » à partir de la vidéo face caméra d'Anthony : les meilleures prises
// de chaque phrase (takes.mjs), mises bout à bout, avec des apparitions animées calées sur le mot prononcé (ses projets, le
// post de Dauphine, l'eau de l'État / du puits / de la citerne, l'appel, Sakia, son grand-père), des sous-titres mot à mot,
// son nom et ses titres, et une fin « réel / simulé ».
// Lancer : node scripts/video/team-build.mjs <vidéo face caméra> [--profile=local]  → videos/build/specs/<profil>.mjs
//   puis : node scripts/video/compose.mjs videos/build/specs/team.mjs
// Prérequis : node --env-file=.env.local scripts/video/takes.mjs <vidéo> scripts/video/specs/team-lines.json videos/build/takes/team.json
// Images : videos/assets/team/ (logos des projets, captures, post LinkedIn, photo du grand-père) ; illustrations générées
// facultatives dans C:/Users/antho/Videos/sakia-film/images (étiquetées « AI illustration »).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

// --profile=local : le passage « localiser l'IA » de la vidéo Banque mondiale (la méthode en six temps et le résultat
// Kairouan → Maroc / Sahel), prises dans videos/build/takes/local.json.
const PROFILE = (process.argv.find((a) => a.startsWith("--profile=")) ?? "--profile=team").slice(10);
const LOCAL = PROFILE === "local";
const [video] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!video) throw new Error("usage : node scripts/video/team-build.mjs <vidéo face caméra> [--profile=local]");
const takes = JSON.parse(readFileSync(`videos/build/takes/${PROFILE}.json`, "utf8"));
const MAX = LOCAL ? 50 : 59.5;
const ASSETS = path.resolve("videos/assets/team");
const AI_DIR = "C:/Users/antho/Videos/sakia-film/images";
const url = (p) => (p && existsSync(p) ? "file:///" + path.resolve(p).replace(/\\/g, "/") : null);
const A = (f) => url(path.join(ASSETS, f));
const aiImgs = existsSync(AI_DIR) ? readdirSync(AI_DIR).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)) : [];
const AI = (...keys) => {
  const f = aiImgs.find((x) => keys.some((k) => x.toLowerCase().includes(k)));
  return f ? url(path.join(AI_DIR, f)) : null;
};

// ---------------------------------------------------------------- les prises, bout à bout (accélérées au plus de 8 % si besoin)
const ok = takes.takes.filter((tk) => tk.start != null);
for (const tk of takes.takes) if (tk.start == null) console.log(`phrase ${tk.line + 1} introuvable dans la vidéo : « ${tk.text.slice(0, 50)} » (elle sera absente)`);
const GAP = 0.1;
const END_CARD = LOCAL ? 0 : 3.0;
// deux prises qui se suivent dans l'enregistrement (même passage, coupé en phrases) : collées sans trou ni fondu ;
// deux prises éloignées : un fondu enchaîné court sur l'image (pas de saute sèche)
const contiguous = (i) => i > 0 && ok[i].start - ok[i - 1].end < 0.05;
const speech = ok.reduce((s, tk, i) => s + (tk.end - tk.start) + (i > 0 && !contiguous(i) ? GAP : 0), 0.3);
const rate = Math.min(1.08, Math.max(1, speech / (MAX - END_CARD - 0.2)));
if (rate > 1) console.log(`un peu long : prises accélérées de ${Math.round((rate - 1) * 100)} %`);
if (speech / rate > MAX - END_CARD - 0.2) console.log(`ATTENTION : même accélérée, la vidéo dépasse ${MAX} s : refaire une phrase plus courte`);
let t = 0.3;
const segs = ok.map((tk, i) => {
  if (i > 0 && !contiguous(i)) t += GAP;
  const len = (tk.end - tk.start) / rate;
  const s = { line: tk.line, at: t, from: tk.start, to: tk.end, len, text: tk.text, xfade: i > 0 && !contiguous(i) ? 0.18 : undefined };
  t += len;
  return s;
});
const END_AT = t + 0.1;
const DURATION = Math.min(MAX, END_AT + END_CARD);
const seg = (line) => segs.find((s) => s.line === line);
const words = takes.words;
// instant (dans le montage) où un mot est prononcé dans une phrase ; à défaut, une fraction de la phrase
const at = (line, re, frac = 0.5) => {
  const s = seg(line);
  if (!s) return null;
  const w = words.find((x) => x.start >= s.from - 0.05 && x.end <= s.to + 0.05 && re.test(x.text.toLowerCase().replace(/[^a-z']/g, "")));
  return s.at + ((w ? w.start : s.from + (s.to - s.from) * frac) - s.from) / rate;
};

// ---------------------------------------------------------------- sous-titres (texte écrit, rythme entendu)
const GLOSSARY = [
  [/\bgo(?:c|ck|ch|k|kh)m(?:a|e)n\b/gi, "Gocmen"],
  [/\bgu(?:c|ck|ch|k)k?man+\b/gi, "Gocmen"],
  [/\bsakya\b/gi, "Sakia"],
  [/\b(?:A\.?\s?G\.?\s?)?Algo\s?Lab\b/gi, "AG Algo Lab"],
  [/\bdolphin(?:e)?\b|\bdauphin\b/gi, "Dauphine"],
  [/\bsak(?:k)?ia\b|\bsaqia\b|\bsakiya\b/gi, "Sakia"],
];
const fix = (s) => GLOSSARY.reduce((acc, [re, to]) => acc.replace(re, to), s);
const subLayers = segs.map((s) => {
  const ws = words.filter((w) => w.start >= s.from - 0.05 && w.end <= s.to + 0.05 && !/^(uh|um|erm|euh)$/i.test(w.text.replace(/[^a-z]/gi, "")));
  const score = takes.takes.find((x) => x.line === s.line)?.score ?? 0;
  const scriptWords = s.text.split(/\s+/);
  let tokens, times;
  if (score >= 0.9 && ws.length) {
    tokens = scriptWords;
    times = scriptWords.map((_, k) => ws[Math.round((k * (ws.length - 1)) / Math.max(1, scriptWords.length - 1))].start);
  } else if (ws.length) {
    tokens = fix(ws.map((w) => w.text).join(" ")).split(/\s+/);
    times = tokens.map((_, k) => ws[Math.round((k * (ws.length - 1)) / Math.max(1, tokens.length - 1))].start);
  } else {
    tokens = scriptWords;
    times = scriptWords.map((_, k) => s.from + (k * (s.to - s.from)) / scriptWords.length);
  }
  return { type: "caption", start: s.at, end: s.at + s.len, fadeOut: 0.12, x: 260, y: 920, w: 1400, cls: "subtitle", align: "center", text: tokens.join(" "), wordsAt: times.map((x) => s.at + (x - s.from) / rate) };
});

// ---------------------------------------------------------------- apparitions (vidéo équipe)
const pops = [];
const html = (start, end, body, extra = {}) => pops.push({ type: "html", start, end, fx: "none", fadeIn: 0.15, fadeOut: 0.25, html: body, ...extra });
if (!LOCAL) {
  // prises gardées (scripts/video/specs/team-recorded.mjs) : 0 nom, 1 entrepreneur et ses projets (« I build this, this, this,
  // this, and also this » : un projet surgit à chaque « this »), 2 étudiant à Dauphine, ambassadeur, 3 joueur d'échecs → l'eau →
  // Sakia, 4 la ferme de l'amie, 5 l'appel puis « the water is very unfair », 6 le grand-père (sa phrase reste sur son visage).
  // Pas de mention de l'outil de code (décision d'Anthony).
  const s0 = seg(0), s1 = seg(1), s2 = seg(2), sChess = seg(3), s3 = seg(4), s5 = seg(5);
  const L_FARM = 4, L_CALL = 5;
  // tous les instants (dans le montage) où un mot est prononcé dans une phrase
  const atAll = (line, re) => {
    const s = seg(line);
    if (!s) return [];
    return words.filter((x) => x.start >= s.from - 0.05 && x.end <= s.to + 0.05 && re.test(x.text.toLowerCase().replace(/[^a-z']/g, ""))).map((w) => s.at + (w.start - s.from) / rate);
  };
  // 1. nom et titres
  if (s0) html(s0.at + 0.2, s1 ? at(1, /algo|company/, 0.35) + 0.9 : s0.at + s0.len + 1.2, `<div class="lower" data-at="0" data-fx="slide"><b>Anthony Gocmen</b><span>Founder, AG Algo Lab · Ambassador, Université Paris Dauphine – PSL</span></div>`);
  // 2. AG Algo Lab, puis ses projets, un par « this »
  if (s1) {
    const tAg = at(1, /algo|company/, 0.35);
    const thisAt = atAll(1, /^this$/);
    const tSaas = thisAt[0] ?? at(1, /saas|products/, 0.75);
    const start = tAg - 0.15;
    // fin : peu après « student » (le post de Dauphine arrive ensuite du même côté de l'écran)
    const end = s2 ? Math.min(at(2, /student/, 0.15) + 0.9, at(2, /ambassador/, 0.6) - 0.3) : s1.at + s1.len + 1.0;
    const items = [
      ["logo-moliere.png", "Institut Molière", "Communication school, French & English", "wide"],
      ["logo-kurdi.png", "Kurdi School", "Learn Kurmanji, the family language"],
      ["logo-iae-icon.png", "Passeport IAE", "Exam prep for business schools"],
      ["logo-prepa600.png", "Prépa 600", "TAGE MAGE practice tests"],
      ["logo-jawekbehi.png", "Jawek Behi", "Outings around Greater Tunis"],
    ];
    const step = Math.min(0.42, Math.max(0.24, (end - tSaas - 1.2) / items.length));
    const popAt = (i) => (thisAt.length >= items.length ? thisAt[i] : tSaas + i * step) - start;
    const cards = items
      .map(([f, name, tag, wide], i) => `<div class="saas" data-at="${popAt(i).toFixed(2)}" data-fx="pop" data-rot="${i % 2 ? 9 : -9}"><span class="ico${wide ? " wide" : ""}"><img src="${A(f)}"></span><span class="txt"><b>${name}</b><i>${tag}</i></span></div>`)
      .join("");
    html(start, end, `<div class="agbadge" data-at="0" data-fx="pop"><img src="${A("logo-agalgolab-icon.png")}"><b>AG Algo Lab</b></div><div class="saascol">${cards}</div>`);
  }
  // 3. étudiant à Dauphine (la Tunisie, en haut à gauche), puis ambassadeur (le vrai post LinkedIn, à droite)
  if (s2) {
    const tMaster = at(2, /master/, 0.45), tAmb = at(2, /ambassador/, 0.6);
    html(tMaster - 0.1, s2.at + s2.len + 0.2, `<div class="pin" data-at="0" data-fx="pop">📍 Tunis, Tunisia · master's at the Dauphine campus</div>`);
    html(tAmb - 0.15, s2.at + s2.len + 0.2, `<div class="post" data-at="0" data-fx="slide" data-rot="-2"><img src="${A("linkedin-dauphine.jpg")}"><em>Université Dauphine Tunis, on LinkedIn</em></div>`);
  }
  // 3 bis. joueur d'échecs : des ressources limitées ; ici, la ressource limitée, c'est l'eau ; d'où Sakia
  if (sChess) {
    const tChess = at(3, /chess/, 0.1), tWater = at(3, /water/, 0.7), tSakia = at(3, /sakia|sakya|sakiya|saqia/, 0.95);
    html(tChess - 0.15, sChess.at + sChess.len + 0.7, `<div class="chess" data-at="0" data-fx="pop" data-rot="-6"><span class="pc">♞</span><span><b>Chess player</b><i>limited resources: every move counts</i></span></div><div class="drop" data-at="${(tWater - tChess + 0.15).toFixed(2)}" data-fx="pop" data-rot="5">💧 Here, the limited resource is water</div><div class="sakiabadge" data-at="${(tSakia - tChess + 0.15).toFixed(2)}" data-fx="pop" data-rot="8"><span class="w">{{WHEEL}}</span><b>Sakia</b></div>`);
  }
  // 4. la ferme de l'amie : illustration générée si elle existe (sans zoom), sinon des mots qui surgissent
  if (s3) {
    const img = AI("09", "arret", "abandon");
    if (img) {
      pops.push({ type: "image", start: s3.at + 0.3, end: s3.at + s3.len + 0.1, fadeIn: 0.25, fadeOut: 0.25, src: img, kenburns: { from: [1, 0.5, 0.5], to: [1, 0.5, 0.5] } });
      pops.push({ type: "note", start: s3.at + 0.4, end: s3.at + s3.len, x: 1620, y: 40, cls: "ai-tag", text: "AI illustration" });
    } else {
      const tW = at(L_FARM, /expensive/, 0.8);
      html(s3.at + 0.5, s3.at + s3.len + 0.2, `<div class="words"><span data-at="0" data-fx="pop" data-rot="-6">A family farm,</span><span data-at="0.35" data-fx="pop" data-rot="5">stopped.</span><span class="hot" data-at="${Math.max(0.8, tW - s3.at - 0.5).toFixed(2)}" data-fx="pop" data-rot="-4">💧 Too expensive</span></div>`);
    }
  }
  // 5. l'appel du premier jour, puis « the water is very unfair » : l'État, le puits, la citerne
  if (s5) {
    const tCall = at(L_CALL, /^call$/, 0.25), tUnfair = at(L_CALL, /^water$/, 0.85);
    html(tCall - 0.1, tUnfair - 0.15, `<div class="call" data-at="0" data-fx="pop">📞 <b>Day 1 of the hackathon</b><i>one phone call</i></div>`);
    const card = (k, emoji, title, sub, img) =>
      `<div class="water" data-at="${(k * 0.4).toFixed(2)}" data-fx="pop" data-rot="${title.length % 2 ? 7 : -7}">${img ? `<span class="ph" style="background-image:url('${img}')"></span>` : `<span class="em">${emoji}</span>`}<span><b>${title}</b><i>${sub}</i></span></div>`;
    html(tUnfair - 0.05, s5.at + s5.len + 0.9, `<div class="waterrow">${card(0, "🏛️", "The state", "public schemes", AI("12", "canal"))}${card(1, "🪣", "Their own well", "pumped, paid in fuel", AI("06", "puits", "well"))}${card(2, "🚚", "Tank by tank", "bought water", AI("11", "citerne", "tanker"))}</div>`);
  }
  // 6. le grand-père : sa phrase reste sur son visage (aucune photo : la seule fournie n'était pas lui)
}

// « localiser l'IA » : le résultat qui fonde la position (phrase 3), puis la méthode en six temps (phrases 6 à 8)
const localLayers = [];
if (LOCAL) {
  const name = seg(0), proof = seg(2), method = seg(5), last = seg(7);
  if (name) localLayers.push({ type: "html", start: name.at + 0.3, end: name.at + name.len, fx: "up", html: `<div class="lower"><b>Localizing AI</b><span>Anthony Gocmen · living in Tunisia</span></div>` });
  if (proof) localLayers.push({ type: "html", start: proof.at + 0.4, end: proof.at + proof.len + 2.5, fx: "up", html: `<div class="proofcard"><span>Same small model, trained in Kairouan</span><p data-at="0.3"><b class="ok">✓</b> Central Tunisia</p><p data-at="0.7"><b class="ok">✓</b> Morocco (Haouz)</p><p data-at="1.1"><b class="ko">✗</b> Sudan (Sahel)</p><small data-at="1.5">Error against satellite evapotranspiration, published with the protocol: github.com/ag-algolab/sakia/tree/main/ml</small></div>` });
  if (method) {
    const l6 = seg(6)?.at ?? method.at + 6;
    const l8 = last?.at ?? method.at + 10;
    localLayers.push({ type: "html", start: method.at, end: END_AT, fx: "up", html: `<div class="method"><span>OUR METHOD</span><ol><li data-at="0.2">Free global data</li><li data-at="1.6">Checked against local reality</li><li data-at="${l6 - method.at}">Test written before the run</li><li data-at="${l6 - method.at + 1.6}">One small model per climate</li><li data-at="${l8 - method.at}">Failures published</li><li data-at="${l8 - method.at + 1.4}">A technician in the loop</li></ol></div>` });
  }
}

// filmé à la verticale ? (téléphone tenu droit) : la vidéo est montrée entière sur un fond flou plutôt que coupée
const dims = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:stream_side_data=rotation", "-of", "json", video]).toString();
const st = JSON.parse(dims).streams?.[0] ?? {};
const rot = Math.abs(Number(st.side_data_list?.find((d) => d.rotation != null)?.rotation ?? 0));
const portrait = rot === 90 || rot === 270 ? st.width > st.height : st.height > st.width;
if (portrait) console.log("vidéo verticale : montrée entière sur fond flou (pour la prochaine fois : téléphone à l'horizontale)");

const spec = {
  name: LOCAL ? "sakia-local" : "sakia-team",
  fps: 30,
  duration: Math.round((LOCAL ? END_AT + 0.3 : DURATION) * 100) / 100,
  css: `
    .subtitle{font:700 42px/1.25 Geist,sans-serif!important;color:#fff!important;text-shadow:0 2px 10px rgba(0,0,0,.7);letter-spacing:0!important;background:rgba(8,14,10,.5);padding:10px 22px;border-radius:16px;box-sizing:border-box}
    .lower{position:absolute;left:80px;bottom:190px;padding:22px 30px;border-radius:22px;background:rgba(11,27,20,.84);border-left:8px solid #f2b33d}
    .lower b{display:block;font:900 54px/1.05 Fraunces,serif;color:#fff}
    .lower span{display:block;font:600 27px/1.35 Geist,sans-serif;color:#d6e6d2;margin-top:8px}
    .ai-tag{font:600 20px Geist,sans-serif!important;color:#fff!important;background:rgba(0,0,0,.45);padding:6px 12px;border-radius:8px}
    .agbadge{position:absolute;right:80px;top:70px;display:flex;align-items:center;gap:14px;padding:12px 22px 12px 12px;border-radius:999px;background:#fff;box-shadow:0 14px 34px rgba(0,0,0,.35);transform-origin:right center}
    .agbadge img{width:56px;height:56px;border-radius:50%}
    .agbadge b{font:800 30px Geist,sans-serif;color:#123524}
    .saascol{position:absolute;right:80px;top:170px;width:560px;display:flex;flex-direction:column;gap:14px}
    .saas{display:flex;align-items:center;gap:18px;padding:14px 18px;border-radius:24px;background:rgba(255,255,255,.96);box-shadow:0 16px 36px rgba(0,0,0,.35);transform-origin:right center}
    .saas .ico{width:84px;height:84px;border-radius:20px;overflow:hidden;flex:none;background:#fff;display:flex;align-items:center;justify-content:center}
    .saas .ico img{width:100%;height:100%;object-fit:cover}
    .saas .ico.wide img{object-fit:contain}
    .saas .txt b{display:block;font:800 32px/1.1 Geist,sans-serif;color:#14231a}
    .saas .txt i{display:block;font:600 21px/1.3 Geist,sans-serif;font-style:normal;color:#4b5d50;margin-top:4px}
    .post{position:absolute;right:90px;top:70px;width:430px;padding:14px;border-radius:26px;background:#fff;box-shadow:0 22px 50px rgba(0,0,0,.45)}
    .post img{display:block;width:100%;border-radius:16px}
    .post em{display:block;margin-top:10px;font:600 20px Geist,sans-serif;font-style:normal;color:#4b5d50;text-align:center}
    .pin{position:absolute;left:80px;top:80px;padding:14px 24px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 28px Geist,sans-serif;box-shadow:0 12px 30px rgba(0,0,0,.35);transform-origin:left center}
    .words{position:absolute;right:90px;top:150px;display:flex;flex-direction:column;align-items:flex-end;gap:18px}
    .words span{display:inline-block;padding:14px 28px;border-radius:22px;background:rgba(11,27,20,.86);color:#fff;font:900 60px/1.05 Fraunces,serif;box-shadow:0 14px 34px rgba(0,0,0,.35);transform-origin:right center}
    .words .hot{background:#f2b33d;color:#2a1d05}
    .waterrow{position:absolute;right:80px;top:120px;width:560px;display:flex;flex-direction:column;gap:16px}
    .water{display:flex;align-items:center;gap:18px;padding:14px 18px;border-radius:24px;background:rgba(255,255,255,.96);box-shadow:0 16px 36px rgba(0,0,0,.38);transform-origin:right center}
    .water .ph{display:block;flex:none;width:150px;height:96px;border-radius:14px;background-size:cover;background-position:center}
    .water .em{display:block;flex:none;width:96px;text-align:center;font-size:70px;line-height:1}
    .water b{display:block;font:900 38px/1.1 Fraunces,serif;color:#14231a}
    .water i{display:block;font:600 22px Geist,sans-serif;font-style:normal;color:#4b5d50;margin-top:4px}
    .call{position:absolute;right:90px;top:110px;padding:22px 30px;border-radius:26px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.4);font-size:64px;transform-origin:right center}
    .call b{display:block;font:900 40px/1.1 Fraunces,serif;color:#14231a}
    .call i{display:block;font:600 24px Geist,sans-serif;font-style:normal;color:#4b5d50;margin-top:4px}
    .sakiabadge{position:absolute;right:120px;top:380px;display:flex;align-items:center;gap:18px;padding:18px 34px 18px 18px;border-radius:999px;background:#12301f;border:3px solid #f2b33d;box-shadow:0 18px 40px rgba(0,0,0,.45)}
    .sakiabadge .w{width:84px;height:84px;color:#f4efe6;display:block}.sakiabadge .w svg{width:100%;height:100%}
    .sakiabadge b{font:900 64px Fraunces,serif;color:#fff}
    .chess{position:absolute;right:80px;top:120px;display:flex;align-items:center;gap:20px;padding:18px 28px 18px 18px;border-radius:26px;background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.4);transform-origin:right center}
    .chess .pc{display:flex;align-items:center;justify-content:center;width:96px;height:96px;border-radius:20px;background:#12301f;color:#f4efe6;font-size:72px;line-height:1}
    .chess b{display:block;font:900 42px/1.1 Fraunces,serif;color:#14231a}
    .chess i{display:block;font:600 24px Geist,sans-serif;font-style:normal;color:#4b5d50;margin-top:6px}
    .drop{position:absolute;right:80px;top:290px;padding:16px 30px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:900 44px Fraunces,serif;box-shadow:0 14px 34px rgba(0,0,0,.35);transform-origin:right center}
    .teamchip{position:absolute;right:80px;top:90px;padding:18px 30px;border-radius:999px;background:#f2b33d;color:#2a1d05;font:800 30px Geist,sans-serif;letter-spacing:.06em;box-shadow:0 12px 30px rgba(0,0,0,.35)}
    .gp img:not(.vid-back){filter:sepia(.25) saturate(.9) contrast(1.05)}
    .gplabel{position:absolute;left:80px;bottom:200px;padding:14px 24px;border-radius:14px;background:rgba(0,0,0,.55);color:#fff;font:600 28px Geist,sans-serif}
    .endcard{position:absolute;inset:0;background:radial-gradient(1300px 900px at 50% 45%,rgba(31,74,51,.55) 0%,rgba(18,48,31,.35) 55%,rgba(11,27,20,0) 100%);display:flex;flex-direction:column;align-items:center;justify-content:center}
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
    { type: "video", start: 0, end: END_AT, fadeIn: 0.3, fadeOut: 0.3, x: 0, y: 0, w: 1920, h: 1080, ...(portrait ? { fit: "contain" } : {}), segments: segs.map((s) => ({ at: s.at, media: "face", from: s.from, to: s.to, rate, xfade: s.xfade })) },
    ...pops,
    ...localLayers,
    ...subLayers,
    // la carte de fin laisse voir le fond animé (roue, vagues) et une lumière qui dérive : rien de figé jusqu'à la dernière image
    ...(LOCAL ? [] : [{ type: "glow", start: END_AT - 0.1, end: DURATION, fadeIn: 0.4, fadeOut: 0.01, opacity: 0.12 }]),
    ...(LOCAL ? [] : [{ type: "html", start: END_AT - 0.1, end: DURATION, fadeIn: 0.4, fadeOut: 0.01, fx: "none", html: `<div class="endcard"><div class="logo" data-at="0">{{WHEEL}}</div><b data-at="0.15">Sakia</b><i data-at="0.35">One decision a day.</i><div class="chips" data-at="0.7"><span class="r">● REAL: web, app, Telegram</span><span class="s">● SIMULATED: call, SMS</span></div><small data-at="1.1">sakia-opal.vercel.app · github.com/ag-algolab/sakia</small></div>` }]),
  ],
  // musique composée par ElevenLabs pour cette vidéo (guitare, piano, oud, montée finale), à −12 LUFS : bien sous la voix
  music: { file: ["videos/build/music-team.mp3", "videos/build/music-emotion.mp3", "videos/build/music-23.wav"].find((f) => existsSync(f)), gain: -16, duckGain: -8, fadeIn: 1.0, fadeOut: 2.0, duck: segs.map((s) => ({ from: s.at - 0.1, to: s.at + s.len + 0.1 })) },
  audio: segs.map((s) => ({ file: "media:face", at: s.at, from: s.from, to: s.to, gain: 0, fadeIn: 0.03, fadeOut: 0.06, rate: rate !== 1 ? rate : undefined, filter: "highpass=f=85,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=3:attack=8:release=120" })),
};
mkdirSync("videos/build/specs", { recursive: true });
writeFileSync(`videos/build/specs/${PROFILE}.mjs`, `// généré par scripts/video/team-build.mjs — ne pas modifier à la main\nexport default ${JSON.stringify(spec, null, 1)};\n`);
console.log(`partition : videos/build/specs/${PROFILE}.mjs — ${segs.length} phrases, ${spec.duration.toFixed(1)} s${rate > 1 ? `, accélérée ×${rate.toFixed(2)}` : ""} ; apparitions : ${pops.length}`);
