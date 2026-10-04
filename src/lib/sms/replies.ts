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
    fr: "Sakia : envoyez culture + région + hier ou 3j si arrosé, ex. olivier kairouan hier. PLAN = dernier plan, LANGUE, STOP = effacer. *123# = menu.",
    en: "Sakia: send crop + region + yesterday or 3d if irrigated, e.g. olive kairouan yesterday. PLAN = last plan, LANGUAGE, STOP = erase. *123# = menu.",
    ar: "ساقية: أرسل المحصول والولاية وآخر سقي، مثال: زيتون القيروان البارح. خطة، لغة، ايقاف = مسح. *123# قائمة",
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
