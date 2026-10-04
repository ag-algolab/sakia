// Voix et réglages ElevenLabs du bulletin.
// Les quatre voix de la bibliothèque à accent tunisien sont des CANDIDATES : Anthony choisit à l'oreille
// (scripts/voice-samples.ts), puis l'identifiant retenu est reporté dans SELECTED_VOICE.
// Aucun clonage de voix d'une personne réelle : uniquement des voix publiques de la bibliothèque.

export type VoiceCandidate = {
  key: string;
  name: string;
  voiceId: string;
  publicOwnerId: string; // nécessaire pour ajouter la voix au compte
  note: string;
};

export const CANDIDATES: VoiceCandidate[] = [
  { key: "yos", name: "Yos", voiceId: "DWzI1mgotR4xUap1D5w3", publicOwnerId: "3363af92a2f5a09d2ce4d5be0f336dddc74b5bcd83f41534a66f97a6c6c66eb6", note: "Yos - Social Media (ar, tunisien)" },
  { key: "yasmin", name: "Yasmin", voiceId: "gKeccbJ6jkUi4aYA91nS", publicOwnerId: "64cbc624eb5aab4e95a968e1f41d75402277cca6e549036ed17e56ea33bbbc9e", note: "Yasmin - Enchanting and Delicate (ar, tunisien)" },
  { key: "rima", name: "Rima M", voiceId: "GLRyn2pNxpZ4FAjmlY3z", publicOwnerId: "7398804d9eaf2f463899a907587c33a390591775784f87857b6d0e1e4e3e66f6", note: "Rima M - Soothing Customer Care Agent (ar, tunisien)" },
  { key: "salim", name: "Salim", voiceId: "nH7M8bGCLQbKoS0wBZj7", publicOwnerId: "cb809939a62b19932d6f05ed5d3a16bb317ced1b7b470cdcc6da3489eb4fd4fe", note: "Salim - Warm, Expressive and Distinctive (ar, tunisien)" },
];

// Voix retenue par Anthony : Rima M (bibliothèque ElevenLabs, accent tunisien), pour le français et l'arabe.
// Pour changer : modifier ici, ou fixer VOICE_ID dans l'environnement.
const RIMA = CANDIDATES.find((c) => c.key === "rima")!;
export const SELECTED_VOICE: { id: string; name: string } = {
  id: process.env.VOICE_ID || RIMA.voiceId,
  name: process.env.VOICE_ID ? "voix personnalisée" : RIMA.name,
};

// Modèle retenu par Anthony après écoute : eleven_v4 (le moins cher des modèles de qualité : ~0,12 crédit par caractère).
// Pour comparer : variable VOICE_MODEL (eleven_multilingual_v2, eleven_v3, eleven_v4_turbo).
export const MODEL_ID = process.env.VOICE_MODEL || "eleven_v4";

// mp3 22 kHz 32 kbit/s : ~4 Ko par seconde, un bulletin de 40 s pèse ~160 Ko (réseau limité).
export const OUTPUT_FORMAT = "mp3_22050_32";

export const VOICE_SETTINGS = { stability: 0.6, similarity_boost: 0.75, style: 0.1, use_speaker_boost: false };

// Crédits réellement facturés par caractère (en-tête « character-cost » mesuré le 3 octobre 2026). Sert au grand livre
// de l'appli ; un modèle inconnu compte 1 crédit par caractère (prudence).
export const CREDITS_PER_CHAR: Record<string, number> = { eleven_v4: 0.12, eleven_v4_turbo: 0.06, eleven_multilingual_v2: 0.44, eleven_v3: 0.44 };

// Budget de crédits de tests (plan Creator ~131 000) : on ne dépasse jamais 20 000.
export const BUDGET_CREDITS = Number(process.env.VOICE_BUDGET_CREDITS || 20000);

// Langues parlées : voir langs.ts (français, arabe standard simple, anglais, coréen).

// Texte court identique pour comparer les voix (sans chiffres : un échantillon, pas un bulletin).
export const SAMPLE_TEXT: Record<"fr" | "ar" | "aeb" | "en" | "ko", string> = {
  fr: "Bonjour à tous, et bienvenue sur Sakia. Notre conseil : irriguer demain matin, de préférence avant la chaleur. Merci pour le service que vous rendez au pays.",
  ar: "مرحبا بكم جميعا في ساقية. نصيحتنا: اسقوا غدا في الصباح الباكر، قبل اشتداد الحرارة. شكرا على الخدمة التي تقدمونها للوطن.",
  aeb: "عسلامة بيكم، ومرحبا بيكم في ساقية. نصيحتنا: اسقيو غدوة الصباح بكّري، قبل ما تسخن الدنيا. يعطيكم الصحة على الخدمة اللي تعملوها لبلادنا.",
  en: "Hello everyone, and welcome to Sakia. Our advice: irrigate tomorrow morning, preferably before the heat. Thank you for the service you give to the country.",
  ko: "안녕하세요, 여러분. 사키아에 오신 것을 환영합니다. 권장 사항입니다. 내일 아침, 더위가 오기 전에 관개하세요. 나라를 위해 애써 주시는 모든 분께 감사드립니다.",
};
