// Claviers « inline » et données des boutons.
// Les choix déjà faits voyagent dans le bouton (langue, région, culture) : aucune ligne n'est écrite
// avant la fin de la configuration, donc une ligne en base = une personne configurée.
// Format des données (64 octets max) :
//   l:<lang>  r:<lang>:<région>  c:<lang>:<région>:<culture>  a:<lang>:<région>:<culture>:<code>
//   L:<lang> (changer de langue)  act:<voice|upd|chg|irr|del|daily>

import { CROPS } from "../crops";
import { LEVEL_LABEL, RAIN_LEVELS, isRainLevel } from "../rainLevels";
import type { RainLevel } from "../rainLevels";
import { REGIONS } from "../regions";
import type { Lang } from "../messages";
import { sortLocale, t } from "./i18n";
import type { InlineButton, InlineKeyboard } from "./types";

export const LANGS: { id: Lang; label: string }[] = [
  { id: "fr", label: "🇫🇷 Français" },
  { id: "ar", label: "🇹🇳 العربية" },
  { id: "en", label: "🇬🇧 English" },
];

export const AGO_CODES = ["0", "2", "4", "7", "u"] as const;
export type AgoCode = (typeof AGO_CODES)[number];

// Jours écoulés pour chaque réponse (« 1-2 jours » → 2, « 3-5 » → 4, « plus de 5 » → 7, plafond du moteur).
export function agoDays(code: AgoCode): number | null {
  return code === "u" ? null : Number(code);
}

export function regionName(id: string, lang: Lang): string {
  const r = REGIONS.find((x) => x.id === id);
  return r ? (lang === "ar" ? r.nameAr : r.nameFr) : id;
}

export function cropName(id: string, lang: Lang): string {
  const c = CROPS.find((x) => x.id === id);
  return c ? (lang === "ar" ? c.nameAr : lang === "en" ? c.nameEn : c.nameFr) : id;
}

function grid(buttons: InlineButton[], columns: number): InlineButton[][] {
  const rows: InlineButton[][] = [];
  for (let i = 0; i < buttons.length; i += columns) rows.push(buttons.slice(i, i + columns));
  return rows;
}

export function langKeyboard(prefix: "l" | "L"): InlineKeyboard {
  return { inline_keyboard: [LANGS.map((l) => ({ text: l.label, callback_data: `${prefix}:${l.id}` }))] };
}

export function regionKeyboard(lang: Lang): InlineKeyboard {
  const items = REGIONS.map((r) => ({ id: r.id, name: regionName(r.id, lang) })).sort((a, b) =>
    a.name.localeCompare(b.name, sortLocale(lang)),
  );
  return { inline_keyboard: grid(items.map((r) => ({ text: r.name, callback_data: `r:${lang}:${r.id}` })), 2) };
}

// `only` : ne proposer que ces cultures (ex. « battikh » = pastèque ou melon).
export function cropKeyboard(lang: Lang, regionId: string, only?: string[]): InlineKeyboard {
  const items = CROPS.filter((c) => !only || only.includes(c.id)).map((c) => ({ id: c.id, name: cropName(c.id, lang) })).sort((a, b) =>
    a.name.localeCompare(b.name, sortLocale(lang)),
  );
  return { inline_keyboard: grid(items.map((c) => ({ text: c.name, callback_data: `c:${lang}:${regionId}:${c.id}` })), 2) };
}

export function agoKeyboard(lang: Lang, regionId: string, cropId: string): InlineKeyboard {
  const s = t(lang).ago;
  const label: Record<AgoCode, string> = { "0": s.today, "2": s.d12, "4": s.d35, "7": s.d6, u: s.unknown };
  return {
    inline_keyboard: AGO_CODES.map((code) => [{ text: label[code], callback_data: `a:${lang}:${regionId}:${cropId}:${code}` }]),
  };
}

// Réponses « dernier arrosage » (sans « je ne sais pas ») pour les plans qui en ont besoin : 2 × 2 boutons.
export function agoRows(lang: Lang, regionId: string, cropId: string): InlineButton[][] {
  const s = t(lang).ago;
  const mk = (code: AgoCode, text: string): InlineButton => ({ text, callback_data: `a:${lang}:${regionId}:${cropId}:${code}` });
  return [
    [mk("0", s.today), mk("2", s.d12)],
    [mk("4", s.d35), mk("7", s.d6)],
  ];
}

