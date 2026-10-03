// Phrases FIXES de la ligne vocale (liste vérifiable : rien n'est généré librement).
// Chaque phrase existe en français et en arabe (arabe standard simple, voix à accent tunisien) avec son sous-titre anglais.
// Les noms de cultures et de régions viennent du catalogue. L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.
// Pur : utilisable dans le navigateur, sur le serveur et dans les scripts.

import { getCrop } from "../crops";
import { getRegion } from "../regions";
import { AGO_CHOICES, GROUPS, OTHER_REGIONS } from "./menu";
import type { GroupId, IvrLang } from "./menu";

export type PromptId =
  | "welcome" // choix de la langue (dit dans les deux langues, l'une après l'autre)
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
  | "rain_hint" // « pour signaler de la pluie, tapez 7 », dit après le choix de la région et après chaque lecture
  | "rain_where" // « dans quelle région a-t-il plu ? »
  | "rain_ask" // « combien a-t-il plu aujourd'hui ? » (cinq degrés, touches 1 à 5)
  | "rain_thanks" // « merci, votre signalement est enregistré »
  | "rain_fail" // « je n'ai pas pu enregistrer votre signalement »
  | "unsure"; // garde-fou « pas sûr : demandez à une personne », identique à la ligne `unsure` du moteur

export const PROMPT_IDS: PromptId[] = [
  "welcome", "help", "region", "region_list", "group", "crop_cereales", "crop_legumes", "crop_arbres", "crop_autres",
  "ago", "wait", "again", "bye", "invalid", "timeout", "rain_hint", "rain_where", "rain_ask", "rain_thanks", "rain_fail", "unsure",
];

type Triple = { fr: string; ar: string; en: string };

// Les chiffres sont écrits en toutes lettres en arabe : la voix les lit sans hésiter.
const AR_DIGIT: Record<string, string> = {
  "0": "صفر", "1": "واحد", "2": "اثنان", "3": "ثلاثة", "4": "أربعة", "5": "خمسة", "6": "ستة", "7": "سبعة", "8": "ثمانية", "9": "تسعة",
};

// « A, tapez 1. B, 2. C, 3. » : le verbe n'est dit qu'une fois, pour garder la liste courte.
function menu(items: { fr: string; ar: string; en: string; key: string }[]): Triple {
  const fr = items.map((it, i) => (i === 0 ? `${it.fr}, tapez ${it.key}.` : `${it.fr}, ${it.key}.`)).join(" ");
  const ar = items.map((it, i) => (i === 0 ? `${it.ar}: اضغط ${AR_DIGIT[it.key]}.` : `${it.ar}: ${AR_DIGIT[it.key]}.`)).join(" ");
  const en = items.map((it, i) => (i === 0 ? `${it.en}: press ${it.key}.` : `${it.en}: ${it.key}.`)).join(" ");
  return { fr, ar, en };
}

// Nom de culture dit à voix haute : « Piment / poivron » devient « Piment ou poivron » (la voix lirait « slash »).
export const spokenName = (name: string): string => name.replace(/\s*\/\s*/g, " ou ");

function cropItems(ids: string[]) {
  return ids.map((id, i) => {
    const c = getCrop(id);
    if (!c) throw new Error(`culture inconnue dans le menu : ${id}`);
    return { fr: spokenName(c.nameFr), ar: c.nameAr, en: c.nameEn, key: String(i + 1) };
  });
}

function regionItems(ids: string[]) {
  return ids.map((id, i) => {
    const r = getRegion(id);
    if (!r) throw new Error(`région inconnue dans le menu : ${id}`);
    return { fr: r.nameFr, ar: r.nameAr, en: r.nameFr, key: String(i + 1) };
  });
}

const kairouan = getRegion("kairouan")!;

