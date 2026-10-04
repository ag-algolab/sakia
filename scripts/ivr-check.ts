// Vérifie la ligne vocale SANS audio et sans crédit vocal :
//   1. l'arbre de dialogue (choix de la langue 1 anglais / 2 français / 3 arabe, parcours complets dans les trois langues, retour,
//      répétition, silences, durée maximale, touches invalides, langue gardée jusqu'au bout) ;
//   2. les phrases fixes (anglais, français, arabe présents ; mêmes touches et même nombre de phrases dans les trois langues ;
//      sous-titres anglais fidèles ; garde-fou identique à celui du moteur) ;
//   3. la lecture du plan sur la météo réelle (toutes les cultures × réponses au dernier arrosage × 3 langues) :
//      mêmes lignes dans les trois langues, garde-fou dit quand il s'applique, aucune valeur absurde, longueur ≈ 25 s ;
//   4. les enregistrements (phrases fixes et démonstrations hors connexion) à jour du texte actuel, dans les trois langues.
// Lancer : node node_modules/tsx/dist/cli.mjs scripts/ivr-check.ts   (réseau : météo Open-Meteo)

import { CROPS } from "../src/lib/crops";
import { bulletinScript } from "../src/lib/messages";
import { buildPlan } from "../src/lib/plan";
import type { Plan } from "../src/lib/plan";
import { REGIONS } from "../src/lib/regions";
import { ask, KEYS, parseState, startCall, step } from "../src/lib/ivr/flow";
import type { CallState, Key, Say } from "../src/lib/ivr/flow";
import { AGO_CHOICES, DEFAULT_LANG, GROUPS, IVR_LANGS, LANG_CHOICES, langKey, MAX_CALL_MS, OTHER_REGIONS, PLAN_TARGET_SECONDS } from "../src/lib/ivr/menu";
import type { IvrLang } from "../src/lib/ivr/menu";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { DemoClipFile, DemoItem, Manifest } from "../src/lib/ivr/demo";
import { allRecordings, AR_DIGIT, promptEn, promptText, PROMPT_IDS, recordingFile, recordingPath, textHash } from "../src/lib/ivr/prompts";
import { ivrDetailLines, ivrDetailText, ivrPlanLines, ivrPlanText, MAX_PLAN_CHARS } from "../src/lib/ivr/script";

let problems = 0;
let checks = 0;
const fail = (msg: string) => {
  problems++;
  console.log("PROBLÈME :", msg);
};
const ok = (cond: boolean, msg: string) => {
  checks++;
  if (!cond) fail(msg);
};

