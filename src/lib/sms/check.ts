// Vérification du service SMS : npx tsx src/lib/sms/check.ts          (sans réseau : analyseur, menus, longueurs)
//                              npx tsx src/lib/sms/check.ts --live   (en plus : 24 régions x 18 cultures sur la météo réelle)
// Sort avec le code 1 si un contrôle échoue.

import { CROPS } from "../crops";
import { REGIONS } from "../regions";
import { AGO_ASK, planSms } from "../messages";
import type { Lang } from "../messages";
import { addDays, computePlan } from "../planCore";
import type { Forecast } from "../weather";
import { handleIncoming, resetSmsSessions } from "./handler";
import type { PlanSource } from "./handler";
import { fitGsm, gsmLength, smsInfo, toGsm } from "./encoding";
import { parseSms } from "./parse";
import { R } from "./replies";

let failed = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` ${detail}`}`);
}

// ---------- analyseur ----------
const plan = (text: string, crop?: string, region?: string) => {
  const p = parseSms(text);
  return p.kind === "plan" && p.cropId === crop && p.regionId === region;
};
const cases: [string, string, string][] = [
  ["olivier kairouan", "olivier", "kairouan"],
  ["zitoun kairouan", "olivier", "kairouan"],
  ["olivier القيروان", "olivier", "kairouan"],
  ["زيتون القيروان", "olivier", "kairouan"],
  ["الزيتون بالقيروان", "olivier", "kairouan"],
  ["zitoun 9ayrawan", "olivier", "kairouan"],
  ["ziotun kairouan", "olivier", "kairouan"], // lettres inversées
  ["oliver kairoan", "olivier", "kairouan"], // fautes de frappe
  ["Olivier à Kairouan", "olivier", "kairouan"],
  ["OLIVIER KAIROUAN.", "olivier", "kairouan"],
  ["9amh sfax", "ble", "sfax"],
  ["blé sidi bouzid", "ble", "sidi-bouzid"],
  ["tomates gabès", "tomate", "gabes"],
  ["tmatem 9abes", "tomate", "gabes"],
  ["felfel nabeul", "piment", "nabeul"],
  ["batata kef", "pomme-de-terre", "le-kef"],
  ["pomme de terre le kef", "pomme-de-terre", "le-kef"],
  ["dellaa kasserine", "pasteque", "kasserine"],
  ["دلاع القصرين", "pasteque", "kasserine"],
  ["deglet nour tozeur", "dattier", "tozeur"],
  ["نخيل توزر", "dattier", "tozeur"],
  ["louz mahdia", "amandier", "mahdia"],
  ["olive sousse", "olivier", "sousse"],
  ["grape monastir", "vigne", "monastir"],
];
for (const [text, crop, region] of cases) check(`parse « ${text} »`, plan(text, crop, region), JSON.stringify(parseSms(text)));

const same = parseSms("zitoun kairouan");
const same2 = parseSms("olivier القيروان");
check("« zitoun kairouan » = « olivier القيروان »", JSON.stringify(same) === JSON.stringify(same2));

const only = parseSms("zitoun");
check("culture seule", only.kind === "plan" && only.cropId === "olivier" && only.regionId === undefined);
const amb = parseSms("battikh kairouan");
check("« battikh » seul est ambigu", amb.kind === "plan" && amb.cropId === undefined && amb.ambiguousCrops?.length === 2);
check("« بطيخ أحمر » = pastèque", parseSms("بطيخ أحمر القيروان").kind === "plan" && (parseSms("بطيخ أحمر القيروان") as { cropId?: string }).cropId === "pasteque");

const kw: [string, string][] = [
  ["PLAN", "plan"], ["plan", "plan"], ["pln", "unknown"], ["stp", "unknown"], ["AIDE", "help"], ["aid", "unknown"], ["help", "help"],
  ["LANGUE", "language"], ["STOP", "stop"], ["stpo", "unknown"], ["arret", "stop"], ["ايقاف", "stop"], ["مساعدة", "help"],
  ["خطة", "plan"], ["لغة", "language"], ["*123#", "ussd"], ["* 123 #", "ussd"], ["*123*1#", "ussd"], ["2", "choice"],
  ["english", "language"], ["", "unknown"], ["blabla", "unknown"], ["tunisie", "unknown"],
];
for (const [text, kind] of kw) check(`mot-clé « ${text} » -> ${kind}`, parseSms(text).kind === kind, parseSms(text).kind);
const l = parseSms("LANGUE AR");
check("LANGUE AR", l.kind === "language" && l.lang === "ar");
const pl = parseSms("plan olivier kairouan");
check("PLAN + culture + région", pl.kind === "plan" && pl.cropId === "olivier" && pl.regionId === "kairouan");
check("STOP l'emporte", parseSms("olivier kairouan stop").kind === "stop");
check("« stp » n'efface pas la conversation", parseSms("olivier kairouan stp").kind === "plan");
check("« sto » seul n'est pas STOP non plus", parseSms("sto").kind === "unknown");

// ---------- dernier arrosage dit dans le message ----------
// [texte, culture attendue, jours écoulés attendus] ; la région est toujours Kairouan.
const agoCases: [string, string, number | undefined][] = [
  ["olivier kairouan hier", "olivier", 1],
  ["zitoun kairouan lbare7", "olivier", 1],
  ["olivier kairouan yesterday", "olivier", 1],
  ["زيتون القيروان البارح", "olivier", 1],
  ["زيتون القيروان امس", "olivier", 1],
  ["olivier kairouan aujourd'hui", "olivier", 0],
  ["olivier kairouan today", "olivier", 0],
  ["zitoun kairouan lyoum", "olivier", 0],
  ["زيتون القيروان اليوم", "olivier", 0],
  ["olivier kairouan avant-hier", "olivier", 2],
  ["olivier kairouan avant hier", "olivier", 2],
  ["زيتون القيروان قبل البارح", "olivier", 2],
  ["زيتون القيروان يومين", "olivier", 2],
  ["tomate kairouan 3j", "tomate", 3],
  ["tomate kairouan 3 jours", "tomate", 3],
  ["tomate kairouan il y a 4 jours", "tomate", 4],
  ["tomate kairouan 5 days", "tomate", 5],
  ["tomate kairouan 2 ayem", "tomate", 2],
  ["tomate kairouan 7j", "tomate", 7],
  ["tomate kairouan 5j", "tomate", 5], // « 5j » ne doit pas être lu comme un mot d'arabizi (5 = خ)
  ["tomate kairouan 10 jours", "tomate", 7], // plafonné comme le moteur
  ["زيتون القيروان قبل 3 ايام", "olivier", 3],
  ["زيتون القيروان قبل يوم", "olivier", 1],
  ["olivier kairouan", "olivier", undefined],
  ["olivier kairouan 3", "olivier", undefined], // un nombre seul n'est pas un nombre de jours
  ["olivier kairouan jours", "olivier", undefined],
  ["olivier kairouan arrosé", "olivier", undefined],
];
for (const [text, crop, ago] of agoCases) {
  const p = parseSms(text);
  check(`dernier arrosage « ${text} » -> ${ago ?? "rien"}`, p.kind === "plan" && p.cropId === crop && p.regionId === "kairouan" && p.ago === ago, JSON.stringify(p));
}
for (const [text, days] of [["hier", 1], ["aujourd'hui", 0], ["3j", 3], ["اليوم", 0], ["البارح", 1], ["5 jours", 5], ["avant-hier", 2], ["lbare7", 1]] as [string, number][]) {
  const p = parseSms(text);
  check(`« ${text} » seul : dernier arrosage ${days}`, p.kind === "ago" && p.days === days, JSON.stringify(p));
}
check("« pluie hier 5 kairouan » : « hier » n'est pas lu comme un arrosage (message de pluie)", (() => { const p = parseSms("pluie hier 5 kairouan"); return p.kind === "plan" && p.regionId === "kairouan" && p.ago === undefined; })());
check("« il a plu hier, olivier kairouan » : pas de dernier arrosage lu", (() => { const p = parseSms("il a plu hier, olivier kairouan"); return p.kind === "plan" && p.cropId === "olivier" && p.ago === undefined; })());
check("« 3 » seul reste une réponse de menu", parseSms("3").kind === "choice");
check("« jour » seul ne dit rien", parseSms("jour").kind === "unknown");

// mots ordinaires qui ressemblent à une culture ou une région : ils ne doivent rien déclencher
for (const text of ["what should I plant in kairouan", "what can you do", "quelle date pour kairouan", "rien du tout", "premier fichier", "je suis déjà sous la pluie", "toutes les orages", "figure 3 vide"]) {
  const p = parseSms(text);
  const crop = p.kind === "plan" ? p.cropId : undefined;
  const region = p.kind === "plan" ? p.regionId : undefined;
  check(`pas de faux positif : « ${text} »`, crop === undefined && (region === undefined || text.includes("kairouan")), JSON.stringify(p));
}
check("avec une vraie région, le mot ordinaire est ignoré", plan("what should I plant in kairouan", undefined, "kairouan"));

// ---------- longueurs ----------
for (const lang of ["fr", "en", "ar"] as Lang[]) {
  for (const [k, v] of Object.entries(R)) {
    const t = (v as Record<Lang, string>)[lang];
    if (lang === "ar") check(`réponse ${k} (ar) ≤ 2 SMS`, smsInfo(t).segments <= 2, `${t.length} car.`);
    else check(`réponse ${k} (${lang}) ≤ 160`, fitGsm(t).length <= 160 && t.length <= 160, `${t.length} car.`);
  }
}

const long = "Sakia Sidi Bouzid : Pomme de terre. Irriguer mardi 13/10 : 1234 m³/ha. 7 irrigation(s) sur 7 jours. Pas sûr : demandez au technicien (CRDA). Merci beaucoup.";
const fitted = fitGsm(long);
check("coupe : la dernière phrase (avertissement) est gardée", fitted.length <= 160 && fitted.endsWith("Merci beaucoup.") && fitted.startsWith("Sakia Sidi Bouzid"), fitted);
const huge = fitGsm("A".repeat(100) + ". " + "B".repeat(100) + ".");
check("coupe : deux phrases trop longues -> 160 au plus, fin gardée", huge.length <= 160 && huge.endsWith("B".repeat(100) + "."), String(huge.length));
check("coupe : un seul bloc trop long", fitGsm("C".repeat(300)).length <= 160);

// ---------- conversation, avec un plan simulé ----------
// Prévision fixe (pas de réseau) : 7 jours passés + 16 jours de prévision autour du 5 octobre 2026, puis le vrai calcul du moteur.
function fixedForecast(): Forecast {
  const days = Array.from({ length: 23 }, (_, i) => ({ date: addDays("2026-09-28", i), et0: 4.4, rain: 0, tmax: 31, tmin: 20, rainProb: 0 }));
  return { days, today: "2026-10-05", fetchedAt: "2026-10-05T05:00:00.000Z", source: "open-meteo" };
}
const FRESH = new Date("2026-10-05T06:00:00.000Z"); // 1 h après le téléchargement de la météo
const STALE = new Date("2026-10-07T17:00:00.000Z"); // 60 h après : le moteur ne donne plus de conseil
const planAt = (now: Date): PlanSource => async (r, c, ago) => computePlan({ regionId: r, cropId: c, lastIrrigationDaysAgo: ago }, fixedForecast(), { now, today: "2026-10-05" });
const stub: PlanSource = planAt(FRESH);

async function say(from: string, text: string, src: PlanSource = stub) {
  return (await handleIncoming({ from, text }, src)).reply;
}

async function conversations() {
  resetSmsSessions();
  const a = await say("t1", "zitoun kairouan");
  const b = await say("t2", "olivier القيروان");
  check("même réponse pour les deux écritures", a === b && a.startsWith("Sakia"), `${a} | ${b}`);
  check("réponse ≤ 160 et GSM", (gsmLength(a) ?? 999) <= 160, a);

  check("garde-fou affiché : « Pas sûr : demandez au technicien (CRDA) »", a.includes("Pas sûr : demandez au technicien (CRDA)") || a.includes("Pas sur : demandez au technicien (CRDA)"), a);
  const stale = await say("t1b", "zitoun kairouan", planAt(STALE));
  check("météo de 60 h : aucun conseil, on renvoie vers une personne", stale.includes("CRDA") && !stale.includes("Irriguer") && !stale.includes("irrigation"), stale);

  check("PLAN rejoue le dernier plan", (await say("t1", "PLAN")) === a);
  check("culture seule -> demande la région", (await say("t3", "olivier")).includes("région"));
  check("puis la région suffit", (await say("t3", "kairouan")) === a);

  const m = await say("t4", "*123#");
  check("menu USSD", m.includes("1. Plan 7 jours") && m.includes("2. Changer culture") && m.includes("3. Langue"), m);
  check("menu 1 sans état -> demande", (await say("t4", "1")).includes("culture"));
  await say("t4", "*123#");
  check("menu 3 -> langues", (await say("t4", "3")).includes("English"));
  const ar = await say("t4", "2");
  check("choix 2 = arabe", ar.startsWith("اللغة"), ar);
  const arPlan = await say("t4", "olivier kairouan");
  check("réponse en arabe ensuite", /[؀-ۿ]/.test(arPlan), arPlan);
  check("arabe : 3 SMS au plus", smsInfo(arPlan).segments <= 3, `${arPlan.length} car.`);

  check("langue auto si message tout en arabe", /[؀-ۿ]/.test(await say("t5", "زيتون القيروان")));
  check("pas d'arabe automatique si mélangé", !/[؀-ۿ]/.test(await say("t6", "olivier القيروان")));
  check("LANGUE EN", (await say("t7", "langue en")) === "Language: English.");
  check("STOP efface", (await say("t7", "stop")).includes("erased"));
  check("après STOP, plus de mémoire", (await say("t7", "plan")).includes("Quelle culture"));
  check("AIDE ≤ 160", (gsmLength(await say("t8", "aide")) ?? 999) <= 160);
  check("inconnu", (await say("t9", "blabla")).includes("pas compris"));
  const down = await say("t10", "olivier kairouan", async () => { throw new Error("réseau coupé"); });
  check("météo en panne -> message poli, sans détail technique", down.includes("indisponible") && !down.includes("réseau"), down);
  check("from absent accepté", (await handleIncoming({ text: "aide" })).reply.length > 0);
  check("texte absent accepté", (await handleIncoming({ from: "x" })).reply.length > 0);
  check("texte trop long refusé", (await say("t11", "a".repeat(400))).includes("trop long"));

  resetSmsSessions();
  let last = "";
  for (let i = 0; i < 25; i++) last = await say("spam", "aide");
  check("limite de débit", last.includes("Trop de messages"), last);
}

// ---------- dernier arrosage : la question dans le SMS du plan, la réponse (1 à 4, « hier », « 3j »), la mémoire ----------
// Au 5 octobre 2026 (prévision fixe) l'olivier, le piment, l'amandier... sont en saison ; le blé et la tomate ne le sont pas.
const planWith = (crop: string, ago: number | undefined, lang: Lang = "fr") => {
  const text = planSms(computePlan({ regionId: "kairouan", cropId: crop, lastIrrigationDaysAgo: ago }, fixedForecast(), { now: FRESH, today: "2026-10-05" }), lang);
  return lang === "ar" ? text : fitGsm(text, 160); // la forme finale du service : m³ -> m3, accents hors GSM retirés
};
const QUESTION_FR = "Arrosé quand ? 1 auj 2 1-2j 3 3-5j 4 +5j";
const SAFEGUARD_FR = "Pas sûr : demandez au technicien (CRDA).";

async function lastIrrigation() {
  resetSmsSessions();
  const q = await say("g1", "piment kairouan");
  check("sans dernier arrosage : le SMS pose la question", q.includes(QUESTION_FR), q);
  check("… et « Pas sûr : demandez au technicien (CRDA) » reste la DERNIÈRE phrase", q.endsWith(SAFEGUARD_FR.replace("sûr", "sur")) || q.endsWith(SAFEGUARD_FR), q);
  check("… le tout tient dans un SMS (≤ 160, alphabet GSM)", (gsmLength(q) ?? 999) <= 160, q);
  const a2 = await say("g1", "2");
  check("réponse 2 (1 à 2 jours) : plan sûr, sans « Pas sûr » ni question", a2.startsWith("Sakia Kairouan") && !a2.includes("Pas s") && !a2.includes("Arrosé quand"), a2);
  check("… c'est le plan du moteur avec 2 jours écoulés", a2 === planWith("piment", 2), `${a2} | ${planWith("piment", 2)}`);
  check("PLAN rejoue ce plan (le dernier arrosage est retenu)", (await say("g1", "PLAN")) === a2);
  check("même culture et région redites : le dernier arrosage est retenu, pas de question", (await say("g1", "piment kairouan")) === a2);
  check("autre culture : le dernier arrosage ne vaut plus, la question revient", (await say("g1", "olivier kairouan")).includes(QUESTION_FR));
  for (const [digit, ago] of [["1", 0], ["2", 2], ["3", 5], ["4", 7]] as [string, number][]) {
    await say(`d${digit}`, "olivier kairouan");
    check(`réponse ${digit} -> ${ago} jour(s) écoulé(s), mêmes tranches que la ligne vocale`, (await say(`d${digit}`, digit)) === planWith("olivier", ago));
  }

  check("dans le message : « piment kairouan hier » -> plan sûr, sans question", (await say("g5", "piment kairouan hier")) === planWith("piment", 1));
  check("dans le message : « piment kairouan 3j »", (await say("g6", "piment kairouan 3j")) === planWith("piment", 3));
  check("dans le message : « piment kairouan aujourd'hui »", (await say("g7", "piment kairouan aujourd'hui")) === planWith("piment", 0));
  check("dans le message, en arabizi : « felfel kairouan lbare7 »", (await say("g8", "felfel kairouan lbare7")) === planWith("piment", 1));

  await say("g9", "piment kairouan");
  check("« hier » seul, après un plan : le plan devient sûr", (await say("g9", "hier")) === planWith("piment", 1));
  check("« hier » seul, sans culture ni région : on les demande", (await say("g10", "hier")).includes("culture"));

  await say("g11", "piment kairouan");
  check("chiffre hors tranches (7) : on repose la question", (await say("g11", "7")) === R.askAgo.fr);
  check("… puis un chiffre valable est accepté", (await say("g11", "2")) === planWith("piment", 2));
  await say("g12", "piment kairouan");
  const dont = await say("g12", "9");
  check("9 = je ne sais pas : le plan avec « Pas sûr », sans reposer la question", dont.includes("Pas s") && !dont.includes("Arrosé quand"), dont);

  check("culture hors saison : pas de question", !(await say("g13", "ble kairouan")).includes("Arrosé quand"));
  const none = await say("g14", "piment kairouan", planAt(STALE));
  check("météo de 60 h : aucun conseil, pas de question", !none.includes("Arrosé quand") && none.includes("CRDA"), none);
  check("… et un chiffre qui suit ne change rien (pas de question en attente)", (await say("g14", "2")).includes("compris"));

  await say("g15", "piment kairouan");
  await say("g15", "2");
  await say("g15", "stop");
  check("STOP efface aussi le dernier arrosage : la question revient", (await say("g15", "piment kairouan")).includes(QUESTION_FR));

  const en = (await say("g16", "langue en"), await say("g16", "pepper kairouan"));
  check("en anglais : question « Last irrigation? » et avertissement en dernier", en.includes("Last irrigation? 1 today") && en.endsWith("Not sure: ask the technician (CRDA)."), en);
  check("… ≤ 160", (gsmLength(en) ?? 999) <= 160, en);
  check("en anglais, réponse 2 : plan sûr", (await say("g16", "2")) === planWith("piment", 2, "en"));
  const ar = await say("g17", "فلفل القيروان");
  check("en arabe : la question est posée", ar.includes("آخر سقي؟ 1 اليوم"), ar);
  check("… 3 SMS au plus", smsInfo(ar).segments <= 3, `${ar.length} car.`);
  check("en arabe, réponse 2 : plan sûr", (await say("g17", "2")) === planWith("piment", 2, "ar"));

  check("« olivier kairouan hier » : la phrase reste ≤ 160 (anglais aussi)", (gsmLength(await say("g18", "olive kairouan yesterday")) ?? 999) <= 160);
}

// Toutes les régions x toutes les cultures (prévision fixe) : le SMS avec la question tient dans 160 caractères GSM (arabe : 3 SMS),
// garde la question ET l'avertissement en dernier. Sans cela, fitGsm ferait sauter la question en silence.
async function askLengths() {
  let n = 0;
  let worst = 0;
  let worstAt = "";
  for (const lang of ["fr", "en", "ar"] as Lang[]) {
    for (const r of REGIONS) {
      for (const c of CROPS) {
        const p = computePlan({ regionId: r.id, cropId: c.id }, fixedForecast(), { now: FRESH, today: "2026-10-05" });
        if (!p.confidence.reasons.includes("unknown_last_irrigation")) continue;
        const t = planSms(p, lang, { askAgo: true });
        const size = lang === "ar" ? smsInfo(t).segments : (gsmLength(toGsm(t)) ?? 999);
        const limit = lang === "ar" ? 3 : 160;
        if (lang !== "ar" && size > worst) { worst = size; worstAt = `${lang} ${r.id}/${c.id}`; }
        n++;
        if (size > limit || !t.includes(AGO_ASK[lang]) || !t.endsWith(lang === "ar" ? "غير متأكد: اسألوا الفني (CRDA)." : lang === "en" ? "Not sure: ask the technician (CRDA)." : SAFEGUARD_FR)) {
          check(`${lang} ${r.id}/${c.id} : question + avertissement en dernier, ${lang === "ar" ? "3 SMS" : "160"} au plus`, false, `${size} : ${t}`);
        }
      }
    }
  }
  check(`${n} SMS avec question (régions x cultures en saison, 3 langues) : tous complets, le plus long : ${worst} (${worstAt})`, n > 0 && worst <= 160);
}

// ---------- 24 régions x 18 cultures sur la météo réelle ----------
async function live() {
  const { buildPlan } = await import("../plan");
  let worst = 0;
  let n = 0;
  for (const r of REGIONS) {
    for (const c of CROPS) {
      const p = await buildPlan({ regionId: r.id, cropId: c.id });
      for (const lang of ["fr", "en"] as Lang[]) {
        const raw = planSms(p, lang);
        const reply = (await handleIncoming({ from: `live-${n}`, text: `${c.nameFr} ${r.nameFr}` }, async () => p)).reply;
        worst = Math.max(worst, gsmLength(reply) ?? 999);
        if (lang === "fr" && (gsmLength(reply) ?? 999) > 160) check(`${r.id}/${c.id}`, false, `${reply.length} car. (brut ${raw.length})`);
      }
      n++;
    }
  }
  check(`${n} combinaisons réelles : réponse ≤ 160 (plus long : ${worst})`, worst <= 160);
}

// ---------- « PLUIE » n'est plus une commande : l'aide ne la cite pas, le message reçoit la réponse d'aide ----------
async function noRainCommand() {
  resetSmsSessions();
  for (const text of ["PLUIE 10", "pluie", "PLUIE BEAUCOUP", "rain 10", "مطر 10", "shta 10"]) {
    const kind = parseSms(text).kind;
    check(`« ${text} » n'est plus une commande`, kind === "unknown", kind);
  }
  const fr = await say("p1", "PLUIE 10");
  check("« PLUIE 10 » reçoit la réponse d'aide (exemple et AIDE)", fr.includes("pas compris") && fr.includes("AIDE"), fr);
  const ar = await say("p2", "مطر 10");
  check("« مطر 10 » reçoit la réponse d'aide en arabe", /[؀-ۿ]/.test(ar) && ar.includes("AIDE"), ar);
  const region = await say("p3", "pluie 10 kairouan");
  check("« pluie 10 kairouan » : seule la région est lue, on demande la culture", region === "Kairouan : quelle culture ? Ex : olivier", region);
  for (const lang of ["fr", "en", "ar"] as Lang[]) {
    check(`l'aide (${lang}) ne cite aucune commande de pluie`, !/pluie|rain|مطر/i.test(R.help[lang]), R.help[lang]);
  }
  const menu = await say("p4", "*123#");
  check("le menu *123# ne propose pas la pluie", !/pluie|rain/i.test(menu), menu);
}

(async () => {
  await conversations();
  await lastIrrigation();
  await askLengths();
  await noRainCommand();
  if (process.argv.includes("--live")) await live();
  console.log(failed ? `\n${failed} contrôle(s) en échec` : "\ntous les contrôles passent");
  process.exit(failed ? 1 : 0);
})();
