// Rapports de pluie des agriculteurs : la solidarité locale corrige la météo de maille.
// Un agriculteur signale « il a plu X mm ici ». Quand au moins MIN_REPORTERS personnes différentes signalent
// la même journée dans la même région, la médiane remplace la pluie du modèle pour cette journée.
// Garde-fous : valeurs plausibles (0 à 150 mm), un seul rapport par personne, par région et par jour,
// médiane (un seul faux rapport ne change rien), aucun nom, aucune adresse IP stockée.
// SERVEUR SEULEMENT (utilise la clé secrète de Supabase) ; la table est décrite dans docs/supabase.sql.

import { createHash } from "node:crypto";
import type { Day, LocalReport } from "./weather";

export type { LocalReport };

export const MIN_REPORTERS = 2;
export const MAX_MM = 150;

export type ReportRow = { day: string; mm: number; reporter_hash: string };

function base(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

// Identifiant anonyme : empreinte salée (jamais l'identifiant lui-même, jamais l'adresse IP).
export function reporterHash(token: string): string {
  const pepper = process.env.CRON_SECRET ?? "sakia";
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex").slice(0, 32);
}

export function validDay(day: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const d = Date.parse(day);
  const t = Date.parse(today);
  return Number.isFinite(d) && d <= t && t - d <= 3 * 86400000;
}

export function validMm(mm: unknown): mm is number {
  return typeof mm === "number" && Number.isFinite(mm) && mm >= 0 && mm <= MAX_MM;
}

export async function saveReport(regionId: string, day: string, mm: number, reporterToken: string): Promise<boolean> {
  const b = base();
  if (!b) return false;
  const res = await fetch(`${b.url}/rest/v1/rain_reports?on_conflict=region_id,day,reporter_hash`, {
    method: "POST",
    headers: {
      apikey: b.key,
      Authorization: `Bearer ${b.key}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ region_id: regionId, day, mm: Math.round(mm * 10) / 10, reporter_hash: reporterHash(reporterToken) }),
  });
  return res.ok;
}

const memo = new Map<string, { at: number; rows: ReportRow[] }>();

// Rapports des derniers jours pour une région. Silencieux en cas de panne : la météo du modèle reste utilisée.
export async function loadReports(regionId: string, sinceDay: string): Promise<ReportRow[]> {
  const b = base();
  if (!b) return [];
  const k = `${regionId}|${sinceDay}`;
  const hit = memo.get(k);
  if (hit && Date.now() - hit.at < 60_000) return hit.rows;
  try {
    const res = await fetch(
      `${b.url}/rest/v1/rain_reports?select=day,mm,reporter_hash&region_id=eq.${encodeURIComponent(regionId)}&day=gte.${sinceDay}&order=day.asc`,
      { headers: { apikey: b.key, Authorization: `Bearer ${b.key}` }, signal: AbortSignal.timeout(1500) },
    );
    if (!res.ok) return [];
    const rows = ((await res.json()) as ReportRow[]).map((r) => ({ day: r.day, mm: Number(r.mm), reporter_hash: r.reporter_hash }));
    memo.set(k, { at: Date.now(), rows });
    return rows;
  } catch {
    return [];
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export type DaySummary = { date: string; n: number; medianMm: number };

export function summarize(rows: ReportRow[]): DaySummary[] {
  const byDay = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!validMm(r.mm)) continue;
    const people = byDay.get(r.day) ?? new Map<string, number>();
    people.set(r.reporter_hash, r.mm); // un seul rapport par personne
    byDay.set(r.day, people);
  }
  return [...byDay.entries()].map(([date, p]) => ({ date, n: p.size, medianMm: median([...p.values()]) }));
}

// Remplace la pluie du modèle par la médiane des signalements quand assez de personnes concordent.
export function applyReports(days: Day[], summary: DaySummary[]): { days: Day[]; applied: LocalReport[] } {
  const by = new Map(summary.filter((s) => s.n >= MIN_REPORTERS).map((s) => [s.date, s]));
  const applied: LocalReport[] = [];
  const out = days.map((d) => {
    const s = by.get(d.date);
    if (!s) return d;
    applied.push({ date: d.date, medianMm: s.medianMm, n: s.n, modelMm: d.rain });
    return { ...d, rain: s.medianMm };
  });
  return { days: out, applied };
}
