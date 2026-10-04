// Ce que chaque TOUCHE du téléphone envoie. Rien d'inventé : ce sont des SMS courts que l'analyseur du serveur
// (src/lib/sms/parse.ts) comprend déjà, les mêmes qu'un agriculteur écrirait à la main. La touche évite d'avoir à les écrire.
// Pas de logique serveur ici : le téléphone envoie le texte à POST /api/sms/incoming et affiche la réponse telle quelle.
// Module pur (aucun navigateur) : vérifié contre le vrai analyseur et le vrai gestionnaire par un script hors dépôt.

import { getRegion } from "@/lib/regions";
import { fitGsm } from "@/lib/sms/encoding";

export type SmsLang = "fr" | "ar" | "en";
export const SMS_LANGS: SmsLang[] = ["fr", "ar", "en"];

// Les quatre degrés que l'analyseur sait lire en MOTS (src/lib/sms/lexicon.ts, RAIN_LEVEL_WORDS) ; « très légère » n'existe pas en SMS.
export type SmsRain = "none" | "light" | "heavy" | "very_heavy";
export const SMS_RAIN: SmsRain[] = ["none", "light", "heavy", "very_heavy"];

const RAIN_WORD: Record<SmsLang, Record<SmsRain, string>> = {
  fr: { none: "PLUIE RIEN", light: "PLUIE PEU", heavy: "PLUIE BEAUCOUP", very_heavy: "PLUIE ENORMEMENT" },
  en: { none: "RAIN NOTHING", light: "RAIN LITTLE", heavy: "RAIN HEAVY", very_heavy: "RAIN HUGE" },
  // En arabe, « لا شيء » (deux mots) et « énormément » n'ont pas de forme que l'analyseur reconnaisse : on envoie la quantité,
  // « 0 » et « 25 » (le bas de la fourchette « plus de 25 mm », voir LEVEL_MM dans src/lib/rainLevels.ts).
  ar: { none: "مطر 0", light: "مطر شوية", heavy: "مطر برشا", very_heavy: "مطر 25" },
};

// Le serveur lit la région dans le texte (il n'a pas forcément gardé la conversation : plusieurs instances, expiration).
function regionWord(regionId: string, lang: SmsLang): string {
  const r = getRegion(regionId);
  if (!r) return regionId;
  return lang === "ar" ? r.nameAr : r.nameFr;
}

export function rainText(lang: SmsLang, level: SmsRain, regionId: string): string {
  return `${RAIN_WORD[lang][level]} ${regionWord(regionId, lang)}`;
}

export const HELP_TEXT: Record<SmsLang, string> = { fr: "AIDE", en: "HELP", ar: "مساعدة" };
export const STOP_TEXT: Record<SmsLang, string> = { fr: "STOP", en: "STOP", ar: "ايقاف" };

// « LANGUE EN » : change la langue des réponses du serveur pour cette conversation. Le mot-clé suit la langue courante du téléphone.
const LANG_KEYWORD: Record<SmsLang, string> = { fr: "LANGUE", en: "LANGUAGE", ar: "لغة" };
export function languageText(current: SmsLang, to: SmsLang): string {
  return `${LANG_KEYWORD[current]} ${to.toUpperCase()}`;
}

// Un SMS de plan tel que le service le renvoie : en français et en anglais ramené à l'alphabet GSM et à 160 caractères,
// l'arabe tel quel (70 par SMS). Même règle que `finish` dans src/lib/sms/handler.ts.
export function asSent(text: string, lang: SmsLang): string {
  if (lang === "ar" || /[؀-ۿ]/.test(text)) return text;
  return fitGsm(text, 160);
}
