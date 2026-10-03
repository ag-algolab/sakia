// Script du bulletin en darija tunisien (code ISO 639-3 : aeb), écrit en lettres arabes, construit à partir
// du plan comme bulletinScript : mêmes lignes, mêmes `id`, aucun chiffre écrit à la main.
//
// Choix de rédaction : mots simples de tous les jours, formes tunisiennes (عسلامة، توّا، موش، فمّاش، تنجّم، لين، باش،
// نهار، غدوة، برّك، يعطيكم الصحة) et JAMAIS de formes marocaines, algériennes, égyptiennes ou levantines : scripts/voice-check.ts
// échoue si l'une d'elles apparaît (liste NOT_TUNISIAN). Les voyelles doublées (shadda) aident la voix à ne pas lire de
// l'arabe standard.
// Tous les nombres (dose, température, pluie, date) sont écrits en toutes lettres (numbers-ar.ts) : la voix n'a pas à
// deviner comment lire des chiffres, et la dose, entendue une seule fois, doit être sans ambiguïté.
// Il n'existe pas d'orthographe standard de la darija : le texte reste à FAIRE RELIRE par un locuteur tunisien.
// Quelques mots peuvent être inexacts ; la page et la fiche le disent, on ne prétend pas à une validation.

import type { BulletinLine } from "../messages";
import type { Plan, PlanDay } from "../plan";
import { getRegion } from "../regions";
import { arabicNumber, countNoun } from "./numbers-ar";

// Noms des cultures tels que les agriculteurs les disent en Tunisie (différents de l'arabe standard pour
// la pastèque, le melon, la figue, le dattier).
export const CROP_AEB: Record<string, string> = {
  ble: "القمح",
  orge: "الشعير",
  tomate: "الطماطم",
  piment: "الفلفل",
  "pomme-de-terre": "البطاطا",
  pasteque: "الدلاع",
  melon: "البطيخ",
  oignon: "البصل",
  sorgho: "الذرة الرفيعة",
  olivier: "الزيتون",
  amandier: "اللوز",
  pistachier: "الفستق",
  vigne: "العنب",
  oranger: "القوارص",
  dattier: "النخل",
  grenadier: "الرمان",
  figuier: "الكرموس",
  luzerne: "الفصة",
};

const STRESS_AEB: Record<Plan["summary"]["stressRisk"], string> = { faible: "قليل", moyen: "متوسط", eleve: "كبير" };

const DEGREE = { one: "درجة واحدة", two: "درجتين", plural: "درجات", many: "درجة" };
const MM = { one: "مليمتر واحد", two: "مليمترين", plural: "مليمترات", many: "مليمتر" };
const LITER = { one: "لتر واحد", two: "لترين", plural: "لترات", many: "لتر" };
const M3 = { one: "متر مكعب واحد", two: "مترين مكعبين", plural: "أمتار مكعبة", many: "متر مكعب" };

// ar-TN : jours et mois à la tunisienne (جانفي، فيفري، جوان، جويلية، أوت…). Le jour du mois est écrit en lettres ;
// le 1er se dit « غرة » (« غرة أوت »).
function dayParts(date: string): { weekday: string; day: string; month: string } {
  const parts = new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).formatToParts(new Date(`${date}T00:00:00Z`));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const d = parseInt(get("day"), 10);
  return { weekday: get("weekday"), day: d === 1 ? "غرة" : arabicNumber(d), month: get("month") };
}

// « اليوم », « غدوة », « بعد غدوة » quand le premier arrosage est dans les 2 jours : un agriculteur qui ne lit pas
// raisonne en jours de la semaine, pas en dates.
function relativeDay(today: string, date: string): string | null {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  return diff === 0 ? "اليوم" : diff === 1 ? "غدوة" : diff === 2 ? "بعد غدوة" : null;
}

function dose(d: PlanDay): string {
  if (d.litersPerTree != null) return `${countNoun(d.litersPerTree, LITER)} لكل شجرة`;
  return `${countNoun(d.m3PerHa, M3)} في الهكتار`;
}

