"use client";

// Bouton « Il a plu » : l'agriculteur dit combien il a plu chez lui, sur une échelle à cinq degrés (personne ne mesure en
// millimètres). Quand au moins MIN_REPORTERS (3) personnes différentes de la région signalent la même journée, la médiane prudente remplace
// la pluie du modèle météo, et le bulletin le dit (src/lib/reports.ts, src/lib/voice/rainreports.ts).
// Garde-fous : aucun nom, un seul rapport par personne, par région et par jour ; présenté comme « signalement d'agriculteurs ».
// Mêmes clés de stockage que la page d'accueil (components/ui/RainReport.tsx) : la même personne n'est comptée qu'une fois,
// quelle que soit la page d'où elle signale. Hors connexion, le signalement attend dans l'appareil et part au retour du réseau.
//
// RÉCOMPENSE : pour remercier les personnes qui nous aident, sans rien leur offrir d'argent : (1) un remerciement DIT à voix
// haute dans leur langue (pour celles et ceux qui ne lisent pas), (2) un petit titre qui monte avec le nombre de jours
// signalés (voisin serviable, guetteur de pluie, gardien de la pluie), compté sur l'appareil, (3) l'effet de leur geste :
// combien de personnes sont d'accord pour ce jour et si le bulletin utilise déjà le signalement de la région.

import { useCallback, useEffect, useState } from "react";
import { todayInTunisia } from "@/components/phone/usePlan";
import { MIN_REPORTERS, RAIN_LEVELS } from "@/lib/rainLevels";
import type { RainLevel } from "@/lib/rainLevels";
import { REPORTS_ARE_FICTIONAL } from "@/lib/voice/flags";
import type { VoiceLang } from "@/lib/voice/langs";
import type { Strings } from "./strings";

const REPORTER_KEY = "sakia-reporter";
const QUEUE_KEY = "sakia-report-queue";
const KEYS_KEY = "sakia-report-keys"; // jours déjà signalés (région|jour), pour le titre de récompense
const MAX_AGE_DAYS = 3; // le serveur n'accepte que aujourd'hui et les 3 derniers jours
const TIERS = [1, 5, 15]; // jours signalés pour chaque titre

type Queued = { regionId: string; level: RainLevel; day: string; at: number };
type Result = "ok" | "rate" | "down" | "invalid" | "network";
type Status = "idle" | "sending" | "sent" | "queued" | "rate" | "down" | "invalid";

const ICON: Record<RainLevel, string> = { none: "☀️", very_light: "💧", light: "🌦️", heavy: "🌧️", very_heavy: "⛈️" };
const TIER_ICON = ["🌱", "🌧️", "🏅"];
const RANGE: Record<RainLevel, string> = { none: "0", very_light: "< 2", light: "2–8", heavy: "8–25", very_heavy: "> 25" };

// Identifiant anonyme gardé dans l'appareil (au moins 8 caractères), jamais affiché. Le serveur n'en garde qu'une empreinte salée.
function reporterId(): string {
  try {
    let id = localStorage.getItem(REPORTER_KEY);
    if (!id || id.length < 8) {
      id = `web:${crypto.randomUUID().replace(/-/g, "")}`;
      localStorage.setItem(REPORTER_KEY, id);
    }
    return id;
  } catch {
    return `web:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null");
    return v === null ? fallback : (v as T);
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
const readQueue = (): Queued[] => {
  const q = readJson<unknown>(QUEUE_KEY, []);
  return Array.isArray(q) ? (q as Queued[]) : [];
};
const readKeys = (): string[] => {
  const k = readJson<unknown>(KEYS_KEY, []);
  return Array.isArray(k) ? (k as string[]) : [];
};

function dayMinus(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function post(item: { regionId: string; level: RainLevel; day: string }): Promise<Result> {
  try {
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regionId: item.regionId, level: item.level, day: item.day, reporter: reporterId() }),
    });
    if (res.ok) return "ok";
    if (res.status === 429) return "rate";
    if (res.status === 503) return "down";
    return "invalid";
  } catch {
    return "network";
  }
}

// Envoie ce qui attendait dans l'appareil. Les signalements trop vieux (plus de 3 jours) sont abandonnés.
async function flushQueue(): Promise<void> {
  const today = todayInTunisia(new Date());
  let q = readQueue().filter((r) => r.day >= dayMinus(today, MAX_AGE_DAYS));
  while (q.length > 0) {
    const r = await post(q[0]);
    if (r === "network") break; // toujours pas de réseau : on garde le reste
    q = q.slice(1); // envoyé, refusé ou invalide : on ne le renvoie pas en boucle
  }
  writeJson(QUEUE_KEY, q);
}

// Effet de leur geste : combien de personnes ont signalé ce jour-là dans la région, et le seuil à atteindre.
async function impactFor(regionId: string, day: string): Promise<{ n: number; min: number } | null> {
  try {
    const res = await fetch(`/api/reports?region=${encodeURIComponent(regionId)}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { days?: { date: string; n: number }[]; minReporters?: number };
    return { n: body.days?.find((d) => d.date === day)?.n ?? 0, min: body.minReporters ?? MIN_REPORTERS };
  } catch {
    return null;
  }
}

