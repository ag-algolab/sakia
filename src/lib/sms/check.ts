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
import type { PlanSource, ReportsApi } from "./handler";
import type { ReportRow } from "../reports";
import { reporterHash } from "../reports";
import { todayInTunisia } from "../weather";
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

// ---------- rapports de pluie, avec un enregistrement simulé (aucune écriture réelle dans Supabase) ----------
type Saved = { regionId: string; day: string; mm: number; level?: string; token: string };
function fakeReports(failing = false) {
  const saved: Saved[] = [];
  const api: ReportsApi = {
    save: async (regionId, day, mm, token, level) => {
      if (failing) return false;
      const i = saved.findIndex((r) => r.regionId === regionId && r.day === day && r.token === token);
      const row = { regionId, day, mm, level, token };
      if (i >= 0) saved[i] = row;
      else saved.push(row);
      return true;
    },
    load: async (regionId, since) =>
      saved.filter((r) => r.regionId === regionId && r.day >= since).map((r): ReportRow => ({ day: r.day, mm: r.mm, level: r.level ?? null, reporter_hash: reporterHash(r.token) })),
  };
  return { api, saved };
}
const sayR = async (from: string, text: string, reports: ReportsApi) => (await handleIncoming({ from, text }, stub, reports)).reply;

async function rainReports() {
  resetSmsSessions();
  const { api, saved } = fakeReports();
  const today = todayInTunisia();

  const a = await sayR("r1", "PLUIE 10 kairouan", api);
  check("PLUIE 10 kairouan : enregistré (10 mm, aujourd'hui, empreinte « sms:r1 »)", saved.length === 1 && saved[0].mm === 10 && saved[0].day === today && saved[0].token === "sms:r1" && saved[0].regionId === "kairouan", JSON.stringify(saved));
  check("1re personne : dit qu'il en faut 2", a.includes("10 mm") && a.includes("1 signalement") && a.includes("2"), a);
  const b = await sayR("r2", "pluie 6 kairouan", api);
  check("2e personne : « la pluie du plan est corrigée » et le nombre", b.includes("2 personnes") && b.includes("corrigée"), b);
  await sayR("r1", "pluie 12 kairouan", api);
  check("même personne qui renvoie : un seul rapport, valeur remplacée", saved.length === 2 && saved.find((r) => r.token === "sms:r1")?.mm === 12);

  const ar = await sayR("r3", "مطر 10 القيروان", api);
  check("مطر 10 القيروان : accepté, réponse en arabe", /[؀-ۿ]/.test(ar) && saved.some((r) => r.token === "sms:r3" && r.mm === 10), ar);
  const arabizi = await sayR("r4", "shta 10 sfax", api);
  check("shta 10 sfax : accepté (arabizi)", saved.some((r) => r.token === "sms:r4" && r.regionId === "sfax" && r.mm === 10), arabizi);
  const virgule = await sayR("r5", "pluie 2,5mm kairouan", api);
  check("virgule et unité : « 2,5mm » -> 2,5", saved.some((r) => r.token === "sms:r5" && r.mm === 2.5), virgule);

  await sayR("r6", "zitoun kairouan", api);
  await sayR("r6", "pluie 7", api);
  check("région retenue de la conversation (pas besoin de la répéter)", saved.some((r) => r.token === "sms:r6" && r.regionId === "kairouan" && r.mm === 7));

  const word = await sayR("r7", "pluie beaucoup kairouan", api);
  check("mot « beaucoup » : retenu 8 mm (bas de la fourchette), estimation prudente", saved.some((r) => r.token === "sms:r7" && r.mm === 8 && r.level === "heavy") && word.includes("prudente"), word);
  await sayR("r8", "chta barcha kairouan", api);
  check("« chta barcha » (arabizi) = beaucoup", saved.some((r) => r.token === "sms:r8" && r.mm === 8));
  await sayR("r9", "pluie hier 5 kairouan", api);
  check("« hier » : la veille", saved.some((r) => r.token === "sms:r9" && r.day < today && r.mm === 5));

  check("« pluie » seul : on demande la quantité", (await sayR("r10", "pluie", api)).includes("PLUIE 10"));
  check("200 mm refusé", (await sayR("r11", "pluie 200 kairouan", api)).includes("invalide") && !saved.some((r) => r.token === "sms:r11"));
  check("sans région : on la demande", (await sayR("r12", "pluie 10", api)).includes("Quelle région") && !saved.some((r) => r.token === "sms:r12"));
  const plan = await sayR("r13", "quand arroser mes oliviers à kairouan s'il a plu ?", api);
  check("question d'irrigation avec « plu » : reste une demande de plan", plan.startsWith("Sakia Kairouan") && !saved.some((r) => r.token === "sms:r13"), plan);

  const down = await sayR("r14", "pluie 10 kairouan", fakeReports(true).api);
  check("enregistrement impossible : message poli, pas d'erreur technique", down.includes("non enregistré"), down);

  resetSmsSessions();
  const lim = fakeReports();
  let last = "";
  for (let i = 0; i < 12; i++) last = await sayR("spam", `pluie ${i} kairouan`, lim.api);
  check("limite de 10 rapports par heure et par expéditeur", last.includes("trop de rapports") && lim.saved.length === 1, last);

  for (const reply of [a, b, ar, word, down]) check(`réponse de pluie ≤ 160 caractères (${reply.length})`, /[\u0600-\u06FF]/.test(reply) || fitGsm(reply).length <= 160 && reply.length <= 160, reply);
}

(async () => {
  await conversations();
  await rainReports();
  if (process.argv.includes("--live")) await live();
  console.log(failed ? `\n${failed} contrôle(s) en échec` : "\ntous les contrôles passent");
  process.exit(failed ? 1 : 0);
})();