const ARABIC = /[؀-ۿ]/;
// mots français qui ne doivent jamais se glisser dans une phrase anglaise dite au téléphone
const FRENCH_WORDS = /(?<!\p{L})(tapez|pour|avec|soit|aujourd'hui|demain|merci|bienvenue|culture|région|arrosages?|millimètres|mètres|degrés|conseil|semaine)(?!\p{L})/iu;

// Touches annoncées dans une phrase, dans l'ordre : « tapez 0 … ou étoile » → ["0", "*"].
// Arabe : la touche est dite en lettres, après « اضغط », après les deux-points d'une liste (« أمس: اثنان. ») ou après « أو » (« أو نجمة »).
const AR_KEY: Record<string, string> = { ...Object.fromEntries(Object.entries(AR_DIGIT).map(([d, w]) => [w, d])), اثنين: "2", نجمة: "*" };
const AR_KEY_RE = new RegExp(`(?:اضغط |: |أو )(${Object.keys(AR_KEY).join("|")})(?=[.،\\s]|$)`, "g");
function keysOf(text: string, lang: IvrLang): string[] {
  if (lang === "ar") return [...text.matchAll(AR_KEY_RE)].map((m) => AR_KEY[m[1]]);
  return [...text.matchAll(/(?<![\p{L}\p{N}])(\d|étoile|star)(?![\p{L}\p{N}])/giu)].map((m) => (/\d/.test(m[1]) ? m[1] : "*"));
}
const sentences = (text: string): number => (text.match(/[.?!؟]/g) ?? []).length;

// Applique une suite de touches et rend l'état final et le dernier « à dire ».
function press(keys: (Key | "silence" | "played" | { tick: number })[], from = startCall()) {
  let state = from.state;
  let say: Say[] = from.say;
  let end = from.end;
  for (const k of keys) {
    const r = step(state, typeof k === "object" ? { type: "tick", ms: k.tick } : k === "silence" ? { type: "silence" } : k === "played" ? { type: "played" } : { type: "key", key: k });
    state = r.state;
    say = r.say;
    end = r.end;
  }
  return { state, say, end };
}
const ids = (say: Say[]) => say.map((s) => (s.kind === "prompt" ? `${s.id}:${s.lang}` : `${s.detail ? "detail" : "plan"}:${s.cropId}:${s.ago}:${s.lang}`)).join(" ");
const everyLang = (id: string) => IVR_LANGS.map((l) => `${id}:${l}`).join(" ");
const FR = langKey("fr");
const EN = langKey("en");
const AR = langKey("ar");

// ---------- 1. arbre de dialogue ----------
function flowChecks() {
  const start = startCall();
  ok(ids(start.say) === "welcome:en welcome:fr welcome:ar", `accueil : l'anglais d'abord, puis le français et l'arabe : ${ids(start.say)}`);
  ok(IVR_LANGS.join(",") === "en,fr,ar" && LANG_CHOICES.map((c) => `${c.key}=${c.lang}`).join(",") === "1=en,2=fr,3=ar", "touches de langue : 1 anglais, 2 français, 3 arabe");
  ok(DEFAULT_LANG === "en", "langue par défaut : l'anglais");

  // chaque touche de langue mène à la région dans cette langue (avec le rappel des touches 0 et *)
  for (const { key, lang } of LANG_CHOICES) {
    const r = press([key]);
    ok(r.state.node === "region" && r.state.lang === lang && ids(r.say) === `help:${lang} region:${lang}`, `touche ${key} → ${lang} : ${ids(r.say)}`);
  }
  for (const key of ["4", "5", "6", "7", "8", "9", "#"] as Key[]) {
    const r = press([key]);
    ok(r.state.node === "lang" && r.state.lang === null && ids(r.say) === `${everyLang("invalid")} ${everyLang("welcome")}`, `touche ${key} au choix de la langue : ${ids(r.say)}`);
  }

  // parcours complet dans chaque langue : olivier à Kairouan, arrosé hier ou avant-hier, puis fin
  for (const { key, lang } of LANG_CHOICES) {
    let r = press([key, "1", "3", "1", "2"]);
    ok(r.state.node === "plan" && r.state.lang === lang && r.state.cropId === "olivier" && r.state.regionId === "kairouan" && r.state.ago === 2, `parcours ${lang} : ${JSON.stringify(r.state)}`);
    ok(ids(r.say) === `plan:olivier:2:${lang}`, `plan olivier (${lang}) : ${ids(r.say)}`);
    r = press(["played"], r);
    ok(r.state.node === "again" && ids(r.say) === `again:${lang}`, `après le plan (${lang}) : ${ids(r.say)}`);
    r = press(["3"], r);
    ok(r.state.node === "detail" && ids(r.say) === `detail:olivier:2:${lang}`, `détail (${lang}) : ${ids(r.say)}`);
    r = press(["played", "2"], r);
    ok(r.end && r.state.node === "ended" && ids(r.say) === `bye:${lang}`, `au revoir (${lang}) : ${ids(r.say)}`);
  }

  // menu de fin : 3 = détail de la semaine, puis retour au menu de fin ; 1 et 2 comme avant
  let r = press([FR, "1", "3", "1", "2", "played", "3"]);
  ok(r.state.node === "detail" && ids(r.say) === "detail:olivier:2:fr", `détail : ${ids(r.say)} / ${r.state.node}`);
  r = press(["played"], r);
  ok(r.state.node === "again" && ids(r.say) === "again:fr", `après le détail : ${ids(r.say)}`);
  r = press(["3", "5"], r); // un appui coupe le détail
  ok(r.state.node === "again", "appui pendant le détail → menu de fin");
  r = press(["3", "*"], r);
  ok(r.state.node === "again", "* depuis le détail → menu de fin");

  // la touche 7 n'ouvre aucun menu caché : au choix de la région comme au menu de fin, ce choix n'existe pas
  r = press([FR, "7"]);
  ok(r.state.node === "region" && ids(r.say) === "invalid:fr region:fr", `7 au choix de la région : ${ids(r.say)}`);
  r = press([EN, "1", "3", "1", "2", "played", "7"]);
  ok(r.state.node === "again" && ids(r.say) === "invalid:en again:en", `7 au menu de fin : ${ids(r.say)}`);

  // arabe, autre région (Sfax = 3e de la liste), légumes, piment, « je ne sais pas » → ago = null
  r = press([AR, "2", "3", "2", "2", "9"]);
  ok(r.state.lang === "ar" && r.state.regionId === "sfax" && r.state.cropId === "piment" && r.state.ago === null, `parcours ar : ${JSON.stringify(r.state)}`);
  ok(ids(r.say) === "plan:piment:null:ar", `plan piment : ${ids(r.say)}`);
  // anglais, même parcours
  r = press([EN, "2", "3", "2", "2", "9"]);
  ok(r.state.lang === "en" && r.state.regionId === "sfax" && r.state.cropId === "piment" && r.state.ago === null && ids(r.say) === "plan:piment:null:en", `parcours en : ${ids(r.say)}`);

  // plusieurs cultures de suite : après « oui », on revient au groupe, l'arrosage est redemandé
  r = press([FR, "1", "3", "1", "2", "played", "1"]);
  ok(r.state.node === "group" && r.state.regionId === "kairouan" && r.state.cropId === null && ids(r.say) === "group:fr", `autre culture : ${ids(r.say)} / ${r.state.node}`);
  r = press(["1", "1", "1"], r); // céréales, blé, aujourd'hui
  ok(r.state.cropId === "ble" && r.state.ago === 0 && r.state.plansHeard === 2, `deuxième culture : ${JSON.stringify(r.state)}`);

  // 0 répète la question ; * revient d'un cran
  r = press([FR, "1"]);
  ok(ids(press(["0"], r).say) === "group:fr", "0 répète le groupe");
  ok(press(["*"], r).state.node === "region", "* depuis le groupe → région");
  ok(press(["*", "*"], r).state.node === "lang" && press(["*", "*"], r).state.lang === null, "* deux fois → langue");
  ok(ids(press(["*", "*"], r).say) === everyLang("welcome"), `* jusqu'au choix de la langue : l'accueil dans les trois langues : ${ids(press(["*", "*"], r).say)}`);
  ok(ids(press(["0"]).say) === everyLang("welcome"), "0 répète l'accueil");
  r = press([FR, "1", "3"]);
  ok(press(["*"], r).state.node === "group", "* depuis la culture → groupe");
  r = press([FR, "1", "3", "1"]);
  ok(press(["*"], r).state.node === "crop", "* depuis le dernier arrosage → culture");
  ok(ids(press(["*", "0"], r).say) === "crop_arbres:fr", "retour puis répétition du menu des arbres");

  // touche invalide : « ce choix n'existe pas » puis la question
  r = press([FR, "1", "7"]);
  ok(ids(r.say) === "invalid:fr group:fr" && r.state.node === "group", `touche invalide : ${ids(r.say)}`);
  r = press(["#"]);
  ok(ids(r.say) === `${everyLang("invalid")} ${everyLang("welcome")}`, `# à l accueil : ${ids(r.say)}`);
  r = press([FR, "2", "8"]);
  ok(r.state.node === "region_list" && ids(r.say).startsWith("invalid:fr"), "8 n'existe pas dans la liste des régions");

  // un appui pendant la lecture du plan passe à la question suivante
  r = press([FR, "1", "3", "1", "2", "5"]);
  ok(r.state.node === "again", "appui pendant le plan → question suivante");

  // silences : un silence répète, deux silences de suite raccrochent ; une touche remet le compteur à zéro
  r = press([FR, "silence"]);
  ok(ids(r.say) === "region:fr" && !r.end, `un silence répète : ${ids(r.say)}`);
  r = press(["silence"], r);
  ok(r.end && ids(r.say) === "bye:fr", `deux silences raccrochent : ${ids(r.say)}`);
  r = press([FR, "silence", "1", "silence"]);
  ok(!r.end, "une touche entre deux silences remet le compteur à zéro");
  r = press(["silence"]);
  ok(!r.end && ids(r.say) === everyLang("welcome"), `un silence à l'accueil répète l'accueil : ${ids(r.say)}`);
  r = press(["silence", "silence"]);
  ok(r.end && ids(r.say) === everyLang("bye"), `deux silences à l'accueil : au revoir dans les trois langues : ${ids(r.say)}`);

  // durée maximale
  r = press([FR, { tick: MAX_CALL_MS - 1000 }]);
  ok(!r.end, "pas de fin avant la durée maximale");
  r = press([{ tick: 1000 }], r);
  ok(r.end && ids(r.say) === "timeout:fr", `fin à 2 minutes : ${ids(r.say)}`);
  r = press([{ tick: MAX_CALL_MS }]);
  ok(r.end && ids(r.say) === everyLang("timeout"), `fin à 2 minutes avant le choix de la langue : ${ids(r.say)}`);

  // raccrocher, puis plus rien ne se passe
  r = press([FR, "1"]);
  const h = step(r.state, { type: "hangup" });
  ok(h.end && step(h.state, { type: "key", key: "1" }).say.length === 0, "raccrocher termine la ligne");

  // état venu de l'extérieur (POST /api/ivr/step) : l'anglais est accepté ; sans langue choisie, la question est dite en anglais
  const base = JSON.parse(JSON.stringify(start.state)) as Record<string, unknown>;
  for (const lang of IVR_LANGS) ok(parseState({ ...base, node: "region", lang })?.lang === lang, `état rechargé en ${lang} refusé`);
  for (const lang of ["de", "EN", "", 1]) ok(parseState({ ...base, node: "region", lang }) === null, `langue inconnue acceptée : ${JSON.stringify(lang)}`);
  const orphan = parseState({ ...base, node: "group", lang: null });
  ok(!!orphan && ids(ask(orphan)) === "group:en", `sans langue choisie, la question est dite en anglais : ${orphan ? ids(ask(orphan)) : "état refusé"}`);
  ok(!!orphan && ids(step(orphan, { type: "key", key: "7" }).say) === `${everyLang("invalid")} group:en`, "sans langue choisie, « ce choix n'existe pas » dans les trois langues");

  // exhaustivité : toute combinaison de touches de 4 appuis ne plante jamais, reste dans des états valides,
  // et une fois la langue choisie, tout est dit dans cette langue (jamais de changement de langue en route)
  let walked = 0;
  const walk = (s: CallState, depth: number) => {
    walked++;
    const back = parseState(JSON.parse(JSON.stringify(s)));
    ok(back !== null, `état non rechargeable : ${JSON.stringify(s)}`);
    if (depth === 0) return;
    for (const key of KEYS) {
      const next = step(s, { type: "key", key });
      const lang = next.state.lang;
      ok(lang === null ? ids(next.say).endsWith(everyLang("welcome")) || next.end : next.say.every((sy) => sy.lang === lang), `langue mélangée après la touche ${key} au nœud ${s.node} : ${ids(next.say)}`);
      if (!next.end) {
        ok(ids(next.say).length > 0 || next.state.node === "ended", `aucune parole après la touche ${key} au nœud ${s.node}`);
        walk(next.state, depth - 1);
      }
    }
  };
  walk(startCall().state, 4);
  console.log(`  ${walked} états parcourus (toutes touches, 4 appuis)`);

  // tous les nœuds ont une question qui existe dans les phrases fixes, et chaque phrase est dite dans les trois langues
  const seen = new Set<string>();
  const explore = (s: CallState, depth: number) => {
    for (const sy of ask(s)) if (sy.kind === "prompt") seen.add(`${sy.id}:${sy.lang}`);
    if (depth === 0) return;
    for (const key of KEYS) {
      const n = step(s, { type: "key", key });
      for (const sy of n.say) if (sy.kind === "prompt") seen.add(`${sy.id}:${sy.lang}`);
      if (!n.end) explore(n.state, depth - 1);
    }
  };
  explore(startCall().state, 7);
  // « wait » (attente du plan) et « unsure » (échec du calcul) sont dites par la page, pas par l'arbre ; « timeout » par le temps écoulé.
  for (const id of PROMPT_IDS) if (!["timeout", "wait", "unsure"].includes(id)) for (const lang of IVR_LANGS) ok(seen.has(`${id}:${lang}`), `phrase jamais dite par l'arbre : ${id}.${lang}`);

  // menus : tout est dans le catalogue, chaque culture est atteignable
  const reachable = new Set(GROUPS.flatMap((g) => g.crops));
  for (const c of CROPS) ok(reachable.has(c.id), `culture inaccessible au téléphone : ${c.id}`);
  for (const id of OTHER_REGIONS) ok(REGIONS.some((r) => r.id === id), `région inconnue : ${id}`);
  ok(AGO_CHOICES.every((c) => c.ago === null || (c.ago >= 0 && c.ago <= 7)), "réponses « dernier arrosage » hors de 0..7");
}

// ---------- 2. phrases fixes ----------
async function promptChecks() {
  const rec = allRecordings();
  const chars = rec.reduce((n, r) => n + r.text.length, 0);
  const per = IVR_LANGS.map((l) => `${l} ${rec.filter((r) => r.lang === l).reduce((n, r) => n + r.text.length, 0)}`).join(", ");
  console.log(`  ${rec.length} enregistrements fixes, ${chars} caractères au total (${per})`);
  ok(rec.length === PROMPT_IDS.length * IVR_LANGS.length, `${rec.length} enregistrements au lieu de ${PROMPT_IDS.length * IVR_LANGS.length}`);
  for (const r of rec) {
    ok(r.text.trim().length > 0 && r.en.trim().length > 0, `phrase vide : ${r.id}.${r.lang}`);
    ok(!/undefined|NaN|null|\[object/.test(r.text), `valeur absurde dans ${r.id}.${r.lang}`);
    if (r.lang === "ar") ok(ARABIC.test(r.text), `${r.id}.ar n'est pas en arabe`);
    else ok(!ARABIC.test(r.text), `${r.id}.${r.lang} contient de l'arabe`);
    ok(!ARABIC.test(r.en) && !FRENCH_WORDS.test(r.en), `sous-titre de ${r.id}.${r.lang} pas en anglais : ${r.en}`);
    if (r.lang === "en") ok(!FRENCH_WORDS.test(r.text), `${r.id}.en contient du français : ${r.text}`);
    ok(!/signal|rain report|report rain|تبليغ/i.test(`${r.text} ${r.en}`), `${r.id}.${r.lang} parle d'un signalement`);
    // le sous-titre annonce exactement les touches dites
    ok(keysOf(r.en, "en").join() === keysOf(r.text, r.lang).join(), `${r.id}.${r.lang} : touches dites ${keysOf(r.text, r.lang).join()} ≠ sous-titre ${keysOf(r.en, "en").join()}`);
    // en anglais, le sous-titre est la phrase dite (l'écran ne l'affiche qu'une fois)
    if (r.lang === "en") ok(r.en === r.text, `${r.id}.en : sous-titre différent de la phrase dite`);
  }
  // les trois langues disent la même chose : mêmes touches, même nombre de phrases (l'accueil a une phrase par langue, avec sa touche)
  for (const id of PROMPT_IDS) {
    if (id === "welcome") {
      for (const lang of IVR_LANGS) ok(keysOf(promptText(id, lang), lang).join() === langKey(lang), `accueil ${lang} : touche ${keysOf(promptText(id, lang), lang).join()} au lieu de ${langKey(lang)}`);
      ok(promptText("welcome", "en").startsWith("Welcome to Sakia"), "l'accueil anglais commence par la bienvenue");
      continue;
    }
    const ref = keysOf(promptText(id, "fr"), "fr").join();
    for (const lang of IVR_LANGS) {
      ok(keysOf(promptText(id, lang), lang).join() === ref, `${id}.${lang} : touches ${keysOf(promptText(id, lang), lang).join()} ≠ français ${ref}`);
      ok(sentences(promptText(id, lang)) === sentences(promptText(id, "fr")), `${id}.${lang} : ${sentences(promptText(id, lang))} phrases, le français en a ${sentences(promptText(id, "fr"))}`);
      ok(promptEn(id, lang) === promptText(id, "en"), `${id}.${lang} : le sous-titre n'est pas la phrase anglaise`);
    }
  }
  ok(PROMPT_IDS.every((id) => !id.startsWith("rain_")), "une phrase fixe de signalement de pluie existe encore");
  // la phrase « pas sûr » dite au téléphone est exactement celle du moteur, dans les trois langues
  const base = await buildPlan({ regionId: "kairouan", cropId: "olivier" }); // dernier arrosage inconnu → pas sûr
  for (const lang of IVR_LANGS) {
    const engine = bulletinScript(base, lang).find((l) => l.id === "unsure")?.text;
    ok(!!engine, `le moteur ne dit pas « pas sûr » (${lang})`);
    ok(promptText("unsure", lang) === engine, `phrase « pas sûr » (${lang}) différente du moteur`);
  }
  return chars;
}

// ---------- 3. lecture du plan ----------
async function planChecks() {
  let plans = 0;
  let longest = { chars: 0, tag: "" };
  const lengths: Record<IvrLang, number[]> = { en: [], fr: [], ar: [] };
  const detailLengths: Record<IvrLang, number[]> = { en: [], fr: [], ar: [] };
  const cases: { regionId: string; cropId: string; ago: number | null; asOf?: string }[] = [];
  for (const c of CROPS) for (const a of [null, 0, 2, 7]) cases.push({ regionId: "kairouan", cropId: c.id, ago: a });
  for (const regionId of OTHER_REGIONS) cases.push({ regionId, cropId: "olivier", ago: 2 });
  for (const c of ["tomate", "piment", "amandier", "ble", "olivier"]) cases.push({ regionId: "kairouan", cropId: c, ago: 2, asOf: "2026-07-17" });

  // commun au plan et au détail : mêmes lignes dans les trois langues, rien d'absurde, la bonne langue, le garde-fou du moteur
  const common = (tag: string, plan: Plan, lines: { id: string; text: string }[], lang: IvrLang, refIds: string) => {
    const text = lines.map((l) => l.text).join(" ");
    const idList = lines.map((l) => l.id).join(",");
    ok(idList === refIds, `${tag} ${lang} : lignes ${idList} ≠ ${refIds}`);
    ok(lines.every((l) => l.text.trim().length > 0), `${tag} ${lang} : ligne vide`);
    ok(!/undefined|NaN|null|\[object|m³/.test(text), `${tag} ${lang} : valeur absurde dans « ${text} »`);
    // arabe : aucun chiffre, tous les nombres sont écrits en lettres (la voix lit mal les chiffres)
    if (lang === "ar") ok(!/[0-9٠-٩]/.test(text), `${tag} ar : chiffre dans le texte arabe « ${text} »`);
    else ok(!ARABIC.test(text), `${tag} ${lang} : arabe dans « ${text} »`);
    if (lang === "en") ok(!FRENCH_WORDS.test(text), `${tag} en : du français dans « ${text} »`);
    // garde-fou : « pas sûr » dit exactement quand le moteur le demande, mot pour mot comme la phrase fixe du téléphone
    ok(plan.confidence.askAPerson === idList.split(",").includes("unsure"), `${tag} ${lang} : askAPerson=${plan.confidence.askAPerson} mais lignes ${idList}`);
    const unsure = lines.find((l) => l.id === "unsure");
    if (unsure) ok(unsure.text === promptText("unsure", lang), `${tag} ${lang} : la phrase « pas sûr » lue n'est pas celle du moteur`);
    return text;
  };

  for (const k of cases) {
    const plan = await buildPlan({ regionId: k.regionId, cropId: k.cropId, lastIrrigationDaysAgo: k.ago ?? undefined, asOf: k.asOf });
    plans++;
    const tag = `${k.regionId}/${k.cropId}/ago=${k.ago}${k.asOf ? "@" + k.asOf : ""}`;
    const refIds = ivrPlanLines(plan, "fr").map((l) => l.id).join(",");
    for (const lang of IVR_LANGS) {
      const lines = ivrPlanLines(plan, lang);
      const text = common(tag, plan, lines, lang, refIds);
      const idList = lines.map((l) => l.id).join(",");
      // aucun conseil : pas de dose, pas de « pas d'irrigation nécessaire »
      if (plan.confidence.level === "none") ok(!idList.includes("advice") && !idList.includes("rain"), `${tag} ${lang} : conseil donné alors que le niveau est « aucun »`);
      ok(text.length <= MAX_PLAN_CHARS + 10 || plan.confidence.level === "none", `${tag} ${lang} : ${text.length} caractères, au-dessus de la cible de 25 s`);
      lengths[lang].push(text.length);
      if (text.length > longest.chars) longest = { chars: text.length, tag: `${tag} ${lang}` };
    }
  }
  // détail de la semaine (touche 3) : mêmes lignes dans les trois langues, garde-fou, pas de chiffre en arabe
  for (const k of cases) {
    const plan = await buildPlan({ regionId: k.regionId, cropId: k.cropId, lastIrrigationDaysAgo: k.ago ?? undefined, asOf: k.asOf });
    const tag = `détail ${k.regionId}/${k.cropId}/ago=${k.ago}${k.asOf ? "@" + k.asOf : ""}`;
    const refIds = ivrDetailLines(plan, "fr").map((l) => l.id).join(",");
    for (const lang of IVR_LANGS) {
      const text = common(tag, plan, ivrDetailLines(plan, lang), lang, refIds);
      ok(text.length <= MAX_PLAN_CHARS + 60, `${tag} ${lang} : ${text.length} caractères`);
      detailLengths[lang].push(text.length);
    }
  }
  const range = (a: number[]) => `${Math.min(...a)}-${Math.max(...a)}`;
  console.log(`  détail de la semaine : ${detailLengths.fr.length} plans × 3 langues, ${IVR_LANGS.map((l) => `${l} ${range(detailLengths[l])}`).join(", ")} caractères.`);
  // plan sans aucun conseil (météo trop ancienne), construit à la main sur un vrai plan
  const base = await buildPlan({ regionId: "kairouan", cropId: "olivier", lastIrrigationDaysAgo: 2 });
  const none = { ...base, days: [], confidence: { level: "none" as const, askAPerson: true, reasons: ["very_stale_data" as const] } };
  for (const lang of IVR_LANGS) {
    const lines = ivrPlanLines(none, lang);
    ok(lines.map((l) => l.id).join(",") === "where,unsure", `niveau « aucun » (${lang}) : ${lines.map((l) => l.id).join(",")}`);
    ok(ivrDetailLines(none, lang).map((l) => l.id).join(",") === "dhead,unsure", `détail, niveau « aucun » (${lang})`);
  }
  const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  console.log(`  ${plans} plans lus en 3 langues. Longueur lue : ${IVR_LANGS.map((l) => `${l} ${range(lengths[l])} (moy. ${avg(lengths[l])})`).join(", ")} caractères.`);
  console.log(`  Le plus long : ${longest.chars} caractères (${longest.tag}). À ~14 caractères par seconde : ≈ ${Math.round(longest.chars / 14)} s (cible ${PLAN_TARGET_SECONDS} s).`);
}

// ---------- 4. enregistrements ----------
// Chaque phrase fixe a un fichier à jour (même empreinte que le texte actuel) dans les trois langues ; chaque démonstration a ses
// fichiers, son texte et ses sous-titres à jour, un garde-fou cohérent avec le moteur, et existe dans les trois langues.
async function recordingChecks() {
  const root = join(process.cwd(), "public", "audio", "ivr");
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Manifest;
  let bytes = 0;
  // rien en trop : chaque entrée du manifeste et chaque fichier audio correspond à une phrase fixe actuelle
  const known = new Set(allRecordings().map((r) => `${r.id}.${r.lang}`));
  for (const i of manifest.items) ok(known.has(`${i.id}.${i.lang}`), `enregistrement sans phrase correspondante : ${i.id}.${i.lang}`);
  const orphans = readdirSync(root).filter((f) => f.endsWith(".mp3") && !known.has(f.replace(/\.mp3$/, "")));
  ok(orphans.length === 0, `fichiers audio sans phrase correspondante : ${orphans.join(", ")}`);
  for (const r of allRecordings()) {
    const item = manifest.items.find((i) => i.id === r.id && i.lang === r.lang);
    ok(!!item, `phrase non enregistrée : ${r.id}.${r.lang}`);
    if (!item) continue;
    ok(item.hash === textHash(r.text), `enregistrement périmé (le texte a changé) : ${r.id}.${r.lang}`);
    // l'adresse porte l'empreinte du texte : une copie gardée par le navigateur ne peut pas faire entendre une ancienne phrase
    ok(item.file === recordingFile(r.id, r.lang), `adresse sans empreinte à jour : ${item.file}`);
    ok(existsSync(join(process.cwd(), "public", recordingPath(r.id, r.lang))), `fichier absent : ${recordingPath(r.id, r.lang)}`);
    ok(item.en === r.en, `sous-titre anglais périmé dans le manifeste : ${r.id}.${r.lang}`);
    ok(item.durationMs > 300, `durée absurde : ${r.id}.${r.lang}`);
    bytes += item.bytes;
  }
  const demos = JSON.parse(readFileSync(join(root, "demo", "index.json"), "utf8")) as DemoItem[];
  for (const d of demos) {
    ok(existsSync(join(process.cwd(), "public", d.file)) && existsSync(join(process.cwd(), "public", d.json)), `fichiers de démonstration absents : ${d.id}`);
    const plan = await buildPlan({ regionId: d.region, cropId: d.crop, asOf: d.asOf, lastIrrigationDaysAgo: d.ago ?? undefined });
    const file = JSON.parse(readFileSync(join(process.cwd(), "public", d.json), "utf8")) as DemoClipFile;
    const textOf = d.detail ? ivrDetailText : ivrPlanText;
    ok(file.lines.map((l) => l.text).join(" ") === textOf(plan, d.lang), `démonstration périmée (le texte du moteur a changé) : ${d.id}`);
    ok(file.lines.map((l) => l.en).join(" ") === textOf(plan, "en"), `sous-titres anglais périmés dans la démonstration ${d.id}`);
    ok(d.askAPerson === plan.confidence.askAPerson, `garde-fou de la démonstration ${d.id} différent du moteur`);
    ok(d.durationMs <= (d.detail ? 35_000 : 29_000), `démonstration trop longue : ${d.id} ${(d.durationMs / 1000).toFixed(1)} s`);
    // la même scène existe dans les trois langues : hors connexion, aucune langue n'est moins bien servie
    for (const lang of IVR_LANGS) {
      ok(demos.some((o) => o.region === d.region && o.crop === d.crop && o.ago === d.ago && !!o.detail === !!d.detail && o.asOf === d.asOf && o.lang === lang), `démonstration ${d.id} sans version ${lang}`);
    }
  }
  const demoBytes = demos.reduce((n, d) => n + d.bytes, 0);
  const longest = Math.max(...demos.map((d) => d.durationMs));
  const perLang = IVR_LANGS.map((l) => `${l} ${demos.filter((d) => d.lang === l).length}`).join(", ");
  console.log(`  ${manifest.items.length} phrases fixes (${(bytes / 1024).toFixed(0)} Ko) et ${demos.length} démonstrations (${perLang} ; ${(demoBytes / 1024).toFixed(0)} Ko, la plus longue ${(longest / 1000).toFixed(1)} s).`);
}

(async () => {
  console.log("1. Arbre de dialogue");
  flowChecks();
  console.log("2. Phrases fixes");
  await promptChecks();
  console.log("3. Lecture du plan (météo réelle)");
  await planChecks();
  console.log("4. Enregistrements");
  await recordingChecks();
  console.log(problems === 0 ? `\nTOUT PASSE (${checks} contrôles)` : `\n${problems} PROBLÈME(S) sur ${checks} contrôles`);
  process.exit(problems === 0 ? 0 : 1);
})();
