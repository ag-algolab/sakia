// Vérifie, pour toutes les cultures et plusieurs régions, que le script du bulletin a les mêmes lignes
// (mêmes `id`, même ordre) en français, arabe, anglais et coréen, sans trou ni valeur absurde.
// Lancer : node node_modules/tsx/dist/cli.mjs scripts/voice-check.ts   (réseau : météo Open-Meteo, aucun crédit vocal)

import { CROPS } from "../src/lib/crops";
import { buildPlan } from "../src/lib/plan";
import { fetchForecast } from "../src/lib/weather";
import { getRegion } from "../src/lib/regions";
import { VOICE_LANGS } from "../src/lib/voice/langs";
import { nonTunisianWords } from "../src/lib/voice/aeb";
import { bandFromPlan } from "../src/lib/voice/band";
import { bulletinScriptFor } from "../src/lib/voice/script";
import { cacheKey } from "../src/lib/voice/cache";

const REGIONS = ["kairouan", "sfax", "tozeur", "bizerte"];
const MAX_CHARS = 1500;

(async () => {
  let plans = 0;
  let problems = 0;
  let longest = 0;
  let sample = "";
  const fail = (msg: string) => {
    problems++;
    console.log("PROBLÈME :", msg);
  };

  for (const regionId of REGIONS) {
    const r = getRegion(regionId)!;
    const fc = await fetchForecast(r.lat, r.lon);
    const cases = [...CROPS.map((c) => ({ cropId: c.id, asOf: undefined as string | undefined })), { cropId: "tomate", asOf: "2026-07-17" }, { cropId: "olivier", asOf: "2026-01-15" }];
    for (const c of cases) {
      const plan = await buildPlan({ regionId, cropId: c.cropId, asOf: c.asOf }, c.asOf ? undefined : fc);
      plans++;
      const tag = `${regionId}/${c.cropId}${c.asOf ? "@" + c.asOf : ""}`;
      let refIds: string | null = null;
      for (const l of VOICE_LANGS) {
        const lines = bulletinScriptFor(plan, l.code);
        const ids = lines.map((x) => x.id).join(",");
        refIds ??= ids;
        if (ids !== refIds) fail(`${tag} ${l.code} : ids ${ids} différents de ${refIds}`);
        // garde-fou : un plan « pas sûr » doit toujours le dire, dans chaque langue
        if (plan.confidence.askAPerson !== ids.split(",").includes("unsure")) fail(`${tag} ${l.code} : askAPerson=${plan.confidence.askAPerson} mais ids ${ids}`);
        // ligne « soil » : juste avant l'avertissement quand il y a un conseil d'irrigation, absente sinon
        const idList = ids.split(",");
        const wantSoil = plan.status === "ok";
        if (wantSoil !== idList.includes("soil")) fail(`${tag} ${l.code} : ligne soil ${wantSoil ? "absente" : "présente"} (ids ${ids})`);
        if (wantSoil && idList[idList.indexOf("soil") + 1] !== "caveat") fail(`${tag} ${l.code} : soil n'est pas juste avant caveat (ids ${ids})`);
        const text = lines.map((x) => x.text).join(" ");
        longest = Math.max(longest, text.length);
        if (text.length > MAX_CHARS) fail(`${tag} ${l.code} : ${text.length} caractères`);
        if (lines.some((x) => !x.text.trim())) fail(`${tag} ${l.code} : ligne vide`);
        if (l.code === "aeb") {
          const bad = nonTunisianWords(text);
          if (bad.length) fail(`${tag} aeb : forme non tunisienne ${bad.join(", ")}`);
          // tous les nombres sont écrits en lettres : aucun chiffre ne doit rester dans le texte lu par la voix
          if (/[0-9٠-٩]/.test(text)) fail(`${tag} aeb : chiffre dans « ${text} »`);
          // garde-fou : « ماناش متأكدين » (pluriel), jamais le masculin « متأكد »
          if (/متأكد(?!ين)/.test(text)) fail(`${tag} aeb : « متأكد » au masculin singulier`);
        }
        if (/undefined|NaN|null|\[object/.test(text)) fail(`${tag} ${l.code} : valeur absurde dans « ${text} »`);
        if (l.code === "ko" && /[A-Za-z]/.test(text.replace(/CRDA/g, ""))) fail(`${tag} ko : lettres latines dans « ${text} »`);
        if (l.code === "ko" && c.cropId === "tomate" && regionId === "kairouan" && c.asOf) sample = lines.map((x) => `[${x.id}] ${x.text}`).join("\n");
      }
    }
  }
  // ligne « soil » nommée : 3 sols x 3 systèmes x 5 langues, toutes différentes, sans chiffre, sans forme non tunisienne
  {
    const plan = await buildPlan({ regionId: "kairouan", cropId: "olivier", lastIrrigationDaysAgo: 3 });
    const seen = new Map<string, string>();
    for (const l of VOICE_LANGS) {
      for (const soil of ["sableux", "limoneux", "argileux"] as const) {
        for (const system of ["goutte", "aspersion", "gravitaire"] as const) {
          const line = bulletinScriptFor(plan, l.code, { soil, system }).find((x) => x.id === "soil");
          const tag = `soil ${l.code} ${soil}/${system}`;
          if (!line) { fail(`${tag} : ligne absente`); continue; }
          if (/[0-9٠-٩]/.test(line.text)) fail(`${tag} : chiffre`);
          if (l.code === "aeb" && nonTunisianWords(line.text).length) fail(`${tag} : forme non tunisienne`);
          const k = `${l.code}|${line.text}`;
          if (seen.has(k)) fail(`${tag} : même phrase que ${seen.get(k)}`);
          seen.set(k, tag);
        }
      }
      // un seul des deux donné : l'autre est la valeur par défaut du moteur ; aucun des deux : phrase par défaut
      const onlySoil = bulletinScriptFor(plan, l.code, { soil: "argileux" }).find((x) => x.id === "soil")!.text;
      const explicitDefault = bulletinScriptFor(plan, l.code, { soil: "argileux", system: "goutte" }).find((x) => x.id === "soil")!.text;
      if (onlySoil !== explicitDefault) fail(`soil ${l.code} : « argileux » seul devrait valoir argileux + goutte`);
    }
    console.log(`ligne soil : ${seen.size} phrases nommées distinctes (3 sols x 3 systèmes x ${VOICE_LANGS.length} langues)`);
    // clé de cache : sol, système et semis la changent ; sans paramètre elle reste celle d'avant
    const k0 = cacheKey("t", "v", "m");
    const ks = [cacheKey("t", "v", "m", {}), cacheKey("t", "v", "m", { soil: "argileux" }), cacheKey("t", "v", "m", { system: "goutte" }), cacheKey("t", "v", "m", { planting: "2026-04-01" }), cacheKey("t", "v", "m", { soil: "argileux", system: "goutte" })];
    if (ks[0] !== k0) fail("clé de cache sans paramètre modifiée");
    if (new Set(ks.slice(1)).size !== 4 || ks.slice(1).includes(k0)) fail("clé de cache : sol, système et semis doivent la changer");
    console.log("clé de cache : sans paramètre inchangée, sol / système / semis la changent");
  }

  // signalements de pluie des agriculteurs : ligne « reports » juste après « rain », dans chaque langue
  {
    const base = await buildPlan({ regionId: "kairouan", cropId: "olivier", lastIrrigationDaysAgo: 3 });
    const day = (back: number) => new Date(Date.parse(`${base.today}T00:00:00Z`) - back * 86400000).toISOString().slice(0, 10);
    const levels = [
      { level: "none" as const, mm: 0 }, { level: "very_light" as const, mm: 1 }, { level: "light" as const, mm: 2 },
      { level: "heavy" as const, mm: 8 }, { level: "very_heavy" as const, mm: 25 },
    ];
    let phrases = 0;
    for (const lv of levels) {
      for (const n of [2, 3, 5, 10, 11, 12]) {
        for (const back of [0, 1, 2, 3]) {
          const plan = { ...base, localReports: [{ date: day(back), medianMm: lv.mm, n, modelMm: 0.4, level: lv.level }] };
          let refIds = "";
          for (const l of VOICE_LANGS) {
            const lines = bulletinScriptFor(plan, l.code);
            const ids = lines.map((x) => x.id).join(",");
            if (!refIds) refIds = ids;
            const tag = `reports ${lv.level} n=${n} -${back}j ${l.code}`;
            if (ids !== refIds) fail(`${tag} : ids ${ids} différents de ${refIds}`);
            const i = lines.findIndex((x) => x.id === "reports");
            if (i < 1 || lines[i - 1].id !== "rain") { fail(`${tag} : ligne reports absente ou pas après rain (${ids})`); continue; }
            const text = lines[i].text;
            phrases++;
            if (l.code === "aeb") {
              if (/[0-9٠-٩]/.test(text)) fail(`${tag} : chiffre dans « ${text} »`);
              if (nonTunisianWords(text).length) fail(`${tag} : forme non tunisienne ${nonTunisianWords(text).join(", ")}`);
            }
            if (l.code === "ko" && /[A-Za-z]/.test(text)) fail(`${tag} : lettres latines dans « ${text} »`);
            if (/undefined|NaN/.test(text)) fail(`${tag} : valeur absurde dans « ${text} »`);
            // jamais « mesuré » : le texte doit dire que c'est un signalement
            const says = { fr: /pas une mesure/, en: /not a measurement/, ar: /وليس قياسا/, aeb: /موش قياس/, ko: /측정값이 아니라/ }[l.code];
            if (!says.test(text)) fail(`${tag} : ne dit pas « signalement, pas mesure » : « ${text} »`);
          }
        }
      }
    }
    // pas de ligne reports quand il n'y a pas de conseil à corriger (hors saison) ou pas de signalement
    const off = { ...base, status: "hors_vegetation" as const, localReports: [{ date: day(1), medianMm: 2, n: 3, modelMm: 0, level: "light" as const }] };
    for (const l of VOICE_LANGS) {
      if (bulletinScriptFor(off, l.code).some((x) => x.id === "reports")) fail(`reports présent hors saison (${l.code})`);
      if (bulletinScriptFor(base, l.code).some((x) => x.id === "reports")) fail(`reports présent sans signalement (${l.code})`);
    }
    console.log(`ligne reports : ${phrases} phrases vérifiées (5 degrés x 6 effectifs x 4 jours x ${VOICE_LANGS.length} langues)`);
  }

  // plan sans aucun conseil (météo trop ancienne) : on ne lit QUE la phrase « pas sûr », jamais de chiffre ni de « pas d'irrigation »
  const base = await buildPlan({ regionId: "kairouan", cropId: "olivier" });
  const none = { ...base, days: [], confidence: { level: "none" as const, askAPerson: true, reasons: ["very_stale_data" as const] } };
  for (const l of VOICE_LANGS) {
    const lines = bulletinScriptFor(none, l.code);
    if (lines.length !== 1 || lines[0].id !== "unsure") fail(`niveau none ${l.code} : ${JSON.stringify(lines.map((x) => x.id))}`);
    if (/\d/.test(lines[0].text)) fail(`niveau none ${l.code} : chiffre dans « ${lines[0].text} »`);
    console.log(`niveau none, ${l.code} : « ${lines[0].text} »`);
  }
  const b = bandFromPlan(none);
  if (b.next !== null || b.rainMm !== 0 || b.tmaxMax !== null || b.confidence.level !== "none") fail(`bandeau niveau none : ${JSON.stringify(b)}`);
  console.log(`${plans} plans x ${VOICE_LANGS.length} langues. Texte le plus long : ${longest} caractères (limite ${MAX_CHARS}). Problèmes : ${problems}.`);
  console.log("\nExemple coréen (tomate, Kairouan, rejeu du 17 juillet 2026) :\n" + sample);
  process.exit(problems ? 1 : 0);
})();
