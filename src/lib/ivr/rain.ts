// Signalements de pluie par téléphone : phrase qui dit combien de personnes ont signalé aujourd'hui.
// Pur (sans réseau ni fichier) : utilisé par l'arbre de dialogue (navigateur), la route /api/ivr/rain et les scripts.
// Les degrés de pluie, leurs libellés et le nombre minimal de personnes ne sont PAS recopiés ici : ils viennent de
// src/lib/rainLevels.ts (session principale), module pur partagé par tous les canaux.

import { arabicWords } from "./arabicNumbers";
import type { IvrLang } from "./menu";
import { MIN_REPORTERS } from "../rainLevels";

export { LEVEL_LABEL, MIN_REPORTERS, RAIN_LEVELS } from "../rainLevels";
export type { RainLevel } from "../rainLevels";

// Nombre de personnes en arabe, avec le bon pluriel : شخص واحد، شخصان، ثلاثة أشخاص … عشرة أشخاص، أحد عشر شخصا.
function peopleAr(n: number): string {
  if (n === 1) return "شخص واحد";
  if (n === 2) return "شخصان";
  return n <= 10 ? `${arabicWords(n)} أشخاص` : `${arabicWords(n)} شخصا`;
}

// « Une personne a signalé aujourd'hui. Il en faut 3 pour que ce soit pris en compte » tant que le seuil n'est pas atteint,
// puis « N personnes ont signalé aujourd'hui : c'est pris en compte ». Le nombre est écrit en lettres en arabe.
export function rainCountText(n: number, lang: IvrLang | "en"): string {
  const count = Math.max(1, Math.round(n));
  const min = MIN_REPORTERS;
  if (count < min) {
    if (lang === "ar") return `${count === 1 ? "شخص واحد بلّغ" : count === 2 ? "شخصان بلّغا" : `${peopleAr(count)} بلّغوا`} اليوم. نحتاج إلى ${peopleAr(min)} على الأقل ليؤخذ ذلك في الحساب.`;
    if (lang === "en") return `${count === 1 ? "One person has" : `${count} people have`} reported today. ${min} are needed for it to be taken into account.`;
    return `${count === 1 ? "Une personne a signalé" : `${count} personnes ont signalé`} aujourd'hui. Il en faut ${min} pour que ce soit pris en compte.`;
  }
  if (lang === "ar") return `${peopleAr(count)} بلّغوا اليوم: هذا مأخوذ في الحساب.`;
  return lang === "en" ? `${count} people have reported today: it is taken into account.` : `${count} personnes ont signalé aujourd'hui : c'est pris en compte.`;
}
