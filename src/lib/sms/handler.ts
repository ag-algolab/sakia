// Cœur du service SMS : un message entrant { from, text } -> une réponse { reply }.
// C'est la seule logique : la route HTTP (src/app/api/sms/incoming) et, plus tard, l'adaptateur d'un vrai fournisseur
// ne font que lui passer (from, text) et renvoyer `reply`.
//
// État de la conversation : en mémoire du serveur, par identifiant `from`, sans aucun stockage durable.
// Il contient seulement la langue, la dernière culture / région, le jour du dernier arrosage dit par la personne et l'étape
// de menu ; il expire après 6 h d'inactivité, STOP l'efface tout de suite. Sur un hébergement sans mémoire partagée (plusieurs
// instances), il peut repartir de zéro : un message complet (« olivier kairouan hier ») marche toujours.
//
// Dernier arrosage : le moteur ne peut pas être sûr sans lui (« pas sûr : demandez au technicien »). Par SMS, la personne le dit
// dans le message (« olivier kairouan hier », « 3j ») ou répond à la question posée dans le SMS du plan (un chiffre de 1 à 4,
// mêmes tranches que la ligne vocale). Il ne vaut que pour la culture et la région en cours : en changer l'oublie, comme sur Telegram.

import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { AGO_CHOICES } from "@/lib/ivr/menu";
import { buildPlan } from "@/lib/plan";
import type { Plan } from "@/lib/plan";
import { planSms } from "@/lib/messages";
import type { Lang } from "@/lib/messages";
import { fitGsm } from "./encoding";
import { latinLangOf, parseSms, scriptOf, MAX_INPUT } from "./parse";
import { R, askCrop, askRegion, askWhichCrop } from "./replies";
import { addDays } from "@/lib/planCore";
import { todayInTunisia } from "@/lib/weather";

type Menu = "main" | "lang" | "ago"; // « ago » : la réponse attendue est un chiffre de 1 à 4 (dernier arrosage)

type Session = {
  lang: Lang;
  langExplicit: boolean; // vrai dès que la personne a choisi sa langue (LANGUE ou menu)
  cropId?: string;
  regionId?: string;
  irrigatedOn?: string; // AAAA-MM-JJ (Tunisie) : jour du dernier arrosage, dit par la personne pour cette culture et cette région
  menu?: Menu;
  lastSeen: number;
};

const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_SESSIONS = 2000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 20; // messages par minute et par expéditeur
const RATE_MAX_ALL = 600; // messages par minute, tous expéditeurs confondus (changer de `from` ne contourne pas la limite)

const sessions = new Map<string, Session>();
const rate = new Map<string, number[]>(); // expéditeur -> horaires des derniers messages (séparé de la session : STOP ne le remet pas à zéro)
let allHits: number[] = [];

// L'identifiant n'est qu'une clé de mémoire : n'importe quel texte court convient (numéro, « whatsapp:+... », identifiant du bot).
function cleanFrom(from: unknown): string {
  const s = typeof from === "string" ? from.trim().slice(0, 64) : "";
  return s || "anonymous";
}

// La session n'est gardée que si elle contient quelque chose à retenir : un message sans suite (aide, inconnu) ne remplit pas la mémoire.
const hasState = (s: Session) => s.langExplicit || s.lang !== "en" || !!s.cropId || !!s.regionId || !!s.irrigatedOn || !!s.menu;

function loadSession(from: string, now: number): Session {
  for (const [k, s] of sessions) if (now - s.lastSeen > SESSION_TTL_MS) sessions.delete(k);
  const kept = sessions.get(from);
  return kept ? { ...kept, lastSeen: now } : { lang: "en", langExplicit: false, lastSeen: now }; // anglais d'abord : le jury lit l'anglais
}

function saveSession(from: string, s: Session) {
  sessions.delete(from); // remis en fin de liste : l'ordre de la Map suit l'ancienneté
  if (!hasState(s)) return;
  if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value as string); // le plus ancien
  sessions.set(from, s);
}

