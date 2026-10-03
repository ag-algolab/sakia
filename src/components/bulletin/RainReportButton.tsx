"use client";

// Bouton « Il a plu » : l'agriculteur dit combien il a plu chez lui, sur une échelle à cinq degrés (personne ne mesure en
// millimètres). Quand au moins 2 personnes différentes de la région signalent la même journée, la médiane prudente remplace
// la pluie du modèle météo, et le bulletin le dit (src/lib/reports.ts, src/lib/voice/rainreports.ts).
// Garde-fous : aucun nom, un seul rapport par personne, par région et par jour, jamais présenté comme une mesure.
// Mêmes clés de stockage que la page d'accueil (components/ui/RainReport.tsx) : la même personne n'est comptée qu'une fois,
// quelle que soit la page d'où elle signale. Hors connexion, le signalement attend dans l'appareil et part au retour du réseau.

import { useCallback, useEffect, useState } from "react";
import { todayInTunisia } from "@/components/phone/usePlan";
import { RAIN_LEVELS } from "@/lib/rainLevels";
import type { RainLevel } from "@/lib/rainLevels";
import { REPORTS_ARE_FICTIONAL } from "@/lib/voice/flags";
import type { Strings } from "./strings";

const REPORTER_KEY = "sakia-reporter";
const QUEUE_KEY = "sakia-report-queue";
const MAX_AGE_DAYS = 3; // le serveur n'accepte que aujourd'hui et les 3 derniers jours

type Queued = { regionId: string; level: RainLevel; day: string; at: number };
type Result = "ok" | "rate" | "down" | "invalid" | "network";
type Status = "idle" | "sending" | "sent" | "queued" | "rate" | "down" | "invalid";

const ICON: Record<RainLevel, string> = { none: "☀️", very_light: "💧", light: "🌦️", heavy: "🌧️", very_heavy: "⛈️" };
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

function readQueue(): Queued[] {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
    return Array.isArray(q) ? (q as Queued[]) : [];
  } catch {
    return [];
  }
}
function writeQueue(q: Queued[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {}
}

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
  writeQueue(q);
}

export default function RainReportButton({ regionId, t, regionName }: { regionId: string; t: Strings; regionName: string }) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<RainLevel | null>(null);
  const [offset, setOffset] = useState(0); // 0 = aujourd'hui, 1 = hier
  const [status, setStatus] = useState<Status>("idle");

  // à l'ouverture de la page et au retour du réseau : on envoie ce qui attendait dans l'appareil
  useEffect(() => {
    const go = () => void flushQueue();
    go();
    window.addEventListener("online", go);
    return () => window.removeEventListener("online", go);
  }, []);

  const send = useCallback(async () => {
    if (!level || status === "sending") return;
    setStatus("sending");
    const day = dayMinus(todayInTunisia(new Date()), offset);
    const r = await post({ regionId, level, day });
    if (r === "network") {
      writeQueue([...readQueue(), { regionId, level, day, at: Date.now() }]);
      setStatus("queued");
    } else setStatus(r === "ok" ? "sent" : r);
  }, [level, offset, regionId, status]);

  return (
    <section className="mt-4 rounded-xl border border-[#5fb3c4]/60 bg-[#0f2f36] p-4 text-[#d6f1f6]" aria-label={t.rainBtn}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#5fb3c4] px-4 py-3 text-lg font-bold text-[#08222a]"
      >
        <span aria-hidden>🌧️</span>
        {t.rainBtn}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {REPORTS_ARE_FICTIONAL && <p className="rounded-md bg-[#3a2f10] px-3 py-2 text-center text-sm font-semibold text-[#ffe9a6]">{t.reportsFictional}</p>}
          <p className="text-base font-semibold">
            {t.rainAsk} <span className="opacity-80">({regionName})</span>
          </p>

          <div role="radiogroup" aria-label={t.rainAsk} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                  className={`flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 px-1 py-2 text-center ${
                    on ? "border-[#e7c36a] bg-[#5fb3c4] text-[#08222a]" : "border-[#2c5a66] bg-[#12404a] hover:border-[#5fb3c4]"
                  }`}
                >
                  <span className="text-3xl leading-none" aria-hidden>
                    {ICON[l]}
                  </span>
                  <span className="text-[13px] font-bold leading-tight">{t.rainLevels[l]}</span>
                  <span className="text-xs font-semibold opacity-80" dir="ltr">
                    {RANGE[l]} mm
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[0, 1].map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOffset(o)}
                aria-pressed={offset === o}
                className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold ${
                  offset === o ? "border-[#e7c36a] bg-[#e7c36a] text-[#0d2118]" : "border-[#2c5a66] bg-[#12404a]"
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
            className="min-h-14 w-full rounded-xl bg-[#e7c36a] px-4 text-lg font-bold text-[#0d2118] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "sending" ? t.loading : status === "sent" ? t.rainSendAgain : t.rainSend}
          </button>

          {status === "sent" && (
            <p role="status" className="rounded-lg bg-[#16301f] p-3 text-sm font-bold text-[#cfeedd]">
              ✓ {t.rainSent}
            </p>
          )}
          {status === "queued" && (
            <p role="status" className="rounded-lg bg-[#3a2f10] p-3 text-sm font-bold text-[#ffe9a6]">
              {t.rainQueued}
            </p>
          )}
          {(status === "rate" || status === "down" || status === "invalid") && (
            <p role="alert" className="rounded-lg bg-[#3a1c12] p-3 text-sm font-bold text-[#ffd0bd]">
              {status === "rate" ? t.rainErrRate : status === "down" ? t.rainErrDown : t.rainErrInvalid}
            </p>
          )}

          <p className="text-xs leading-relaxed opacity-85">{t.rainRule}</p>
          <p className="text-xs font-semibold opacity-90">{t.reportsNote}</p>
        </div>
      )}
    </section>
  );
}
