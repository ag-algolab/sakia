"use client";

import { useCallback, useEffect, useState } from "react";
import { todayInTunisia } from "@/components/phone/usePlan";
import { LEVEL_LABEL, MIN_REPORTERS, RAIN_LEVELS } from "@/lib/rainLevels";
import type { RainLevel } from "@/lib/rainLevels";
import { sendRainReport } from "@/lib/reporterClient";
import { useLang } from "./LangProvider";
import { Reveal } from "./motion";
import { SunIcon } from "./icons";

// « Signaler la pluie » : l'agriculteur dit combien il a plu chez lui, sur une échelle à cinq degrés (personne ne mesure
// en millimètres). Quand au moins MIN_REPORTERS (3) personnes différentes de la région signalent la même journée, la médiane prudente
// remplace la pluie du modèle météo (src/lib/reports.ts). C'est de la donnée locale avec un humain dans la boucle.
// Jamais présenté comme une mesure : « signalé par des agriculteurs ».
// Hors connexion : le signalement attend dans l'appareil et part au retour du réseau.

// Les signalements montrés dans la démonstration sont fictifs : le dire. Passer à false quand de vrais agriculteurs signalent.
export const REPORTS_ARE_DEMO = true;

const QUEUE_KEY = "sakia-report-queue";
const MAX_AGE_DAYS = 3; // le serveur n'accepte que aujourd'hui et les 3 derniers jours

// Fourchettes des degrés (mm sur la journée), les mêmes que LEVEL_RANGE_MM de src/lib/rainLevels.ts, sans les mots.
const RANGE: Record<RainLevel, string> = { none: "0", very_light: "< 2", light: "2–8", heavy: "8–25", very_heavy: "> 25" };

type Queued = { regionId: string; level: RainLevel; day: string; at: number };
type Summary = { date: string; n: number; medianMm: number; level?: RainLevel }[];
type Result = "ok" | "rate" | "down" | "invalid" | "network";

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

// L'identité est émise et signée par le serveur (src/lib/reporterClient.ts) : sans elle, POST /api/reports répond 400.
async function post(item: { regionId: string; level: RainLevel; day: string }): Promise<Result> {
  const sent = await sendRainReport(item);
  if (!sent.ok) return sent.reason;
  if (sent.res.ok) return "ok";
  if (sent.res.status === 429) return "rate";
  if (sent.res.status === 503) return "down";
  return "invalid";
}

// Envoie ce qui attendait dans l'appareil. Les rapports trop vieux (plus de 3 jours) sont abandonnés.
async function flushQueue(): Promise<boolean> {
  const today = todayInTunisia(new Date());
  let q = readQueue().filter((r) => r.day >= dayMinus(today, MAX_AGE_DAYS));
  let sent = false;
  while (q.length > 0) {
    const r = await post(q[0]);
    if (r === "network") break; // toujours pas de réseau : on garde le reste
    if (r === "ok") sent = true;
    q = q.slice(1); // envoyé, refusé ou invalide : on ne le renvoie pas en boucle
  }
  writeQueue(q);
  return sent;
}

// Pictogramme de l'échelle : soleil (aucune pluie), puis un nuage avec de plus en plus de pluie, et un éclair pour « énormément ».
const DROPS: Record<Exclude<RainLevel, "none">, [number, number][]> = {
  very_light: [[9, 17], [15, 17]],
  light: [[7.5, 16.5], [12, 16.5], [16.5, 16.5]],
  heavy: [[6.5, 16], [11, 16], [15.5, 16], [8.5, 20], [13, 20]],
  very_heavy: [[5.5, 16], [9.5, 16], [13.5, 16], [17.5, 16], [7.5, 20], [11.5, 20], [15.5, 20]],
};

function RainLevelIcon({ level, className }: { level: RainLevel; className?: string }) {
  if (level === "none") return <SunIcon className={className} />;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="M7 13.5a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 4.2a4.7 4.7 0 0 1 0 9.3H7z" fill="currentColor" fillOpacity=".2" />
      <g className="sk-rainfall">
        {DROPS[level].map(([x, y], i) => (
          <path key={i} style={{ animationDelay: `${(i % 3) * 0.25}s` }} d={`M${x} ${y} l-1.1 3`} />
        ))}
      </g>
      {level === "very_heavy" && <path d="M12.8 6.5l-2.2 3.3h3.2l-2.2 3.3" strokeWidth="1.7" />}
    </svg>
  );
}

const DARIJA_LABEL: Record<RainLevel, string> = {
  none: "ما فمّاش شتا",
  very_light: "شويّة قطرات",
  light: "شتا خفيفة",
  heavy: "برشا شتا",
  very_heavy: "برشا برشا",
};

