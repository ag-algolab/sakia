// Menus de la ligne vocale : régions, groupes de cultures, réponses à « quand avez-vous arrosé ? ».
// Tout vient du catalogue (crops.ts, regions.ts) : aucun nom de culture ni de région n'est écrit à la main dans les phrases.
// Pur (sans réseau, sans fichier) : utilisable dans le navigateur, sur le serveur et dans les scripts.

export type IvrLang = "fr" | "ar";
export const IVR_LANGS: IvrLang[] = ["fr", "ar"];

export const DEFAULT_REGION = "kairouan";
// Gouvernorats agricoles proposés après « une autre région » (touches 1 à 7).
export const OTHER_REGIONS = ["sidi-bouzid", "kasserine", "sfax", "nabeul", "jendouba", "beja", "gabes"];

export type GroupId = "cereales" | "legumes" | "arbres" | "autres";

// Cultures regroupées par façon de s'arroser (touches 1 à 4, puis 1 à n dans le groupe).
export const GROUPS: { id: GroupId; crops: string[] }[] = [
  { id: "cereales", crops: ["ble", "orge"] },
  { id: "legumes", crops: ["tomate", "piment", "pomme-de-terre", "oignon"] },
  { id: "arbres", crops: ["olivier", "amandier", "oranger", "dattier"] },
  { id: "autres", crops: ["pasteque", "melon", "sorgho", "vigne", "pistachier", "luzerne", "grenadier", "figuier"] },
];

// Réponse à « quand avez-vous arrosé pour la dernière fois ? ».
// `ago` est le nombre de jours passé au moteur (0 à 7). Pour une tranche on prend le bout le plus ancien :
// on suppose le sol le plus sec possible, donc on ne risque pas de conseiller d'attendre trop longtemps.
// null = « je ne sais pas » : le moteur répond « pas sûr, demandez à une personne ».
export const AGO_CHOICES: { key: string; ago: number | null }[] = [
  { key: "1", ago: 0 }, // aujourd'hui
  { key: "2", ago: 2 }, // hier ou avant-hier
  { key: "3", ago: 5 }, // il y a 3 à 5 jours
  { key: "4", ago: 7 }, // il y a plus de 5 jours (le moteur plafonne à 7)
  { key: "9", ago: null }, // je ne sais pas
];

export const MAX_CALL_MS = 120_000; // la ligne se termine proprement après 2 minutes
export const SILENCE_MS = 10_000; // sans touche pendant 10 s : on répète, puis on raccroche

// Un plan lu au téléphone doit tenir en 25 secondes environ.
export const PLAN_TARGET_SECONDS = 25;
