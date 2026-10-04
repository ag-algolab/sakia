// Langues du bulletin parlé. Pour en ajouter une : une entrée ici + un script de lignes (mêmes `id` que
// bulletinScript) + des libellés d'interface. Rien d'autre à toucher.
// fr / ar / en viennent de src/lib/messages.ts (propriété de la session principale) ; ko est écrit dans src/lib/voice/ko.ts.

import type { Lang } from "../messages";

// aeb = arabe tunisien (darija), code ISO 639-3
export type VoiceLang = Lang | "ko" | "aeb";

export type VoiceLangInfo = {
  code: VoiceLang;
  native: string; // nom dans la langue elle-même
  english: string; // nom en anglais (pour le jury)
  htmlLang: string; // attribut lang du HTML
  rtl: boolean;
  locale: string; // pour les dates
  // Qui a validé le texte de cette langue. « non validé » = à faire relire par un locuteur avant diffusion.
  validated: boolean;
};

export const VOICE_LANGS: VoiceLangInfo[] = [
  // la darija vient en premier : c'est la langue des agriculteurs qui ne lisent pas l'arabe standard
  { code: "aeb", native: "الدارجة التونسية", english: "Tunisian Arabic", htmlLang: "ar-TN", rtl: true, locale: "ar-TN-u-nu-latn", validated: false }, // à valider par un Tunisien
  { code: "fr", native: "Français", english: "French", htmlLang: "fr", rtl: false, locale: "fr-FR", validated: true },
  { code: "ar", native: "العربية الفصحى", english: "Modern Standard Arabic", htmlLang: "ar", rtl: true, locale: "ar-TN-u-nu-latn", validated: false }, // à valider par un Tunisien
  { code: "en", native: "English", english: "English", htmlLang: "en", rtl: false, locale: "en-GB", validated: true },
  { code: "ko", native: "한국어", english: "Korean", htmlLang: "ko", rtl: false, locale: "ko-KR", validated: false }, // à valider par un locuteur coréen
];

export const rtlOf = (code: VoiceLang): boolean => VOICE_LANGS.find((l) => l.code === code)?.rtl ?? false;
export const htmlLangOf = (code: VoiceLang): string => VOICE_LANGS.find((l) => l.code === code)?.htmlLang ?? code;

export function isVoiceLang(x: string): x is VoiceLang {
  return VOICE_LANGS.some((l) => l.code === x);
}
