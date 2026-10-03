// Cœur du service SMS : un message entrant { from, text } -> une réponse { reply }.
// C'est la seule logique : la route HTTP (src/app/api/sms/incoming) et, plus tard, l'adaptateur d'un vrai fournisseur
// ne font que lui passer (from, text) et renvoyer `reply`.
//
// État de la conversation : en mémoire du serveur, par identifiant `from`, sans aucun stockage durable.
// Il contient seulement la langue, la dernière culture / région et l'étape de menu ; il expire après 6 h d'inactivité,
// STOP l'efface tout de suite. Sur un hébergement sans mémoire partagée (plusieurs instances), il peut repartir de zéro :
// un message complet (« olivier kairouan ») marche toujours.

import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { buildPlan } from "@/lib/plan";
import type { Plan } from "@/lib/plan";
import { planSms } from "@/lib/messages";
import type { Lang } from "@/lib/messages";
import { fitGsm } from "./encoding";
import { parseSms, scriptOf, MAX_INPUT } from "./parse";
import { R, askCrop, askRegion, askWhichCrop } from "./replies";

type Menu = "main" | "lang";

type Session = {
  lang: Lang;
  langExplicit: boolean; // vrai dès que la personne a choisi sa langue (LANGUE ou menu)
  cropId?: string;
  regionId?: string;
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
const hasState = (s: Session) => s.langExplicit || s.lang !== "fr" || !!s.cropId || !!s.regionId || !!s.menu;

function loadSession(from: string, now: number): Session {
  for (const [k, s] of sessions) if (now - s.lastSeen > SESSION_TTL_MS) sessions.delete(k);
  const kept = sessions.get(from);
  return kept ? { ...kept, lastSeen: now } : { lang: "fr", langExplicit: false, lastSeen: now };
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

export type PlanSource = (regionId: string, cropId: string) => Promise<Plan>;

const PLAN_TTL_MS = 10 * 60 * 1000;
const planCache = new Map<string, { at: number; plan: Plan }>();

export const defaultPlanSource: PlanSource = async (regionId, cropId) => {
  const key = `${regionId}|${cropId}`;
  const hit = planCache.get(key);
  if (hit && Date.now() - hit.at < PLAN_TTL_MS) return hit.plan;
  const plan = await buildPlan({ regionId, cropId });
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

async function planReply(s: Session, getPlan: PlanSource): Promise<string> {
  if (!s.cropId && !s.regionId) return R.askBoth[s.lang];
  if (!s.regionId) return askRegion(s.cropId!, s.lang);
  if (!s.cropId) return askCrop(s.regionId, s.lang);
  try {
    return planSms(await getPlan(s.regionId, s.cropId), s.lang);
  } catch {
    return R.unavailable[s.lang]; // la météo ne répond pas : on ne montre pas l'erreur technique
  }
}

export async function handleIncoming(
  input: { from?: unknown; text?: unknown },
  getPlan: PlanSource = defaultPlanSource,
): Promise<{ reply: string }> {
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

  // Quelqu'un qui écrit seulement en arabe et n'a pas choisi de langue reçoit la réponse en arabe.
  if (!s.langExplicit && scriptOf(text) === "arabic") s.lang = "ar";

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
      if (menu === "main" && parsed.n === 1) reply = await planReply(s, getPlan);
      else if (menu === "main" && parsed.n === 2) reply = R.askBoth[s.lang];
      else if (menu === "main" && parsed.n === 3) {
        s.menu = "lang";
        reply = R.langMenu[s.lang];
      } else if (menu === "lang" && parsed.n >= 1 && parsed.n <= 3) {
        s.lang = (["fr", "ar", "en"] as const)[parsed.n - 1];
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
      if (parsed.cropId && getCrop(parsed.cropId)) s.cropId = parsed.cropId;
      if (parsed.regionId && getRegion(parsed.regionId)) s.regionId = parsed.regionId;
      reply = await planReply(s, getPlan);
      break;
    }
    default:
      reply = R.unknown[s.lang];
  }
  saveSession(from, s);
  return { reply: finish(reply, s.lang) };
}
