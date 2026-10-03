// Mots reconnus par l'analyseur SMS, en plus des noms du catalogue (src/lib/crops.ts et src/lib/regions.ts).
// Écriture latine d'arabe tunisien (« arabizi » : 9 = ق, 3 = ع, 7 = ح), français, anglais et arabe.
// À FAIRE VALIDER par un locuteur tunisien : variantes d'écriture et sens des mots (voir docs/NOTES-telephone.md).

// Plusieurs variantes par identifiant de culture. Un mot qui désigne deux cultures est listé dans AMBIGUOUS_CROP_ALIASES.
export const CROP_ALIASES: Record<string, string[]> = {
  ble: ["ble", "ble dur", "9amh", "9am7", "9ama7", "qamh", "kamh", "gamh", "wheat", "قمح"],
  orge: ["orge", "cha3ir", "chaair", "cha3er", "chaeir", "shaeer", "barley", "شعير"],
  tomate: ["tomate", "tomates", "tomatem", "tamatem", "tmatem", "tmatim", "tomato", "طماطم", "طماطة"],
  piment: ["piment", "poivron", "poivrons", "felfel", "filfil", "pepper", "chili", "فلفل"],
  "pomme-de-terre": ["pomme de terre", "patate", "patates", "batata", "btata", "potato", "بطاطا", "بطاطس"],
  pasteque: ["pasteque", "dellaa", "dallaa", "dalla3", "dellaa3", "delleh", "watermelon", "دلاع", "بطيخ احمر"],
  melon: ["melon", "cantaloup", "chammam", "شمام", "بطيخ اصفر"],
  oignon: ["oignon", "oignons", "bsal", "basal", "bassal", "onion", "بصل"],
  sorgho: ["sorgho", "sorghum", "ذرة رفيعة"],
  olivier: ["olivier", "oliviers", "olive", "olives", "zitoun", "zitouna", "zitoune", "zitun", "zeitoun", "zaytoun", "زيتون"],
  amandier: ["amandier", "amande", "amandes", "louz", "lauz", "loz", "almond", "لوز"],
  pistachier: ["pistachier", "pistache", "pistaches", "fostok", "fustuq", "fosto9", "fostoq", "pistachio", "فستق"],
  vigne: ["vigne", "raisin", "raisins", "3enb", "enb", "inab", "aanab", "dalia", "dalya", "grape", "grapes", "vine", "عنب", "دالية", "دوالي"],
  oranger: [
    "oranger", "orangers", "orange", "oranges", "agrume", "agrumes", "citrus", "citron", "citronnier", "limoun", "limon",
    "bortogal", "bortokal", "borto9al", "qawares", "gawares", "clementine", "برتقال", "قوارص", "ليمون", "كلمنتين",
  ],
  dattier: [
    "dattier", "dattiers", "palmier", "palmier dattier", "datte", "dattes", "deglet", "deglet nour", "degla", "tmar", "tamr",
    "nakhla", "nakhel", "date palm", "dates", "palm", "نخيل", "نخلة", "تمر", "دقلة", "دقلة نور",
  ],
  grenadier: ["grenadier", "grenade", "grenades", "remman", "rommen", "romman", "rmen", "pomegranate", "رمان"],
  figuier: ["figuier", "figue", "figues", "karmous", "kermous", "tin", "teen", "fig", "figs", "تين", "كرموس"],
  luzerne: ["luzerne", "fessa", "fassa", "fesa", "fisa", "bersim", "berseem", "alfalfa", "فصة", "برسيم"],
};

// « battikh » / « بطيخ » seul : pastèque ou melon selon les régions et les gens. On demande plutôt que de deviner.
export const AMBIGUOUS_CROP_ALIASES: { aliases: string[]; ids: string[] }[] = [
  { aliases: ["battikh", "batikh", "bettikh", "بطيخ"], ids: ["pasteque", "melon"] },
];

