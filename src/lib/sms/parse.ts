// Analyseur de SMS : « olivier kairouan », « zitoun kairouan », « زيتون القيروان » donnent le même résultat.
// Fonction pure (aucun réseau, aucun état) : on compare le texte au catalogue (cultures, régions) et à un lexique de
// variantes d'écriture, avec tolérance aux fautes de frappe (distance d'édition de Damerau-Levenshtein).

import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import type { Lang } from "@/lib/messages";
import { AMBIGUOUS_CROP_ALIASES, CROP_ALIASES, KEYWORDS, LANGUAGE_WORDS, RAIN_LEVEL_WORDS, RAIN_WORDS, REGION_ALIASES, YESTERDAY_WORDS } from "./lexicon";
import type { KeywordKind } from "./lexicon";

export type Parsed =
  | { kind: "ussd"; option?: number } // *123# (ou *123*1# pour aller droit à une option)
  | { kind: "choice"; n: number } // un chiffre seul : réponse à un menu
  | { kind: "stop" }
  | { kind: "help" }
  | { kind: "language"; lang?: Lang } // sans langue : on affiche le choix
  | { kind: "plan"; cropId?: string; regionId?: string; ambiguousCrops?: string[] }
  // rapport de pluie : « PLUIE 10 », « مطر 10 », « shta 10 kairouan », « pluie beaucoup hier » ; sans quantité (`mm` et `level` absents) on la demande
  | { kind: "rain"; mm?: number; level?: "none" | "light" | "heavy" | "very_heavy"; regionId?: string; dayOffset: 0 | -1 }
  | { kind: "unknown" };

export const MAX_INPUT = 320; // au-delà, on ignore la suite (un SMS fait 160)

// ---------- normalisation ----------

const ARABIC = /[؀-ۿ]/;
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function foldArabic(s: string): string {
  return s
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ڨ/g, "ق")
    .replace(/ڤ/g, "ف")
    .replace(/پ/g, "ب")
    .replace(/چ/g, "ج");
}

// Écriture latine : « ou/w » -> u, « ai/ay/ei/ey/ee » -> i, « q/9 » -> k, lettres doublées -> une seule.
// Appliquée à la saisie ET aux mots du lexique, donc les deux côtés restent comparables.
function canonLatin(t: string): string {
  // chiffres de l'arabizi collés à des lettres : 7 = ح (h), 5 = خ (kh) ; un nombre seul reste un nombre
  if (/[a-z]/.test(t)) t = t.replace(/7/g, "h").replace(/5/g, "kh");
  return t
    .replace(/ou|oo|w/g, "u")
    .replace(/ai|ay|ei|ey|ee/g, "i")
    .replace(/[q9]/g, "k")
    .replace(/(.)\1+/g, "$1");
}

