// Échelle de pluie à cinq degrés, pour les rapports des agriculteurs. MODULE PUR : utilisable dans le navigateur,
// les boutons de Telegram, le téléphone SMS simulé et la ligne vocale (libellés en français, arabe, anglais).
//
// Personne ne mesure la pluie en millimètres : on demande « beaucoup ? un peu ? ». Chaque degré vaut une quantité
// PRUDENTE (le bas de la fourchette), parce que les deux erreurs ne coûtent pas pareil : surestimer la pluie fait
// sauter une irrigation et la culture souffre ; la sous-estimer gaspille un peu d'eau. (Les arabes sont à faire valider.)

export type RainLevel = "none" | "very_light" | "light" | "heavy" | "very_heavy";
export const RAIN_LEVELS: RainLevel[] = ["none", "very_light", "light", "heavy", "very_heavy"];

// Quantité retenue pour chaque degré : le BAS de la fourchette, en mm sur la journée.
export const LEVEL_MM: Record<RainLevel, number> = { none: 0, very_light: 1, light: 2, heavy: 8, very_heavy: 25 };

// Ce que le degré veut dire, en clair (affichable à l'agriculteur : « environ … »).
export const LEVEL_RANGE_MM: Record<RainLevel, string> = {
  none: "0",
  very_light: "moins de 2",
  light: "2 à 8",
  heavy: "8 à 25",
  very_heavy: "plus de 25",
};

export const LEVEL_LABEL: Record<"fr" | "ar" | "en", Record<RainLevel, string>> = {
  fr: { none: "Pas de pluie", very_light: "Très légère (quelques gouttes)", light: "Légère", heavy: "Beaucoup", very_heavy: "Énormément" },
  ar: { none: "لا مطر", very_light: "خفيفة جدا (قطرات)", light: "خفيفة", heavy: "غزيرة", very_heavy: "غزيرة جدا" },
  en: { none: "No rain", very_light: "Very light (a few drops)", light: "Light", heavy: "A lot", very_heavy: "A huge amount" },
};

export function isRainLevel(x: unknown): x is RainLevel {
  return typeof x === "string" && (RAIN_LEVELS as string[]).includes(x);
}

export function levelFromMm(mm: number): RainLevel {
  if (mm >= LEVEL_MM.very_heavy) return "very_heavy";
  if (mm >= LEVEL_MM.heavy) return "heavy";
  if (mm >= LEVEL_MM.light) return "light";
  if (mm >= LEVEL_MM.very_light) return "very_light";
  return "none";
}

// Nombre minimal de personnes DIFFÉRENTES pour qu'un signalement remplace la pluie du modèle (anti-abus).
export const MIN_REPORTERS = 3;
