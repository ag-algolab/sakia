// Phrases FIXES de la ligne vocale (liste vérifiable : rien n'est généré librement).
// Chaque phrase existe en anglais, en français et en arabe (arabe standard simple, voix à accent tunisien), dite par la même voix.
// Le texte anglais est dit tel quel à qui a choisi l'anglais (touche 1), et sert de sous-titre aux deux autres langues : il dit
// donc les mêmes touches et la même chose que le français et l'arabe (scripts/ivr-check.ts le vérifie).
// Les noms de cultures et de régions viennent du catalogue. L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.
// Pur : utilisable dans le navigateur, sur le serveur et dans les scripts.

import { getCrop } from "../crops";
import { getRegion } from "../regions";
import { AGO_CHOICES, GROUPS, IVR_LANGS, langKey, OTHER_REGIONS } from "./menu";
import type { GroupId, IvrLang } from "./menu";

export type PromptId =
  | "welcome" // choix de la langue (dit dans les trois langues, l'une après l'autre, chacune avec sa touche)
  | "help"
  | "region"
  | "region_list"
  | "group"
  | "crop_cereales"
  | "crop_legumes"
  | "crop_arbres"
  | "crop_autres"
  | "ago"
  | "wait"
  | "again"
  | "bye"
  | "invalid"
  | "timeout"
  | "unsure"; // garde-fou « pas sûr : demandez à une personne », identique à la ligne `unsure` du moteur

export const PROMPT_IDS: PromptId[] = [
  "welcome", "help", "region", "region_list", "group", "crop_cereales", "crop_legumes", "crop_arbres", "crop_autres",
  "ago", "wait", "again", "bye", "invalid", "timeout", "unsure",
];

type Triple = Record<IvrLang, string>;

// Les chiffres sont écrits en toutes lettres en arabe : la voix les lit sans hésiter.
export const AR_DIGIT: Record<string, string> = {
  "0": "صفر", "1": "واحد", "2": "اثنان", "3": "ثلاثة", "4": "أربعة", "5": "خمسة", "6": "ستة", "7": "سبعة", "8": "ثمانية", "9": "تسعة",
};

// « A, tapez 1. B, 2. C, 3. » : le verbe n'est dit qu'une fois, pour garder la liste courte.
function menu(items: (Triple & { key: string })[]): Triple {
  const en = items.map((it, i) => (i === 0 ? `${it.en}, press ${it.key}.` : `${it.en}, ${it.key}.`)).join(" ");
  const fr = items.map((it, i) => (i === 0 ? `${it.fr}, tapez ${it.key}.` : `${it.fr}, ${it.key}.`)).join(" ");
  const ar = items.map((it, i) => (i === 0 ? `${it.ar}: اضغط ${AR_DIGIT[it.key]}.` : `${it.ar}: ${AR_DIGIT[it.key]}.`)).join(" ");
  return { en, fr, ar };
}

// Nom de culture dit à voix haute : « Piment / poivron » devient « Piment ou poivron » (la voix lirait « slash »).
export const spokenName = (name: string, lang: "fr" | "en" = "fr"): string => name.replace(/\s*\/\s*/g, lang === "en" ? " or " : " ou ");

function cropItems(ids: string[]) {
  return ids.map((id, i) => {
    const c = getCrop(id);
    if (!c) throw new Error(`culture inconnue dans le menu : ${id}`);
    return { en: spokenName(c.nameEn, "en"), fr: spokenName(c.nameFr), ar: c.nameAr, key: String(i + 1) };
  });
}

// Les régions n'ont pas de nom anglais dans le catalogue : on dit le nom français, comme sur les cartes (« Sfax », « Gabès »).
function regionItems(ids: string[]) {
  return ids.map((id, i) => {
    const r = getRegion(id);
    if (!r) throw new Error(`région inconnue dans le menu : ${id}`);
    return { en: r.nameFr, fr: r.nameFr, ar: r.nameAr, key: String(i + 1) };
  });
}

