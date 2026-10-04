// Réponses fixes du service SMS (hors plan, qui vient de planSms dans src/lib/messages.ts).
// Chaque texte tient dans 160 caractères en français et en anglais (vérifié par `npx tsx src/lib/sms/check.ts`).
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.

import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { AGO_ASK } from "@/lib/messages";
import type { Lang } from "@/lib/messages";

type T = Record<Lang, string>;

export function cropName(id: string, lang: Lang): string {
  const c = getCrop(id);
  return c ? (lang === "ar" ? c.nameAr : lang === "en" ? c.nameEn : c.nameFr) : id;
}

export function regionName(id: string, lang: Lang): string {
  const r = getRegion(id);
  return r ? (lang === "ar" ? r.nameAr : r.nameFr) : id;
}

export const R = {
  help: {
    fr: "Sakia : envoyez culture + région + hier ou 3j si arrosé, ex. olivier kairouan hier. PLAN = dernier plan, PLUIE 10, LANGUE, STOP = effacer. *123# = menu.",
    en: "Sakia: send crop + region + yesterday or 3d if irrigated, e.g. olive kairouan yesterday. PLAN = last plan, RAIN 10, LANGUAGE, STOP = erase. *123# = menu.",
    ar: "ساقية: أرسل المحصول والولاية وآخر سقي، مثال: زيتون القيروان البارح. خطة، مطر 10، لغة، ايقاف = مسح. *123# قائمة",
  } as T,
  // Réponse à la question « dernier arrosage ? » quand le chiffre n'est pas l'un de ceux proposés.
  askAgo: AGO_ASK as T,
  menu: {
    fr: "Sakia\n1. Plan 7 jours\n2. Changer culture\n3. Langue",
    en: "Sakia\n1. 7-day plan\n2. Change crop\n3. Language",
    ar: "ساقية\n1. خطة 7 أيام\n2. تغيير المحصول\n3. اللغة",
  } as T,
  // Anglais d'abord (le jury), puis l'arabe, puis le français ; handler.ts lit les chiffres dans le même ordre.
  langMenu: {
    fr: "1. English\n2. العربية\n3. Français",
    en: "1. English\n2. العربية\n3. Français",
    ar: "1. English\n2. العربية\n3. Français",
  } as T,
  langSet: {
    fr: "Langue : français.",
    en: "Language: English.",
    ar: "اللغة: العربية.",
  } as T,
  askBoth: {
    fr: "Quelle culture et quelle région ? Ex : olivier kairouan",
    en: "Which crop and which region? E.g. olive kairouan",
    ar: "أي محصول وأي ولاية؟ مثال: زيتون القيروان",
  } as T,
  unknown: {
    fr: "Je n'ai pas compris. Exemple : olivier kairouan. Envoyez AIDE pour l'aide.",
    en: "Sorry, not understood. Example: olive kairouan. Send HELP for help.",
    ar: "لم أفهم. مثال: زيتون القيروان. أرسل AIDE للمساعدة.",
  } as T,
  ussdUnknown: {
    fr: "Code inconnu. Essayez *123#.",
    en: "Unknown code. Try *123#.",
    ar: "رمز غير معروف. جرّب *123#.",
  } as T,
  stopped: {
    fr: "Sakia : vos réglages sont effacés. Envoyez AIDE pour recommencer.",
    en: "Sakia: your settings are erased. Send HELP to start again.",
    ar: "ساقية: تم مسح إعداداتك. أرسل AIDE للبدء من جديد.",
  } as T,
  unavailable: {
    fr: "Sakia : service momentanément indisponible. Réessayez plus tard.",
    en: "Sakia: service temporarily unavailable. Please try again later.",
    ar: "ساقية: الخدمة غير متوفرة حاليا. أعد المحاولة لاحقا.",
  } as T,
  tooMany: {
    fr: "Trop de messages. Réessayez dans une minute.",
    en: "Too many messages. Try again in a minute.",
    ar: "رسائل كثيرة. أعد المحاولة بعد دقيقة.",
  } as T,
  askRain: {
    fr: "Combien de pluie ? Ex : PLUIE 10 (mm) ou PLUIE BEAUCOUP",
    en: "How much rain? E.g. RAIN 10 (mm) or RAIN HEAVY",
    ar: "كم مطر؟ مثال: مطر 10 (ملم) أو مطر برشا",
  } as T,
  badMm: {
    fr: "Quantité invalide : de 0 à 150 mm. Ex : PLUIE 10",
    en: "Invalid amount: 0 to 150 mm. E.g. RAIN 10",
    ar: "كمية غير صالحة: من 0 إلى 150 ملم. مثال: مطر 10",
  } as T,
  rainNeedRegion: {
    fr: "Quelle région ? Ex : PLUIE 10 kairouan",
    en: "Which region? E.g. RAIN 10 kairouan",
    ar: "أي ولاية؟ مثال: مطر 10 القيروان",
  } as T,
  reportFailed: {
    fr: "Rapport de pluie non enregistré pour le moment. Réessayez plus tard.",
    en: "Rain report not saved right now. Please try again later.",
    ar: "لم يُسجَّل تقرير المطر حاليا. أعد المحاولة لاحقا.",
  } as T,
  tooManyReports: {
    fr: "Merci, mais trop de rapports de pluie pour le moment. Réessayez plus tard.",
    en: "Thanks, but too many rain reports for now. Please try again later.",
    ar: "شكرا، لكن تقارير المطر كثيرة حاليا. أعد المحاولة لاحقا.",
  } as T,
  tooLong: {
    fr: "Message trop long (160 caractères maximum).",
    en: "Message too long (160 characters maximum).",
    ar: "الرسالة طويلة جدا (160 حرفا كحد أقصى).",
  } as T,
};

