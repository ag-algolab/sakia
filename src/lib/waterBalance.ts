// Bilan hydrique de la zone racinaire, méthode FAO-56 (épuisement Dr), au pas journalier.
// Le conseil n'est qu'une aide à la décision : hypothèses simplifiées, à valider avec l'administration agricole.

import type { Crop } from "./crops";
import { kcOnDate } from "./crops";
import type { Day } from "./weather";

export type SoilName = "sableux" | "limoneux" | "argileux";

// Eau utile en mm par mètre de sol (ordres de grandeur FAO-56, tableau 19) : valeurs indicatives.
export const SOILS: Record<SoilName, { nameFr: string; tawPerM: number }> = {
  sableux: { nameFr: "Sol sableux", tawPerM: 90 },
  limoneux: { nameFr: "Sol limoneux", tawPerM: 150 },
  argileux: { nameFr: "Sol argileux", tawPerM: 170 },
};

export type IrrigationSystem = "goutte" | "aspersion" | "gravitaire";

// Efficience d'application (part de l'eau apportée réellement utile) : ordres de grandeur FAO.
export const EFFICIENCY: Record<IrrigationSystem, number> = {
  goutte: 0.9,
  aspersion: 0.75,
  gravitaire: 0.55,
};

export type Policy =
  | { type: "adaptive"; trigger?: number } // irriguer quand l'épuisement atteint trigger × RAW
  // calendrier fixe : tous les everyDays jours, dose netMm (ou netMmByMonth[mois-1] si fourni : calendrier saisonnier)
  | { type: "fixed"; everyDays: number; netMm: number; netMmByMonth?: number[]; offsetDays?: number };

export type SimInput = {
  crop: Crop;
  days: Day[]; // série météo continue, jour par jour
  planting?: string;
  soil: SoilName;
  system: IrrigationSystem;
  // fraction de RAW déjà consommée au premier jour (0 = sol à capacité au champ)
  initialDepletion?: number;
  policy: Policy;
  irrigationSeason?: { from: number; to: number };
};

export type SimDay = {
  date: string;
  kc: number;
  etc: number; // besoin de la culture (mm)
  eta: number; // évapotranspiration réelle (mm)
  rain: number;
  effRain: number;
  ks: number; // 1 = pas de stress
  dr: number; // épuisement en fin de journée (mm)
  raw: number;
  taw: number;
  irrigNet: number; // eau utile apportée (mm)
  irrigGross: number; // eau à pomper compte tenu de l'efficience (mm)
  waste: number; // percolation profonde (mm)
};

// Pluie utile du jour, règle FAO-56 : une pluie inférieure à 0,2 × ET0 s'évapore et est ignorée,
// au-delà on compte la pluie entière. Le ruissellement n'est pas modélisé ; l'excès est suivi comme percolation.
export function effectiveRain(rain: number, et0: number): number {
  return rain >= 0.2 * et0 ? rain : 0;
}

export function inSeason(date: string, s?: { from: number; to: number }): boolean {
  if (!s) return true;
  const m = Number(date.slice(5, 7));
  return s.from <= s.to ? m >= s.from && m <= s.to : m >= s.from || m <= s.to;
}

export function simulate(input: SimInput): SimDay[] {
  const { crop, days, soil, system, policy } = input;
  const taw = SOILS[soil].tawPerM * crop.rootDepthM;
  const raw = crop.p * taw;
  const eff = EFFICIENCY[system];
  const out: SimDay[] = [];
  let dr = Math.min(taw, Math.max(0, (input.initialDepletion ?? 0.5) * raw));
  let sinceFixed = (policy.type === "fixed" ? policy.offsetDays ?? 0 : 0) % (policy.type === "fixed" ? policy.everyDays : 1);

  for (const day of days) {
    const kc = kcOnDate(crop, day.date, input.planting);
    if (kc == null) continue; // culture hors végétation : on ne simule pas ce jour
    const etc = kc * day.et0;
    const effRain = effectiveRain(day.rain, day.et0);
    const season = inSeason(day.date, input.irrigationSeason);

    // stress d'après l'épuisement de la veille
    const ks = dr > raw ? Math.max(0, (taw - dr) / (taw - raw)) : 1;
    const eta = ks * etc;

    // décision d'irrigation
    let irrigNet = 0;
    if (season) {
      if (policy.type === "adaptive") {
        const trigger = policy.trigger ?? 1;
        // on irrigue le jour où la consommation du jour ferait franchir le seuil, avant le stress
        if (dr + etc >= trigger * raw) irrigNet = dr; // on remet le sol à capacité
      } else {
        sinceFixed += 1;
        if (sinceFixed >= policy.everyDays) {
          irrigNet = policy.netMmByMonth ? policy.netMmByMonth[Number(day.date.slice(5, 7)) - 1] ?? policy.netMm : policy.netMm;
          sinceFixed = 0;
        }
      }
    }

    dr = dr - effRain - irrigNet + eta;
    let waste = 0;
    if (dr < 0) {
      waste = -dr;
      dr = 0;
    }
    if (dr > taw) dr = taw;

    out.push({
      date: day.date,
      kc,
      etc,
      eta,
      rain: day.rain,
      effRain,
      ks,
      dr,
      raw,
      taw,
      irrigNet,
      irrigGross: irrigNet / eff,
      waste,
    });
  }
  return out;
}

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}
