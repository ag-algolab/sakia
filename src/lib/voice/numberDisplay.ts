// Affichage : les nombres écrits en LETTRES pour la voix arabe (« مائتين وأربعة عشر », lu sans hésiter par la synthèse) redeviennent
// des CHIFFRES à l'écran (« 214 ») : sous-titres de l'accueil, ligne vocale, agent vocal. Demande d'Anthony (4 oct.) : « les nombres
// écrits en lettres, c'est intenable ». La voix garde les lettres ; seul l'affichage change.
// On reconnaît exactement les formes produites par nos deux générateurs (voice/numbers-ar.ts et ivr/arabicNumbers.ts), mot entier par
// mot entier : « الاثنين » (lundi) n'est jamais pris pour « اثنين » (deux). Pur : navigateur, serveur et scripts.

import { arabicWords } from "../ivr/arabicNumbers";
import { arabicNumber } from "./numbers-ar";

const MAX = 2100; // doses, litres par arbre, millimètres, degrés, jours du mois : bien en dessous
let table: { map: Map<string, number>; longest: number } | null = null;

function words(): { map: Map<string, number>; longest: number } {
  if (table) return table;
  const map = new Map<string, number>();
  let longest = 1;
  for (let n = 0; n <= MAX; n++) {
    for (const phrase of [arabicNumber(n), arabicWords(n)]) {
      if (!phrase || /\d/.test(phrase) || map.has(phrase)) continue;
      map.set(phrase, n);
      longest = Math.max(longest, phrase.split(" ").length);
    }
  }
  table = { map, longest };
  return table;
}

const ARABIC = /[؀-ۿ]/;
const TRAIL = /([،؛.:!?»)\]]+)$/;
// « السبعة » (les sept) s'écrit « الـ7 », comme déjà « الـ7 أيام » à l'accueil ; jamais les jours qui ressemblent à un nombre
const DAYS = new Set(["الاثنين", "الإثنين", "الأحد"]);

export function digitsForDisplay(text: string): string {
  if (!text || !ARABIC.test(text)) return text; // seuls les textes arabes portent des nombres en lettres
  const { map, longest } = words();
  const tokens = text.split(" ");
  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    let hit = 0;
    let value = 0;
    let tail = "";
    // le plus long groupe de mots qui forme un nombre connu (la ponctuation collée au dernier mot est remise après le chiffre)
    for (let k = Math.min(longest, tokens.length - i); k >= 1; k--) {
      const group = tokens.slice(i, i + k);
      const last = group[k - 1];
      const m = TRAIL.exec(last);
      const punct = m ? m[1] : "";
      const phrase = [...group.slice(0, -1), punct ? last.slice(0, -punct.length) : last].join(" ");
      const n = map.get(phrase);
      if (n !== undefined) {
        hit = k;
        value = n;
        tail = punct;
        break;
      }
    }
    if (hit) {
      out.push(`${value}${tail}`);
      i += hit;
      continue;
    }
    // un seul mot avec l'article : « السبعة » → « الـ7 »
    const after = TRAIL.exec(tokens[i])?.[1] ?? "";
    const bare = after ? tokens[i].slice(0, -after.length) : tokens[i];
    const withArticle = bare.startsWith("ال") && !DAYS.has(bare) ? map.get(bare.slice(2)) : undefined;
    out.push(withArticle !== undefined ? `الـ${withArticle}${after}` : tokens[i]);
    i += 1;
  }
  return out.join(" ");
}