const tierOf = (days: number): number => TIERS.reduce((acc, min, i) => (days >= min ? i : acc), -1);

export default function RainReportButton({
  regionId,
  regionName,
  voiceLang,
  muted,
  t,
}: {
  regionId: string;
  regionName: string;
  voiceLang: VoiceLang;
  muted: boolean;
  t: Strings;
}) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<RainLevel | null>(null);
  const [offset, setOffset] = useState(0); // 0 = aujourd'hui, 1 = hier
  const [status, setStatus] = useState<Status>("idle");
  const [days, setDays] = useState(0); // jours différents signalés depuis cet appareil
  const [impact, setImpact] = useState<{ n: number; min: number } | null>(null);
  const [party, setParty] = useState(0); // change à chaque succès : relance l'animation

  // à l'ouverture de la page et au retour du réseau : on envoie ce qui attendait dans l'appareil
  useEffect(() => {
    const id = window.setTimeout(() => setDays(readKeys().length), 0); // lu sur l'appareil après l'affichage
    const go = () => void flushQueue();
    go();
    window.addEventListener("online", go);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("online", go);
    };
  }, []);

  const celebrate = useCallback(
    (day: string) => {
      const keys = readKeys();
      const key = `${regionId}|${day}`;
      if (!keys.includes(key)) {
        keys.push(key);
        writeJson(KEYS_KEY, keys.slice(-200));
      }
      setDays(keys.length);
      setParty((p) => p + 1);
      // le remerciement est DIT, dans la langue de la voix choisie (sauf son coupé)
      if (!muted) {
        try {
          void new Audio(`/audio/thanks-${voiceLang}.mp3`).play().catch(() => {});
        } catch {}
      }
    },
    [muted, regionId, voiceLang],
  );

  const send = useCallback(async () => {
    if (!level || status === "sending") return;
    setStatus("sending");
    setImpact(null);
    const day = dayMinus(todayInTunisia(new Date()), offset);
    const r = await post({ regionId, level, day });
    if (r === "network") {
      writeJson(QUEUE_KEY, [...readQueue(), { regionId, level, day, at: Date.now() }]);
      setStatus("queued");
      celebrate(day);
    } else if (r === "ok") {
      setStatus("sent");
      celebrate(day);
      void impactFor(regionId, day).then(setImpact);
    } else setStatus(r);
  }, [celebrate, level, offset, regionId, status]);

  const tier = tierOf(days);
  const next = tier < TIERS.length - 1 ? TIERS[tier + 1] : null;
  const thanked = status === "sent" || status === "queued";

  return (
    <section className="mt-5 rounded-2xl border-2 border-[#7fd0e0] bg-[#0b3a44] p-4 text-base text-[#f2fcff] sm:p-5" aria-label={t.rainBtn}>
      <style>{`
        @keyframes bl-fall { 0% { transform: translateY(-30px); opacity: 0 } 15% { opacity: 1 } 100% { transform: translateY(220px); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { .bl-drop { animation: none !important; opacity: 0 !important } }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-[#7fd0e0] px-4 py-3 text-xl font-bold text-[#04161a]"
      >
        <span aria-hidden>🌧️</span>
        {t.rainBtn}
      </button>

      {open && (
        <div className="relative mt-5 space-y-5">
          {/* pluie de félicitations : quelques gouttes qui tombent une fois, puis disparaissent */}
          {party > 0 && thanked && (
            <div key={party} className="pointer-events-none absolute inset-x-0 top-0 h-0 overflow-visible" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className="bl-drop absolute text-xl"
                  style={{ left: `${4 + i * 8}%`, animation: `bl-fall ${1.3 + (i % 4) * 0.25}s ease-in ${(i % 5) * 0.12}s both` }}
                >
                  {i % 3 === 0 ? "💧" : i % 3 === 1 ? "🌱" : "✨"}
                </span>
              ))}
            </div>
          )}

          {REPORTS_ARE_FICTIONAL && (
            <p className="rounded-lg bg-[#4a3a08] px-3 py-3 text-center text-base font-bold text-[#fff3c4]">{t.reportsFictional}</p>
          )}
          <p className="text-lg font-bold">
            {t.rainAsk} <span className="font-semibold text-[#cfeef5]">({regionName})</span>
          </p>

          <div role="radiogroup" aria-label={t.rainAsk} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {RAIN_LEVELS.map((l) => {
              const on = level === l;
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setLevel(l);
                    setStatus("idle");
                  }}
                  className={`flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 text-center ${
                    on ? "border-[#f0c75e] bg-[#7fd0e0] text-[#04161a]" : "border-[#3d7f8f] bg-[#0f4b57] text-[#ffffff] hover:border-[#7fd0e0]"
                  }`}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {ICON[l]}
                  </span>
                  <span className="text-base font-bold leading-tight">{t.rainLevels[l]}</span>
                  <span className="text-sm font-semibold" dir="ltr">
                    {RANGE[l]} mm
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {[0, 1].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                aria-pressed={offset === o}
                className={`min-h-12 rounded-full border-2 px-6 text-base font-bold ${
                  offset === o ? "border-[#f0c75e] bg-[#f0c75e] text-[#0b1d15]" : "border-[#3d7f8f] bg-[#0f4b57] text-[#ffffff]"
                }`}
              >
                {t.relDays[o]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={send}
            disabled={!level || status === "sending"}
            className="min-h-14 w-full rounded-xl bg-[#f0c75e] px-4 text-xl font-bold text-[#0b1d15] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "sending" ? t.loading : thanked ? t.rainSendAgain : t.rainSend}
          </button>

          {status === "queued" && (
            <p role="status" className="rounded-lg bg-[#4a3a08] p-4 text-base font-bold text-[#fff3c4]">
              {t.rainQueued}
            </p>
          )}
          {(status === "rate" || status === "down" || status === "invalid") && (
            <p role="alert" className="rounded-lg bg-[#5a1f10] p-4 text-base font-bold text-[#ffe8dd]">
              {status === "rate" ? t.rainErrRate : status === "down" ? t.rainErrDown : t.rainErrInvalid}
            </p>
          )}

          {/* la récompense : remerciement, titre, et l'effet du geste */}
          {thanked && (
            <div role="status" className="space-y-3 rounded-xl border-2 border-[#8fe3a1] bg-[#12401f] p-4 text-[#f2fff5]">
              <p className="flex items-center gap-3 text-xl font-bold">
                <span aria-hidden className="text-3xl">
                  {tier >= 0 ? TIER_ICON[tier] : "🌱"}
                </span>
                {t.rewardThanks}
              </p>
              {status === "sent" && <p className="text-base">{t.rainSent}</p>}
              <p className="text-base font-semibold">{days === 1 ? t.rewardCountOne : t.rewardCount.replace("{n}", String(days))}</p>
              {tier >= 0 && (
                <p className="inline-block rounded-full bg-[#f0c75e] px-4 py-2 text-base font-bold text-[#0b1d15]">
                  {TIER_ICON[tier]} {t.rewardTiers[tier]}
                </p>
              )}
              <p className="text-base">
                {next === null ? t.rewardTop : t.rewardNext.replace("{k}", String(next - days)).replace("{name}", t.rewardTiers[tier + 1])}
              </p>
              {impact && (
                <p className="rounded-lg bg-[#0b2a14] p-3 text-base font-semibold">
                  {impact.n >= impact.min
                    ? t.rewardImpactUsed.replace("{n}", String(impact.n))
                    : t.rewardImpactWaiting.replace("{n}", String(impact.n)).replace("{need}", String(impact.min - impact.n))}
                </p>
              )}
            </div>
          )}

          <p className="text-base leading-relaxed text-[#e4f7fb]">{t.rainRule}</p>
          <p className="text-base font-semibold text-[#ffffff]">{t.reportsNote}</p>
        </div>
      )}
    </section>
  );
}
