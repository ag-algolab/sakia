// Rapports de pluie des agriculteurs : la solidarité locale corrige la météo de maille.
// Personne ne mesure la pluie en millimètres : on demande une ÉCHELLE à cinq degrés (aucune, très légère, légère,
// beaucoup, énormément). Chaque degré vaut une quantité PRUDENTE (le bas de la fourchette) car les deux erreurs
// ne coûtent pas pareil : surestimer la pluie fait sauter une irrigation et la culture souffre, la sous-estimer
// gaspille un peu d'eau. Quand au moins MIN_REPORTERS personnes différentes signalent la même journée dans la
// même région, la médiane PRUDENTE (la plus basse des deux valeurs centrales) remplace la pluie du modèle.
// Garde-fous : un seul rapport par personne, par région et par jour, aucun nom, aucune adresse IP stockée.
// SERVEUR SEULEMENT (utilise la clé secrète de Supabase) ; la table est décrite dans docs/supabase.sql.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Day, LocalReport } from "./weather";

export type { LocalReport };

export const MAX_MM = 150;

import { MIN_REPORTERS, levelFromMm } from "./rainLevels";
import type { RainLevel } from "./rainLevels";

export { LEVEL_LABEL, LEVEL_MM, MIN_REPORTERS, RAIN_LEVELS, isRainLevel, levelFromMm } from "./rainLevels";
export type { RainLevel } from "./rainLevels";

export type ReportRow = { day: string; mm: number; reporter_hash: string; level?: string | null };

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

export async function saveReport(
  regionId: string,
  day: string,
  mm: number,
  reporterToken: string,
  level?: RainLevel,
): Promise<boolean> {
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
    body: JSON.stringify({
      region_id: regionId,
      day,
      mm: Math.round(mm * 10) / 10,
      level: level ?? levelFromMm(mm),
      reporter_hash: reporterHash(reporterToken),
    }),
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
      `${b.url}/rest/v1/rain_reports?select=day,mm,level,reporter_hash&region_id=eq.${encodeURIComponent(regionId)}&day=gte.${sinceDay}&order=day.asc`,
      { headers: { apikey: b.key, Authorization: `Bearer ${b.key}` }, signal: AbortSignal.timeout(1500) },
    );
    if (!res.ok) return [];
    const rows = ((await res.json()) as ReportRow[]).map((r) => ({
      day: r.day,
      mm: Number(r.mm),
      level: r.level ?? null,
      reporter_hash: r.reporter_hash,
    }));
    memo.set(k, { at: Date.now(), rows });
    return rows;
  } catch {
    return [];
  }
}

// Médiane PRUDENTE : si le nombre de valeurs est pair, on prend la plus basse des deux valeurs centrales.
function cautiousMedian(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

export type DaySummary = { date: string; n: number; medianMm: number; level: RainLevel };

export function summarize(rows: ReportRow[]): DaySummary[] {
  const byDay = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!validMm(r.mm)) continue;
    const people = byDay.get(r.day) ?? new Map<string, number>();
    people.set(r.reporter_hash, r.mm); // un seul rapport par personne
    byDay.set(r.day, people);
  }
  return [...byDay.entries()].map(([date, p]) => {
    const medianMm = cautiousMedian([...p.values()]);
    return { date, n: p.size, medianMm, level: levelFromMm(medianMm) };
  });
}

// Remplace la pluie du modèle par la médiane prudente des signalements quand assez de personnes concordent.
export function applyReports(days: Day[], summary: DaySummary[]): { days: Day[]; applied: LocalReport[] } {
  const by = new Map(summary.filter((s) => s.n >= MIN_REPORTERS).map((s) => [s.date, s]));
  const applied: LocalReport[] = [];
  const out = days.map((d) => {
    const s = by.get(d.date);
    if (!s) return d;
    applied.push({ date: d.date, medianMm: s.medianMm, n: s.n, modelMm: d.rain, level: s.level });
    return { ...d, rain: s.medianMm };
  });
  return { days: out, applied };
}

// ---- identité anonyme ÉMISE PAR LE SERVEUR (anti-faux rapports) ----
// Un navigateur ne choisit pas son identité : il la demande (GET /api/reports/token) et le serveur la signe.
// Les canaux serveur (Telegram, SMS simulé, ligne vocale) appellent saveReport directement avec leur propre identifiant.
function tokenKey(): string {
  return process.env.CRON_SECRET ?? "sakia-dev";
}

export function issueReporterToken(): string {
  const id = randomBytes(12).toString("hex");
  const sig = createHmac("sha256", tokenKey()).update(id).digest("hex").slice(0, 16);
  return `${id}.${sig}`;
}

export function verifyReporterToken(token: string): boolean {
  const [id, sig] = token.split(".");
  if (!id || !sig || id.length !== 24) return false;
  const good = createHmac("sha256", tokenKey()).update(id).digest("hex").slice(0, 16);
  const a = Buffer.from(sig);
  const b = Buffer.from(good);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Plafond par adresse et par jour : au plus 10 rapports et 2 identités différentes. Une seule adresse ne peut donc
// jamais atteindre à elle seule le nombre minimal de personnes. (En mémoire, par instance : un frein, pas un mur.)
const ipLog = new Map<string, { day: string; reports: number; reporters: Set<string> }>();
export function ipAllowed(ip: string, reporterKey: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  let e = ipLog.get(ip);
  if (!e || e.day !== today) e = { day: today, reports: 0, reporters: new Set() };
  if (e.reports >= 10 || (!e.reporters.has(reporterKey) && e.reporters.size >= 2)) return false;
  e.reports += 1;
  e.reporters.add(reporterKey);
  ipLog.set(ip, e);
  return true;
}

// Limite d'émission de jetons : 6 par adresse et par jour.
const tokenLog = new Map<string, { day: string; n: number }>();
export function tokenAllowed(ip: string): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const e = tokenLog.get(ip);
  const cur = !e || e.day !== today ? { day: today, n: 0 } : e;
  if (cur.n >= 6) return false;
  cur.n += 1;
  tokenLog.set(ip, cur);
  return true;
}
