// Jeu de phrases de test du SMS : écrites À LA MAIN par l'équipe (pas recueillies auprès d'agriculteurs, pas tirées d'un
// corpus). Elles servent à MESURER la part comprise par l'analyseur de src/lib/sms/parse.ts, pas à prouver qu'il comprend
// les agriculteurs tunisiens. Quelques phrases sont volontairement difficiles : le chiffre n'est pas arrondi à la hausse.
// Les formes arabes et arabizi sont à faire relire par un Tunisien (voir docs/NOTES-telephone.md).
//
// Pour comparer plus tard avec un petit modèle d'intentions (src/lib/intent/) : même fichier, même fonction de score.

import { parseSms } from "./parse";

export type Group = "français" | "arabe" | "arabizi";

export type Expect =
  | { kind: "plan"; cropId?: string; regionId?: string }
  | { kind: "ambiguous"; crops: string[] }
  | { kind: "help" | "stop" | "language" | "ussd" };

export type Case = { text: string; group: Group; expect: Expect; note?: string };

const plan = (cropId?: string, regionId?: string): Expect => ({ kind: "plan", cropId, regionId });

export const TESTSET: Case[] = [
  // ---------- français ----------
  { text: "olivier kairouan", group: "français", expect: plan("olivier", "kairouan") },
  { text: "Quand arroser mes oliviers à Kairouan ?", group: "français", expect: plan("olivier", "kairouan"), note: "phrase entière" },
  { text: "irrigation tomate sfax", group: "français", expect: plan("tomate", "sfax") },
  { text: "plan blé sidi bouzid", group: "français", expect: plan("ble", "sidi-bouzid") },
  { text: "piments gafsa svp", group: "français", expect: plan("piment", "gafsa") },
  { text: "j'ai de la pomme de terre à Sousse, je dois arroser quand ?", group: "français", expect: plan("pomme-de-terre", "sousse"), note: "phrase entière" },
  { text: "oliver kairoan", group: "français", expect: plan("olivier", "kairouan"), note: "fautes de frappe" },
  { text: "tomte nabeul", group: "français", expect: plan("tomate", "nabeul"), note: "faute de frappe" },
  { text: "dattier tozeur", group: "français", expect: plan("dattier", "tozeur") },
  { text: "pastèque kasserine", group: "français", expect: plan("pasteque", "kasserine") },
  { text: "vigne zaghouan", group: "français", expect: plan("vigne", "zaghouan") },
  { text: "orge le kef", group: "français", expect: plan("orge", "le-kef") },
  { text: "oranger bizerte", group: "français", expect: plan("oranger", "bizerte") },
  { text: "melon medenine", group: "français", expect: plan("melon", "medenine") },
  { text: "aide", group: "français", expect: { kind: "help" } },
  { text: "stop", group: "français", expect: { kind: "stop" } },
  { text: "langue", group: "français", expect: { kind: "language" } },
  { text: "*123#", group: "français", expect: { kind: "ussd" } },
  // ---------- arabe (écriture arabe) ----------
  { text: "زيتون القيروان", group: "arabe", expect: plan("olivier", "kairouan") },
  { text: "متى نسقي الزيتون في القيروان؟", group: "arabe", expect: plan("olivier", "kairouan"), note: "phrase entière" },
  { text: "طماطم صفاقس", group: "arabe", expect: plan("tomate", "sfax") },
  { text: "قمح سيدي بوزيد", group: "arabe", expect: plan("ble", "sidi-bouzid") },
  { text: "فلفل قفصة", group: "arabe", expect: plan("piment", "gafsa") },
  { text: "نخيل توزر", group: "arabe", expect: plan("dattier", "tozeur") },
  { text: "شعير الكاف", group: "arabe", expect: plan("orge", "le-kef") },
  { text: "بطاطا سوسة", group: "arabe", expect: plan("pomme-de-terre", "sousse") },
  { text: "الزيتون بالمهدية", group: "arabe", expect: plan("olivier", "mahdia"), note: "« بال » collé au nom" },
  { text: "دلاع القصرين", group: "arabe", expect: plan("pasteque", "kasserine") },
  { text: "زيتوم القيروان", group: "arabe", expect: plan("olivier", "kairouan"), note: "faute de frappe" },
  { text: "بطيخ صفاقس", group: "arabe", expect: { kind: "ambiguous", crops: ["pasteque", "melon"] }, note: "pastèque ou melon : on redemande" },
  { text: "مساعدة", group: "arabe", expect: { kind: "help" } },
  // ---------- arabizi (écriture latine d'arabe tunisien) ----------
  { text: "zitoun kairouan", group: "arabizi", expect: plan("olivier", "kairouan") },
  { text: "zitoun 9ayrawan", group: "arabizi", expect: plan("olivier", "kairouan") },
  { text: "9amh sidi bouzid", group: "arabizi", expect: plan("ble", "sidi-bouzid") },
  { text: "tmatem sfax", group: "arabizi", expect: plan("tomate", "sfax") },
  { text: "felfel 9afsa", group: "arabizi", expect: plan("piment", "gafsa") },
  { text: "cha3ir kef", group: "arabizi", expect: plan("orge", "le-kef") },
  { text: "wa9t esa9i zitoun fi kairouan", group: "arabizi", expect: plan("olivier", "kairouan"), note: "phrase entière" },
  { text: "nheb na3ref kifeh nsa9i el 9amh f sfax", group: "arabizi", expect: plan("ble", "sfax"), note: "phrase entière" },
  { text: "batata 9abes", group: "arabizi", expect: plan("pomme-de-terre", "gabes") },
  { text: "zitouna mahdia", group: "arabizi", expect: plan("olivier", "mahdia") },
  { text: "bsal kasserine", group: "arabizi", expect: plan("oignon", "kasserine") },
  { text: "zitoun sfaqs", group: "arabizi", expect: plan("olivier", "sfax"), note: "écriture variante de Sfax" },
  { text: "louz nabeul", group: "arabizi", expect: plan("amandier", "nabeul") },
  { text: "ziton qairawan", group: "arabizi", expect: plan("olivier", "kairouan"), note: "écriture libre" },
  { text: "dellaa3 sousse", group: "arabizi", expect: plan("pasteque", "sousse") },
  { text: "dhra kairouan", group: "arabizi", expect: plan("sorgho", "kairouan"), note: "difficile : « dhra » = maïs ou sorgho, mot volontairement non reconnu" },
  { text: "kifech nsa9i el ghalla fi sfax", group: "arabizi", expect: plan(undefined, "sfax"), note: "pas de culture reconnaissable : seule la région compte" },
  // ---------- un mot de météo dans la phrase ne change rien : la demande reste une demande de plan ----------
  { text: "quand arroser mes oliviers à kairouan s'il a plu ?", group: "français", expect: plan("olivier", "kairouan"), note: "« plu » dans la phrase : sans effet" },
  // ---------- variantes d'écriture non prévues dans le lexique (écrites après coup pour ne pas se flatter) ----------
  { text: "zeitouna kairwan", group: "arabizi", expect: plan("olivier", "kairouan"), note: "variante libre" },
  { text: "tamatem sfax", group: "arabizi", expect: plan("tomate", "sfax"), note: "variante libre" },
  { text: "gamh jendouba", group: "arabizi", expect: plan("ble", "jendouba"), note: "variante libre" },
  { text: "9ama7 bizerte", group: "arabizi", expect: plan("ble", "bizerte"), note: "chiffre 7 pour ح" },
  { text: "el batata mte3i fi monastir", group: "arabizi", expect: plan("pomme-de-terre", "monastir"), note: "phrase entière" },
  { text: "tin ben arous", group: "arabizi", expect: plan("figuier", "ben-arous") },
  { text: "فلفل حار القيروان", group: "arabe", expect: plan("piment", "kairouan"), note: "mot en plus" },
  { text: "قيروان زيتون", group: "arabe", expect: plan("olivier", "kairouan"), note: "ordre inversé, sans article" },
  { text: "الزيتون تاع القيروان", group: "arabe", expect: plan("olivier", "kairouan"), note: "tournure tunisienne" },
  { text: "نخل توزر", group: "arabe", expect: plan("dattier", "tozeur"), note: "variante non prévue (نخل au lieu de نخيل)" },
  { text: "ou arroser tomate", group: "français", expect: plan("tomate", undefined), note: "pas de région : on la redemande" },
  { text: "kairouan zitoun stp", group: "français", expect: plan("olivier", "kairouan"), note: "« stp » ne doit pas valoir « stop »" },
];

