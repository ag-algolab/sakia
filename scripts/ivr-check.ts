// Vérifie la ligne vocale SANS audio et sans crédit vocal :
//   1. l'arbre de dialogue (parcours complets, retour, répétition, silences, durée maximale, touches invalides) ;
//   2. les phrases fixes (français, arabe, anglais présents ; garde-fou identique à celui du moteur ; budget de caractères) ;
//   3. la lecture du plan sur la météo réelle (toutes les cultures × réponses au dernier arrosage × 2 langues) :
//      mêmes lignes dans les trois langues, garde-fou dit quand il s'applique, aucune valeur absurde, longueur ≈ 25 s.
// Lancer : node node_modules/tsx/dist/cli.mjs scripts/ivr-check.ts   (réseau : météo Open-Meteo)

import { CROPS } from "../src/lib/crops";
import { bulletinScript } from "../src/lib/messages";
import { buildPlan } from "../src/lib/plan";
import { REGIONS } from "../src/lib/regions";
import { ask, KEYS, parseState, startCall, step } from "../src/lib/ivr/flow";
import type { CallState, Key, Say } from "../src/lib/ivr/flow";
import { AGO_CHOICES, GROUPS, MAX_CALL_MS, OTHER_REGIONS, PLAN_TARGET_SECONDS } from "../src/lib/ivr/menu";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { DemoItem, Manifest } from "../src/lib/ivr/demo";
import { allRecordings, promptText, PROMPT_IDS, textHash } from "../src/lib/ivr/prompts";
import { MIN_REPORTERS, RAIN_LEVELS, rainCountText } from "../src/lib/ivr/rain";
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
const ids = (say: Say[]) =>
  say.map((s) => (s.kind === "prompt" ? `${s.id}:${s.lang}` : s.kind === "rain" ? `rain:${s.regionId}:${s.level}` : `${s.detail ? "detail" : "plan"}:${s.cropId}:${s.ago}`)).join(" ");