export default function RainReport({ regionId }: { regionId: string }) {
  const { lang, t, fmtDate, fmtNum } = useLang();
  const [level, setLevel] = useState<RainLevel | null>(null);
  const [offset, setOffset] = useState(0); // 0 = aujourd'hui, 1 = hier
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "queued" | "rate" | "down" | "invalid">("idle");
  const [summary, setSummary] = useState<Summary>([]);
  const [minReporters, setMinReporters] = useState<number>(MIN_REPORTERS); // le serveur redit la même valeur ; hors connexion, c'est celle-ci

  const label = useCallback(
    (l: RainLevel) => (lang === "aeb" ? DARIJA_LABEL[l] : LEVEL_LABEL[lang][l]),
    [lang],
  );

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports?region=${encodeURIComponent(regionId)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { days: Summary; minReporters: number };
      setSummary(body.days ?? []);
      if (typeof body.minReporters === "number") setMinReporters(body.minReporters);
    } catch {}
  }, [regionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Au retour du réseau (et à l'ouverture), on envoie ce qui attendait dans l'appareil.
  useEffect(() => {
    const go = () => void flushQueue().then((sent) => sent && void refresh());
    go();
    window.addEventListener("online", go);
    return () => window.removeEventListener("online", go);
  }, [refresh]);

  const send = async () => {
    if (!level || status === "sending") return;
    setStatus("sending");
    const day = dayMinus(todayInTunisia(new Date()), offset);
    const r = await post({ regionId, level, day });
    if (r === "network") {
      writeQueue([...readQueue(), { regionId, level, day, at: Date.now() }]);
      setStatus("queued");
      return;
    }
    if (r === "ok") {
      setStatus("sent");
      void refresh();
    } else setStatus(r);
  };

  const today = todayInTunisia(new Date());
  const shown = [...summary].filter((d) => d.n > 0).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  const dayName = (date: string) => (date === today ? t("today") : date === dayMinus(today, 1) ? t("yesterday") : fmtDate(date));

  return (
    <section aria-labelledby="rain-title" className="space-y-3">
      <Reveal>
        <h2 id="rain-title" className="font-display text-3xl font-bold text-sakia-green-deep">
          {t("rainTitle")}
        </h2>
      </Reveal>

      <Reveal delay={60} className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
        {REPORTS_ARE_DEMO && (
          <p className="bg-sakia-sun/25 px-4 py-2 text-center text-sm font-bold text-sakia-brown">{t("rainDemo")}</p>
        )}
        <div className="space-y-4 p-4">
          <p className="text-lg font-bold text-sakia-ink">{t("rainAsk")}</p>

          <div role="radiogroup" aria-label={t("rainAsk")} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
                  className={`sk-press flex min-h-28 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-1 py-2 text-center ${
                    on ? "border-sakia-water bg-sakia-water text-white shadow-md" : "border-sakia-sand-dark bg-sakia-sand/50 text-sakia-ink hover:border-sakia-water"
                  }`}
                >
                  <RainLevelIcon level={l} className={`h-11 w-11 ${on ? "text-white" : l === "none" ? "text-sakia-sun-deep" : "text-sakia-water"}`} />
                  <span className="text-[13px] font-bold leading-tight">{label(l)}</span>
                  <span className={`flex items-center gap-1 text-xs font-semibold ${on ? "text-white/85" : "text-sakia-brown/80"}`}>
                    <bdi dir="ltr">{RANGE[l]}</bdi>
                    <span>{t("mm")}</span>
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
                className={`min-h-11 rounded-full border-2 px-4 text-sm font-bold first-letter:uppercase ${
                  offset === o ? "border-sakia-green bg-sakia-green text-white" : "border-sakia-sand-dark bg-white text-sakia-ink"
                }`}
              >
                {o === 0 ? t("today") : t("yesterday")}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={send}
            disabled={!level || status === "sending"}
            className="sk-press flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sakia-green px-4 text-lg font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
          >
            {status === "sending" ? t("loading") : status === "sent" ? t("rainSendAgain") : t("rainSend")}
          </button>

          {status === "sent" && (
            <p role="status" className="flex items-center gap-2 rounded-xl bg-sakia-green-light p-3 text-sm font-bold text-sakia-green">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-sakia-green text-white" style={{ animation: "sk-pop .5s both" }}>
                ✓
              </span>
              {t("rainSent", { min: fmtNum(minReporters) })}
            </p>
          )}
          {status === "queued" && (
            <p role="status" className="rounded-xl bg-sakia-sand p-3 text-sm font-bold text-sakia-brown">
              {t("rainQueued")}
            </p>
          )}
          {(status === "rate" || status === "down" || status === "invalid") && (
            <p role="alert" className="rounded-xl bg-sakia-alert-light p-3 text-sm font-bold text-sakia-alert">
              {t(status === "rate" ? "rainErrRate" : status === "down" ? "rainErrDown" : "rainErrInvalid")}
            </p>
          )}

          {/* ce que les autres ont signalé */}
          <div className="space-y-2 border-t border-sakia-sand-dark/60 pt-3">
            {shown.length === 0 ? (
              <p className="text-sm text-sakia-brown">{t("rainNone")}</p>
            ) : (
              <ul className="space-y-2">
                {shown.map((d) => {
                  const counts = d.n >= minReporters;
                  return (
                    <li key={d.date} className="rounded-xl bg-sakia-sand/60 p-3 text-sm">
                      <p className="font-bold text-sakia-ink first-letter:uppercase">
                        {dayName(d.date)} · {d.n === 1 ? t("rainReported1") : t("rainReportedN", { n: fmtNum(d.n) })}
                        {d.level ? ` : ${label(d.level)}` : ` : ${fmtNum(d.medianMm, 1)} ${t("mm")}`}
                      </p>
                      <p className={`mt-0.5 font-semibold ${counts ? "text-sakia-water-deep" : "text-sakia-brown"}`}>
                        {counts ? `✓ ${t("rainUsed")}` : t("rainWaiting", { n: fmtNum(minReporters - d.n) })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="text-xs leading-relaxed text-sakia-brown/85">{t("rainRule", { min: fmtNum(minReporters) })}</p>
            <p className="text-xs font-semibold text-sakia-brown">{t("rainNotMeasured")}</p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