export const REGION_ALIASES: Record<string, string[]> = {
  tunis: ["tunis", "tounes", "تونس"],
  ariana: ["ariana", "aryana", "اريانة"],
  "ben-arous": ["ben arous", "benarous", "bin arous", "بن عروس"],
  manouba: ["manouba", "mannouba", "manuba", "منوبة"],
  nabeul: ["nabeul", "nabel", "نابل"],
  zaghouan: ["zaghouan", "zaghwan", "zaghuan", "زغوان"],
  bizerte: ["bizerte", "bizert", "binzert", "benzart", "بنزرت"],
  beja: ["beja", "baja", "باجة"],
  jendouba: ["jendouba", "jendoba", "jandouba", "جندوبة"],
  "le-kef": ["le kef", "el kef", "kef", "kaf", "الكاف"],
  siliana: ["siliana", "seliana", "سليانة"],
  sousse: ["sousse", "sousa", "susa", "soussa", "سوسة"],
  monastir: ["monastir", "mounastir", "المنستير"],
  mahdia: ["mahdia", "mehdia", "mahdiya", "المهدية"],
  sfax: ["sfax", "sfaqs", "safaqes", "sfaks", "صفاقس"],
  kairouan: ["kairouan", "kairouane", "9ayrawan", "qayrawan", "kayrawan", "kairawan", "kirwan", "القيروان"],
  kasserine: ["kasserine", "9asrin", "qasrin", "gasrine", "kasrin", "القصرين"],
  "sidi-bouzid": ["sidi bouzid", "sidi bou zid", "sidi bouzaid", "sbz", "سيدي بوزيد"],
  gabes: ["gabes", "9abes", "qabis", "gabis", "قابس"],
  medenine: ["medenine", "mednine", "madanin", "مدنين"],
  tataouine: ["tataouine", "tatawin", "tatouine", "تطاوين"],
  gafsa: ["gafsa", "9afsa", "qafsa", "قفصة"],
  tozeur: ["tozeur", "touzeur", "tuzar", "توزر"],
  kebili: ["kebili", "kebelli", "9bili", "qibili", "قبلي"],
};

export type KeywordKind = "stop" | "help" | "language" | "plan";

export const KEYWORDS: Record<KeywordKind, string[]> = {
  stop: ["stop", "arret", "arreter", "unsubscribe", "ايقاف", "توقف"],
  help: ["aide", "aidez", "help", "3awen", "مساعدة"],
  language: ["langue", "lang", "language", "لغة"],
  plan: ["plan", "planning", "خطة"],
};

export const LANGUAGE_WORDS: Record<"fr" | "ar" | "en", string[]> = {
  fr: ["fr", "francais", "french"],
  ar: ["ar", "arabe", "arabic", "arabi", "عربي", "عربية"],
  en: ["en", "english", "anglais", "انجليزي", "انقليزي"],
};

// ---------- rapports de pluie (« PLUIE 10 », « مطر 10 », « shta 10 ») ----------
// À FAIRE VALIDER par un Tunisien : « shta / chta » (arabizi), « barcha » (beaucoup), « chwaya » (un peu), « walou » (rien).

export const RAIN_WORDS = ["pluie", "plu", "rain", "مطر", "امطار", "شتا", "شتاء", "shta", "chta", "matar", "mtar"];

// Personne ne mesure en millimètres : un mot suffit. Chaque mot correspond à un degré de l'échelle de src/lib/rainLevels.ts.
export const RAIN_LEVEL_WORDS: Record<"none" | "light" | "heavy" | "very_heavy", string[]> = {
  none: ["rien", "aucune", "zero", "walou", "nothing", "لا شيء"],
  light: ["peu", "chwaya", "chuaya", "شوية", "خفيفة", "little", "light"],
  heavy: ["beaucoup", "barcha", "barsha", "برشا", "غزيرة", "heavy"],
  very_heavy: ["enormement", "enorme", "huge"],
};

export const YESTERDAY_WORDS = ["hier", "yesterday", "lbare7", "lbarah", "lbarha", "البارح", "البارحة", "امس"];