// ---------- 1. arbre de dialogue ----------
function flowChecks() {
  const start = startCall();
  ok(ids(start.say) === "welcome:fr welcome:ar", `accueil : ${ids(start.say)}`);

  // parcours complet en français : olivier à Kairouan, arrosé hier ou avant-hier, puis fin
  let r = press(["1", "1", "3", "1", "2"]);
  ok(r.state.node === "plan" && r.state.cropId === "olivier" && r.state.regionId === "kairouan" && r.state.ago === 2, `parcours fr : ${JSON.stringify(r.state)}`);
  ok(ids(r.say) === "plan:olivier:2", `plan olivier : ${ids(r.say)}`);
  r = press(["played"], r);
  ok(r.state.node === "again" && ids(r.say) === "again:fr rain_hint:fr", `après le plan : ${ids(r.say)}`);
  r = press(["2"], r);
  ok(r.end && r.state.node === "ended" && ids(r.say) === "bye:fr", `au revoir : ${ids(r.say)}`);

  // menu de fin : 3 = détail de la semaine, puis retour au menu de fin ; 1 et 2 comme avant
  r = press(["1", "1", "3", "1", "2", "played", "3"]);
  ok(r.state.node === "detail" && ids(r.say) === "detail:olivier:2", `détail : ${ids(r.say)} / ${r.state.node}`);
  r = press(["played"], r);
  ok(r.state.node === "again" && ids(r.say) === "again:fr rain_hint:fr", `après le détail : ${ids(r.say)}`);
  r = press(["3", "5"], r); // un appui coupe le détail
  ok(r.state.node === "again", "appui pendant le détail → menu de fin");
  r = press(["3", "*"], r);
  ok(r.state.node === "again", "* depuis le détail → menu de fin");

  // signaler de la pluie : touche 7 au choix de la région, puis la région, puis cinq degrés de pluie (1 à 5), enregistrement, menu de fin
  r = press(["1", "7"]);
  ok(r.state.intent === "rain" && r.state.node === "region" && ids(r.say) === "rain_where:fr", `7 au choix de la région : ${ids(r.say)}`);
  r = press(["1"], r);
  ok(r.state.node === "rain_level" && r.state.regionId === "kairouan" && ids(r.say) === "rain_ask:fr", `région Kairouan : ${ids(r.say)}`);
  r = press(["3"], r);
  ok(r.state.node === "rain_done" && ids(r.say) === "rain:kairouan:light", `degré 3 = pluie légère : ${ids(r.say)}`);
  r = press(["played"], r);
  ok(r.state.node === "again" && r.state.intent === "advice" && r.state.rainLevel === null && ids(r.say) === "again:fr rain_hint:fr", `après le signalement : ${ids(r.say)}`);
  // une autre région : Sidi Bouzid est la 1re de la liste (2 puis 1)
  r = press(["2", "7", "2", "1", "5"]);
  ok(r.state.node === "rain_done" && ids(r.say) === "rain:sidi-bouzid:very_heavy", `autre région, énormément : ${ids(r.say)}`);
  // chaque touche 1 à 5 donne le bon degré ; 6 à 9 et # sont refusées
  RAIN_LEVELS.forEach((lvl, k) => {
    const x = press(["1", "7", "1", String(k + 1) as Key]);
    ok(ids(x.say) === `rain:kairouan:${lvl}`, `touche ${k + 1} → ${lvl} : ${ids(x.say)}`);
  });
  r = press(["1", "7", "1", "6"]);
  ok(r.state.node === "rain_level" && ids(r.say).startsWith("invalid:fr rain_ask:fr"), "6 n'est pas un degré de pluie");
  // depuis le menu de fin (après un plan), la touche 7 garde la région de l'appel ; * revient au menu de fin
  r = press(["1", "2", "1", "2", "2", "2", "played", "7"]);
  ok(r.state.node === "rain_level" && r.state.regionId === "sidi-bouzid" && ids(r.say) === "rain_ask:fr", `7 au menu de fin : ${ids(r.say)}`);
  ok(press(["*"], r).state.node === "again", "* depuis les degrés (après un plan) → menu de fin");
  // 7 en premier : * revient au choix de la région, puis à la langue
  r = press(["1", "7", "1"]);
  ok(press(["*"], r).state.node === "region", "* depuis les degrés (sans plan) → région");
  ok(press(["*", "*", "*"], r).state.node === "lang", "retour jusqu'à la langue");
  // un appui pendant la confirmation passe au menu de fin ; la répétition (0) refait l'enregistrement du même degré
  r = press(["1", "7", "1", "2", "4"]);
  ok(r.state.node === "again", "appui pendant la confirmation → menu de fin");
  // arabe
  r = press(["2", "7", "1", "4"]);
  ok(ids(r.say) === "rain:kairouan:heavy" && r.state.lang === "ar", `signalement en arabe : ${ids(r.say)}`);

  // arabe, autre région (Sfax = 3e de la liste), légumes, piment, « je ne sais pas » → ago = null
  r = press(["2", "2", "3", "2", "2", "9"]);
  ok(r.state.lang === "ar" && r.state.regionId === "sfax" && r.state.cropId === "piment" && r.state.ago === null, `parcours ar : ${JSON.stringify(r.state)}`);
  ok(ids(r.say) === "plan:piment:null", `plan piment : ${ids(r.say)}`);

  // plusieurs cultures de suite : après « oui », on revient au groupe, l'arrosage est redemandé
  r = press(["1", "1", "3", "1", "2", "played", "1"]);
  ok(r.state.node === "group" && r.state.regionId === "kairouan" && r.state.cropId === null && ids(r.say) === "group:fr", `autre culture : ${ids(r.say)} / ${r.state.node}`);
  r = press(["1", "1", "1"], r); // céréales, blé, aujourd'hui
  ok(r.state.cropId === "ble" && r.state.ago === 0 && r.state.plansHeard === 2, `deuxième culture : ${JSON.stringify(r.state)}`);

  // 0 répète la question ; * revient d'un cran
  r = press(["1", "1"]);
  ok(ids(press(["0"], r).say) === "group:fr", "0 répète le groupe");
  ok(press(["*"], r).state.node === "region", "* depuis le groupe → région");
  ok(press(["*", "*"], r).state.node === "lang" && press(["*", "*"], r).state.lang === null, "* deux fois → langue");
  r = press(["1", "1", "3"]);
  ok(press(["*"], r).state.node === "group", "* depuis la culture → groupe");
  r = press(["1", "1", "3", "1"]);
  ok(press(["*"], r).state.node === "crop", "* depuis le dernier arrosage → culture");
  ok(ids(press(["*", "0"], r).say) === "crop_arbres:fr", "retour puis répétition du menu des arbres");

  // touche invalide : « ce choix n'existe pas » puis la question
  r = press(["1", "1", "7"]);
  ok(ids(r.say) === "invalid:fr group:fr" && r.state.node === "group", `touche invalide : ${ids(r.say)}`);
  r = press(["#"]);
  ok(ids(r.say) === "invalid:fr invalid:ar welcome:fr welcome:ar", `# à l'accueil : ${ids(r.say)}`);
  r = press(["1", "2", "8"]);
  ok(r.state.node === "region_list" && ids(r.say).startsWith("invalid:fr"), "8 n'existe pas dans la liste des régions");

  // un appui pendant la lecture du plan passe à la question suivante
  r = press(["1", "1", "3", "1", "2", "5"]);
  ok(r.state.node === "again", "appui pendant le plan → question suivante");

  // silences : un silence répète, deux silences de suite raccrochent ; une touche remet le compteur à zéro
  r = press(["1", "silence"]);
  ok(ids(r.say) === "region:fr rain_hint:fr" && !r.end, `un silence répète : ${ids(r.say)}`);
  r = press(["silence"], r);
  ok(r.end && ids(r.say) === "bye:fr", `deux silences raccrochent : ${ids(r.say)}`);
  r = press(["1", "silence", "1", "silence"]);
  ok(!r.end, "une touche entre deux silences remet le compteur à zéro");

  // durée maximale
  r = press(["1", { tick: MAX_CALL_MS - 1000 }]);
  ok(!r.end, "pas de fin avant la durée maximale");
  r = press([{ tick: 1000 }], r);
  ok(r.end && ids(r.say) === "timeout:fr", `fin à 2 minutes : ${ids(r.say)}`);
  r = press([{ tick: MAX_CALL_MS }]);
  ok(r.end && ids(r.say) === "timeout:fr timeout:ar", `fin à 2 minutes avant le choix de la langue : ${ids(r.say)}`);

  // raccrocher, puis plus rien ne se passe
  r = press(["1", "1"]);
  const h = step(r.state, { type: "hangup" });
  ok(h.end && step(h.state, { type: "key", key: "1" }).say.length === 0, "raccrocher termine la ligne");

  // exhaustivité : toute combinaison de touches de 4 appuis ne plante jamais et reste dans des états valides
  let walked = 0;
  const walk = (s: CallState, depth: number) => {
    walked++;
    const back = parseState(JSON.parse(JSON.stringify(s)));
    ok(back !== null, `état non rechargeable : ${JSON.stringify(s)}`);
    if (depth === 0) return;
    for (const key of KEYS) {
      const next = step(s, { type: "key", key });
      if (!next.end) {
        ok(ids(next.say).length > 0 || next.state.node === "ended", `aucune parole après la touche ${key} au nœud ${s.node}`);
        walk(next.state, depth - 1);
      }
    }
  };
  walk(startCall().state, 4);
  console.log(`  ${walked} états parcourus (toutes touches, 4 appuis)`);

  // tous les nœuds ont une question qui existe dans les phrases fixes
  const seen = new Set<string>();
  const explore = (s: CallState, depth: number) => {
    for (const sy of ask(s)) if (sy.kind === "prompt") seen.add(sy.id);
    if (depth === 0) return;
    for (const key of KEYS) {
      const n = step(s, { type: "key", key });
      for (const sy of n.say) if (sy.kind === "prompt") seen.add(sy.id);
      if (!n.end) explore(n.state, depth - 1);
    }
  };
  explore(startCall().state, 7);
  // « wait » (attente du plan) et « unsure » (échec du calcul) sont dites par la page, pas par l'arbre ; « timeout » par le temps écoulé.
  for (const id of PROMPT_IDS) if (!["timeout", "wait", "unsure", "rain_thanks", "rain_fail"].includes(id)) ok(seen.has(id), `phrase jamais dite par l'arbre : ${id}`);
  // « rain_thanks » et « rain_fail » sont dites par la page après l'enregistrement du signalement, comme « wait » et « unsure ».

  // menus : tout est dans le catalogue, chaque culture est atteignable
  const reachable = new Set(GROUPS.flatMap((g) => g.crops));
  for (const c of CROPS) ok(reachable.has(c.id), `culture inaccessible au téléphone : ${c.id}`);
  for (const id of OTHER_REGIONS) ok(REGIONS.some((r) => r.id === id), `région inconnue : ${id}`);
  ok(AGO_CHOICES.every((c) => c.ago === null || (c.ago >= 0 && c.ago <= 7)), "réponses « dernier arrosage » hors de 0..7");
}