export function bulletinScriptAeb(plan: Plan): BulletinLine[] {
  const region = getRegion(plan.regionId)?.nameAr ?? plan.regionId;
  const crop = CROP_AEB[plan.cropId] ?? plan.cropId;
  const s = plan.summary;
  const rain = s.rainExpectedMm;
  const hot = Number.isFinite(s.tmaxMax) ? Math.round(s.tmaxMax) : null;
  const first = plan.days.find((d) => d.action === "irriguer");
  const L = (id: string, text: string): BulletinLine => ({ id, text });

  const lines: BulletinLine[] = [
    L("hello", "عسلامة بيكم، ومرحبا بيكم في ساقية."),
    L("where", `هاذي نشرة السقي متاع ولاية ${region}، والمحصول: ${crop}.`),
  ];
  if (plan.status === "hors_vegetation") {
    lines.push(L("off", "المحصول هذا موش في موسمو توّا: ما فمّاش لزوم للسقي."));
  } else {
    lines.push(
      rain >= 1
        ? L("rain", `الأسبوع هذا المتوقع إنو تنزل الشتا، تقريبا ${countNoun(rain, MM)}.`)
        : L("rain", "الأسبوع هذا ما فمّاش شتا تنفع الزرع."),
    );
    if (hot != null) lines.push(L("hot", `الحرارة تنجّم توصل لين ${countNoun(hot, DEGREE)}.`));
    if (first) {
      const p = dayParts(first.date);
      const rel = relativeDay(plan.today, first.date);
      // le jour est dit, puis la quantité dans une phrase à part, puis le jour répété : le bulletin n'est entendu qu'une fois
      lines.push(
        L("advice", `نصيحتنا: اسقيو ${rel ? `${rel}، ` : ""}نهار ${p.weekday}، ${p.day} ${p.month}. الكمية: ${dose(first)}. نعاود: نهار ${p.weekday}.`),
      );
    } else {
      lines.push(L("advice", "نصيحتنا: ما فمّاش لزوم للسقي في السبعة أيام الجاية."));
    }
    lines.push(L("stress", `خطر العطش على الزرع: ${STRESS_AEB[s.stressRisk]}.`));
  }
  // même règle que bulletinScript (messages.ts) : une ligne « je ne suis pas sûr » quand le plan manque de fiabilité.
  // Au pluriel « nous » (la voix retenue est féminine : pas de « متأكد » masculin, et le reste du bulletin dit « نصيحتنا »),
  // et elle dit de quoi on n'est pas sûr.
  if (plan.confidence.askAPerson) lines.push(L("unsure", "انتبهو: ماناش متأكدين من النصيحة هاذي. قبل ما تسقيو، سقسيو تقني فلاحي في المندوبية."));
  lines.push(
    L("caveat", "هاذي نصيحة برّك: تثبّتو منها عند المصالح الفلاحية."),
    L("bye", "يعطيكم الصحة على الخدمة اللي تعملوها لبلادنا. بالتوفيق للجميع."),
  );
  return lines;
}

// Formes marocaines, algériennes, égyptiennes, levantines ou du Golfe à ne jamais écrire dans le texte tunisien :
// vérifié par scripts/voice-check.ts (mot entier, avec ou sans un préfixe d'une lettre ou un suffixe courant).
export const NOT_TUNISIAN = [
  // marocain
  "ديال", "كاين", "بغيت", "دابا", "واش", "ماشي", "بزاف", "غادي", "دروك", "شحال", "هاد", "هادي", "مزيان", "شنو", "أشنو", "راه",
  // algérien
  "راني", "تاع", "ياخي", "بصح",
  // égyptien
  "ازاي", "إزاي", "دلوقتي", "عايز", "كده", "أوي", "عشان", "علشان", "لسه", "برضه", "مفيش", "بتاع", "كويس", "بقى",
  // levantin
  "كتير", "هلق", "هلأ", "شو", "ليش", "هيك", "بدي", "منيح",
  // golfe
  "وش", "شلون", "الحين",
];

const PREFIXES = ["", "و", "ف", "ب", "ل", "ك"];
const SUFFIXES = ["", "ه", "ها", "نا", "ك", "كم", "هم"];

// Mots interdits trouvés dans un texte (insensible à la ponctuation arabe et latine).
export function nonTunisianWords(text: string): string[] {
  const tokens = text.split(/[\s،.:؛؟!?;()«»"'\-]+/).filter(Boolean);
  const found = new Set<string>();
  for (const tok of tokens) {
    for (const w of NOT_TUNISIAN) {
      if (PREFIXES.some((p) => SUFFIXES.some((s) => tok === p + w + s))) found.add(w);
    }
  }
  return [...found];
}
