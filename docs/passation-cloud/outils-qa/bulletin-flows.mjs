// Parcours /bulletin (après fusion avec main) : question de première visite, profil de l'appareil, rendu serveur, mouvement réduit,
// clavier, absence de tout signalement de pluie (le bouton « Il a plu » est retiré du produit).
import { chromium } from "playwright-core";

const BASE = process.argv[2] ?? "http://localhost:3101";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"] });
let fails = 0;
const check = (name, ok, detail = "") => {
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};
const newPage = async (opts = {}, init, arg) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", ...opts });
  if (init) await ctx.addInitScript(init, arg); // l'argument est la seule façon de passer une valeur à la page
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  page.on("console", (m) => m.type() === "error" && !/502|503|Failed to load resource/.test(m.text()) && errs.push(m.text().slice(0, 200)));
  return { ctx, page, errs };
};
const listen = (page) => page.locator("main button.text-2xl");
const placeSel = (page) => page.locator("main section select"); // les deux listes de la question de première visite
const active = (page) => page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.closest("label")?.innerText ? ":" + a.closest("label").innerText.split("\n")[0].trim() : ""}` : "none"; });
const hint = (page) => page.evaluate(() => document.querySelector("#bl-need")?.textContent?.trim() ?? null);
const PROFILE = { region: "kairouan", crop: "olivier", soil: "argileux", system: "aspersion", ago: "2", planting: "2026-03-01" };
const seed = (p) => localStorage.setItem("sakia-form", JSON.stringify(p)); // exécuté DANS la page : la valeur arrive par l'argument

// 1. première visite : état, texte, bouton, focus, enregistrement au premier « Écouter »
{
  const { ctx, page, errs } = await newPage();
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("1a la question de première visite est affichée, au-dessus du bouton", (await placeSel(page).count()) === 2);
  check("1b aucune région ni culture par défaut", (await placeSel(page).nth(0).inputValue()) === "" && (await placeSel(page).nth(1).inputValue()) === "");
  check("1c texte de ce qui manque", (await hint(page)) === "Choose your region and your crop to hear your bulletin.", String(await hint(page)));
  check("1d « Écouter » est aria-disabled (atteignable au clavier)", (await listen(page).getAttribute("aria-disabled")) === "true");
  check("1e « Écouter » relié au texte (aria-describedby)", (await listen(page).getAttribute("aria-describedby")) === "bl-need");
  check("1f les listes sont `required`", (await page.locator("main select[required]").count()) >= 2);
  await page.evaluate(() => { window.__ac = 0; const O = window.AudioContext; window.AudioContext = class extends O { constructor(...a) { super(...a); window.__ac++; } }; });
  await listen(page).click({ force: true }); // aria-disabled : Playwright le croit inactif, un vrai doigt peut le toucher
  check("1g clic sur « Écouter » inactif : le focus va à la région", (await active(page)).startsWith("select:Region"), await active(page));
  check("1h … et rien ne démarre (aucun contexte audio, donc aucune musique)", (await page.evaluate(() => window.__ac)) === 0);
  await placeSel(page).nth(0).selectOption("tunis");
  await listen(page).click({ force: true });
  check("1i seule la culture manque : le focus va à la culture", (await active(page)).startsWith("select:Crop"), await active(page));
  check("1j rien n'est enregistré tant qu'on n'a pas écouté", (await page.evaluate(() => localStorage.getItem("sakia-form"))) === null);
  await placeSel(page).nth(1).selectOption("tomate");
  check("1k tout choisi : texte et question restent jusqu'au premier « Écouter », bouton actif", (await listen(page).getAttribute("aria-disabled")) === null && (await hint(page)) === null);
  await listen(page).click();
  await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0.3; }, null, { timeout: 25000 });
  const f = await page.evaluate(() => JSON.parse(localStorage.getItem("sakia-form") ?? "null"));
  check("1l au premier « Écouter », le choix est enregistré dans le profil de l'appareil", f && f.region === "tunis" && f.crop === "tomate", JSON.stringify(f));
  check("1m … et la question de première visite disparaît", (await page.locator("main section select").count()) === 0);
  check("1n aucune erreur JS", errs.length === 0, errs.join(" | "));
  await ctx.close();
}

// 2. profil de l'appareil : repris, modifiable dans « Options », sans écraser le reste
{
  const { ctx, page } = await newPage({}, seed, PROFILE);
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  check("2a profil complet : pas de question de première visite", (await page.locator("main section select").count()) === 0 && (await hint(page)) === null);
  check("2b … et « Écouter » est actif", (await listen(page).getAttribute("aria-disabled")) === null);
  await page.locator("main details > summary").click();
  const opt = page.locator("main details select");
  check("2c région et culture du profil affichées dans Options", (await opt.nth(0).inputValue()) === "kairouan" && (await opt.nth(1).inputValue()) === "olivier");
  await opt.nth(0).selectOption("sfax");
  const f = await page.evaluate(() => JSON.parse(localStorage.getItem("sakia-form")));
  check("2d le changement est enregistré", f.region === "sfax" && f.crop === "olivier", JSON.stringify(f));
  check("2e sol, système, arrosage, semis intacts", f.soil === "argileux" && f.system === "aspersion" && f.ago === "2" && f.planting === "2026-03-01");
  await ctx.close();
}

// 3. profil absent, partiel ou invalide : on demande, on n'invente rien
{
  for (const [name, p] of [["partiel (région seule)", { region: "sousse" }], ["invalide", { region: "atlantis", crop: 42 }]]) {
    const { ctx, page } = await newPage({}, seed, p);
    await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    const vals = [await placeSel(page).nth(0).inputValue(), await placeSel(page).nth(1).inputValue()];
    check(`3 profil ${name} : la question est posée, la culture reste vide`, (await placeSel(page).count()) === 2 && vals[1] === "", JSON.stringify(vals));
    if (p.region === "sousse") check("3b … la région connue est reprise", vals[0] === "sousse");
    else check("3b … la région invalide n'est pas reprise", vals[0] === "");
    await ctx.close();
  }
  // profil complet : jamais de clignotement de la question
  const { ctx, page } = await newPage({}, () => {
    localStorage.setItem("sakia-form", JSON.stringify({ region: "sousse", crop: "vigne" }));
    window.__sawPlace = false;
    new MutationObserver(() => { if (document.querySelector("main section") || document.querySelector("#bl-need")) window.__sawPlace = true; }).observe(document, { childList: true, subtree: true });
  });
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  check("3c profil complet : la question ne clignote jamais", (await page.evaluate(() => window.__sawPlace)) === false);
  await ctx.close();
}

// 4. rendu serveur
{
  const { ctx, page } = await newPage();
  const html = await (await page.request.get(`${BASE}/bulletin`)).text();
  const sel = html.match(/<select[\s\S]*?<\/select>/g) ?? [];
  const selected = sel.map((s) => (s.match(/<option[^>]*selected[^>]*>[^<]*/g) ?? []).map((o) => o.replace(/<[^>]+>/, "").trim()));
  check("4a le HTML du serveur : aucune région ni culture présélectionnée", sel.length >= 2 && selected.every((o) => o.length === 1 && /Choose/.test(o[0])), JSON.stringify(selected));
  check("4b un seul <main>", (html.match(/<main[\s>]/g) ?? []).length === 1);
  check("4c aucun réglage de musique", !/Music (on|off)|Musique (activée|coupée)/.test(html));
  await ctx.close();
}

// 5. mouvement réduit
{
  const { ctx, page } = await newPage({ reducedMotion: "reduce" }, seed, PROFILE);
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.evaluate(() => { window.__h = new Set(); window.__m = new Set(); const f = () => { window.__h.add(document.querySelector('[data-part="head"]')?.getAttribute("transform")); window.__m.add(document.querySelector('[data-part="mouth"]')?.getAttribute("d")); requestAnimationFrame(f); }; f(); });
  await listen(page).click();
  await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0.5; }, null, { timeout: 25000 });
  await page.waitForTimeout(6000);
  const r = await page.evaluate(() => ({ head: [...window.__h], mouth: window.__m.size }));
  check("5a mouvement réduit : la tête ne bouge pas", r.head.length === 1, JSON.stringify(r.head.slice(0, 3)));
  check("5b … la bouche suit toujours la voix", r.mouth > 20, `${r.mouth} formes différentes`);
  await ctx.close();
}

// 6. clavier
{
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 800 } }, seed, PROFILE);
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await listen(page).focus();
  const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle }; });
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab"); // retour sur le bouton par le clavier : l'anneau « focus-visible » s'applique
  const ring2 = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { color: cs.outlineColor, width: cs.outlineWidth, style: cs.outlineStyle, tag: document.activeElement.tagName }; });
  check("6a anneau de focus doré, épais, visible sur le thème sombre", ring2.color === "rgb(255, 216, 102)" && ring2.width === "3px" && ring2.style === "solid", JSON.stringify(ring2));
  const order = [];
  await listen(page).focus();
  for (let i = 0; i < 3; i++) {
    order.push(await page.evaluate(() => { const a = document.activeElement; return `${a.tagName.toLowerCase()}:${(a.getAttribute("aria-label") || a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 20)}`; }));
    await page.keyboard.press("Tab");
  }
  check("6b ordre de tabulation : Écouter puis Options", /Listen/.test(order[0]) && /Options/.test(order[1]), JSON.stringify(order));
  void ring;
  await ctx.close();
}

// 7. plus aucun signalement de pluie : après un bulletin lu, ni bouton, ni panneau, ni appel à /api/reports, ni mot sur les
//    signalements ou les voisins dans la page (volet « Options » ouvert compris), ni formule « provisoire / fictif »
{
  const { ctx, page, errs } = await newPage({}, seed, PROFILE);
  const reportCalls = [];
  page.on("request", (r) => /\/api\/reports/.test(r.url()) && reportCalls.push(r.url()));
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await listen(page).click();
  await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0.3; }, null, { timeout: 25000 });
  await page.waitForTimeout(800);
  await page.locator("main details > summary").click();
  check("7a bulletin lu : aucun bouton « It rained »", (await page.getByRole("button", { name: /rained/i }).count()) === 0);
  check("7b … aucun panneau de signalement (degrés, envoi)", (await page.locator("#bl-rain-panel, [role=radiogroup]").count()) === 0 && (await page.getByRole("button", { name: /Send my report|Send another report/ }).count()) === 0);
  const txt = await page.locator("main").innerText();
  const bad = txt.match(/report|neighbour|rain guardian|rain watcher|fictional|fictitious|provisional|for now|coming soon|in progress|demonstration/gi);
  check("7c … la page ne parle d'aucun signalement, voisin, démonstration fictive ni « provisoire »", !bad, bad ? [...new Set(bad)].join(", ") : "");
  check("7d … aucune requête vers /api/reports", reportCalls.length === 0, reportCalls.join(","));
  check("7e aucune erreur JS", errs.length === 0, errs.join(" | "));
  await ctx.close();
}

// 8. bulletin enregistré lu sans avoir choisi de lieu : pas d'alerte absurde, le bandeau dit de quelle région et culture il est
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/bulletin?lang=en`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  await page.locator("main details > summary").click();
  await page.locator('main details [aria-labelledby^="bl-demo"] button', { hasText: "English" }).first().click(); // un bulletin enregistré (pas le bouton de langue)
  await page.waitForFunction(() => { const a = document.querySelector("audio"); return a && !a.paused && a.currentTime > 0.3; }, null, { timeout: 25000 });
  await page.waitForTimeout(500);
  const txt = await page.locator("main").innerText();
  check("8a aucun lieu choisi : pas de « pas pour votre choix » quand il n'y a aucun choix", !/not for your current choice/.test(txt));
  check("8b … le bandeau dit de quelle région et culture est le bulletin", /Kairouan · Olive/.test(txt));
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} échec(s)` : "\nTout passe");
process.exit(fails ? 1 : 0);