// ---------- 1 bis. signalements de pluie : degrés et seuil viennent de src/lib/rainLevels.ts (rien n'est recopié) ----------
function rainChecks() {
  ok(RAIN_LEVELS.length === 5 && MIN_REPORTERS >= 2, "degrés de pluie ou seuil de personnes absurdes");
  for (const n of [1, 2, 3, 7, 11, 25]) {
    for (const lang of ["fr", "ar", "en"] as const) {
      const t = rainCountText(n, lang);
      ok(t.length > 10 && !/undefined|NaN/.test(t), `phrase de comptage vide (${lang}, ${n})`);
      if (lang === "ar") ok(!/[0-9٠-٩]/.test(t), `chiffre dans la phrase arabe de comptage : ${t}`);
      if (lang !== "ar" && n >= MIN_REPORTERS) ok(t.includes(String(n)), `le nombre ${n} manque : ${t}`);
    }
  }
  ok(rainCountText(1, "fr").includes(`Il en faut ${MIN_REPORTERS}`), "sous le seuil la phrase doit dire combien de personnes il en faut");
  ok(rainCountText(MIN_REPORTERS, "fr").includes("pris en compte") && !rainCountText(MIN_REPORTERS, "fr").includes("Il en faut"), "au seuil la phrase dit que c'est pris en compte");
}