const GROUP_LABEL: Record<GroupId, Triple> = {
  cereales: { fr: "Céréales", ar: "الحبوب", en: "Cereals" },
  legumes: { fr: "Légumes", ar: "الخضروات", en: "Vegetables" },
  arbres: { fr: "Arbres", ar: "الأشجار", en: "Trees" },
  autres: { fr: "Autres cultures", ar: "محاصيل أخرى", en: "Other crops" },
};
const groupMenu = menu(GROUPS.map((g, i) => ({ ...GROUP_LABEL[g.id], key: String(i + 1) })));

// Phrase d'accueil, dite une fois par langue (le texte arabe suit le texte français).
const TEXTS: Record<PromptId, Triple> = {
  welcome: {
    fr: "Bienvenue sur Sakia, le conseil d'irrigation. Pour continuer en français, tapez 1.",
    ar: "مرحبا بكم في ساقية، نصيحة السقي. للمتابعة بالعربية، اضغط اثنين.",
    en: "Welcome to Sakia, irrigation advice.",
  },
  help: {
    fr: "À tout moment, tapez 0 pour répéter, ou étoile pour revenir en arrière.",
    ar: "في أي وقت، اضغط صفر للإعادة، أو نجمة للرجوع.",
    en: "At any time, press 0 to repeat, or star to go back.",
  },
  region: {
    fr: `Pour ${kairouan.nameFr}, tapez 1. Pour une autre région, tapez 2.`,
    ar: `لولاية ${kairouan.nameAr}، اضغط واحد. لولاية أخرى، اضغط اثنين.`,
    en: `For ${kairouan.nameFr}, press 1. For another region, press 2.`,
  },
  region_list: menu(regionItems(OTHER_REGIONS)),
  group: {
    fr: `Quelle culture ? ${groupMenu.fr}`,
    ar: `أي محصول؟ ${groupMenu.ar}`,
    en: `Which crop? ${groupMenu.en}`,
  },
  crop_cereales: menu(cropItems(GROUPS[0].crops)),
  crop_legumes: menu(cropItems(GROUPS[1].crops)),
  crop_arbres: menu(cropItems(GROUPS[2].crops)),
  crop_autres: menu(cropItems(GROUPS[3].crops)),
  ago: {
    fr: "Quand avez-vous arrosé pour la dernière fois ? Aujourd'hui, tapez 1. Hier ou avant-hier, 2. Il y a trois à cinq jours, 3. Il y a plus de cinq jours, 4. Vous ne savez pas, 9.",
    ar: "متى سقيتم آخر مرة؟ اليوم: اضغط واحد. أمس أو أول أمس: اثنان. قبل ثلاثة إلى خمسة أيام: ثلاثة. قبل أكثر من خمسة أيام: أربعة. لا أعرف: تسعة.",
    en: "When did you last irrigate? Today: press 1. Yesterday or the day before: 2. Three to five days ago: 3. More than five days ago: 4. I do not know: 9.",
  },
  wait: {
    fr: "Un instant, je prépare votre conseil.",
    ar: "لحظة من فضلكم، أجهز لكم النصيحة.",
    en: "One moment, I am preparing your advice.",
  },
  again: {
    fr: "Pour écouter une autre culture, tapez 1. Pour terminer l'appel, tapez 2. Pour le détail de la semaine, tapez 3.",
    ar: "للاستماع إلى محصول آخر، اضغط واحد. لإنهاء المكالمة، اضغط اثنين. لتفاصيل الأسبوع، اضغط ثلاثة.",
    en: "To hear another crop, press 1. To end the call, press 2. For the week details, press 3.",
  },
  bye: {
    fr: "Merci d'avoir appelé Sakia. Ce conseil est indicatif : vérifiez-le auprès de votre technicien agricole. Au revoir.",
    ar: "شكرا لاتصالكم بساقية. هذه النصيحة إرشادية: تحققوا منها لدى الفني الفلاحي. إلى اللقاء.",
    en: "Thank you for calling Sakia. This advice is indicative: please check it with your agricultural technician. Goodbye.",
  },
  invalid: {
    fr: "Ce choix n'existe pas.",
    ar: "هذا الاختيار غير موجود.",
    en: "That choice does not exist.",
  },
  timeout: {
    fr: "La durée maximale de l'appel est atteinte. Merci et au revoir.",
    ar: "انتهت المدة القصوى للمكالمة. شكرا وإلى اللقاء.",
    en: "The maximum call length has been reached. Thank you and goodbye.",
  },
  // Signalements de pluie des agriculteurs (docs/HANDOFF.md section 13). Cinq degrés, pas de millimètres : personne ne mesure la pluie.
  rain_hint: {
    fr: "Pour signaler de la pluie, tapez 7.",
    ar: "للتبليغ عن مطر، اضغط سبعة.",
    en: "To report rain, press 7.",
  },
  rain_where: {
    fr: "Dans quelle région a-t-il plu ? Pour Kairouan, tapez 1. Pour une autre région, tapez 2.",
    ar: "في أي ولاية نزل المطر؟ للقيروان، اضغط واحد. لولاية أخرى، اضغط اثنين.",
    en: "In which region did it rain? For Kairouan, press 1. For another region, press 2.",
  },
  rain_ask: {
    fr: "Combien a-t-il plu aujourd'hui ? Pas de pluie, tapez 1. Quelques gouttes, 2. Pluie légère, 3. Beaucoup de pluie, 4. Énormément, 5.",
    ar: "كم نزل من المطر اليوم؟ لا مطر: اضغط واحد. قطرات: اثنان. مطر خفيف: ثلاثة. مطر غزير: أربعة. غزير جدا: خمسة.",
    en: "How much did it rain today? No rain: press 1. A few drops: 2. Light rain: 3. A lot of rain: 4. A huge amount: 5.",
  },
  rain_thanks: {
    fr: "Merci, votre signalement est enregistré.",
    ar: "شكرا، تم تسجيل تبليغكم.",
    en: "Thank you, your report is saved.",
  },
  rain_fail: {
    fr: "Je n'ai pas pu enregistrer votre signalement pour le moment.",
    ar: "لم أستطع تسجيل تبليغكم في الوقت الحالي.",
    en: "I could not save your report right now.",
  },
  // Même phrase que la ligne `unsure` de src/lib/messages.ts (scripts/ivr-check.ts le vérifie).
  unsure: {
    fr: "Je ne suis pas sûr : demandez à un technicien agricole (CRDA).",
    ar: "لست متأكدا: اسألوا فنيا فلاحيا (المندوبية الجهوية للتنمية الفلاحية).",
    en: "I am not sure: please ask an agricultural technician (CRDA).",
  },
};

