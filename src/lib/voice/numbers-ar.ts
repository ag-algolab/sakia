// Nombres en lettres arabes, pour que la voix ne dépende pas de sa façon de lire les chiffres.
// La dose, la température et la date sont les informations les plus importantes du bulletin, entendues une seule
// fois : on les écrit donc en toutes lettres (forme arabe simple, celle de la radio et de la télévision, comprise
// de tous les Tunisiens). Fonction déterministe : même nombre, même texte. Hors de 0 à 9999, on garde les chiffres.

const UNITS = ["صفر", "واحد", "اثنين", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة"];
const TEENS: Record<number, string> = {
  11: "أحد عشر",
  12: "اثنا عشر",
  13: "ثلاثة عشر",
  14: "أربعة عشر",
  15: "خمسة عشر",
  16: "ستة عشر",
  17: "سبعة عشر",
  18: "ثمانية عشر",
  19: "تسعة عشر",
};
const TENS: Record<number, string> = { 2: "عشرين", 3: "ثلاثين", 4: "أربعين", 5: "خمسين", 6: "ستين", 7: "سبعين", 8: "ثمانين", 9: "تسعين" };
const HUNDREDS: Record<number, string> = { 1: "مائة", 2: "مائتين", 3: "ثلاثمائة", 4: "أربعمائة", 5: "خمسمائة", 6: "ستمائة", 7: "سبعمائة", 8: "ثمانمائة", 9: "تسعمائة" };

const joinAnd = (parts: string[]) => parts.map((p, i) => (i === 0 ? p : `و${p}`)).join(" ");

function below100(n: number): string[] {
  if (n === 0) return [];
  if (n <= 10) return [UNITS[n]];
  if (n <= 19) return [TEENS[n]];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return u === 0 ? [TENS[t]] : [UNITS[u], TENS[t]]; // « واحد وتسعين » : les unités d'abord
}

function below1000(n: number): string[] {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [...(h ? [HUNDREDS[h]] : []), ...below100(rest)];
}

export function arabicNumber(n: number): string {
  const v = Math.round(n);
  if (!Number.isFinite(v) || v < 0 || v > 9999) return String(v);
  if (v === 0) return UNITS[0];
  const th = Math.floor(v / 1000);
  const rest = v % 1000;
  const parts: string[] = [];
  if (th === 1) parts.push("ألف");
  else if (th === 2) parts.push("ألفين");
  else if (th >= 3) parts.push(`${UNITS[th]} آلاف`);
  parts.push(...below1000(rest));
  return joinAnd(parts);
}

// Nombre suivi de son nom commun, avec le singulier, le duel et le pluriel arabes :
// 1 -> `one` (« لتر واحد »), 2 -> `two` (« لترين »), 3 à 10 -> nombre + pluriel, 11 et plus -> nombre + singulier.
export function countNoun(n: number, w: { one: string; two: string; plural: string; many: string }): string {
  const v = Math.round(n);
  if (v === 1) return w.one;
  if (v === 2) return w.two;
  if (v >= 3 && v <= 10) return `${arabicNumber(v)} ${w.plural}`;
  return `${arabicNumber(v)} ${w.many}`;
}