function matches(text: string, e: Expect): boolean {
  const p = parseSms(text);
  switch (e.kind) {
    case "plan":
      return p.kind === "plan" && p.cropId === e.cropId && p.regionId === e.regionId && !p.ambiguousCrops;
    case "ambiguous":
      return p.kind === "plan" && !!p.ambiguousCrops && [...p.ambiguousCrops].sort().join() === [...e.crops].sort().join();
    default:
      return p.kind === e.kind;
  }
}

export type Scored = { case: Case; ok: boolean; got: string };
export type Score = { total: number; ok: number; byGroup: Record<Group, { total: number; ok: number }>; results: Scored[] };

// Part des phrases comprises exactement comme prévu (culture ET région, ou mot-clé attendu).
export function scoreTestset(cases: Case[] = TESTSET): Score {
  const byGroup: Score["byGroup"] = { français: { total: 0, ok: 0 }, arabe: { total: 0, ok: 0 }, arabizi: { total: 0, ok: 0 } };
  const results = cases.map((c) => {
    const ok = matches(c.text, c.expect);
    byGroup[c.group].total++;
    if (ok) byGroup[c.group].ok++;
    return { case: c, ok, got: JSON.stringify(parseSms(c.text)) };
  });
  return { total: cases.length, ok: results.filter((r) => r.ok).length, byGroup, results };
}