const kairouan = getRegion("kairouan")!;

const GROUP_LABEL: Record<GroupId, Triple> = {
  cereales: { en: "Cereals", fr: "Céréales", ar: "الحبوب" },
  legumes: { en: "Vegetables", fr: "Légumes", ar: "الخضروات" },
  arbres: { en: "Trees", fr: "Arbres", ar: "الأشجار" },
  autres: { en: "Other crops", fr: "Autres cultures", ar: "محاصيل أخرى" },
};
const groupMenu = menu(GROUPS.map((g, i) => ({ ...GROUP_LABEL[g.id], key: String(i + 1) })));

// Accueil : une phrase par langue, dites l'une après l'autre dans l'ordre des touches (1 anglais, 2 français, 3 arabe).
// La bienvenue n'est dite qu'une fois, en anglais, en tête : l'accueil reste court. Les touches viennent de LANG_CHOICES (menu.ts).
const welcome: Triple = {
  en: `Welcome to Sakia, irrigation advice. For English, press ${langKey("en")}.`,
  fr: `Pour le français, tapez ${langKey("fr")}.`,
  ar: `للعربية، اضغط ${AR_DIGIT[langKey("ar")]}.`,
};
// Sous-titre anglais de chaque phrase d'accueil (en anglais, c'est la phrase elle-même).
const WELCOME_EN: Triple = {
  en: welcome.en,
  fr: `For French, press ${langKey("fr")}.`,
  ar: `For Arabic, press ${langKey("ar")}.`,
};

const TEXTS: Record<PromptId, Triple> = {
  welcome,
  help: {
    en: "At any time, press 0 to repeat, or star to go back.",
    fr: "À tout moment, tapez 0 pour répéter, ou étoile pour revenir en arrière.",
    ar: "في أي وقت، اضغط صفر للإعادة، أو نجمة للرجوع.",
  },
  region: {
    en: `For ${kairouan.nameFr}, press 1. For another region, press 2.`,
    fr: `Pour ${kairouan.nameFr}, tapez 1. Pour une autre région, tapez 2.`,
    ar: `لولاية ${kairouan.nameAr}، اضغط واحد. لولاية أخرى، اضغط اثنين.`,
  },
  region_list: menu(regionItems(OTHER_REGIONS)),
  group: {
    en: `Which crop? ${groupMenu.en}`,
    fr: `Quelle culture ? ${groupMenu.fr}`,
    ar: `أي محصول؟ ${groupMenu.ar}`,
  },
  crop_cereales: menu(cropItems(GROUPS[0].crops)),
  crop_legumes: menu(cropItems(GROUPS[1].crops)),
  crop_arbres: menu(cropItems(GROUPS[2].crops)),
  crop_autres: menu(cropItems(GROUPS[3].crops)),
  ago: {
    en: "When did you last irrigate? Today, press 1. Yesterday or the day before, 2. Three to five days ago, 3. More than five days ago, 4. If you do not know, 9.",
    fr: "Quand avez-vous arrosé pour la dernière fois ? Aujourd'hui, tapez 1. Hier ou avant-hier, 2. Il y a trois à cinq jours, 3. Il y a plus de cinq jours, 4. Vous ne savez pas, 9.",
    ar: "متى سقيتم آخر مرة؟ اليوم: اضغط واحد. أمس أو أول أمس: اثنان. قبل ثلاثة إلى خمسة أيام: ثلاثة. قبل أكثر من خمسة أيام: أربعة. لا أعرف: تسعة.",
  },
  wait: {
    en: "One moment, I am preparing your advice.",
    fr: "Un instant, je prépare votre conseil.",
    ar: "لحظة من فضلكم، أجهز لكم النصيحة.",
  },
  again: {
    en: "To hear about another crop, press 1. To end the call, press 2. For this week's details, press 3.",
    fr: "Pour écouter une autre culture, tapez 1. Pour terminer l'appel, tapez 2. Pour le détail de la semaine, tapez 3.",
    ar: "للاستماع إلى محصول آخر، اضغط واحد. لإنهاء المكالمة، اضغط اثنين. لتفاصيل الأسبوع، اضغط ثلاثة.",
  },
  bye: {
    en: "Thank you for calling Sakia. This advice is indicative: please check it with your agricultural technician. Goodbye.",
    fr: "Merci d'avoir appelé Sakia. Ce conseil est indicatif : vérifiez-le auprès de votre technicien agricole. Au revoir.",
    ar: "شكرا لاتصالكم بساقية. هذه النصيحة إرشادية: تحققوا منها لدى الفني الفلاحي. إلى اللقاء.",
  },
  invalid: {
    en: "That choice does not exist.",
    fr: "Ce choix n'existe pas.",
    ar: "هذا الاختيار غير موجود.",
  },
  timeout: {
    en: "The maximum call length has been reached. Thank you and goodbye.",
    fr: "La durée maximale de l'appel est atteinte. Merci et au revoir.",
    ar: "انتهت المدة القصوى للمكالمة. شكرا وإلى اللقاء.",
  },
  // Même phrase que la ligne `unsure` de src/lib/messages.ts, dans les trois langues (scripts/ivr-check.ts le vérifie).
  unsure: {
    en: "I am not sure: please ask an agricultural technician (CRDA).",
    fr: "Je ne suis pas sûr : demandez à un technicien agricole (CRDA).",
    ar: "لست متأكدا: اسألوا فنيا فلاحيا (المندوبية الجهوية للتنمية الفلاحية).",
  },
};