// Mots du message après nettoyage (minuscules, sans accents, chiffres arabes -> latins), avant la forme « canonique » de comparaison.
export function normalizeTokens(text: string): string[] {
  let s = text.slice(0, MAX_INPUT);
  s = s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  s = s
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .toLowerCase()
    .replace(/['’ʼ`]/g, "");
  s = foldArabic(s).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return s ? s.split(" ") : [];
}

function canonToken(tok: string): string {
  if (ARABIC.test(tok)) return tok.replace(/^(?:وال|بال|فال|كال|لل|ال)(?=.{3,})/, ""); // « ال » = « le », « بال » = « dans le »
  return canonLatin(tok);
}

export function tokenize(text: string): string[] {
  return normalizeTokens(text).map(canonToken);
}

// ---------- distance d'édition (Damerau-Levenshtein restreinte : une inversion de deux lettres compte pour 1) ----------

export function editDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (!la) return lb;
  if (!lb) return la;
  const d: number[][] = Array.from({ length: la + 1 }, (_, i) => [i, ...new Array<number>(lb).fill(0)]);
  for (let j = 0; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[la][lb];
}

// Fautes tolérées selon la longueur du mot cherché. Arabe : aucune jusqu'à 3 lettres, une jusqu'à 6, deux au-delà.
// Latin, plus strict (les mots courants du français et de l'anglais ressemblent à des noms de cultures : « what » / « wheat ») :
// aucune faute sous 5 lettres, une de 5 à 8 lettres, deux à partir de 9.
function maxTypos(key: string): number {
  const len = key.length;
  if (ARABIC.test(key)) return len <= 3 ? 0 : len <= 6 ? 1 : 2;
  return len < 5 ? 0 : len <= 8 ? 1 : 2;
}

// Mots courants qui ressemblent à une culture ou une région sans en être : ignorés seuls (« date » n'est pas « datte », « figure » n'est pas « figue »).
const STOPWORDS = new Set([
  "date", "rien", "premier", "premiere", "deja", "sous", "sure", "toutes", "tout", "vie", "vide", "faits", "fait", "fichier", "figure", "orage", "orages",
  "pour", "avec", "dans", "quand", "quel", "quelle", "comment", "combien", "merci", "bonjour", "salut", "svp", "stp",
  "what", "when", "where", "which", "who", "how", "much", "water", "please", "hello", "thanks", "wheel", "grade",
]);

// ---------- index : catalogue + lexique ----------

type Entry = { kind: "crop" | "region"; ids: string[]; key: string };

const INDEX: Entry[] = [];
const seen = new Set<string>();

function addAlias(kind: Entry["kind"], ids: string[], alias: string) {
  const key = tokenize(alias).join("");
  if (key.length < 2) return;
  const sig = `${kind}|${ids.join(",")}|${key}`;
  if (seen.has(sig)) return;
  seen.add(sig);
  INDEX.push({ kind, ids, key });
}

// « Piment / poivron » -> « piment », « poivron » ; « Orangers et agrumes » -> « orangers », « agrumes ».
function nameParts(name: string): string[] {
  return [name, ...name.split(/\s*\/\s*|\s+et\s+/)];
}

for (const c of CROPS) {
  for (const n of [c.nameFr, c.nameAr, c.nameEn]) for (const p of nameParts(n)) addAlias("crop", [c.id], p);
  for (const a of CROP_ALIASES[c.id] ?? []) addAlias("crop", [c.id], a);
}
for (const group of AMBIGUOUS_CROP_ALIASES) for (const a of group.aliases) addAlias("crop", group.ids, a);
for (const r of REGIONS) {
  for (const n of [r.nameFr, r.nameAr]) addAlias("region", [r.id], n);
  for (const a of REGION_ALIASES[r.id] ?? []) addAlias("region", [r.id], a);
}

type Hit = { entry: Entry; start: number; end: number; dist: number };

function findEntities(tokens: string[], raw: string[]): { crop?: Hit; region?: Hit } {
  const hits: Hit[] = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let n = 1; n <= 3 && i + n <= tokens.length; n++) {
      if (n === 1 && STOPWORDS.has(raw[i])) continue;
      const gram = tokens.slice(i, i + n).join("");
      if (gram.length < 2) continue;
      for (const entry of INDEX) {
        const max = maxTypos(entry.key);
        if (Math.abs(gram.length - entry.key.length) > max) continue;
        const dist = editDistance(gram, entry.key);
        if (dist > max) continue;
        // une faute dans les deux premières lettres est rare : on l'écarte pour éviter les faux positifs
        if (dist > 0 && gram.slice(0, 2) !== entry.key.slice(0, 2)) continue;
        hits.push({ entry, start: i, end: i + n, dist });
      }
    }
  }
  // meilleur d'abord : le moins de fautes, puis le plus de mots couverts, puis le mot le plus long
  hits.sort((a, b) => a.dist - b.dist || b.end - b.start - (a.end - a.start) || b.entry.key.length - a.entry.key.length);
  const out: { crop?: Hit; region?: Hit } = {};
  const taken: Hit[] = [];
  for (const h of hits) {
    if (out[h.entry.kind]) continue;
    if (taken.some((t) => h.start < t.end && t.start < h.end)) continue;
    out[h.entry.kind] = h;
    taken.push(h);
  }
  return out;
}

// Mot-clé reconnu tel quel ; avec une faute de frappe seulement si `fuzzy` (et que les deux mots font au moins `minTypoLen` lettres :
// « stp » ne doit jamais valoir « stop »).
function matchWord(token: string, words: string[], minTypoLen: number, fuzzy: boolean): boolean {
  for (const w of words) {
    const key = tokenize(w).join("");
    if (token === key) return true;
    if (fuzzy && key.length >= minTypoLen && token.length >= minTypoLen && Math.abs(token.length - key.length) <= 1 && token[0] === key[0] && editDistance(token, key) <= 1) return true;
  }
  return false;
}

