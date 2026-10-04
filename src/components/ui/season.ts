import { CROPS } from "@/lib/crops";

// Saison d'arrosage d'une culture (mois inclus, src/lib/crops.ts) : hors de cette saison, le moteur ne prévoit AUCUN arrosage, même si
// la culture est encore en végétation (la vigne en octobre, après la vendange). L'écran doit le dire, sinon « pas d'arrosage cette
// semaine » laisserait croire que c'est le sol qui suffit.
export function irrigationSeasonOf(cropId: string): { from: number; to: number } | null {
  return CROPS.find((c) => c.id === cropId)?.irrigationSeason ?? null;
}

export function outOfIrrigationSeason(cropId: string, isoDate: string): boolean {
  const s = irrigationSeasonOf(cropId);
  if (!s) return false;
  const month = Number(isoDate.slice(5, 7));
  const inSeason = s.from <= s.to ? month >= s.from && month <= s.to : month >= s.from || month <= s.to;
  return !inSeason;
}
