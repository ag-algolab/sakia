// Cultures : coefficients FAO-56 (Kc), stades, enracinement, seuil d'épuisement admissible (p), facteur Ky.
//
// Sources :
//   - FAO Irrigation and Drainage Paper 56 : tableaux 11 (stades), 12 (Kc), 22 (Zr, p), 24 (Ky)
//     https://www.fao.org/4/x0490e/x0490e0b.htm ; https://www.fao.org/4/x0490e/x0490e0e.htm
//   - Pereira et al. 2024, Irrigation Science (Kc proposés pour olivier, amandier, pistachier, grenadier, figuier)
//   - FAO CropCalendar Tunisie (dates de semis) : https://api-cropcalendar.apps.fao.org/api/v1/countries/TN/cropCalendar
// status "confirme"   : valeurs lues telles quelles dans la source.
// status "a_verifier" : valeur ajustée, interpolée ou prise par analogie : voir `notes`.
// Les noms arabes sont à faire valider par un locuteur tunisien.

export type CropStatus = "confirme" | "a_verifier";

export type Crop = {
  id: string;
  nameFr: string;
  nameAr: string;
  nameEn: string;
  kind: "annual" | "perennial";
  // annuelles : stades en jours, Kc au début / à mi-saison / en fin de saison
  stages?: { ini: number; dev: number; mid: number; late: number };
  kc?: { ini: number; mid: number; end: number };
  typicalPlanting?: { month: number; day: number };
  // pérennes : Kc par mois (index 0 = janvier) ; 0 = repos végétatif
  kcMonthly?: number[];
  // saison d'irrigation (mois, 1-12) utilisée pour le backtest
  irrigationSeason: { from: number; to: number };
  rootDepthM: number; // profondeur racinaire utile (m), valeur basse de la fourchette FAO (programmation)
  p: number; // fraction d'eau utile consommable sans stress (pour ETc ≈ 5 mm/j)
  ky?: number; // facteur de réponse du rendement ; absent si non publié
  treesPerHa?: number; // densité supposée, pour convertir en litres par arbre
  source: string;
  notes?: string;
  status: CropStatus;
};

const M = (...v: number[]) => v; // 12 valeurs, janvier à décembre

