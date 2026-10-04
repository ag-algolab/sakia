// Lecture et validation des paramètres des routes /api/ivr/plan et /api/ivr/plan-audio.
// ?region=kairouan&crop=olivier&lang=en|fr|ar&ago=0..7|u[&asOf=AAAA-MM-JJ][&detail=1]   (lang absent = anglais ; ago absent ou « u » =
// dernier arrosage inconnu → « pas sûr » ; detail=1 = le détail de la semaine)

import { getCrop } from "../crops";
import { getRegion } from "../regions";
import { DEFAULT_LANG, isIvrLang } from "./menu";
import type { IvrLang } from "./menu";

export type PlanQuery = { regionId: string; cropId: string; lang: IvrLang; ago: number | null; asOf?: string; detail: boolean };

export function parsePlanQuery(url: string): { ok: true; q: PlanQuery } | { ok: false; error: string } {
  const p = new URL(url).searchParams;
  const regionId = p.get("region") ?? "kairouan";
  const cropId = p.get("crop") ?? "olivier";
  const lang = p.get("lang") ?? DEFAULT_LANG;
  if (!getRegion(regionId)) return { ok: false, error: `région inconnue : ${regionId}` };
  if (!getCrop(cropId)) return { ok: false, error: `culture inconnue : ${cropId}` };
  if (!isIvrLang(lang)) return { ok: false, error: "lang : en, fr ou ar" };
  const agoRaw = p.get("ago");
  if (agoRaw != null && agoRaw !== "u" && !/^[0-7]$/.test(agoRaw)) return { ok: false, error: "ago : 0 à 7, ou u (inconnu)" };
  const ago = agoRaw == null || agoRaw === "u" ? null : Number(agoRaw);
  const asOfRaw = p.get("asOf") ?? "";
  if (asOfRaw && !/^\d{4}-\d{2}-\d{2}$/.test(asOfRaw)) return { ok: false, error: "asOf : AAAA-MM-JJ" };
  return { ok: true, q: { regionId, cropId, lang, ago, asOf: asOfRaw || undefined, detail: p.get("detail") === "1" } };
}

// Limite simple par adresse (en mémoire, par instance) : chaque lecture non gardée en cache coûte des crédits vocaux.
const hits = new Map<string, number[]>();
export function tooMany(ip: string, perMinute = 20): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > perMinute;
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0].trim() : request.headers.get("x-real-ip")) || "local";
}
