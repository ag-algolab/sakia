// Parité des 4 langues de l'écran (fr, en, ar, aeb) dans src/components/ui/i18n.ts : clés manquantes, variables {x} différentes,
// textes vides, textes arabes ou anglais recopiés tels quels du français (oubli de traduction probable).
// Usage : npx tsx scripts/i18n-parity.ts   (code de sortie 1 s'il y a un problème)
import { DICTS } from "../src/components/ui/i18n";
const langs = ["fr", "en", "ar", "aeb"] as const;
const keys = new Set<string>();
for (const l of langs) for (const k of Object.keys(DICTS[l])) keys.add(k);
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
let problems = 0;
console.log("clés au total :", keys.size, "| par langue :", langs.map((l) => `${l}=${Object.keys(DICTS[l]).length}`).join(" "));
for (const k of [...keys].sort()) {
  const missing = langs.filter((l) => !(k in DICTS[l]));
  if (missing.length) { problems++; console.log(`MANQUE  ${k} : absente de ${missing.join(",")} (retombe en français)`); }
  const present = langs.filter((l) => k in DICTS[l]);
  const sets = new Map(present.map((l) => [l, vars(DICTS[l][k])]));
  if (new Set(sets.values()).size > 1) { problems++; console.log(`VARIABLES  ${k} :`, [...sets].map(([l, v]) => `${l}{${v}}`).join(" ")); }
  for (const l of present) if (DICTS[l][k].trim() === "") { problems++; console.log(`VIDE  ${k} (${l})`); }
}
// textes identiques au français dans une autre langue (possible oubli de traduction), hors mots invariables
const same: string[] = [];
for (const k of keys) {
  const fr = DICTS.fr[k]; if (!fr) continue;
  for (const l of ["en", "ar", "aeb"] as const) {
    const v = DICTS[l][k]; if (v && v === fr && /[a-zéèêàç]{4,}/i.test(fr) && fr.length > 12) same.push(`${k}(${l})`);
  }
}
console.log("textes recopiés tels quels du français :", same.length ? same.join(" ") : "aucun");
console.log("PROBLÈMES :", problems);
process.exit(problems === 0 ? 0 : 1);