// Sans `ask`, les boutons habituels. Avec `ask` (dernier arrosage inconnu), on demande d'abord le dernier arrosage.
export function planKeyboard(lang: Lang, ask?: { regionId: string; cropId: string }): InlineKeyboard {
  const s = t(lang);
  if (ask === undefined) return standardRows(s);
  return { inline_keyboard: [...agoRows(lang, ask.regionId, ask.cropId), ...standardRows(s).inline_keyboard] };
}

function standardRows(s: ReturnType<typeof t>): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: s.btnVoice, callback_data: "act:voice" }],
      [{ text: s.btnRefresh, callback_data: "act:upd" }],
      [{ text: s.btnIrrigated, callback_data: "act:irr" }],
      [{ text: s.btnRain, callback_data: "act:rain" }],
      [{ text: s.btnChange, callback_data: "act:chg" }],
    ],
  };
}

// Échelle de pluie à cinq degrés (src/lib/rainLevels.ts) : personne ne mesure la pluie en millimètres.
export function rainKeyboard(lang: Lang): InlineKeyboard {
  return { inline_keyboard: RAIN_LEVELS.map((l) => [{ text: LEVEL_LABEL[lang][l], callback_data: `rain:${l}` }]) };
}

export function refreshKeyboard(lang: Lang): InlineKeyboard {
  return { inline_keyboard: [[{ text: t(lang).btnRefresh, callback_data: "act:upd" }]] };
}

export function stopKeyboard(lang: Lang): InlineKeyboard {
  const s = t(lang);
  return { inline_keyboard: [[{ text: s.btnDailyOn, callback_data: "act:daily" }], [{ text: s.btnDelete, callback_data: "act:del" }]] };
}

export type ActName = "voice" | "upd" | "chg" | "irr" | "rain" | "del" | "daily";

export type Action =
  | { kind: "lang"; lang: Lang }
  | { kind: "setLang"; lang: Lang }
  | { kind: "region"; lang: Lang; regionId: string }
  | { kind: "crop"; lang: Lang; regionId: string; cropId: string }
  | { kind: "ago"; lang: Lang; regionId: string; cropId: string; code: AgoCode }
  | { kind: "rain"; level: RainLevel }
  | { kind: "act"; name: ActName };

const isLang = (x: string): x is Lang => x === "fr" || x === "ar" || x === "en";
const isRegion = (x: string) => REGIONS.some((r) => r.id === x);
const isCrop = (x: string) => CROPS.some((c) => c.id === x);
const ACTS: string[] = ["voice", "upd", "chg", "irr", "rain", "del", "daily"];

// Lit les données d'un bouton ; renvoie null pour tout ce qui n'est pas reconnu (jamais d'erreur).
export function parseAction(data: string | undefined): Action | null {
  if (!data || data.length > 64) return null;
  const p = data.split(":");
  const lang = p[1] ?? "";
  if ((p[0] === "l" || p[0] === "L") && p.length === 2 && isLang(lang)) return { kind: p[0] === "l" ? "lang" : "setLang", lang };
  if (p[0] === "r" && p.length === 3 && isLang(lang) && isRegion(p[2])) return { kind: "region", lang, regionId: p[2] };
  if (p[0] === "c" && p.length === 4 && isLang(lang) && isRegion(p[2]) && isCrop(p[3]))
    return { kind: "crop", lang, regionId: p[2], cropId: p[3] };
  if (p[0] === "a" && p.length === 5 && isLang(lang) && isRegion(p[2]) && isCrop(p[3]) && (AGO_CODES as readonly string[]).includes(p[4]))
    return { kind: "ago", lang, regionId: p[2], cropId: p[3], code: p[4] as AgoCode };
  if (p[0] === "rain" && p.length === 2 && isRainLevel(p[1])) return { kind: "rain", level: p[1] };
  if (p[0] === "act" && p.length === 2 && ACTS.includes(p[1])) return { kind: "act", name: p[1] as ActName };
  return null;
}