function rateLimited(from: string, now: number): boolean {
  allHits = allHits.filter((t) => now - t < RATE_WINDOW_MS);
  const mine = (rate.get(from) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (allHits.length >= RATE_MAX_ALL || mine.length >= RATE_MAX) {
    rate.set(from, mine);
    return true;
  }
  mine.push(now);
  rate.set(from, mine);
  allHits.push(now);
  if (rate.size > 5000) for (const [k, v] of rate) if (!v.some((t) => now - t < RATE_WINDOW_MS)) rate.delete(k);
  return false;
}

export function resetSmsSessions() {
  sessions.clear();
  rate.clear();
  allHits = [];
}

// ---------- plan, avec un petit cache pour ne pas interroger la météo à chaque SMS ----------

// `ago` : jours écoulés depuis le dernier arrosage (0 à 7), ou absent quand la personne ne l'a pas dit.
export type PlanSource = (regionId: string, cropId: string, ago?: number) => Promise<Plan>;

const PLAN_TTL_MS = 10 * 60 * 1000;
const planCache = new Map<string, { at: number; plan: Plan }>();

export const defaultPlanSource: PlanSource = async (regionId, cropId, ago) => {
  const key = `${regionId}|${cropId}|${ago ?? "?"}`;
  const hit = planCache.get(key);
  if (hit && Date.now() - hit.at < PLAN_TTL_MS) return hit.plan;
  const plan = await buildPlan({ regionId, cropId, lastIrrigationDaysAgo: ago });
  if (planCache.size > 200) planCache.clear();
  planCache.set(key, { at: Date.now(), plan });
  return plan;
};

// ---------- réponse ----------

// Français / anglais : toujours ramené à l'alphabet GSM et à 160 caractères au plus. Arabe : tel quel (70 par SMS).
function finish(text: string, lang: Lang): string {
  if (lang === "ar" || /[؀-ۿ]/.test(text)) return text; // le choix de langue montre aussi l'arabe : on ne le convertit pas
  return fitGsm(text, 160);
}

// Jours écoulés depuis le dernier arrosage dit par la personne (0 à 7, plafond du moteur), ou undefined si elle ne l'a pas dit.
// Calculé à chaque demande depuis le JOUR de l'arrosage : « aujourd'hui » dit à 23 h vaut « hier » à 1 h.
function agoOf(s: Session): number | undefined {
  if (!s.irrigatedOn) return undefined;
  const days = Math.round((Date.parse(todayInTunisia()) - Date.parse(s.irrigatedOn)) / 86400000);
  return Math.min(7, Math.max(0, days));
}

// `askAgo` : poser la question « dernier arrosage ? » quand le moteur en a besoin. Faux seulement quand la personne vient de
// répondre « je ne sais pas » (9) : on lui donne le plan avec son avertissement, sans la questionner de nouveau.
async function planReply(s: Session, getPlan: PlanSource, askAgo = true): Promise<string> {
  if (!s.cropId && !s.regionId) return R.askBoth[s.lang];
  if (!s.regionId) return askRegion(s.cropId!, s.lang);
  if (!s.cropId) return askCrop(s.regionId, s.lang);
  try {
    const plan = await getPlan(s.regionId, s.cropId, agoOf(s));
    const ask = askAgo && plan.confidence.level !== "none" && plan.confidence.reasons.includes("unknown_last_irrigation");
    if (ask) s.menu = "ago"; // le prochain chiffre (1 à 4) répond à la question
    return planSms(plan, s.lang, { askAgo: ask });
  } catch {
    return R.unavailable[s.lang]; // la météo ne répond pas : on ne montre pas l'erreur technique
  }
}

export async function handleIncoming(input: { from?: unknown; text?: unknown }, getPlan: PlanSource = defaultPlanSource): Promise<{ reply: string }> {
  const now = Date.now();
  const from = cleanFrom(input.from);
  const s = loadSession(from, now);
  const text = typeof input.text === "string" ? input.text : "";

  if (text.length > MAX_INPUT) return { reply: finish(R.tooLong[s.lang], s.lang) };
  const parsed = parseSms(text);

  // STOP passe avant la limite de débit : on peut toujours effacer ses réglages.
  if (parsed.kind === "stop") {
    sessions.delete(from);
    return { reply: finish(R.stopped[s.lang], s.lang) };
  }
  if (rateLimited(from, now)) return { reply: finish(R.tooMany[s.lang], s.lang) };

  const menu = s.menu;
  s.menu = undefined;

  // Tant que la personne n'a pas choisi de langue, on répond dans celle de son message : arabe s'il est écrit en arabe, français ou
  // anglais d'après ses mots ; sinon (arabizi, chiffre, nom de région) la conversation garde sa langue, l'anglais au départ.
  if (!s.langExplicit) {
    const guess = scriptOf(text) === "arabic" ? "ar" : latinLangOf(text);
    if (guess) s.lang = guess;
  }

  let reply: string;
  switch (parsed.kind) {
    case "ussd": {
      if (parsed.option === 1) reply = await planReply(s, getPlan);
      else if (parsed.option === 2) reply = R.askBoth[s.lang];
      else if (parsed.option === 3) {
        s.menu = "lang";
        reply = R.langMenu[s.lang];
      } else if (parsed.option === undefined) {
        s.menu = "main";
        reply = R.menu[s.lang];
      } else reply = R.ussdUnknown[s.lang];
      break;
    }
    case "choice": {
      if (menu === "ago") {
        // réponse à « dernier arrosage ? » : 1 aujourd'hui, 2 hier ou avant-hier, 3 il y a 3 à 5 jours, 4 plus de 5 jours (9 : je ne sais pas)
        const pick = AGO_CHOICES.find((c) => c.key === String(parsed.n));
        if (!pick) {
          s.menu = "ago";
          reply = R.askAgo[s.lang]; // un autre chiffre : on repose la question
        } else if (pick.ago === null) {
          reply = await planReply(s, getPlan, false);
        } else {
          s.irrigatedOn = addDays(todayInTunisia(), -pick.ago);
          reply = await planReply(s, getPlan);
        }
      } else if (menu === "main" && parsed.n === 1) reply = await planReply(s, getPlan);
      else if (menu === "main" && parsed.n === 2) reply = R.askBoth[s.lang];
      else if (menu === "main" && parsed.n === 3) {
        s.menu = "lang";
        reply = R.langMenu[s.lang];
      } else if (menu === "lang" && parsed.n >= 1 && parsed.n <= 3) {
        s.lang = (["en", "ar", "fr"] as const)[parsed.n - 1]; // même ordre que R.langMenu : anglais, arabe, français
        s.langExplicit = true;
        reply = R.langSet[s.lang];
      } else reply = R.unknown[s.lang];
      break;
    }
    case "help":
      reply = R.help[s.lang];
      break;
    case "language":
      if (parsed.lang) {
        s.lang = parsed.lang;
        s.langExplicit = true;
        reply = R.langSet[s.lang];
      } else {
        s.menu = "lang";
        reply = R.langMenu[s.lang];
      }
      break;
    case "plan": {
      if (parsed.ambiguousCrops) {
        if (parsed.regionId) s.regionId = parsed.regionId;
        reply = askWhichCrop(parsed.ambiguousCrops, s.lang);
        break;
      }
      const cropId = parsed.cropId && getCrop(parsed.cropId) ? parsed.cropId : undefined;
      const regionId = parsed.regionId && getRegion(parsed.regionId) ? parsed.regionId : undefined;
      // un autre champ (autre culture ou autre région) : le dernier arrosage dit plus tôt ne vaut plus pour lui
      if ((cropId && s.cropId && cropId !== s.cropId) || (regionId && s.regionId && regionId !== s.regionId)) s.irrigatedOn = undefined;
      if (cropId) s.cropId = cropId;
      if (regionId) s.regionId = regionId;
      if (parsed.ago !== undefined) s.irrigatedOn = addDays(todayInTunisia(), -parsed.ago); // « olivier kairouan hier »
      reply = await planReply(s, getPlan);
      break;
    }
    case "ago": {
      // seulement « hier », « 3j »... : il faut déjà savoir de quelle culture et de quelle région on parle
      if (!s.cropId || !s.regionId) {
        reply = R.askBoth[s.lang];
        break;
      }
      s.irrigatedOn = addDays(todayInTunisia(), -parsed.days);
      reply = await planReply(s, getPlan);
      break;
    }
    default:
      reply = R.unknown[s.lang];
  }
  saveSession(from, s);
  return { reply: finish(reply, s.lang) };
}