export const CROPS: Crop[] = [
  // ---------- cultures annuelles ----------
  {
    id: "ble",
    nameFr: "Blé",
    nameAr: "القمح",
    nameEn: "Wheat",
    kind: "annual",
    stages: { ini: 30, dev: 110, mid: 40, late: 30 },
    kc: { ini: 0.7, mid: 1.15, end: 0.3 },
    typicalPlanting: { month: 11, day: 15 },
    irrigationSeason: { from: 11, to: 6 },
    rootDepthM: 1.5,
    p: 0.55,
    ky: 1.0,
    source: "FAO-56 tab. 11, 12, 22 ; Ky du blé d'hiver : FAO-33 via FAO Irrigation Manual module 4 (1,00) ; calendrier FAO Tunisie (semis 15 nov-15 déc, récolte 15 juin-15 juil)",
    notes: "Stades ramenés à 210 jours (30/110/40/30) d'après le calendrier tunisien ; FAO-56 donne 30/140/40/30 pour l'hiver méditerranéen. Blé dur et tendre non distingués. Ky : 1,00 (FAO-33), 1,05 dans un autre tableau FAO-66.",
    status: "a_verifier",
  },
  {
    id: "orge",
    nameFr: "Orge",
    nameAr: "الشعير",
    nameEn: "Barley",
    kind: "annual",
    stages: { ini: 40, dev: 60, mid: 60, late: 40 },
    kc: { ini: 0.3, mid: 1.15, end: 0.25 },
    typicalPlanting: { month: 11, day: 1 },
    irrigationSeason: { from: 11, to: 6 },
    rootDepthM: 1.0,
    p: 0.55,
    source: "FAO-56 tab. 11, 12, 22 ; calendrier FAO Tunisie (semis 1-15 nov)",
    notes: "Ky non publié dans FAO-56.",
    status: "confirme",
  },
  {
    id: "tomate",
    nameFr: "Tomate",
    nameAr: "الطماطم",
    nameEn: "Tomato",
    kind: "annual",
    stages: { ini: 30, dev: 40, mid: 45, late: 30 },
    kc: { ini: 0.6, mid: 1.15, end: 0.8 },
    typicalPlanting: { month: 4, day: 1 },
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 0.7,
    p: 0.4,
    ky: 1.05,
    source: "FAO-56 tab. 11, 12, 22, 24",
    notes: "Kc de fin : 0,70-0,90 selon la récolte, 0,80 retenu. Semis typique 1er avril (saison de printemps).",
    status: "a_verifier",
  },
  {
    id: "piment",
    nameFr: "Piment / poivron",
    nameAr: "الفلفل",
    nameEn: "Pepper",
    kind: "annual",
    stages: { ini: 30, dev: 40, mid: 110, late: 30 },
    kc: { ini: 0.6, mid: 1.05, end: 0.9 },
    typicalPlanting: { month: 4, day: 15 },
    irrigationSeason: { from: 4, to: 10 },
    rootDepthM: 0.5,
    p: 0.3,
    ky: 1.1,
    source: "FAO-56 tab. 11 (ligne poivron, climat aride), 12, 22, 24 ; calendrier FAO Kairouan (semis avril, récolte sept-déc)",
    notes: "Le piment sec n'a pas de ligne FAO propre : on utilise celle du poivron. Kairouan est le premier producteur national de piment.",
    status: "a_verifier",
  },
  {
    id: "pomme-de-terre",
    nameFr: "Pomme de terre",
    nameAr: "البطاطا",
    nameEn: "Potato",
    kind: "annual",
    stages: { ini: 25, dev: 30, mid: 40, late: 30 },
    kc: { ini: 0.5, mid: 1.15, end: 0.75 },
    typicalPlanting: { month: 1, day: 15 },
    irrigationSeason: { from: 1, to: 6 },
    rootDepthM: 0.4,
    p: 0.35,
    ky: 1.1,
    source: "FAO-56 tab. 11, 12, 22, 24 ; calendrier FAO Tunisie (saison : semis en janvier)",
    notes: "Mi-saison : FAO donne 30 à 45 jours, 40 retenu. Arrière-saison possible (semis 15 août-15 sept).",
    status: "a_verifier",
  },
  {
    id: "pasteque",
    nameFr: "Pastèque",
    nameAr: "البطيخ الأحمر",
    nameEn: "Watermelon",
    kind: "annual",
    stages: { ini: 20, dev: 30, mid: 30, late: 30 },
    kc: { ini: 0.4, mid: 1.0, end: 0.75 },
    typicalPlanting: { month: 4, day: 1 },
    irrigationSeason: { from: 4, to: 8 },
    rootDepthM: 0.8,
    p: 0.4,
    ky: 1.1,
    source: "FAO-56 tab. 11, 12, 22, 24 ; calendrier FAO Tunisie (semis 15 mars-30 avril)",
    status: "confirme",
  },
  {
    id: "melon",
    nameFr: "Melon",
    nameAr: "البطيخ الأصفر",
    nameEn: "Melon",
    kind: "annual",
    stages: { ini: 25, dev: 35, mid: 40, late: 20 },
    kc: { ini: 0.5, mid: 1.05, end: 0.75 },
    typicalPlanting: { month: 4, day: 1 },
    irrigationSeason: { from: 4, to: 8 },
    rootDepthM: 0.8,
    p: 0.4,
    source: "FAO-56 tab. 11, 12, 22 ; calendrier FAO Tunisie (semis 15 mars-15 avril)",
    notes: "Ky non publié dans FAO-56.",
    status: "confirme",
  },
  {
    id: "oignon",
    nameFr: "Oignon",
    nameAr: "البصل",
    nameEn: "Onion",
    kind: "annual",
    stages: { ini: 15, dev: 25, mid: 70, late: 40 },
    kc: { ini: 0.7, mid: 1.05, end: 0.75 },
    typicalPlanting: { month: 11, day: 15 },
    irrigationSeason: { from: 11, to: 5 },
    rootDepthM: 0.3,
    p: 0.3,
    ky: 1.1,
    source: "FAO-56 tab. 11, 12, 22, 24 ; calendrier FAO Tunisie (semis 1 oct-20 déc)",
    status: "confirme",
  },
  {
    id: "sorgho",
    nameFr: "Sorgho",
    nameAr: "الذرة الرفيعة",
    nameEn: "Sorghum",
    kind: "annual",
    stages: { ini: 20, dev: 35, mid: 45, late: 30 },
    kc: { ini: 0.3, mid: 1.05, end: 0.55 },
    typicalPlanting: { month: 4, day: 1 },
    irrigationSeason: { from: 4, to: 8 },
    rootDepthM: 1.0,
    p: 0.55,
    ky: 0.9,
    source: "FAO-56 tab. 11 (mars-avril, aride), 12, 22, 24 ; calendrier FAO Tunisie (semis 15 mars-15 avril)",
    notes: "Kc de mi-saison : 1,00-1,10, 1,05 retenu.",
    status: "a_verifier",
  },

  // ---------- cultures pérennes (Kc mensuels ; 0 = repos végétatif) ----------
  {
    id: "olivier",
    nameFr: "Olivier",
    nameAr: "الزيتون",
    nameEn: "Olive",
    kind: "perennial",
    kcMonthly: M(0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45, 0.45),
    irrigationSeason: { from: 4, to: 10 },
    rootDepthM: 1.2,
    p: 0.65,
    treesPerHa: 100,
    source: "Pereira 2024 (olivier traditionnel 100-200 arbres/ha : Kc 0,45) ; FAO-56 tab. 22 (Zr 1,2-1,7 ; p 0,65)",
    notes:
      "Kc 0,45 constant. FAO-56 donne 0,65-0,70 pour un couvert de 40-60 % et des Kc mensuels de 0,45 à 0,65 (Pastor et Orgaz) ; l'olivier de Kairouan est peu dense (environ 61 arbres/ha selon les chiffres nationaux), donc la valeur basse. Densité de 100 arbres/ha supposée pour les litres par arbre. Ky non publié.",
    status: "a_verifier",
  },
  {
    id: "amandier",
    nameFr: "Amandier",
    nameAr: "اللوز",
    nameEn: "Almond",
    kind: "perennial",
    kcMonthly: M(0, 0, 0.45, 0.45, 0.65, 0.85, 0.85, 0.85, 0.7, 0.55, 0, 0),
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 1.0,
    p: 0.4,
    source: "Pereira 2024 (couvert 0,40-0,55 : Kc 0,45 / 0,85 / 0,55) ; FAO-56 tab. 22",
    notes: "Valeurs mensuelles interpolées entre les trois Kc publiés. Calendrier tunisien non trouvé.",
    status: "a_verifier",
  },
  {
    id: "pistachier",
    nameFr: "Pistachier",
    nameAr: "الفستق",
    nameEn: "Pistachio",
    kind: "perennial",
    kcMonthly: M(0, 0, 0.4, 0.4, 0.65, 0.9, 0.9, 0.9, 0.7, 0.55, 0, 0),
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 1.0,
    p: 0.4,
    source: "Pereira 2024 (densité moyenne à forte : 0,40 / 0,90 / 0,55) ; FAO-56 tab. 22",
    notes: "Valeurs mensuelles interpolées. FAO-56 donne un Kc de mi-saison plus haut (1,10).",
    status: "a_verifier",
  },
  {
    id: "vigne",
    nameFr: "Vigne",
    nameAr: "العنب",
    nameEn: "Grape",
    kind: "perennial",
    kcMonthly: M(0, 0, 0, 0.3, 0.5, 0.7, 0.85, 0.85, 0.65, 0.45, 0, 0),
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 1.0,
    p: 0.35,
    ky: 0.85,
    source: "FAO-56 tab. 12 (raisin de table : 0,30 / 0,85 / 0,45), tab. 22, tab. 24",
    notes: "Valeurs mensuelles interpolées entre les trois Kc publiés.",
    status: "a_verifier",
  },
  {
    id: "oranger",
    nameFr: "Orangers et agrumes",
    nameAr: "القوارص",
    nameEn: "Citrus",
    kind: "perennial",
    kcMonthly: M(0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65, 0.65),
    irrigationSeason: { from: 4, to: 10 },
    rootDepthM: 1.1,
    p: 0.5,
    treesPerHa: 280,
    source: "FAO-56 tab. 12 (sans couvert, canopée 50 % : 0,65 / 0,60 / 0,65), tab. 22",
    notes: "Kc moyen de 0,65 constant. Densité de 280 arbres/ha supposée. Ky : fourchette 1,1-1,3 seulement, non retenu.",
    status: "a_verifier",
  },
  {
    id: "dattier",
    nameFr: "Palmier dattier",
    nameAr: "النخيل",
    nameEn: "Date palm",
    kind: "perennial",
    kcMonthly: M(0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9),
    irrigationSeason: { from: 1, to: 12 },
    rootDepthM: 1.5,
    p: 0.5,
    treesPerHa: 130,
    source: "FAO-56 tab. 12 (0,90-0,95) ; mesures de terrain Deglet Nour : 0,75-0,90 (Pereira 2024)",
    notes: "Kc constant de 0,90. Densité de 130 palmiers/ha supposée. Oasis du sud : irrigation toute l'année. Ky non publié.",
    status: "a_verifier",
  },
  {
    id: "grenadier",
    nameFr: "Grenadier",
    nameAr: "الرمان",
    nameEn: "Pomegranate",
    kind: "perennial",
    kcMonthly: M(0, 0, 0.35, 0.35, 0.5, 0.55, 0.55, 0.55, 0.45, 0.35, 0, 0),
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 1.0,
    p: 0.5,
    source: "Pereira 2024 (couvert 0,25-0,40 : 0,35 / 0,55 / 0,35) ; Zr et p par analogie avec les fruits à noyau",
    notes: "Absent de FAO-56 : Zr et p sont des valeurs d'analogie, à valider.",
    status: "a_verifier",
  },
  {
    id: "figuier",
    nameFr: "Figuier",
    nameAr: "التين",
    nameEn: "Fig",
    kind: "perennial",
    kcMonthly: M(0, 0, 0.35, 0.35, 0.5, 0.6, 0.6, 0.6, 0.45, 0.35, 0, 0),
    irrigationSeason: { from: 4, to: 9 },
    rootDepthM: 1.0,
    p: 0.5,
    source: "Pereira 2024 (faible densité, couvert 0,20-0,30 : 0,35 / 0,60 / 0,35) ; Zr et p par analogie",
    notes: "Absent de FAO-56 : Zr et p sont des valeurs d'analogie, à valider.",
    status: "a_verifier",
  },
  {
    id: "luzerne",
    nameFr: "Luzerne",
    nameAr: "الفصة",
    nameEn: "Alfalfa",
    kind: "perennial",
    kcMonthly: M(0, 0, 0.4, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 0.5, 0),
    irrigationSeason: { from: 3, to: 10 },
    rootDepthM: 1.0,
    p: 0.55,
    ky: 1.1,
    source: "FAO-56 tab. 12 (moyenne des coupes : 0,40 / 0,95 / 0,90), tab. 22, tab. 24",
    notes: "Kc moyen de 0,90 d'avril à octobre ; coupes successives non modélisées.",
    status: "a_verifier",
  },
];

