// Hypothèses affichées sous le conseil (accueil) et sous la preuve : le moteur les écrit en français (planCore.ts pour le plan,
// backtest.ts pour la preuve). Pour les autres langues de l'écran, on reconnaît chaque phrase connue et on l'affiche traduite
// (clés « asm… » de i18n.ts). Une phrase inconnue reste en français, jamais déformée : le moteur peut évoluer sans rien casser.
// Les chiffres et les noms sont repris de la phrase du moteur, on n'en recalcule aucun.
// Garde-fou : scripts/assumptions-check.ts vérifie que CHAQUE phrase écrite par le moteur est reconnue ici.

import { REGIONS } from "@/lib/regions";
import { regionName } from "./catalog";
import type { Lang } from "./i18n";

type Vars = Record<string, string | number>;
export type Translator = (key: string, vars?: Vars) => string;
export type Formatters = { lang: Lang; t: Translator; fmtNum: (n: number) => string; fmtDate: (iso: string, opts?: Intl.DateTimeFormatOptions) => string };

const DATE = { day: "numeric", month: "long", year: "numeric" } as const;

type Rule = { re: RegExp; key: string; vars?: (m: RegExpMatchArray, f: Formatters) => Vars };

const region = (nameFr: string, f: Formatters): string => {
  const r = REGIONS.find((x) => x.nameFr === nameFr);
  return r ? regionName(r, f.lang) : nameFr;
};

export const RULES: Rule[] = [
  { re: /^Météo réelle Open-Meteo \(point du chef-lieu de (.+)\), mise à jour toutes les 3 h environ\.$/, key: "asmWeatherLive", vars: (m, f) => ({ region: region(m[1], f) }) },
  {
    re: /^REJEU du (\d{4}-\d{2}-\d{2}) : météo observée ERA5 \(Open-Meteo, chef-lieu de (.+)\), pas une prévision\.$/,
    key: "asmWeatherReplay",
    vars: (m, f) => ({ date: f.fmtDate(m[1], DATE), region: region(m[2], f) }),
  },
  {
    re: /^Sol (sableux|limoneux|argileux) \(eau utile indicative\), irrigation (goutte|aspersion|gravitaire) \(efficience (\d+) %\)\.$/,
    key: "asmSoil",
    vars: (m, f) => ({ soil: f.t(m[1]), system: f.t(m[2]), eff: f.fmtNum(Number(m[3])) }),
  },
  { re: /^Coefficients de culture FAO-56\.$/, key: "asmKc" },
  { re: /^Coefficients de culture FAO-56 \(certaines valeurs ajustées ou interpolées : voir la fiche de la culture\)\.$/, key: "asmKcAdjusted" },
  { re: /^Pluie utile \(règle FAO-56\) : ignorée si inférieure à 0,2 × ET0, comptée entièrement sinon ; ruissellement non modélisé\.$/, key: "asmRainRule" },
  { re: /^Densité supposée : (\d+) arbres\/ha \(à ajuster\)\.$/, key: "asmTrees", vars: (m, f) => ({ n: f.fmtNum(Number(m[1])) }) },
  { re: /^Besoins exprimés en mm et en m³\/ha\.$/, key: "asmUnits" },
  { re: /^À partir du (\d{4}-\d{2}-\d{2}), météo estimée par la climatologie 2015-2025 \(pas une prévision\)\.$/, key: "asmClimato", vars: (m, f) => ({ date: f.fmtDate(m[1], DATE) }) },
  { re: /^Horizon couvert par la prévision météo\.$/, key: "asmHorizon" },
  { re: /^Conseil indicatif : une personne décide\. À valider auprès de l'administration agricole régionale\.$/, key: "asmAdvisory" },
  { re: /^Météo observée ERA5 \(Open-Meteo\) du chef-lieu \(pas des prévisions passées\), saisons rejouées depuis 2015\.$/, key: "asmBtWeather" },
  {
    re: /^Calendrier fixe saisonnier : une irrigation tous les (\d+) jours, dose calée sur la demande moyenne du mois sur toutes les saisons \(référence volontairement exigeante\)\. HYPOTHÈSE à remplacer par le calendrier réel de l'administration\.$/,
    key: "asmBtFixed",
    vars: (m, f) => ({ n: f.fmtNum(Number(m[1])) }),
  },
  { re: /^Rendement relatif : relation FAO-33, estimation par modèle et non mesure ; fiable pour des déficits modérés seulement\.$/, key: "asmBtYield" },
  { re: /^Coefficients de culture FAO-56, certaines valeurs ajustées ou interpolées : résultats indicatifs\.$/, key: "asmBtKcAdjusted" },
  { re: /^Coefficients de culture FAO-56 lus tels quels\.$/, key: "asmBtKc" },
];

// Phrase du moteur (français) → phrase dans la langue de l'écran. `translated` = faux : phrase inconnue, laissée en français.
export function localizeAssumption(fr: string, f: Formatters): { text: string; translated: boolean } {
  if (f.lang === "fr") return { text: fr, translated: true };
  for (const rule of RULES) {
    const m = fr.match(rule.re);
    if (m) return { text: f.t(rule.key, rule.vars?.(m, f)), translated: true };
  }
  return { text: fr, translated: false };
}
