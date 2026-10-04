// Film technique (≤ 60 s : la limite du formulaire HackOS) : comment Sakia fonctionne. Mêmes outils que le film principal.

import { makeScenes } from "../timeline";

export const TECH_CUTS = [0, 8.0, 27.0, 37.0, 47.0, 57.0] as const;
export const TECH_TOTAL = TECH_CUTS[TECH_CUTS.length - 1];

export const TECH_SCENES = makeScenes(TECH_CUTS, [
  ["intro", "Under the hood"],
  ["pipeline", "Four steps"],
  ["small", "Small by design"],
  ["stack", "Stack and limits"],
  ["safeguards", "Safeguards"],
]);

// Arrêts de navigation quand les animations sont réduites : tout est à l'écran.
export const TECH_SETTLED = [6.5, 25.0, 35.5, 45.5, 55.5] as const;

// Fond « plan d'architecte » : vert très sombre, quadrillage discret.
export const techBackdrop = (): string =>
  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px) 0 0 / 80px 80px, linear-gradient(180deg, #0b1b14 0%, #10281d 55%, #183024 100%)";
