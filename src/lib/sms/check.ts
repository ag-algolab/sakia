// Vérification du service SMS : npx tsx src/lib/sms/check.ts          (sans réseau : analyseur, menus, longueurs)
//                              npx tsx src/lib/sms/check.ts --live   (en plus : 24 régions x 18 cultures sur la météo réelle)
// Sort avec le code 1 si un contrôle échoue.

import { CROPS } from "../crops";
import { REGIONS } from "../regions";
import { planSms } from "../messages";
import type { Lang } from "../messages";
import { addDays, computePlan } from "../planCore";
import type { Forecast } from "../weather";
import { handleIncoming, resetSmsSessions } from "./handler";
import type { PlanSource } from "./handler";
import { fitGsm, gsmLength, smsInfo } from "./encoding";
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
const planAt = (now: Date): PlanSource => async (r, c) => computePlan({ regionId: r, cropId: c }, fixedForecast(), { now, today: "2026-10-05" });
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

(async () => {
  await conversations();
  if (process.argv.includes("--live")) await live();
  console.log(failed ? `\n${failed} contrôle(s) en échec` : "\ntous les contrôles passent");
  process.exit(failed ? 1 : 0);
})();