// Texte dit à voix haute (langue de l'appelant) et sous-titre anglais de cette même phrase.
// En anglais, le sous-titre est la phrase dite elle-même : l'écran peut ne l'afficher qu'une fois.
export function promptText(id: PromptId, lang: IvrLang): string {
  return TEXTS[id][lang];
}
export function promptEn(id: PromptId, lang: IvrLang): string {
  // l'accueil a une phrase par langue : le sous-titre traduit celle-là (« For French, press 2. »)
  return id === "welcome" ? WELCOME_EN[lang] : TEXTS[id].en;
}

// Menu de cultures d'un groupe.
export function cropPromptId(group: GroupId): PromptId {
  return `crop_${group}` as PromptId;
}

// ---------- enregistrements ----------

export type Recording = { id: PromptId; lang: IvrLang; text: string; en: string };

// Liste unique de ce qu'il faut enregistrer : une entrée par phrase et par langue (anglais, français, arabe).
export function allRecordings(): Recording[] {
  const out: Recording[] = [];
  for (const id of PROMPT_IDS) {
    for (const lang of IVR_LANGS) {
      out.push({ id, lang, text: promptText(id, lang), en: promptEn(id, lang) });
    }
  }
  return out;
}

// Empreinte du texte (FNV-1a, 32 bits) : sert à savoir si un enregistrement correspond encore au texte actuel.
// Pas de cryptographie ici : le code tourne aussi dans le navigateur.
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

// Fichier d'une phrase, sous public/.
export function recordingPath(id: PromptId, lang: IvrLang): string {
  return `/audio/ivr/${id}.${lang}.mp3`;
}
// Adresse servie : elle porte l'empreinte du texte (?v=…). Une phrase réenregistrée change d'adresse, et aucune copie gardée par
// le navigateur (mémoire de /call, service worker) ne peut faire entendre l'ancienne version (« pour le français, tapez 1 »).
export function recordingFile(id: PromptId, lang: IvrLang): string {
  return `${recordingPath(id, lang)}?v=${textHash(promptText(id, lang))}`;
}

// Chiffres des réponses « dernier arrosage », pour l'affichage.
export const AGO_KEYS = AGO_CHOICES.map((c) => c.key);
