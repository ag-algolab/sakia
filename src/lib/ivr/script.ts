// Texte parlé du plan, pour la ligne vocale : construit à partir du Plan du moteur (buildPlan), jamais à la main.
// Seules les VALEURS changent (culture, région, jour, dose, pluie) ; les phrases sont une liste fixe.
//
// Deux lectures :
//   - ivrPlanLines   : l'essentiel, environ 25 secondes (où, pluie, chaleur, premier arrosage, arrosages suivants, risque) ;
//   - ivrDetailLines : le détail de la semaine (touche 3), jour d'arrosage par jour d'arrosage, total, pluie, jour le plus chaud.
//
// En arabe, tous les nombres sont écrits en toutes lettres (la voix lit mal les chiffres collés à du texte arabe) et les unités sont
// dites en entier (« ميليمتر », pas « مم »). Les sous-titres affichent donc les mêmes mots que ceux dits.
//
// Garde-fou « pas sûr : demandez à une personne » (critère éliminatoire) :
//   - plan.confidence.level === "none" : AUCUN conseil, on ne lit que le lieu et la phrase « pas sûr » ;
//   - plan.confidence.askAPerson       : le conseil est lu, puis la phrase « pas sûr » (la même que le moteur).

import { getCrop } from "../crops";
import { bulletinScript } from "../messages";
import type { Lang } from "../messages";
import type { Plan, PlanDay } from "../plan";
import { getRegion } from "../regions";
import { arabicWords } from "./arabicNumbers";
import { spokenName } from "./prompts";

export type PlanLine = { id: string; text: string };

// ~12,4 caractères par seconde mesurés sur la voix (français et arabe) : 330 caractères ≈ 26 s au plus.
// Au-delà, on retire d'abord les lignes facultatives : jamais le conseil ni le garde-fou.
export const MAX_PLAN_CHARS = 330;
const OPTIONAL_LINES = ["hot", "next", "hot2", "rain2"];

const LOCALE: Record<Lang, string> = { fr: "fr-FR", ar: "ar-TN-u-nu-latn", en: "en-GB" };

// Nombre dit à voix haute : en lettres en arabe, en chiffres ailleurs.
const num = (n: number, lang: Lang): string => (lang === "ar" ? arabicWords(n) : String(Math.round(n)));

function dayParts(date: string, lang: Lang) {
  const parts = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).formatToParts(
    new Date(`${date}T00:00:00Z`),
  );
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { weekday: get("weekday"), day: Number(get("day")), month: get("month") };
}

function absoluteDay(date: string, lang: Lang): string {
  if (lang === "ar") {
    const p = dayParts(date, lang);
    return `${p.weekday} ${arabicWords(p.day)} ${p.month}`;
  }
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

const weekday = (date: string, lang: Lang): string => dayParts(date, lang).weekday;

const diffDays = (a: string, b: string): number => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86400000);

// « aujourd'hui », « demain » ou le jour en toutes lettres. Un rejeu (date passée) n'emploie jamais « aujourd'hui » ni « demain ».
function when(date: string, plan: Plan, lang: Lang): string {
  const d = diffDays(date, plan.today);
  if (!plan.replay && d === 0) return lang === "ar" ? "اليوم" : lang === "en" ? "today" : "aujourd'hui";
  if (!plan.replay && d === 1) return lang === "ar" ? "غدا" : lang === "en" ? "tomorrow" : "demain";
  const abs = absoluteDay(date, lang);
  return lang === "ar" ? `يوم ${abs}` : lang === "en" ? `on ${abs}` : `le ${abs}`;
}

// Une dose se dit de façon que l'agriculteur la comprenne :
//   - arbres : des litres par arbre ;
//   - autres cultures : l'équivalent d'une pluie de N millimètres (un chiffre que tout agriculteur connaît, 1 mm = 10 m³/ha),
//     puis le volume par hectare. Les deux viennent du moteur (grossMm et m3PerHa), rien n'est inventé.
// Unités dites en toutes lettres : la voix lirait mal « m³/ha ».
type Dose = { m3PerHa: number; grossMm: number; litersPerTree?: number };

function spokenAmount(d: Dose, lang: Lang): string {
  if (d.litersPerTree != null) {
    const l = num(d.litersPerTree, lang);
    return lang === "ar" ? `${l} لترا للشجرة` : lang === "en" ? `${l} litres per tree` : `${l} litres par arbre`;
  }
  const mm = num(d.grossMm, lang);
  const m = num(d.m3PerHa, lang);
  return lang === "ar"
    ? `ما يعادل مطرا من ${mm} ميليمتر، أي ${m} متر مكعب للهكتار`
    : lang === "en"
      ? `the equivalent of ${mm} millimetres of rain, which is ${m} cubic metres per hectare`
      : `l'équivalent d'une pluie de ${mm} millimètres, soit ${m} mètres cubes par hectare`;
}

