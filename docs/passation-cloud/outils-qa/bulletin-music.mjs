// Comportement de la musique de fond : toujours là, seule un instant, éteinte proprement à l'arrêt / l'erreur / la pause externe /
// le démontage / le son coupé / la fin. On compte les AudioContext : le 1er créé par « Écouter » est celui de la musique.
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3101";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block", ...opts });
  await ctx.addInitScript(() => {
    const Orig = window.AudioContext;
    window.__ac = [];
    window.AudioContext = class extends Orig {
      constructor(...a) {
        super(...a);
        const rec = { t: performance.now(), closed: null, ctx: this };
        window.__ac.push(rec);
        const close = this.close.bind(this);
        this.close = () => {
          rec.closed = performance.now();
          return close();
        };
      }
    };
    window.__events = [];
    document.addEventListener("DOMContentLoaded", () => {});
    const hook = () => {
      const a = document.querySelector("audio");
      if (!a || a.__hooked) return;
      a.__hooked = true;
      for (const ev of ["play", "pause", "ended"]) a.addEventListener(ev, () => window.__events.push([ev, performance.now()]));
    };
    setInterval(hook, 20);
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.locator("main select").nth(0).selectOption("kairouan");
  await page.locator("main select").nth(1).selectOption("olivier");
  return { ctx, page };
}
const listenBtn = (page) => page.locator("main button.text-2xl");
const acInfo = (page) => page.evaluate(() => window.__ac.map((r) => ({ closed: r.closed !== null, state: r.ctx.state })));
const events = (page) => page.evaluate(() => window.__events);
async function waitPlaying(page, ms = 20000) {
  await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && !a.ended && a.currentTime > 0.3; }, null, { timeout: ms });
}

// A. musique + intro + arrêt
{
  const { ctx, page } = await fresh();
  const t0 = await page.evaluate(() => performance.now());
  await listenBtn(page).click();
  await page.waitForTimeout(400);
  let ac = await acInfo(page);
  check("A1 la musique démarre au clic (contexte audio créé)", ac.length >= 1, `contextes: ${ac.length}`);
  let ev = await events(page);
  check("A2 la voix n'a pas encore démarré 400 ms après le clic (musique seule)", ev.filter((e) => e[0] === "play").length === 0);
  await waitPlaying(page);
  ev = await events(page);
  const play = ev.find((e) => e[0] === "play");
  const clickToVoice = play ? Math.round(play[1] - t0) : -1;
  check("A3 musique seule au moins ~1,5 s avant la voix (comme sur l accueil)", clickToVoice >= 1400, `${clickToVoice} ms entre le clic et la voix`);
  ac = await acInfo(page);
  check("A4 pendant la voix, la musique tourne encore", ac[0] && !ac[0].closed && ac[0].state === "running", JSON.stringify(ac[0]));
  await page.waitForTimeout(1200);
  await listenBtn(page).click(); // Arrêter
  await page.waitForTimeout(1100);
  ac = await acInfo(page);
  check("A5 « Arrêter » éteint la musique", ac[0]?.closed === true, JSON.stringify(ac));
  const paused = await page.evaluate(() => document.querySelector("audio").paused);
  check("A6 « Arrêter » arrête la voix", paused);
  // relancer : une NOUVELLE musique
  await listenBtn(page).click();
  await page.waitForTimeout(500);
  ac = await acInfo(page);
  check("A7 relancer recrée une musique", ac.length >= 3 && !ac[ac.length - 1].closed, `contextes: ${ac.length}`);
  await ctx.close();
}

// B. son coupé en cours de lecture : la musique s'éteint, la voix continue
{
  const { ctx, page } = await fresh();
  await listenBtn(page).click();
  await waitPlaying(page);
  await page.locator("main details > summary").click();
  await page.locator('main button[role="switch"]').click();
  await page.waitForTimeout(1000);
  const ac = await acInfo(page);
  check("B1 « Son coupé » éteint aussi la musique", ac[0]?.closed === true);
  const st = await page.evaluate(() => ({ paused: document.querySelector("audio").paused }));
  check("B2 la voix continue (la bouche bouge, le son est à zéro)", st.paused === false);
  // relancer avec le son coupé : AUCUNE musique
  await listenBtn(page).click(); // Arrêter
  await page.waitForTimeout(300);
  const before = (await acInfo(page)).length;
  await listenBtn(page).click(); // Écouter, son coupé
  await page.waitForTimeout(600);
  const after = (await acInfo(page)).length;
  check("B3 son coupé : « Écouter » ne lance pas de musique", after === before, `contextes ${before} → ${after}`);
  await ctx.close();
}

