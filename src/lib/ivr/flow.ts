// Arbre de dialogue de la ligne vocale : machine à états PURE (aucun audio, aucun réseau, aucune horloge).
// Elle reçoit un événement (touche, silence, temps écoulé, fin de lecture du plan) et rend le nouvel état
// plus la liste de ce qu'il faut dire. Le faux téléphone de /call l'utilise dans le navigateur ; un vrai
// opérateur ou une ligne SIP l'utiliserait de la même façon, via POST /api/ivr/step.
//
// Parcours : langue (1 français, 2 arabe) → région (1 Kairouan, 2 une autre) → groupe de cultures → culture →
// dernier arrosage → lecture du plan → menu de fin (1 une autre culture, 2 terminer, 3 détail de la semaine) → au revoir.
// 0 répète, * revient en arrière, la ligne se termine après 2 minutes ou après deux silences de suite.

import { AGO_CHOICES, DEFAULT_REGION, GROUPS, MAX_CALL_MS, OTHER_REGIONS } from "./menu";
import type { GroupId, IvrLang } from "./menu";
import { cropPromptId } from "./prompts";
import type { PromptId } from "./prompts";

export type Key = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "*" | "#";
export const KEYS: Key[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export type NodeId = "lang" | "region" | "region_list" | "group" | "crop" | "ago" | "plan" | "detail" | "again" | "ended";

// Ce qu'il faut faire entendre. `plan` = lecture du plan de la culture (texte et chiffres venus du moteur) ;
// `detail: true` = le détail de la semaine pour ce même plan.
export type Say =
  | { kind: "prompt"; id: PromptId; lang: IvrLang }
  | { kind: "plan"; regionId: string; cropId: string; lang: IvrLang; ago: number | null; detail: boolean };

export type CallState = {
  node: NodeId;
  lang: IvrLang | null;
  regionId: string;
  groupId: GroupId | null;
  cropId: string | null;
  ago: number | null | undefined; // undefined = pas encore demandé ; null = « je ne sais pas »
  elapsedMs: number;
  silences: number; // silences consécutifs
  helpGiven: boolean;
  plansHeard: number;
};

export type CallEvent =
  | { type: "key"; key: Key }
  | { type: "silence" } // aucune touche pendant SILENCE_MS après la fin de la question
  | { type: "tick"; ms: number } // temps écoulé depuis le dernier événement de temps
  | { type: "played" } // le plan a fini d'être lu
  | { type: "hangup" };

export type StepResult = { state: CallState; say: Say[]; end: boolean };

const prompt = (id: PromptId, lang: IvrLang): Say => ({ kind: "prompt", id, lang });
const bothLangs = (id: PromptId): Say[] => [prompt(id, "fr"), prompt(id, "ar")];
const inLang = (id: PromptId, s: CallState): Say[] => (s.lang ? [prompt(id, s.lang)] : bothLangs(id));

export function startCall(): StepResult {
  const state: CallState = {
    node: "lang",
    lang: null,
    regionId: DEFAULT_REGION,
    groupId: null,
    cropId: null,
    ago: undefined,
    elapsedMs: 0,
    silences: 0,
    helpGiven: false,
    plansHeard: 0,
  };
  return { state, say: ask(state), end: false };
}

// La question du nœud courant.
export function ask(s: CallState): Say[] {
  const lang = s.lang ?? "fr";
  switch (s.node) {
    case "lang":
      return bothLangs("welcome");
    case "region":
      return [prompt("region", lang)];
    case "region_list":
      return [prompt("region_list", lang)];
    case "group":
      return [prompt("group", lang)];
    case "crop":
      return [prompt(cropPromptId(s.groupId ?? "cereales"), lang)];
    case "ago":
      return [prompt("ago", lang)];
    case "plan":
    case "detail":
      return [{ kind: "plan", regionId: s.regionId, cropId: s.cropId ?? "olivier", lang, ago: s.ago ?? null, detail: s.node === "detail" }];
    case "again":
      return [prompt("again", lang)];
    case "ended":
      return [];
  }
}

// Entrer dans un nœud : la première fois qu'on arrive au choix de région, on rappelle les touches 0 et *.
function enter(s: CallState, node: NodeId): StepResult {
  let next: CallState = { ...s, node, silences: 0 };
  let say = ask(next);
  if (node === "region" && !next.helpGiven) {
    next = { ...next, helpGiven: true };
    say = [prompt("help", next.lang ?? "fr"), ...say];
  }
  if (node === "plan") next = { ...next, plansHeard: next.plansHeard + 1 };
  return { state: next, say, end: false };
}

function finish(s: CallState, id: PromptId): StepResult {
  return { state: { ...s, node: "ended" }, say: inLang(id, s), end: true };
}

// Retour arrière (touche *).
function back(s: CallState): StepResult {
  switch (s.node) {
    case "region":
      return enter({ ...s, lang: null }, "lang");
    case "region_list":
      return enter(s, "region");
    case "group":
      return enter(s, "region");
    case "crop":
      return enter({ ...s, groupId: null }, "group");
    case "ago":
      return enter({ ...s, cropId: null }, "crop");
    case "plan":
      return enter({ ...s, ago: undefined }, "ago");
    case "detail":
      return enter(s, "again");
    case "again":
      return enter({ ...s, groupId: null, cropId: null, ago: undefined }, "group");
    default:
      return { state: s, say: ask(s), end: false };
  }
}

function invalid(s: CallState): StepResult {
  return { state: { ...s, silences: 0 }, say: [...inLang("invalid", s), ...ask(s)], end: false };
}

const digitIndex = (k: Key): number => (/^[1-9]$/.test(k) ? Number(k) - 1 : -1);

function onKey(s0: CallState, key: Key): StepResult {
  const s: CallState = { ...s0, silences: 0 };
  if (s.node === "ended") return { state: s, say: [], end: true };
  if (key === "0") return { state: s, say: ask(s), end: false };
  if (key === "*") return back(s);
  const i = digitIndex(key);

  switch (s.node) {
    case "lang":
      if (key === "1") return enter({ ...s, lang: "fr" }, "region");
      if (key === "2") return enter({ ...s, lang: "ar" }, "region");
      return invalid(s);
    case "region":
      if (key === "1") return enter({ ...s, regionId: DEFAULT_REGION }, "group");
      if (key === "2") return enter(s, "region_list");
      return invalid(s);
    case "region_list":
      if (i >= 0 && i < OTHER_REGIONS.length) return enter({ ...s, regionId: OTHER_REGIONS[i] }, "group");
      return invalid(s);
    case "group":
      if (i >= 0 && i < GROUPS.length) return enter({ ...s, groupId: GROUPS[i].id }, "crop");
      return invalid(s);
    case "crop": {
      const crops = GROUPS.find((g) => g.id === s.groupId)?.crops ?? [];
      if (i >= 0 && i < crops.length) return enter({ ...s, cropId: crops[i] }, "ago");
      return invalid(s);
    }
    case "ago": {
      const choice = AGO_CHOICES.find((c) => c.key === key);
      if (choice) return enter({ ...s, ago: choice.ago }, "plan");
      return invalid(s);
    }
    case "plan":
    case "detail":
      // un appui pendant la lecture coupe le plan et passe au menu de fin
      return enter(s, "again");
    case "again":
      if (key === "1") return enter({ ...s, groupId: null, cropId: null, ago: undefined }, "group");
      if (key === "2") return finish(s, "bye");
      if (key === "3") return enter(s, "detail");
      return invalid(s);
  }
}

export function step(state: CallState, event: CallEvent): StepResult {
  if (state.node === "ended") return { state, say: [], end: true };
  switch (event.type) {
    case "key":
      return onKey(state, event.key);
    case "silence": {
      if (state.node === "plan" || state.node === "detail") return { state, say: [], end: false };
      const silences = state.silences + 1;
      if (silences >= 2) return finish({ ...state, silences }, "bye");
      return { state: { ...state, silences }, say: ask(state), end: false };
    }
    case "tick": {
      const elapsedMs = state.elapsedMs + event.ms;
      if (elapsedMs >= MAX_CALL_MS) return finish({ ...state, elapsedMs }, "timeout");
      return { state: { ...state, elapsedMs }, say: [], end: false };
    }
    case "played":
      if (state.node === "plan" || state.node === "detail") return enter(state, "again");
      return { state, say: [], end: false };
    case "hangup":
      return { state: { ...state, node: "ended" }, say: [], end: true };
  }
}

// ---------- validation d'un état reçu de l'extérieur (POST /api/ivr/step) ----------

const NODES: NodeId[] = ["lang", "region", "region_list", "group", "crop", "ago", "plan", "detail", "again", "ended"];

export function parseState(x: unknown): CallState | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const lang = o.lang === "fr" || o.lang === "ar" ? o.lang : o.lang === null ? null : undefined;
  if (lang === undefined) return null;
  if (typeof o.node !== "string" || !NODES.includes(o.node as NodeId)) return null;
  if (typeof o.regionId !== "string" || ![DEFAULT_REGION, ...OTHER_REGIONS].includes(o.regionId)) return null;
  const groupId = o.groupId === null ? null : GROUPS.find((g) => g.id === o.groupId)?.id;
  if (groupId === undefined) return null;
  const allCrops = GROUPS.flatMap((g) => g.crops);
  if (o.cropId !== null && (typeof o.cropId !== "string" || !allCrops.includes(o.cropId))) return null;
  if (o.ago !== undefined && o.ago !== null && !AGO_CHOICES.some((c) => c.ago === o.ago)) return null;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e9 ? v : null);
  const elapsedMs = num(o.elapsedMs);
  const silences = num(o.silences);
  const plansHeard = num(o.plansHeard);
  if (elapsedMs === null || silences === null || plansHeard === null || typeof o.helpGiven !== "boolean") return null;
  return {
    node: o.node as NodeId,
    lang,
    regionId: o.regionId,
    groupId,
    cropId: o.cropId as string | null,
    ago: o.ago as number | null | undefined,
    elapsedMs,
    silences,
    helpGiven: o.helpGiven,
    plansHeard,
  };
}
