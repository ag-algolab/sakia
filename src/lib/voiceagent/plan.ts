// L'outil get_irrigation_plan de l'agent vocal : c'est le MÊME moteur et les mêmes phrases que la ligne à touches.
// L'agent comprend la demande puis lit `spoken_text` mot pour mot ; il n'écrit jamais lui-même un chiffre.
// SERVEUR SEULEMENT (météo Open-Meteo).

import { getCrop } from "../crops";
import { promptEn, promptText } from "../ivr/prompts";
import { ivrPlanText } from "../ivr/script";
import { buildPlan } from "../plan";
import { getRegion } from "../regions";
import { REFUSAL } from "./prompt";

export type AgentPlanResult = {
  ok: boolean;
  spoken_text: string; // à lire tel quel
  english_text: string; // pour les sous-titres du jury
  ask_a_person: boolean; // le moteur n'est pas sûr (la phrase « demandez à une personne » est déjà dans spoken_text)
  confidence: "ok" | "low" | "none";
  region_id: string;
  crop_id: string;
  last_irrigation_days_ago: number | null;
  language: "en" | "fr" | "ar";
  plan_date?: string;
  error?: "unknown_crop" | "unknown_region" | "plan_unavailable";
};

export type AgentPlanInput = { region?: unknown; crop?: unknown; ago?: unknown; lang?: unknown };

// Un entier de 0 à 7, ou null (inconnu). Une valeur absurde est traitée comme « inconnu » : le moteur dira « pas sûr ».
export function parseAgo(x: unknown): number | null {
  if (x === null || x === undefined || x === "" || x === "u") return null;
  const n = typeof x === "number" ? x : Number(x);
  if (!Number.isFinite(n)) return null;
  return Math.min(7, Math.max(0, Math.round(n)));
}

export async function agentPlan(input: AgentPlanInput): Promise<AgentPlanResult> {
  // anglais par défaut (décision d'Anthony, 4 oct. : le jury est anglophone) ; l'arabe et le français quand la personne les parle
  const language: "en" | "fr" | "ar" = input.lang === "ar" ? "ar" : input.lang === "fr" ? "fr" : "en";
  const regionId = typeof input.region === "string" ? input.region : "kairouan";
  const cropId = typeof input.crop === "string" ? input.crop : "";
  const ago = parseAgo(input.ago);
  const base = { region_id: regionId, crop_id: cropId, last_irrigation_days_ago: ago, language };

  if (!getCrop(cropId)) {
    return { ...base, ok: false, spoken_text: REFUSAL[language], english_text: REFUSAL.en, ask_a_person: true, confidence: "none", error: "unknown_crop" };
  }
  if (!getRegion(regionId)) {
    return { ...base, ok: false, spoken_text: REFUSAL[language], english_text: REFUSAL.en, ask_a_person: true, confidence: "none", error: "unknown_region" };
  }
  try {
    const plan = await buildPlan({ regionId, cropId, lastIrrigationDaysAgo: ago ?? undefined });
    return {
      ...base,
      ok: true,
      spoken_text: ivrPlanText(plan, language),
      english_text: ivrPlanText(plan, "en"),
      ask_a_person: plan.confidence.askAPerson,
      confidence: plan.confidence.level,
      plan_date: plan.today,
    };
  } catch {
    // météo injoignable : l'agent dit « pas sûr, demandez à une personne » plutôt que de deviner
    return {
      ...base,
      ok: false,
      spoken_text: promptText("unsure", language),
      english_text: promptEn("unsure", language),
      ask_a_person: true,
      confidence: "none",
      error: "plan_unavailable",
    };
  }
}
