// GET /api/voice/bulletin?region=kairouan&crop=olivier&lang=fr|ar|aeb|en|ko[&soil=][&system=][&planting=][&ago=0..7][&asOf=AAAA-MM-JJ]
// Renvoie { lines, audioBase64, mime, generatedAt, ... }. Utilise le cache : le même texte n'est jamais
// synthétisé deux fois, et le budget de crédits plafonne toute génération (503 au-delà, la page bascule alors
// sur un bulletin enregistré).
//
// Les paramètres du plan (region, crop, soil, system, planting, ago, asOf) sont lus et validés comme dans /api/plan et
// passés au même buildPlan : le texte lu vient donc du même plan que celui affiché à l'écran. Sol, système et date de
// semis entrent aussi dans la clé de cache ; quand sol ou système sont donnés, la voix les nomme.

import { buildPlan } from "@/lib/plan";
import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";
import { BudgetError, synthesizeBulletinMeta } from "@/lib/voice";
import { isVoiceLang } from "@/lib/voice/langs";
import { bandFromPlan } from "@/lib/voice/band";
import type { BulletinPayload } from "@/lib/voice/band";
import { SELECTED_VOICE } from "@/lib/voice/voices";

export const dynamic = "force-dynamic";

// mêmes listes que /api/plan
const SOILS = ["sableux", "limoneux", "argileux"];
const SYSTEMS = ["goutte", "aspersion", "gravitaire"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const regionId = q.get("region") ?? "kairouan";
  const cropId = q.get("crop") ?? "olivier";
  const lang = q.get("lang") ?? "fr";
  if (!getRegion(regionId)) return Response.json({ error: `région inconnue : ${regionId}` }, { status: 400 });
  if (!getCrop(cropId)) return Response.json({ error: `culture inconnue : ${cropId}` }, { status: 400 });
  if (!isVoiceLang(lang)) return Response.json({ error: "lang : fr, ar, aeb, en ou ko" }, { status: 400 });

  // une valeur invalide est ignorée (valeur par défaut du moteur), comme dans /api/plan
  const soilRaw = q.get("soil");
  const systemRaw = q.get("system");
  const soil = soilRaw && SOILS.includes(soilRaw) ? (soilRaw as SoilName) : undefined;
  const system = systemRaw && SYSTEMS.includes(systemRaw) ? (systemRaw as IrrigationSystem) : undefined;
  const planting = DATE.test(q.get("planting") ?? "") ? (q.get("planting") as string) : undefined;
  const asOf = DATE.test(q.get("asOf") ?? "") ? (q.get("asOf") as string) : undefined;
  const ago = q.get("ago"); // dernier arrosage il y a N jours : comme /api/plan, le moteur borne la valeur

  let plan;
  try {
    plan = await buildPlan({
      regionId,
      cropId,
      soil,
      system,
      planting,
      asOf,
      lastIrrigationDaysAgo: ago != null && ago !== "" ? Number(ago) : undefined,
    });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
  try {
    const r = await synthesizeBulletinMeta(plan, lang, { soil, system, planting });
    const body: BulletinPayload = {
      lines: r.lines,
      audioBase64: r.audio.toString("base64"),
      mime: r.mime,
      generatedAt: r.generatedAt,
      lang,
      band: bandFromPlan(plan),
      source: r.source,
      soil: soil ?? "limoneux", // valeurs réellement utilisées par le moteur (défauts compris)
      system: system ?? "goutte",
      planting,
      voiceName: SELECTED_VOICE.name,
    };
    return Response.json(body);
  } catch (e) {
    const status = e instanceof BudgetError ? 503 : 502;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
