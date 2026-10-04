// Données du film. Le conseil montré dans la scène « réponse » n'est pas dessiné à la main : il est demandé au moteur de
// ce site à l'ouverture de la page (GET /api/plan), puis les textes (SMS, Telegram, voix en darija) sont fabriqués par
// les mêmes fonctions que celles qui servent les vrais canaux. Si le réseau manque, on affiche une copie du conseil
// du 3 octobre 2026 (sortie réelle du moteur ce jour-là), et le film le dit à l'écran (`live` vaut false).

import { useEffect, useState } from "react";
import { defaultCropForMonth, getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { bulletinScript, planMessage, planSms } from "@/lib/messages";
import { bulletinScriptAeb } from "@/lib/voice/aeb";
import type { Plan, PlanDay } from "@/lib/planCore";

export type Mode = "irrigate" | "wait" | "ask" | "off";

export type ProofRow = { name: string; pct: number };

export type FilmData = {
  live: boolean; // true : conseil calculé à l'ouverture de la page ; false : copie du 3 octobre 2026
  plan: Plan;
  cropEn: string;
  region: string;
  mode: Mode;
  cautious: boolean; // le conseil est donné, mais le moteur dit « pas sûr » (données de plus de 12 h, etc.)
  first?: PlanDay;
  sms: string;
  telegram: string[];
  adviceEn: string;
  adviceAeb: string;
  proof: ProofRow[];
  proofLive: boolean; // true : économies d'eau recalculées par /api/backtest à l'ouverture
};

// ------------------------------------------------------------------ copie du 3 octobre 2026

// [date, ET0 cultural, pluie, tmax, épuisement, action, brut mm, m³/ha]
const SNAP_DAYS: [string, number, number, number, number, PlanDay["action"], number, number][] = [
  ["2026-10-03", 5.1135, 0, 29.7, 19.341, "attendre", 0, 0],
  ["2026-10-04", 4.8615, 0, 29.6, 4.8615, "irriguer", 21.49, 214.9],
  ["2026-10-05", 5.418, 0, 31, 10.2795, "attendre", 0, 0],
  ["2026-10-06", 4.7565, 0, 33.5, 15.036, "attendre", 0, 0],
  ["2026-10-07", 3.927, 0.3, 33.1, 18.963, "attendre", 0, 0],
  ["2026-10-08", 5.901, 0, 34.9, 5.901, "irriguer", 21.07, 210.7],
  ["2026-10-09", 4.473, 0, 28.5, 10.374, "attendre", 0, 0],
];

const SNAPSHOT: Plan = {
  regionId: "kairouan",
  cropId: "piment",
  today: "2026-10-03",
  generatedAt: "2026-10-03T20:15:42.950Z",
  dataFetchedAt: "2026-10-03T19:45:22.532Z",
  dataAgeHours: 0.5,
  status: "ok",
  replay: false,
  confidence: { level: "ok", askAPerson: false, reasons: [], notes: [] },
  days: SNAP_DAYS.map(([date, etc, rain, tmax, dr, action, gross, m3PerHa]) => ({
    date,
    etc,
    rain,
    tmax,
    ks: 1,
    dr,
    raw: 22.5,
    action,
    netMm: action === "irriguer" ? gross * 0.9 : 0,
    grossMm: gross,
    m3PerHa,
    estimated: false,
  })),
  summary: {
    nextIrrigation: "2026-10-04",
    irrigationCount: 2,
    totalGrossMm: 42.56,
    totalM3PerHa: 425.6,
    rainExpectedMm: 0.3,
    tmaxMax: 34.9,
    stressRisk: "faible",
    daysSinceLastIrrigation: 3,
  },
  assumptions: [],
};

// Économies d'eau du backtest (simulation) le 3 octobre 2026, pour les quatre cultures montrées.
const PROOF_IDS: { id: string; name: string }[] = [
  { id: "piment", name: "Pepper" },
  { id: "tomate", name: "Tomato" },
  { id: "olivier", name: "Olive" },
  { id: "ble", name: "Wheat" },
];
const PROOF_SNAPSHOT: ProofRow[] = [
  { name: "Pepper", pct: 3.1 },
  { name: "Tomato", pct: 3.6 },
  { name: "Olive", pct: 24.8 },
  { name: "Wheat", pct: 26.9 },
];

// ------------------------------------------------------------------ fabrication

const lineOf = (lines: { id: string; text: string }[], id: string) => lines.find((l) => l.id === id)?.text ?? "";

export function buildFilmData(plan: Plan, live: boolean, proof: ProofRow[], proofLive: boolean): FilmData {
  const first = plan.days.find((d) => d.action === "irriguer");
  const en = bulletinScript(plan, "en");
  const mode: Mode = plan.confidence.level === "none" ? "ask" : plan.status === "hors_vegetation" ? "off" : first ? "irrigate" : "wait";
  return {
    live,
    plan,
    cropEn: getCrop(plan.cropId)?.nameEn ?? plan.cropId,
    region: getRegion(plan.regionId)?.nameFr ?? plan.regionId,
    mode,
    cautious: plan.confidence.askAPerson && mode !== "ask",
    first,
    sms: planSms(plan, "en"),
    telegram: planMessage(plan, "en").split("\n"),
    // sans conseil possible, le bulletin ne dit que la phrase du garde-fou (pas de ligne « advice »)
    adviceEn: lineOf(en, "advice") || (en[0]?.text ?? ""),
    adviceAeb: mode === "ask" ? "" : lineOf(bulletinScriptAeb(plan), "advice"),
    proof,
    proofLive,
  };
}

export const SNAPSHOT_DATA = buildFilmData(SNAPSHOT, false, PROOF_SNAPSHOT, false);

const dayFmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" });
export const dayShort = (date: string) => dayFmt({ weekday: "short" }).format(new Date(`${date}T00:00:00Z`));
export const dayLong = (date: string) => dayFmt({ weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T00:00:00Z`));

// ------------------------------------------------------------------ chargement

export function useFilmData(enabled = true): FilmData {
  const [data, setData] = useState<FilmData>(SNAPSHOT_DATA);

  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    // Un délai de 15 s par requête, sans AbortSignal.any (absent de Safari avant 17.4).
    const get = async <T,>(url: string): Promise<T | null> => {
      const local = new AbortController();
      const stop = () => local.abort();
      ctrl.signal.addEventListener("abort", stop);
      const timer = window.setTimeout(stop, 15000);
      try {
        const res = await fetch(url, { signal: local.signal });
        return res.ok ? ((await res.json()) as T) : null;
      } catch {
        return null;
      } finally {
        window.clearTimeout(timer);
        ctrl.signal.removeEventListener("abort", stop);
      }
    };

    // Conseil du jour : la culture de saison à Kairouan, « arrosé il y a 3 jours » (comme dans la démonstration).
    const month = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", month: "numeric" }).format(new Date()));
    const cropId = defaultCropForMonth(month);
    void get<Plan>(`/api/plan?region=kairouan&crop=${encodeURIComponent(cropId)}&ago=3`).then((plan) => {
      if (plan && Array.isArray(plan.days) && plan.confidence && !ctrl.signal.aborted) {
        setData((prev) => buildFilmData(plan, true, prev.proof, prev.proofLive));
      }
    });

    // Preuve : le backtest est recalculé pour les quatre cultures montrées.
    void Promise.all(
      PROOF_IDS.map(async ({ id, name }) => {
        const j = await get<{ summary?: { waterSavedPct?: number } }>(`/api/backtest?crop=${id}`);
        const pct = j?.summary?.waterSavedPct;
        return typeof pct === "number" && Number.isFinite(pct) && pct > 0 ? { name, pct } : null;
      }),
    ).then((rows) => {
      if (ctrl.signal.aborted || rows.some((r) => r === null)) return;
      setData((prev) => ({ ...prev, proof: rows as ProofRow[], proofLive: true }));
    });

    return () => ctrl.abort();
  }, [enabled]);

  return data;
}