// Version courte pour le détail de la semaine (une ligne par arrosage) : le sens du chiffre a déjà été donné par la lecture principale.
function shortAmount(d: Dose, lang: Lang): string {
  if (d.litersPerTree != null) return spokenAmount(d, lang);
  const mm = num(d.grossMm, lang);
  return lang === "ar" ? `${mm} ميليمتر` : lang === "en" ? `${mm} millimetres` : `${mm} millimètres`;
}

function listWeekdays(dates: string[], lang: Lang): string {
  const names = dates.map((d) => weekday(d, lang));
  if (names.length === 1) return names[0];
  const last = names[names.length - 1];
  const head = names.slice(0, -1).join(lang === "ar" ? " و" : ", ");
  return lang === "ar" ? `${head} و${last}` : `${head} ${lang === "en" ? "and" : "et"} ${last}`;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

function names(plan: Plan, lang: Lang) {
  const crop = getCrop(plan.cropId);
  const region = getRegion(plan.regionId);
  return {
    crop: crop ? (lang === "ar" ? crop.nameAr : lang === "en" ? crop.nameEn : spokenName(crop.nameFr)) : plan.cropId,
    region: region ? (lang === "ar" ? region.nameAr : region.nameFr) : plan.regionId,
  };
}

// Les lignes retirées sont décidées sur le texte FRANÇAIS (le plus long) pour que les trois langues gardent les mêmes `id`.
export function ivrPlanLines(plan: Plan, lang: Lang): PlanLine[] {
  const dropped = droppedIds(buildLines(plan, "fr"));
  return buildLines(plan, lang).filter((l) => !dropped.has(l.id));
}

export function ivrDetailLines(plan: Plan, lang: Lang): PlanLine[] {
  const dropped = droppedIds(buildDetail(plan, "fr"));
  return buildDetail(plan, lang).filter((l) => !dropped.has(l.id));
}

function unsureLine(plan: Plan, lang: Lang): string | undefined {
  const text = bulletinScript(plan, lang).find((l) => l.id === "unsure")?.text;
  if (plan.confidence.askAPerson && !text) throw new Error("plan « pas sûr » sans phrase « pas sûr » : script incohérent");
  return text;
}

function rainLine(rain: number, lang: Lang): string {
  if (rain >= 1) {
    const mm = num(rain, lang);
    return lang === "ar"
      ? `الأمطار المتوقعة هذا الأسبوع: حوالي ${mm} ميليمتر.`
      : lang === "en"
        ? `Rain expected this week: about ${mm} millimetres.`
        : `Pluie attendue cette semaine : environ ${mm} millimètres.`;
  }
  return lang === "ar" ? "لا أمطار مفيدة متوقعة هذا الأسبوع." : lang === "en" ? "No useful rain is expected this week." : "Pas de pluie utile prévue cette semaine.";
}

function hotLine(tmax: number, lang: Lang): string {
  const t = num(tmax, lang);
  return lang === "ar" ? `قد تبلغ درجات الحرارة ${t} درجة.` : lang === "en" ? `Temperatures may reach ${t} degrees.` : `Les températures peuvent atteindre ${t} degrés.`;
}

function buildLines(plan: Plan, lang: Lang): PlanLine[] {
  const n = names(plan, lang);
  const where: PlanLine = {
    id: "where",
    text:
      lang === "ar"
        ? `نصيحة السقي لولاية ${n.region}، المحصول: ${n.crop}.`
        : lang === "en"
          ? `Irrigation advice for ${n.region}, crop: ${n.crop}.`
          : `Conseil d'irrigation pour ${n.region}, culture : ${n.crop}.`,
  };
  const bulletin = new Map(bulletinScript(plan, lang).map((l) => [l.id, l.text]));
  const unsure = unsureLine(plan, lang);
  const lines: PlanLine[] = [where];

  // aucun conseil : ni dose, ni « pas d'irrigation nécessaire » (fausse assurance sur un plan vide)
  if (plan.confidence.level === "none") return [...lines, { id: "unsure", text: unsure! }];

  if (plan.status === "hors_vegetation") {
    lines.push({ id: "off", text: bulletin.get("off")! });
  } else {
    lines.push({ id: "rain", text: rainLine(plan.summary.rainExpectedMm, lang) });
    if (Number.isFinite(plan.summary.tmaxMax)) lines.push({ id: "hot", text: hotLine(plan.summary.tmaxMax, lang) });
    const irrigations = plan.days.filter((d) => d.action === "irriguer");
    const first = irrigations[0];
    if (first) {
      const amount = spokenAmount(first, lang);
      const day = when(first.date, plan, lang);
      lines.push({
        id: "advice",
        text:
          lang === "ar"
            ? `نصيحتنا: اسقِ ${day}، ${first.litersPerTree != null ? "بمقدار " : ""}${amount}.`
            : lang === "en"
              ? `Our advice: irrigate ${day}, with ${amount}.`
              : `Notre conseil : irriguer ${day}, avec ${amount}.`,
      });
      const later = irrigations.slice(1, 4).map((d) => d.date);
      if (later.length) {
        const list = listWeekdays(later, lang);
        lines.push({
          id: "next",
          text: lang === "ar" ? `السقيات التالية: ${list}.` : lang === "en" ? `Next irrigations: ${list}.` : `Arrosages suivants : ${list}.`,
        });
      }
    } else {
      lines.push({ id: "advice", text: bulletin.get("advice")! });
    }
    lines.push({ id: "stress", text: bulletin.get("stress")! });
  }
  if (plan.confidence.askAPerson) lines.push({ id: "unsure", text: unsure! });
  return lines;
}

// ---------- le détail de la semaine (touche 3) ----------
function totalAmount(days: PlanDay[]): Dose {
  const trees = days.every((d) => d.litersPerTree != null);
  return {
    m3PerHa: days.reduce((s, d) => s + d.m3PerHa, 0),
    grossMm: days.reduce((s, d) => s + d.grossMm, 0),
    litersPerTree: trees ? days.reduce((s, d) => s + (d.litersPerTree ?? 0), 0) : undefined,
  };
}

function buildDetail(plan: Plan, lang: Lang): PlanLine[] {
  const n = names(plan, lang);
  const head: PlanLine = {
    id: "dhead",
    text: lang === "ar" ? `تفاصيل الأسبوع، ${n.crop}.` : lang === "en" ? `Week details, ${n.crop}.` : `Détail de la semaine, ${n.crop}.`,
  };
  const unsure = unsureLine(plan, lang);
  if (plan.confidence.level === "none") return [head, { id: "unsure", text: unsure! }];
  const lines: PlanLine[] = [head];
  if (plan.status === "hors_vegetation") {
    lines.push({ id: "off", text: bulletinScript(plan, lang).find((l) => l.id === "off")!.text });
  } else {
    const irrigations = plan.days.filter((d) => d.action === "irriguer");
    if (irrigations.length === 0) {
      lines.push({
        id: "noirr",
        text: lang === "ar" ? "لا حاجة لأي سقي هذا الأسبوع." : lang === "en" ? "No irrigation is needed this week." : "Aucun arrosage nécessaire cette semaine.",
      });
    } else {
      irrigations.slice(0, 4).forEach((d, i) => {
        const amount = shortAmount(d, lang);
        const day = lang === "ar" ? when(d.date, plan, lang) : cap(when(d.date, plan, lang));
        lines.push({ id: `irr${i + 1}`, text: lang === "fr" ? `${day} : ${amount}.` : `${day}: ${amount}.` });
      });
      if (irrigations.length > 1) {
        const amount = spokenAmount(totalAmount(irrigations), lang);
        lines.push({
          id: "total",
          text: lang === "ar" ? `مجموع الأسبوع: ${amount}.` : lang === "en" ? `Week total: ${amount}.` : `Total de la semaine : ${amount}.`,
        });
      }
    }
    const rainy = [...plan.days].sort((a, b) => b.rain - a.rain)[0];
    if (rainy && rainy.rain >= 1) {
      const mm = num(rainy.rain, lang);
      const day = when(rainy.date, plan, lang);
      lines.push({
        id: "rain2",
        text:
          lang === "ar"
            ? `أكثر الأيام مطرا ${day}: ${mm} ميليمتر.`
            : lang === "en"
              ? `Rainiest day ${day}: ${mm} millimetres.`
              : `Jour le plus pluvieux ${day} : ${mm} millimètres.`,
      });
    }
    const hottest = [...plan.days].filter((d) => Number.isFinite(d.tmax)).sort((a, b) => b.tmax - a.tmax)[0];
    if (hottest) {
      const day = when(hottest.date, plan, lang);
      const t = num(hottest.tmax, lang);
      lines.push({
        id: "hot2",
        text:
          lang === "ar"
            ? `أشد الأيام حرارة ${day}: ${t} درجة.`
            : lang === "en"
              ? `Hottest day ${day}: ${t} degrees.`
              : `Jour le plus chaud ${day} : ${t} degrés.`,
      });
    }
  }
  if (plan.confidence.askAPerson) lines.push({ id: "unsure", text: unsure! });
  return lines;
}

function droppedIds(lines: PlanLine[]): Set<string> {
  const dropped = new Set<string>();
  for (const id of OPTIONAL_LINES) {
    if (lines.filter((l) => !dropped.has(l.id)).map((l) => l.text).join(" ").length <= MAX_PLAN_CHARS) break;
    dropped.add(id);
  }
  return dropped;
}

export const ivrPlanText = (plan: Plan, lang: Lang): string => ivrPlanLines(plan, lang).map((l) => l.text).join(" ");
export const ivrDetailText = (plan: Plan, lang: Lang): string => ivrDetailLines(plan, lang).map((l) => l.text).join(" ");
