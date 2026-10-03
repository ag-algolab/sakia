"use client";

// Plan d'irrigation calculé SUR L'APPAREIL, donc qui marche sans réseau.
//   en ligne    : on télécharge la météo brute (GET /api/forecast, environ 2 Ko), on la garde dans le navigateur,
//                 puis on calcule avec computePlan (src/lib/planCore.ts), le même calcul que sur le serveur ;
//   hors ligne  : on recalcule avec la dernière météo gardée et l'horloge de l'appareil. On peut changer la culture ou
//                 le « dernier arrosage » sans réseau. Le plan porte son âge ; plus de 12 h : prudence, plus de 48 h : aucun conseil
//                 (c'est `plan.confidence`, calculé par le moteur, qui se dégrade tout seul).
// Rien n'est envoyé : la météo est une donnée publique d'une région, pas une donnée de la personne.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { computePlan } from "@/lib/planCore";
import type { Plan, PlanRequest } from "@/lib/planCore";
import type { Forecast } from "@/lib/weather";
import { isReachable, setReachable, useOnline } from "./offline";

const STORE = "sakia.forecast.v1.";
const REFETCH_AFTER_MS = 30 * 60 * 1000; // en ligne, la météo est renouvelée toutes les 30 min (en plus du contrôle à l'ouverture)
const MIN_TRY_GAP_MS = 60 * 1000; // ni plus d'un essai par minute (réseau instable)

export type PlanInput = Pick<PlanRequest, "regionId" | "cropId" | "soil" | "system" | "planting" | "lastIrrigationDaysAgo">;

export type PlanState = {
  plan: Plan | null;
  // loading : lecture / premier téléchargement ; ready : plan calculé ; no-data : pas de météo gardée et pas de réseau ;
  // too-old : la météo gardée ne couvre plus la date du jour (plusieurs semaines sans réseau) ; error : calcul impossible
  status: "loading" | "ready" | "no-data" | "too-old" | "error";
  source: "network" | "stored" | null; // la météo utilisée vient d'un téléchargement de cette session ou de la mémoire de l'appareil
  forecastReceivedAt: number | null; // quand cet appareil a reçu la météo (ms)
  online: boolean;
  refreshing: boolean;
  refresh: () => Promise<void>;
};

type Stored = { forecast: Forecast; receivedAt: number };

// Date du jour en Tunisie (l'appareil peut être réglé sur un autre fuseau).
export function todayInTunisia(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(now);
}

function isForecast(v: unknown): v is Forecast {
  const f = v as Forecast | null;
  return !!f && Array.isArray(f.days) && f.days.length > 0 && typeof f.fetchedAt === "string" && typeof f.today === "string";
}

function readStored(regionId: string): Stored | null {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE + regionId) ?? "null") as Stored | null;
    return raw && isForecast(raw.forecast) && typeof raw.receivedAt === "number" ? raw : null;
  } catch {
    return null;
  }
}

function writeStored(regionId: string, s: Stored) {
  try {
    localStorage.setItem(STORE + regionId, JSON.stringify(s));
  } catch {
    // stockage plein ou bloqué : la météo reste utilisable jusqu'au rechargement de la page
  }
}

export function usePlan(input: PlanInput): PlanState {
  const { regionId, cropId, soil, system, planting, lastIrrigationDaysAgo } = input;
  const [stored, setStored] = useState<{ regionId: string; data: Stored | null; via: "network" | "stored" } | null>(null);
  const [now, setNow] = useState<number>(0);
  const online = useOnline();
  const [refreshing, setRefreshing] = useState(false);
  const lastTry = useRef(0);

  const download = useCallback(
    async (force: boolean) => {
      const t = Date.now();
      if (!navigator.onLine) return;
      if (!force && t - lastTry.current < MIN_TRY_GAP_MS) return;
      lastTry.current = t;
      setRefreshing(true);
      try {
        const res = await fetch(`/api/forecast?region=${encodeURIComponent(regionId)}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
        if (!res.ok) {
          setReachable(res.status < 500); // une erreur 4xx vient de la requête, pas du réseau
          return;
        }
        const forecast: unknown = await res.json();
        if (!isForecast(forecast)) return;
        const data = { forecast, receivedAt: Date.now() };
        writeStored(regionId, data);
        setStored({ regionId, data, via: "network" });
        setReachable(true);
        window.dispatchEvent(new Event("sakia:plans-updated")); // le bandeau « dernier plan mis à jour » relit l'âge
      } catch {
        // le serveur ne répond pas (même si l'appareil se croit en ligne : wifi sans internet) : on garde ce qu'on a et on le dit
        setReachable(false);
      } finally {
        setRefreshing(false);
      }
    },
    [regionId],
  );

  // Lecture de la météo gardée pour cette région (hors rendu serveur : le navigateur seul a le stockage), puis téléchargement si utile.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = readStored(regionId);
    setStored({ regionId, data: saved, via: "stored" });
    setNow(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
    void download(true); // 2 Ko : on vérifie toujours que le serveur répond, pour ne pas afficher « en ligne » à tort
  }, [regionId, download]);

  // L'horloge de l'appareil avance : l'âge de la météo grandit, donc la confiance se dégrade toute seule.
  useEffect(() => {
    // chaque minute : l'horloge avance ; si le serveur ne répondait pas, on réessaie (le wifi sans internet n'envoie aucun événement)
    const tick = setInterval(() => {
      setNow(Date.now());
      const saved = readStored(regionId);
      if (!isReachable() || !saved || Date.now() - saved.receivedAt > REFETCH_AFTER_MS) void download(false);
    }, 60 * 1000);
    const onOnline = () => {
      setNow(Date.now());
      void download(true);
    };
    const onOffline = () => setNow(Date.now());
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      void download(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [download, regionId]);

  const current = stored && stored.regionId === regionId ? stored : null;

  const computed = useMemo<{ status: PlanState["status"]; plan: Plan | null }>(() => {
    if (!current || !now) return { status: "loading", plan: null };
    if (!current.data) return { status: online ? "loading" : "no-data", plan: null };
    const clock = new Date(now);
    const today = todayInTunisia(clock);
    const days = current.data.forecast.days;
    if (today < days[0].date || today > days[days.length - 1].date) return { status: "too-old", plan: null };
    try {
      return { status: "ready", plan: computePlan({ regionId, cropId, soil, system, planting, lastIrrigationDaysAgo }, current.data.forecast, { now: clock, today }) };
    } catch {
      return { status: "error", plan: null };
    }
  }, [current, now, online, regionId, cropId, soil, system, planting, lastIrrigationDaysAgo]);

  const refresh = useCallback(() => download(true), [download]);

  return {
    plan: computed.plan,
    status: computed.status,
    source: current?.data ? current.via : null,
    forecastReceivedAt: current?.data?.receivedAt ?? null,
    online,
    refreshing,
    refresh,
  };
}