export function getCrop(id: string): Crop | undefined {
  return CROPS.find((c) => c.id === id);
}

// Culture à montrer en premier sur l'accueil : la première, parmi les cultures courantes de Kairouan, qui est EN SAISON
// d'irrigation à cette date (même règle que le moteur : irrigationSeason). Ainsi le premier écran affiche un vrai conseil du
// moteur et non « culture hors saison » ; rien n'est inventé, c'est seulement le choix de ce qui est montré d'abord.
// Dattier (irrigué toute l'année) en dernier recours.
const FIRST_SCREEN_CROPS = ["piment", "tomate", "olivier", "pomme-de-terre", "oignon", "ble", "dattier"];

export function defaultCropForMonth(month: number): string {
  const inSeason = (c: Crop) => {
    const { from, to } = c.irrigationSeason;
    return from <= to ? month >= from && month <= to : month >= from || month <= to;
  };
  const found = FIRST_SCREEN_CROPS.find((id) => {
    const c = getCrop(id);
    return c != null && inSeason(c);
  });
  return found ?? "dattier";
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

// Date de semis par défaut pour une date donnée : le dernier semis typique qui précède cette date.
export function defaultPlanting(crop: Crop, date: string): string | undefined {
  if (!crop.typicalPlanting) return undefined;
  const y = Number(date.slice(0, 4));
  const mk = (yy: number) =>
    `${yy}-${String(crop.typicalPlanting!.month).padStart(2, "0")}-${String(crop.typicalPlanting!.day).padStart(2, "0")}`;
  return mk(y) <= date ? mk(y) : mk(y - 1);
}

export function cropDaysTotal(crop: Crop): number {
  if (!crop.stages) return 0;
  const s = crop.stages;
  return s.ini + s.dev + s.mid + s.late;
}

// Kc du jour : interpolation linéaire entre stades pour les annuelles, table mensuelle pour les pérennes.
// Renvoie null si la culture n'est pas en végétation à cette date.
export function kcOnDate(crop: Crop, date: string, planting?: string): number | null {
  if (crop.kind === "perennial") {
    const v = crop.kcMonthly?.[Number(date.slice(5, 7)) - 1];
    return v != null && v > 0 ? v : null;
  }
  const start = planting ?? defaultPlanting(crop, date);
  if (!start || !crop.stages || !crop.kc) return null;
  const d = daysBetween(start, date);
  const { ini, dev, mid, late } = crop.stages;
  const total = ini + dev + mid + late;
  if (d < 0 || d >= total) return null;
  if (d < ini) return crop.kc.ini;
  if (d < ini + dev) return crop.kc.ini + ((d - ini) / dev) * (crop.kc.mid - crop.kc.ini);
  if (d < ini + dev + mid) return crop.kc.mid;
  return crop.kc.mid + ((d - ini - dev - mid) / late) * (crop.kc.end - crop.kc.mid);
}
