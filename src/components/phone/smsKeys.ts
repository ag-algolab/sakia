// Ce que chaque TOUCHE du téléphone envoie. Rien d'inventé : ce sont des SMS courts que l'analyseur du serveur
// (src/lib/sms/parse.ts) comprend déjà, les mêmes qu'un agriculteur écrirait à la main. La touche évite d'avoir à les écrire.
// Pas de logique serveur ici : le téléphone envoie le texte à POST /api/sms/incoming et affiche la réponse telle quelle.
// Module pur (aucun navigateur) : vérifié contre le vrai analyseur et le vrai gestionnaire par un script hors dépôt.

import { fitGsm } from "@/lib/sms/encoding";

export type SmsLang = "fr" | "ar" | "en";
export const SMS_LANGS: SmsLang[] = ["en", "ar", "fr"]; // ordre du menu des langues : anglais d'abord (le jury), puis l'arabe, puis le français

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