// Texte dit à voix haute (langue de l'appelant) et sous-titre anglais de cette même phrase.
export function promptText(id: PromptId, lang: IvrLang): string {
  return TEXTS[id][lang];
}
export function promptEn(id: PromptId, lang: IvrLang): string {
  // l'accueil existe en deux versions : l'anglais dit laquelle
  if (id === "welcome") return `${TEXTS.welcome.en} To continue in ${lang === "fr" ? "French, press 1" : "Arabic, press 2"}.`;
  return TEXTS[id].en;
}

// Menu de cultures d'un groupe.
export function cropPromptId(group: GroupId): PromptId {
  return `crop_${group}` as PromptId;
}

// ---------- enregistrements ----------

export type Recording = { id: PromptId; lang: IvrLang; text: string; en: string };

// Liste unique de ce qu'il faut enregistrer : une entrée par phrase et par langue.
export function allRecordings(): Recording[] {
  const out: Recording[] = [];
  for (const id of PROMPT_IDS) {
    for (const lang of ["fr", "ar"] as const) {
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

export function recordingFile(id: PromptId, lang: IvrLang): string {
  return `/audio/ivr/${id}.${lang}.mp3`;
}

// Chiffres des réponses « dernier arrosage », pour l'affichage.
export const AGO_KEYS = AGO_CHOICES.map((c) => c.key);
