// Vidéo Banque mondiale (2 à 5 min) : les deux cartes propres à cette vidéo, rendues d'un seul tenant puis découpées par
// scripts/video/wb.mjs — 0–30 s : l'énoncé « Because of Sakia… we know because… » (docs/WB-VIDEO.md, plan minuté 0:00) ;
// 30–46 s : ce que nous ne prétendons pas, la suite, et le code de référence.
// Rendu : node scripts/video/compose.mjs scripts/video/specs/wb-cards.mjs
const X = 150;
export default {
  name: "sakia-wb-cards",
  fps: 30,
  duration: 46,
  css: `
    .kick{position:absolute;left:${X}px;top:110px;font:800 26px Geist,sans-serif;letter-spacing:.14em;color:#f2b33d}
    .src{position:absolute;left:${X}px;top:960px;width:1600px;font:500 22px/1.4 Geist,sans-serif;color:rgba(244,239,230,.7)}
    .lim{position:absolute;left:${X}px;top:250px;width:1620px}
    .lim h2{font:900 72px/1.05 Fraunces,serif;color:#fff;margin:0 0 34px}
    .lim li{font:600 38px/1.35 Geist,sans-serif;color:#d6e6d2;margin:0 0 14px;list-style:none}
    .lim li::before{content:"—";color:#f2b33d;margin-right:18px}
    .next{position:absolute;left:${X}px;top:250px;width:1620px}
    .next h2{font:900 72px/1.05 Fraunces,serif;color:#fff;margin:0 0 26px}
    .next p{font:600 40px/1.35 Geist,sans-serif;color:#d6e6d2;margin:0}
    .code{position:absolute;left:0;right:0;top:600px;text-align:center}
    .code span{display:block;font:700 30px Geist,sans-serif;letter-spacing:.12em;color:#f2b33d}
    .code b{display:inline-block;margin-top:14px;font:900 96px Geist,sans-serif;letter-spacing:.06em;color:#fff;padding:18px 44px;border-radius:24px;background:rgba(255,255,255,.08);border:2px solid rgba(255,255,255,.18)}
  `,
  layers: [
    { type: "bg", style: "green" },
    // ------------------------------------------------ énoncé (0–30 s)
    { type: "html", start: 0.2, end: 29.8, fx: "none", html: `<div class="kick">THE CHANGE WE AIM FOR</div>` },
    { type: "caption", start: 0.4, end: 14.6, x: X, y: 180, w: 1620, size: 58, stagger: 0.06, text: "Because of Sakia, a smallholder in Kairouan who pumps from their own well will know __which day to irrigate, and how much__, through a short call or message that needs __no smartphone and no reading__, instead of deciding by habit or by waiting for rain." },
    { type: "caption", start: 15.0, end: 29.8, x: X, y: 180, w: 1620, size: 54, stagger: 0.05, text: "We know because, in a past SMS pilot, only __about 15–16 % of 421 farmers__ said messages arrived at the right time; and because replaying our rule on 11–12 seasons of observed weather used __3 to 27 % less pumped water__ than a fixed weekly schedule." },
    { type: "note", start: 15.6, end: 29.8, x: X, y: 940, w: 1620, text: "Pilot: ICT2Scale (ICARDA/GIZ), survey perception, not a delivery measurement. Replay: simulation on observed weather, Kairouan only, against a benchmark schedule we defined; not a field result." },
    // ------------------------------------------------ limites, suite, code (30–46 s)
    { type: "html", start: 30.2, end: 37.8, fx: "up", html: `<div class="kick">WHAT WE DO NOT CLAIM</div><div class="lim"><h2 data-at="0.1">Honest limits</h2><ul style="margin:0;padding:0"><li data-at="0.5">The call and the SMS are simulated in the browser.</li><li data-at="0.9">The Tunisian dialect is not yet validated by native speakers.</li><li data-at="1.3">Speech recognition is not measured on real farmers.</li><li data-at="1.7">No field trial yet: the water saving is a simulation.</li></ul></div>` },
    { type: "html", start: 38.0, end: 46.0, fadeOut: 0.01, fx: "up", html: `<div class="kick">NEXT</div><div class="next"><h2 data-at="0.1">One regional technician, ten farmers.</h2><p data-at="0.5">Then a real phone line with a Tunisian operator.</p></div><div class="code" data-at="1.0"><span>WORLD BANK REFERRAL CODE</span><b>WBGSmallAIGADS</b></div>` },
  ],
  music: { file: "videos/build/music-23.wav", gain: -20, fadeIn: 1.2, fadeOut: 2.0, duck: [] },
  audio: [],
};
