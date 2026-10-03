// Textes générés à partir d'un Plan : SMS, message Telegram, script du bulletin parlé.
// Tout est calculé sur les données du plan, rien n'est inventé à la main.
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien avant diffusion (arabe standard simple, pas de dialecte).

import { getCrop } from "./crops";
import { getRegion } from "./regions";
import type { ConfidenceReason, Plan, PlanDay } from "./planCore";

export type Lang = "fr" | "ar" | "en";

// Garde-fou « pas sûr : demandez à une personne » : phrases FIXES et vérifiables (jamais générées librement).
const ASK: Record<Lang, string> = {
  fr: "Je ne suis pas sûr : demandez à un technicien agricole (CRDA).",
  ar: "لست متأكدا: اسألوا فنيا فلاحيا (المندوبية الجهوية للتنمية الفلاحية).",
  en: "I am not sure: please ask an agricultural technician (CRDA).",
};
const ASK_SHORT: Record<Lang, string> = {
  fr: "Pas sûr : demandez au technicien (CRDA).",
  ar: "غير متأكد: اسألوا الفني (CRDA).",
  en: "Not sure: ask the technician (CRDA).",
};
const REASON: Record<Lang, Record<ConfidenceReason, string>> = {
  fr: {
    very_stale_data: "les données météo ont plus de 48 heures",
    stale_data: "les données météo ont plus de 12 heures",
    unknown_last_irrigation: "le dernier arrosage n'est pas connu",
    analogy_coefficients: "les coefficients de cette culture sont estimés par analogie",
    uncertain_rain: "de la pluie est possible dans les 3 jours",
    short_horizon: "la prévision ne couvre pas toute la semaine",
  },
  ar: {
    very_stale_data: "بيانات الطقس أقدم من 48 ساعة",
    stale_data: "بيانات الطقس أقدم من 12 ساعة",
    unknown_last_irrigation: "تاريخ آخر سقي غير معروف",
    analogy_coefficients: "معاملات هذا المحصول مقدرة بالمقارنة",
    uncertain_rain: "قد تسقط أمطار خلال 3 أيام",
    short_horizon: "التوقعات لا تغطي الأسبوع كله",
  },
  en: {
    very_stale_data: "the weather data is more than 48 hours old",
    stale_data: "the weather data is more than 12 hours old",
    unknown_last_irrigation: "the last irrigation is not known",
    analogy_coefficients: "this crop's coefficients are estimated by analogy",
    uncertain_rain: "rain is possible within 3 days",
    short_horizon: "the forecast does not cover the whole week",
  },
};

const LOCALE: Record<Lang, string> = {
  fr: "fr-FR",
  ar: "ar-TN-u-nu-latn", // chiffres latins : plus lisibles sur un téléphone basique
  en: "en-GB",
};