// ---------- 2. phrases fixes ----------
async function promptChecks() {
  const rec = allRecordings();
  const chars = rec.reduce((n, r) => n + r.text.length, 0);
  console.log(`  ${rec.length} enregistrements fixes, ${chars} caractères au total (fr + ar)`);
  for (const r of rec) {
    ok(r.text.trim().length > 0 && r.en.trim().length > 0, `phrase vide : ${r.id}.${r.lang}`);
    ok(!/undefined|NaN|null|\[object/.test(r.text), `valeur absurde dans ${r.id}.${r.lang}`);
    if (r.lang === "ar") ok(/[؀-ۿ]/.test(r.text), `${r.id}.ar n'est pas en arabe`);
    if (r.lang === "fr") ok(!/[؀-ۿ]/.test(r.text), `${r.id}.fr contient de l'arabe`);
  }
  // la phrase « pas sûr » dite au téléphone est exactement celle du moteur
  const base = await buildPlan({ regionId: "kairouan", cropId: "olivier" }); // dernier arrosage inconnu → pas sûr
  for (const lang of ["fr", "ar", "en"] as const) {
    const engine = bulletinScript(base, lang).find((l) => l.id === "unsure")?.text;
    ok(!!engine, `le moteur ne dit pas « pas sûr » (${lang})`);
    if (lang !== "en") ok(promptText("unsure", lang) === engine, `phrase « pas sûr » (${lang}) différente du moteur`);
  }
  return chars;
}

// ---------- 3. lecture du plan ----------
async function planChecks() {
  let plans = 0;
  let longest = { chars: 0, tag: "" };
  const lengths: Record<"fr" | "ar", number[]> = { fr: [], ar: [] };
  const detailLengths: number[] = [];
  const cases: { regionId: string; cropId: string; ago: number | null; asOf?: string }[] = [];
  for (const c of CROPS) for (const a of [null, 0, 2, 7]) cases.push({ regionId: "kairouan", cropId: c.id, ago: a });
  for (const regionId of OTHER_REGIONS) cases.push({ regionId, cropId: "olivier", ago: 2 });
  for (const c of ["tomate", "piment", "amandier", "ble", "olivier"]) cases.push({ regionId: "kairouan", cropId: c, ago: 2, asOf: "2026-07-17" });

  for (const k of cases) {
    const plan = await buildPlan({ regionId: k.regionId, cropId: k.cropId, lastIrrigationDaysAgo: k.ago ?? undefined, asOf: k.asOf });
    plans++;
    const tag = `${k.regionId}/${k.cropId}/ago=${k.ago}${k.asOf ? "@" + k.asOf : ""}`;
    let refIds: string | null = null;
    for (const lang of ["fr", "ar", "en"] as const) {
      const lines = ivrPlanLines(plan, lang);
      const text = lines.map((l) => l.text).join(" ");
      const idList = lines.map((l) => l.id).join(",");
      refIds ??= idList;
      ok(idList === refIds, `${tag} ${lang} : lignes ${idList} ≠ ${refIds}`);
      ok(lines.every((l) => l.text.trim().length > 0), `${tag} ${lang} : ligne vide`);
      ok(!/undefined|NaN|null|\[object|m³/.test(text), `${tag} ${lang} : valeur absurde dans « ${text} »`);
      // arabe : aucun chiffre, tous les nombres sont écrits en lettres (la voix lit mal les chiffres)
      if (lang === "ar") ok(!/[0-9٠-٩]/.test(text), `${tag} ar : chiffre dans le texte arabe « ${text} »`);
      // garde-fou : « pas sûr » dit exactement quand le moteur le demande
      ok(plan.confidence.askAPerson === idList.split(",").includes("unsure"), `${tag} ${lang} : askAPerson=${plan.confidence.askAPerson} mais lignes ${idList}`);
      // aucun conseil : pas de dose, pas de « pas d'irrigation nécessaire »
      if (plan.confidence.level === "none") ok(!idList.includes("advice") && !idList.includes("rain"), `${tag} ${lang} : conseil donné alors que le niveau est « aucun »`);
      if (lang !== "en") ok(text.length <= MAX_PLAN_CHARS + 10 || plan.confidence.level === "none", `${tag} ${lang} : ${text.length} caractères, au-dessus de la cible de 25 s`);
      if (lang !== "en") {
        lengths[lang].push(text.length);
        if (text.length > longest.chars) longest = { chars: text.length, tag: `${tag} ${lang}` };
      }
    }
  }
  // détail de la semaine (touche 3) : mêmes lignes dans les trois langues, garde-fou, pas de chiffre en arabe
  for (const k of cases) {
    const plan = await buildPlan({ regionId: k.regionId, cropId: k.cropId, lastIrrigationDaysAgo: k.ago ?? undefined, asOf: k.asOf });
    const tag = `détail ${k.regionId}/${k.cropId}/ago=${k.ago}${k.asOf ? "@" + k.asOf : ""}`;
    let refIds: string | null = null;
    for (const lang of ["fr", "ar", "en"] as const) {
      const lines = ivrDetailLines(plan, lang);
      const text = lines.map((l) => l.text).join(" ");
      const idList = lines.map((l) => l.id).join(",");
      refIds ??= idList;
      ok(idList === refIds, `${tag} ${lang} : lignes ${idList} ≠ ${refIds}`);
      ok(lines.every((l) => l.text.trim().length > 0), `${tag} ${lang} : ligne vide`);
      ok(!/undefined|NaN|null|\[object|m³/.test(text), `${tag} ${lang} : valeur absurde dans « ${text} »`);
      if (lang === "ar") ok(!/[0-9٠-٩]/.test(text), `${tag} ar : chiffre dans le détail arabe « ${text} »`);
      ok(plan.confidence.askAPerson === idList.split(",").includes("unsure"), `${tag} ${lang} : askAPerson=${plan.confidence.askAPerson} mais lignes ${idList}`);
      ok(text.length <= MAX_PLAN_CHARS + 60, `${tag} ${lang} : ${text.length} caractères`);
      if (lang !== "en") detailLengths.push(text.length);
    }
  }
  console.log(`  détail de la semaine : ${detailLengths.length / 2} plans × 3 langues, ${Math.min(...detailLengths)}-${Math.max(...detailLengths)} caractères.`);
  // plan sans aucun conseil (météo trop ancienne), construit à la main sur un vrai plan
  const base = await buildPlan({ regionId: "kairouan", cropId: "olivier", lastIrrigationDaysAgo: 2 });
  const none = { ...base, days: [], confidence: { level: "none" as const, askAPerson: true, reasons: ["very_stale_data" as const] } };
  for (const lang of ["fr", "ar", "en"] as const) {
    const lines = ivrPlanLines(none, lang);
    ok(lines.map((l) => l.id).join(",") === "where,unsure", `niveau « aucun » (${lang}) : ${lines.map((l) => l.id).join(",")}`);
    ok(ivrDetailLines(none, lang).map((l) => l.id).join(",") === "dhead,unsure", `détail, niveau « aucun » (${lang})`);
  }
  const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  console.log(`  ${plans} plans lus en 3 langues. Longueur lue : français ${Math.min(...lengths.fr)}-${Math.max(...lengths.fr)} caractères (moy. ${avg(lengths.fr)}), arabe ${Math.min(...lengths.ar)}-${Math.max(...lengths.ar)} (moy. ${avg(lengths.ar)}).`);
  console.log(`  Le plus long : ${longest.chars} caractères (${longest.tag}). À ~14 caractères par seconde : ≈ ${Math.round(longest.chars / 14)} s (cible ${PLAN_TARGET_SECONDS} s).`);
  return { avgFr: avg(lengths.fr), avgAr: avg(lengths.ar) };
}

// ---------- 4. enregistrements ----------
// Chaque phrase fixe a un fichier à jour (même empreinte que le texte actuel) ; chaque démonstration a ses fichiers,
// son texte à jour et un garde-fou cohérent avec le moteur.
async function recordingChecks() {
  const root = join(process.cwd(), "public", "audio", "ivr");
  const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8")) as Manifest;
  let bytes = 0;
  for (const r of allRecordings()) {
    const item = manifest.items.find((i) => i.id === r.id && i.lang === r.lang);
    ok(!!item, `phrase non enregistrée : ${r.id}.${r.lang}`);
    if (!item) continue;
    ok(item.hash === textHash(r.text), `enregistrement périmé (le texte a changé) : ${r.id}.${r.lang}`);
    ok(existsSync(join(process.cwd(), "public", item.file)), `fichier absent : ${item.file}`);
    ok(item.durationMs > 300, `durée absurde : ${r.id}.${r.lang}`);
    bytes += item.bytes;
  }
  const demos = JSON.parse(readFileSync(join(root, "demo", "index.json"), "utf8")) as DemoItem[];
  for (const d of demos) {
    ok(existsSync(join(process.cwd(), "public", d.file)) && existsSync(join(process.cwd(), "public", d.json)), `fichiers de démonstration absents : ${d.id}`);
    const plan = await buildPlan({ regionId: d.region, cropId: d.crop, asOf: d.asOf, lastIrrigationDaysAgo: d.ago ?? undefined });
    const file = JSON.parse(readFileSync(join(process.cwd(), "public", d.json), "utf8")) as { lines: { text: string }[] };
    ok(file.lines.map((l) => l.text).join(" ") === (d.detail ? ivrDetailText : ivrPlanText)(plan, d.lang), `démonstration périmée (le texte du moteur a changé) : ${d.id}`);
    ok(d.askAPerson === plan.confidence.askAPerson, `garde-fou de la démonstration ${d.id} différent du moteur`);
    ok(d.durationMs <= (d.detail ? 35_000 : 29_000), `démonstration trop longue : ${d.id} ${(d.durationMs / 1000).toFixed(1)} s`);
  }
  const demoBytes = demos.reduce((n, d) => n + d.bytes, 0);
  const longest = Math.max(...demos.map((d) => d.durationMs));
  console.log(`  ${manifest.items.length} phrases fixes (${(bytes / 1024).toFixed(0)} Ko) et ${demos.length} démonstrations (${(demoBytes / 1024).toFixed(0)} Ko, la plus longue ${(longest / 1000).toFixed(1)} s).`);
}

(async () => {
  console.log("1. Arbre de dialogue");
  flowChecks();
  rainChecks();
  console.log("2. Phrases fixes");
  await promptChecks();
  console.log("3. Lecture du plan (météo réelle)");
  await planChecks();
  console.log("4. Enregistrements");
  await recordingChecks();
  console.log(problems === 0 ? `\nTOUT PASSE (${checks} contrôles)` : `\n${problems} PROBLÈME(S) sur ${checks} contrôles`);
  process.exit(problems === 0 ? 0 : 1);
})();