// C. page quittée en cours de lecture
{
  const { ctx, page } = await fresh();
  await listenBtn(page).click();
  await waitPlaying(page);
  await page.locator(`header nav a[href="/"]`).first().click();
  await page.waitForTimeout(1200);
  const ac = await acInfo(page);
  check("C1 quitter la page éteint la musique", ac[0]?.closed === true, page.url());
  await ctx.close();
}

// D. erreur : ni réseau ni bulletin enregistré
{
  const { ctx, page } = await fresh();
  await page.route("**/audio/demo-*.json", (r) => r.abort());
  await page.route("**/api/voice/bulletin*", (r) => r.abort());
  await listenBtn(page).click();
  await page.waitForSelector('main [role="alert"]', { timeout: 15000 });
  await page.waitForTimeout(900);
  const ac = await acInfo(page);
  const msg = (await page.locator('main [role="alert"]').first().innerText()).trim();
  check("D1 erreur : message localisé affiché", /Could not play a bulletin/.test(msg), msg);
  check("D2 erreur : la musique s'éteint", ac[0]?.closed === true, JSON.stringify(ac[0]));
  const btn = (await listenBtn(page).innerText()).trim();
  check("D3 erreur : le bouton redevient « Listen »", /Listen/.test(btn), btn);
  await ctx.close();
}

// E. pause venue de l'extérieur (touche média, casque débranché)
{
  const { ctx, page } = await fresh();
  await listenBtn(page).click();
  await waitPlaying(page);
  await page.evaluate(() => document.querySelector("audio").pause());
  await page.waitForTimeout(1000);
  const ac = await acInfo(page);
  check("E1 pause externe : la musique ne reste pas seule", ac[0]?.closed === true);
  await ctx.close();
}

// F. fin du bulletin : la musique remonte un instant puis s'éteint
{
  const { ctx, page } = await fresh();
  await listenBtn(page).click();
  await waitPlaying(page);
  await page.evaluate(() => { const a = document.querySelector("audio"); a.currentTime = Math.max(0, a.duration - 0.4); });
  await page.waitForFunction(() => window.__events.some((e) => e[0] === "ended"), null, { timeout: 8000 });
  await page.waitForTimeout(1200);
  let ac = await acInfo(page);
  check("F1 juste après la fin, la musique joue encore (outro)", ac[0] && !ac[0].closed);
  await page.waitForTimeout(3600);
  ac = await acInfo(page);
  check("F2 puis elle s'éteint seule", ac[0]?.closed === true);
  await ctx.close();
}

// G. relancer pendant l'outro : l'ancienne musique ne coupe pas la nouvelle
{
  const { ctx, page } = await fresh();
  await listenBtn(page).click();
  await waitPlaying(page);
  await page.evaluate(() => { const a = document.querySelector("audio"); a.currentTime = Math.max(0, a.duration - 0.4); });
  await page.waitForFunction(() => window.__events.some((e) => e[0] === "ended"), null, { timeout: 8000 });
  await page.waitForTimeout(500);
  await listenBtn(page).click(); // relance en pleine outro
  await page.waitForTimeout(3600); // le minuteur de l'outro de l'ancienne musique passe pendant ce temps
  const ac = await acInfo(page);
  const last = ac[ac.length - 1];
  check("G1 relancer pendant l'outro : la nouvelle musique n'est pas coupée par l'ancienne", ac.length >= 3 && last && !last.closed, `contextes: ${ac.length}, dernier fermé: ${last?.closed}`);
  await ctx.close();
}

await browser.close();
const bad = results.filter((r) => !r).length;
console.log(`\n${results.length - bad}/${results.length} vérifications passent`);
process.exit(bad ? 1 : 0);