function dayLabel(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function shortDay(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

function names(plan: Plan, lang: Lang) {
  const crop = getCrop(plan.cropId);
  const region = getRegion(plan.regionId);
  const key = lang === "ar" ? "nameAr" : lang === "en" ? "nameEn" : "nameFr";
  return {
    crop: crop ? (lang === "en" ? crop.nameEn : crop[key as "nameFr" | "nameAr"]) : plan.cropId,
    region: region ? (lang === "ar" ? region.nameAr : region.nameFr) : plan.regionId,
    perTree: !!crop?.treesPerHa,
  };
}

function dose(d: PlanDay, lang: Lang): string {
  if (d.litersPerTree != null) {
    const l = Math.round(d.litersPerTree);
    return lang === "ar" ? `${l} لتر/شجرة` : `${l} L/${lang === "en" ? "tree" : "arbre"}`;
  }
  const m3 = Math.round(d.m3PerHa);
  return lang === "ar" ? `${m3} م³/هكتار` : `${m3} m³/ha`;
}

const STRESS: Record<Lang, Record<Plan["summary"]["stressRisk"], string>> = {
  fr: { faible: "faible", moyen: "moyen", eleve: "élevé" },
  ar: { faible: "ضعيف", moyen: "متوسط", eleve: "مرتفع" },
  en: { faible: "low", moyen: "medium", eleve: "high" },
};

// SMS : une seule phrase courte (viser 160 caractères en français et anglais ; l'arabe compte pour 70 par SMS).
export function planSms(plan: Plan, lang: Lang = "fr"): string {
  const n = names(plan, lang);
  // aucun conseil quand les données ne le permettent pas
  if (plan.confidence.level === "none") return `Sakia ${n.region} : ${ASK_SHORT[lang]}`;
  const base = planSmsCore(plan, lang, n);
  return plan.confidence.askAPerson ? `${base} ${ASK_SHORT[lang]}` : base;
}

function planSmsCore(plan: Plan, lang: Lang, n: ReturnType<typeof names>): string {
  if (plan.status === "hors_vegetation") {
    if (lang === "ar") return `ساقية ${n.region}: ${n.crop} ليس في موسم النمو الآن. لا سقي.`;
    if (lang === "en") return `Sakia ${n.region}: ${n.crop} is out of season. No irrigation.`;
    return `Sakia ${n.region} : ${n.crop} hors saison. Pas d'irrigation.`;
  }
  const first = plan.days.find((d) => d.action === "irriguer");
  if (!first) {
    if (lang === "ar") return `ساقية ${n.region}: ${n.crop}. لا حاجة للسقي خلال 7 أيام.`;
    if (lang === "en") return `Sakia ${n.region}: ${n.crop}. No irrigation needed in the next 7 days.`;
    return `Sakia ${n.region} : ${n.crop}. Pas d'irrigation nécessaire dans les 7 jours.`;
  }
  const when = shortDay(first.date, lang);
  const count = plan.summary.irrigationCount;
  if (lang === "ar") return `ساقية ${n.region}: ${n.crop}. اسقِ ${when}: ${dose(first, lang)}. ${count} سقيات في 7 أيام.`;
  if (lang === "en") return `Sakia ${n.region}: ${n.crop}. Irrigate ${when}: ${dose(first, lang)}. ${count} in 7 days.`;
  return `Sakia ${n.region} : ${n.crop}. Irriguer ${when} : ${dose(first, lang)}. ${count} irrigation(s) sur 7 jours.`;
}

// Message plus complet (Telegram, page web) : plusieurs lignes.
export function planMessage(plan: Plan, lang: Lang = "fr"): string {
  const n = names(plan, lang);
  const head =
    lang === "ar" ? `ساقية · ${n.crop} · ${n.region}` : lang === "en" ? `Sakia · ${n.crop} · ${n.region}` : `Sakia · ${n.crop} · ${n.region}`;
  if (plan.confidence.level === "none") {
    const why = plan.confidence.reasons.map((r) => REASON[lang][r]).join(" ; ");
    return `${head}\n${ASK[lang]}\n(${why})`;
  }
  if (plan.status === "hors_vegetation") {
    const msg =
      lang === "ar"
        ? "هذه الزراعة ليست في موسم النمو الآن."
        : lang === "en"
          ? "This crop is not in its growing season right now."
          : "Cette culture n'est pas en végétation en ce moment.";
    return `${head}\n${msg}`;
  }
  const lines = plan.days.map((d) => {
    const act =
      d.action === "irriguer"
        ? lang === "ar"
          ? `اسقِ ${dose(d, lang)}`
          : lang === "en"
            ? `irrigate ${dose(d, lang)}`
            : `irriguer ${dose(d, lang)}`
        : lang === "ar"
          ? "انتظر"
          : lang === "en"
            ? "wait"
            : "attendre";
    const rain = d.rain >= 1 ? ` · ${d.rain.toFixed(0)} mm` : "";
    const est = d.estimated ? " ~" : "";
    return `${est}${shortDay(d.date, lang)} : ${act}${rain}`;
  });
  const s = plan.summary;
  const rainLine =
    lang === "ar"
      ? `الأمطار المتوقعة: ${s.rainExpectedMm.toFixed(0)} مم · خطر الإجهاد المائي: ${STRESS.ar[s.stressRisk]}`
      : lang === "en"
        ? `Expected rain: ${s.rainExpectedMm.toFixed(0)} mm · water-stress risk: ${STRESS.en[s.stressRisk]}`
        : `Pluie prévue : ${s.rainExpectedMm.toFixed(0)} mm · risque de stress hydrique : ${STRESS.fr[s.stressRisk]}`;
  const foot =
    lang === "ar"
      ? "نصيحة إرشادية محسوبة حسب الطقس المتوقع (وقد يتغير). القرار لكم."
      : lang === "en"
        ? "Indicative advice, calculated from the forecast weather (it can change). The decision is yours."
        : "Conseil indicatif, calculé d'après la météo prévue (elle peut changer). La décision vous appartient.";
  const unsure = plan.confidence.askAPerson
    ? [`⚠ ${ASK[lang]} (${plan.confidence.reasons.map((r) => REASON[lang][r]).join(" ; ")})`]
    : [];
  const rainNote = plan.confidence.notes?.includes("uncertain_rain")
    ? [lang === "ar" ? "قد تسقط أمطار خلال 3 أيام: أعيدوا التحقق غدا." : lang === "en" ? "Rain is possible within 3 days: check again tomorrow." : "Pluie possible dans les 3 jours : revérifiez demain."]
    : [];
  return [head, ...lines, rainLine, ...rainNote, ...unsure, foot].join("\n");
}

export type BulletinLine = { id: string; text: string };

// Script du bulletin du jour, façon présentation télé. Les mêmes lignes existent dans les trois langues
// (même ordre, mêmes identifiants) pour que les sous-titres anglais suivent la voix.
export function bulletinScript(plan: Plan, lang: Lang = "fr"): BulletinLine[] {
  const n = names(plan, lang);
  const s = plan.summary;
  const rain = s.rainExpectedMm;
  const hot = Number.isFinite(s.tmaxMax) ? Math.round(s.tmaxMax) : null;
  const first = plan.days.find((d) => d.action === "irriguer");
  const L = (id: string, fr: string, ar: string, en: string): BulletinLine => ({ id, text: lang === "ar" ? ar : lang === "en" ? en : fr });

  const lines: BulletinLine[] = [
    L("hello", "Bonjour à tous, et bienvenue sur Sakia.", "مرحبا بكم جميعا في ساقية.", "Hello everyone, and welcome to Sakia."),
    L(
      "where",
      `Voici le bulletin d'irrigation pour ${n.region}, culture : ${n.crop}.`,
      `هذه نشرة الري لولاية ${n.region}، المحصول: ${n.crop}.`,
      `Here is today's irrigation bulletin for ${n.region}, crop: ${n.crop}.`,
    ),
  ];
  if (plan.status === "hors_vegetation") {
    lines.push(L("off", "Cette culture n'est pas en végétation en ce moment : aucune irrigation à prévoir.", "هذا المحصول ليس في موسم النمو الآن: لا حاجة للسقي.", "This crop is out of season right now: no irrigation is needed."));
  } else {
    lines.push(
      rain >= 1
        ? L("rain", `Pluie attendue cette semaine : environ ${Math.round(rain)} millimètres.`, `الأمطار المتوقعة هذا الأسبوع: حوالي ${Math.round(rain)} مم.`, `Rain expected this week: about ${Math.round(rain)} millimetres.`)
        : L("rain", "Pas de pluie utile prévue cette semaine.", "لا أمطار مفيدة متوقعة هذا الأسبوع.", "No useful rain is expected this week."),
    );
    if (hot != null) lines.push(L("hot", `Les températures peuvent atteindre ${hot} degrés.`, `قد تبلغ درجات الحرارة ${hot} درجة.`, `Temperatures may reach ${hot} degrees.`));
    if (first) {
      lines.push(
        L(
          "advice",
          `Notre conseil : irriguer ${dayLabel(first.date, "fr")}, avec ${dose(first, "fr")}.`,
          `نصيحتنا: اسقِ يوم ${dayLabel(first.date, "ar")}، بمقدار ${dose(first, "ar")}.`,
          `Our advice: irrigate on ${dayLabel(first.date, "en")}, with ${dose(first, "en")}.`,
        ),
      );
    } else {
      lines.push(L("advice", "Notre conseil : pas d'irrigation nécessaire dans les sept prochains jours.", "نصيحتنا: لا حاجة للسقي خلال الأيام السبعة القادمة.", "Our advice: no irrigation is needed in the next seven days."));
    }
    lines.push(L("stress", `Risque de stress hydrique : ${STRESS.fr[s.stressRisk]}.`, `خطر الإجهاد المائي: ${STRESS.ar[s.stressRisk]}.`, `Water-stress risk: ${STRESS.en[s.stressRisk]}.`));
  }
  if (plan.confidence.askAPerson) {
    lines.push({ id: "unsure", text: ASK[lang] });
  }
  lines.push(
    L("caveat", "Ce conseil est indicatif : vérifiez-le auprès de votre administration agricole.", "هذه النصيحة إرشادية: تحققوا منها لدى المصالح الفلاحية.", "This advice is indicative: please check it with your agriculture office."),
    L("bye", "Merci pour le service que vous rendez au pays. Bonne chance à tous.", "شكرا على الخدمة التي تقدمونها للوطن. حظا سعيدا للجميع.", "Thank you for the service you give to the country. Good luck to all."),
  );
  return lines;
}