// Premier nombre isolé du message (« 10 », « 2,5 », « 10mm »), pas un chiffre collé à un mot d'arabizi (« 9ayrawan »).
function extractNumber(raw: string): number | undefined {
  for (const m of raw.matchAll(/\d+(?:[.,]\d+)?/g)) {
    const at = m.index ?? 0;
    if (at > 0 && /\p{L}/u.test(raw[at - 1])) continue;
    const after = raw.slice(at + m[0].length);
    if (/^\p{L}/u.test(after) && !/^(mm|ملم|millim)/iu.test(after)) continue;
    return Number(m[0].replace(",", "."));
  }
  return undefined;
}

// ---------- analyse ----------

// Alphabet dominant du message : sert à répondre en arabe à quelqu'un qui écrit seulement en arabe.
export function scriptOf(text: string): "arabic" | "latin" | "none" {
  const ar = ARABIC.test(text);
  const latin = /[a-zA-Z]/.test(text);
  return ar && !latin ? "arabic" : latin ? "latin" : "none";
}

export function parseSms(text: string): Parsed {
  const raw = text.slice(0, MAX_INPUT).replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).trim();

  const ussd = /^\*\s*123\s*(?:\*\s*(\d)\s*)?#$/.exec(raw);
  if (ussd) return { kind: "ussd", option: ussd[1] ? Number(ussd[1]) : undefined };

  const rawTokens = normalizeTokens(raw);
  const tokens = rawTokens.map(canonToken);
  if (tokens.length === 0) return { kind: "unknown" };
  if (tokens.length === 1 && /^\d$/.test(tokens[0])) return { kind: "choice", n: Number(tokens[0]) };

  const { crop, region } = findEntities(tokens, rawTokens);
  const used = new Set<number>();
  for (const h of [crop, region]) if (h) for (let i = h.start; i < h.end; i++) used.add(i);
  const rest = tokens.filter((_, i) => !used.has(i));

  // Une faute de frappe n'est tolérée sur un mot-clé que si le message ne contient ni culture ni région :
  // sinon « olivier kairouan stp » pourrait effacer la conversation.
  const fuzzy = !crop && !region;
  const keywords = new Set<KeywordKind>();
  for (const tok of rest) {
    for (const k of Object.keys(KEYWORDS) as KeywordKind[]) if (matchWord(tok, KEYWORDS[k], 4, fuzzy && k !== "stop")) keywords.add(k); // STOP efface les réglages : jamais deviné
  }
  const langs = new Set<Lang>();
  for (const tok of rest) {
    for (const l of Object.keys(LANGUAGE_WORDS) as Lang[]) if (matchWord(tok, LANGUAGE_WORDS[l], 6, fuzzy)) langs.add(l);
  }

  if (keywords.has("stop")) return { kind: "stop" };

  // Rapport de pluie : un mot « pluie » et une quantité (nombre ou mot). Sans quantité, seulement si le message ne parle de rien d'autre
  // (« quand arroser mes oliviers s'il a plu ? » reste une demande de plan).
  if (rest.some((tok) => matchWord(tok, RAIN_WORDS, 5, fuzzy))) {
    const mm = extractNumber(raw);
    let level: "none" | "light" | "heavy" | "very_heavy" | undefined;
    for (const l of Object.keys(RAIN_LEVEL_WORDS) as (keyof typeof RAIN_LEVEL_WORDS)[]) {
      if (rest.some((tok) => matchWord(tok, RAIN_LEVEL_WORDS[l], 6, fuzzy))) level = l;
    }
    if (mm !== undefined || level || (!crop && !region)) {
      return {
        kind: "rain",
        mm,
        level: mm === undefined ? level : undefined,
        regionId: region?.entry.ids[0],
        dayOffset: rest.some((tok) => matchWord(tok, YESTERDAY_WORDS, 5, false)) ? -1 : 0,
      };
    }
  }

  if (crop || region) {
    const ids = crop?.entry.ids;
    return {
      kind: "plan",
      cropId: ids && ids.length === 1 ? ids[0] : undefined,
      regionId: region?.entry.ids[0],
      ambiguousCrops: ids && ids.length > 1 ? ids : undefined,
    };
  }

  if (keywords.has("help")) return { kind: "help" };
  if (keywords.has("language")) return { kind: "language", lang: langs.size === 1 ? [...langs][0] : undefined };
  if (langs.size === 1 && rest.length === tokens.length && tokens.length === 1) return { kind: "language", lang: [...langs][0] };
  if (keywords.has("plan")) return { kind: "plan" };
  return { kind: "unknown" };
}