export function askCrop(regionId: string, lang: Lang): string {
  const r = regionName(regionId, lang);
  if (lang === "ar") return `${r}: أي محصول؟ مثال: زيتون`;
  if (lang === "en") return `${r}: which crop? E.g. olive`;
  return `${r} : quelle culture ? Ex : olivier`;
}

export function askRegion(cropId: string, lang: Lang): string {
  const c = cropName(cropId, lang);
  if (lang === "ar") return `${c}: أي ولاية؟ مثال: القيروان`;
  if (lang === "en") return `${c}: which region? E.g. kairouan`;
  return `${c} : quelle région ? Ex : kairouan`;
}

export function askWhichCrop(ids: string[], lang: Lang): string {
  const names = ids.map((i) => cropName(i, lang));
  if (lang === "ar") return `${names.join(" أو ")}؟ أعد الإرسال مع الاسم الدقيق.`;
  if (lang === "en") return `${names.join(" or ")}? Please resend with the exact name.`;
  return `${names.join(" ou ")} ? Renvoyez avec le nom exact.`;
}

// Confirmation d'un rapport de pluie : ce qui a été retenu, et combien de personnes ont signalé ce jour-là.
// `kept` : quantité retenue en mm (pour un mot comme « beaucoup », c'est le bas de la fourchette, voir src/lib/rainLevels.ts).
export function rainThanks(opts: { regionId: string; kept: number; fromWord: boolean; yesterday: boolean; n: number; need: number }, lang: Lang): string {
  const { regionId, kept, fromWord, yesterday, n, need } = opts;
  const r = regionName(regionId, lang);
  const mm = Number.isInteger(kept) ? String(kept) : kept.toFixed(1);
  const when = lang === "ar" ? (yesterday ? "البارحة" : "اليوم") : lang === "en" ? (yesterday ? "yesterday" : "today") : yesterday ? "hier" : "aujourd'hui";
  if (lang === "ar") {
    const head = `شكرا. مطر ${r} ${when}: ${mm} ملم${fromWord ? " (تقدير حذر)" : ""}.`;
    const reports = n === 1 ? "تقرير واحد" : n === 2 ? "تقريران" : `${n} تقارير`; // 1 : singulier, 2 : duel, 3 et plus : pluriel
    return n >= need ? `${head} ${n} أشخاص أبلغوا: تم تصحيح المطر في الخطة.` : `${head} ${reports}، ويلزم ${need} لتصحيح الخطة.`;
  }
  if (lang === "en") {
    const head = `Thanks. Rain at ${r} ${when}: ${mm} mm${fromWord ? " (cautious estimate)" : ""}.`;
    return n >= need ? `${head} ${n} people reported: the plan's rain is corrected.` : `${head} ${n} report${n > 1 ? "s" : ""} so far; ${need} are needed to correct the plan.`;
  }
  const head = `Merci. Pluie à ${r} ${when} : ${mm} mm${fromWord ? " (estimation prudente)" : ""}.`;
  return n >= need ? `${head} ${n} personnes ont signalé : la pluie du plan est corrigée.` : `${head} ${n} signalement${n > 1 ? "s" : ""} pour l'instant ; il en faut ${need} pour corriger le plan.`;
}
