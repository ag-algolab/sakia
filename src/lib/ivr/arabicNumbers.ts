// Nombres écrits en toutes lettres en arabe (0 à 9 999). Une voix de synthèse lit mal une suite de chiffres arabes collée à du
// texte arabe (« 192 » devient parfois « un, neuf, deux ») : on lui donne les mots. Genre grammatical ignoré (masculin partout).

const ONES = [
  "صفر", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة", "عشرة",
  "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر",
];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

function below100(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${ONES[o]} و${TENS[t]}` : TENS[t];
}

export function arabicWords(value: number): string {
  const n = Math.round(value);
  if (!Number.isFinite(n)) return "";
  if (n < 0) return `ناقص ${arabicWords(-n)}`;
  if (n < 100) return below100(n);
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return r ? `${HUNDREDS[h]} و${below100(r)}` : HUNDREDS[h];
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const r = n % 1000;
    const head = th === 1 ? "ألف" : th === 2 ? "ألفان" : `${ONES[th]} آلاف`;
    return r ? `${head} و${arabicWords(r)}` : head;
  }
  return String(n);
}
