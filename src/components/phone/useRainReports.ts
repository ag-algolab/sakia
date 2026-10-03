"use client";

// Rapports de pluie avec ENVOI DIFFÉRÉ (« store-and-forward ») : le signalement est d'abord gardé dans l'appareil, puis envoyé
// à POST /api/reports dès que le serveur répond. Sans réseau il reste « en attente » et part tout seul au retour du réseau.
// Garde-fous : un seul rapport par jour et par région dans la file (le dernier remplace), jamais de nom ni d'adresse :
// l'identifiant envoyé est une identité anonyme émise et signée par le serveur, la même que sur tout le site
// (src/lib/reporterClient.ts) : le serveur refuse (400) toute identité qu'il n'a pas émise.

import { useCallback, useEffect, useRef, useState } from "react";
import { addDays } from "@/lib/planCore";
import type { RainLevel } from "@/lib/rainLevels";
import { sendRainReport } from "@/lib/reporterClient";
import { setReachable } from "./offline";
import { todayInTunisia } from "./usePlan";

const QUEUE = "sakia.reports.queue.v1";
const KEEP = 20;
const RETRY_MS = 20 * 1000;

export type ReportEntry = {
  id: string;
  regionId: string;
  day: string; // AAAA-MM-JJ
  level: RainLevel;
  at: number;
  status: "pending" | "sent" | "rejected";
  n?: number; // personnes qui ont signalé ce jour-là, connu après l'envoi
  note?: string; // pourquoi un rapport est refusé, ou pourquoi il attend encore
};

const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");

function readQueue(): ReportEntry[] {
  try {
    const q = JSON.parse(localStorage.getItem(QUEUE) ?? "[]") as ReportEntry[];
    return Array.isArray(q) ? q.filter((e) => e && typeof e.id === "string" && typeof e.regionId === "string") : [];
  } catch {
    return [];
  }
}

// Les jours où l'on peut encore signaler (aujourd'hui et les 3 précédents, comme le serveur) ; `nowMs` = horloge de l'appareil.
export function reportDays(nowMs: number, count = 4): string[] {
  if (!nowMs) return [];
  const today = todayInTunisia(new Date(nowMs));
  return Array.from({ length: count }, (_, i) => addDays(today, -i));
}

export function useRainReports() {
  const [entries, setEntries] = useState<ReportEntry[]>([]);
  const ref = useRef<ReportEntry[]>([]);
  const busy = useRef(false);

  const commit = useCallback((next: ReportEntry[]) => {
    // on garde tout ce qui attend encore, puis les plus récents
    const pending = next.filter((e) => e.status === "pending");
    const done = next.filter((e) => e.status !== "pending").slice(-KEEP);
    const kept = [...done, ...pending].sort((a, b) => a.at - b.at);
    ref.current = kept;
    setEntries(kept);
    try {
      localStorage.setItem(QUEUE, JSON.stringify(kept));
    } catch {
      // stockage plein ou bloqué : la file reste à l'écran jusqu'au rechargement
    }
  }, []);

  const patch = useCallback((id: string, change: Partial<ReportEntry>) => commit(ref.current.map((e) => (e.id === id ? { ...e, ...change } : e))), [commit]);

  const flush = useCallback(async () => {
    if (busy.current || typeof navigator === "undefined" || !navigator.onLine) return;
    busy.current = true;
    try {
      for (let e = ref.current.find((x) => x.status === "pending"); e; e = ref.current.find((x) => x.status === "pending")) {
        const sent = await sendRainReport({ regionId: e.regionId, level: e.level, day: e.day }, AbortSignal.timeout(15000));
        if (!sent.ok) {
          if (sent.reason === "network") {
            setReachable(false); // le serveur ne répond pas : le rapport attend
          } else {
            // le serveur répond, mais ne donne pas d'identité (trop de demandes aujourd'hui, ou panne) : on réessaiera plus tard
            setReachable(true);
            patch(e.id, { note: sent.reason === "rate" ? "trop de rapports pour le moment" : "enregistrement impossible pour le moment" });
          }
          break;
        }
        const res = sent.res;
        setReachable(true);
        if (res.ok) {
          let n: number | undefined;
          try {
            const sum = (await (await fetch(`/api/reports?region=${encodeURIComponent(e.regionId)}`, { signal: AbortSignal.timeout(8000) })).json()) as { days?: { date: string; n: number }[] };
            n = sum.days?.find((d) => d.date === e.day)?.n;
          } catch {
            // le nombre de personnes est un plus : l'envoi, lui, a réussi
          }
          patch(e.id, { status: "sent", n, note: undefined });
        } else if (res.status === 400) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          patch(e.id, { status: "rejected", note: body.error ?? "refusé" });
        } else {
          // 429 (trop de rapports), 503 (enregistrement impossible), 5xx : on réessaiera plus tard
          patch(e.id, { note: res.status === 429 ? "trop de rapports pour le moment" : "enregistrement impossible pour le moment" });
          break;
        }
      }
    } finally {
      busy.current = false;
    }
  }, [patch]);

  useEffect(() => {
    // la file n'existe que dans le navigateur : lue après l'hydratation
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = readQueue();
    ref.current = saved;
    setEntries(saved);
    /* eslint-enable react-hooks/set-state-in-effect */
    void flush();
    const retry = setInterval(() => {
      if (ref.current.some((e) => e.status === "pending")) void flush();
    }, RETRY_MS);
    const onOnline = () => void flush();
    window.addEventListener("online", onOnline);
    return () => {
      clearInterval(retry);
      window.removeEventListener("online", onOnline);
    };
  }, [flush]);

  const submit = useCallback(
    (regionId: string, day: string, level: RainLevel) => {
      // un seul rapport en attente par région et par jour : le dernier remplace
      const rest = ref.current.filter((e) => !(e.status === "pending" && e.regionId === regionId && e.day === day));
      commit([...rest, { id: randomId(), regionId, day, level, at: Date.now(), status: "pending" }]);
      void flush();
    },
    [commit, flush],
  );

  return { entries, submit };
}
