// Bandeau de données affiché sous l'avatar : tout vient du plan, rien n'est écrit à la main.

import type { Plan } from "../plan";
import type { VoiceLang } from "./langs";

export type Band = {
  regionId: string;
  cropId: string;
  date: string; // date du plan (« aujourd'hui », ou la date rejouée)
  replay: boolean;
  outOfSeason: boolean;
  rainMm: number;
  tmaxMax: number | null;
  stressRisk: Plan["summary"]["stressRisk"];
  next: { date: string; m3PerHa: number; litersPerTree?: number } | null;
  // garde-fou « pas sûr » : à afficher en évidence ; level "none" = aucun conseil donné
  confidence: Plan["confidence"];
  // jours dont la pluie vient de signalements d'agriculteurs (pas du modèle) : « signalé », jamais « mesuré »
  localReports?: NonNullable<Plan["localReports"]>;
};

export function bandFromPlan(plan: Plan): Band {
  const first = plan.days.find((d) => d.action === "irriguer");
  const none = plan.confidence.level === "none"; // aucun conseil : on n'affiche aucun chiffre du plan
  return {
    regionId: plan.regionId,
    cropId: plan.cropId,
    date: plan.today,
    replay: plan.replay,
    outOfSeason: plan.status === "hors_vegetation",
    rainMm: none ? 0 : plan.summary.rainExpectedMm,
    tmaxMax: !none && Number.isFinite(plan.summary.tmaxMax) ? plan.summary.tmaxMax : null,
    stressRisk: plan.summary.stressRisk,
    next: !none && first && plan.status === "ok" ? { date: first.date, m3PerHa: first.m3PerHa, litersPerTree: first.litersPerTree } : null,
    confidence: plan.confidence,
    localReports: none || !plan.localReports?.length ? undefined : plan.localReports,
  };
}

// Forme commune d'un bulletin servi à la page (route, démos enregistrées).
export type BulletinPayload = {
  lines: { id: string; text: string; en: string; startMs: number; endMs: number }[];
  audioBase64?: string;
  audioUrl?: string; // pour les démos : fichier statique
  mime: string;
  generatedAt: string;
  lang: VoiceLang;
  band: Band;
  source: "live" | "cache" | "demo";
  // paramètres du plan utilisés (écho, pour que la page vérifie que la voix correspond à l'écran)
  soil?: string;
  system?: string;
  planting?: string;
  // vrai quand les signalements de pluie affichés sont fictifs (démonstration) : la page doit le dire
  reportsFictional?: boolean;
  voiceName?: string;
  voiceValidated?: boolean;
};
