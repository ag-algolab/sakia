// Aides côté navigateur pour l'hors connexion : âge du dernier plan gardé, lecture d'un plan avec son âge, état du réseau.
// Le service worker (public/sw.js) garde chaque réponse de /api/plan avec ses heures ; la page les relit ici.

"use client";

import { useEffect, useState } from "react";

export const DATA_CACHE = "sakia-data-v1"; // doit rester identique à public/sw.js
export const STALE_MS = 5 * 60 * 60 * 1000;

export type PlanMeta = {
  dataAt: number; // âge de la donnée météo (ms depuis 1970)
  cachedAt: number; // moment où cet appareil l'a reçue
  url: string;
};

// Le plan ou la météo gardés les plus récents, tous choix confondus (le bandeau dit « dernier plan »).
// Deux sources : la météo brute gardée par usePlan (le plan est recalculé dessus), et les réponses de /api/plan gardées par le service worker.
export async function latestPlanMeta(): Promise<PlanMeta | null> {
  let best: PlanMeta | null = null;
  const consider = (m: PlanMeta) => {
    if (!best || m.dataAt > best.dataAt) best = m;
  };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith("sakia.forecast.v1.")) continue;
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as { forecast?: { fetchedAt?: string }; receivedAt?: number } | null;
      const dataAt = Date.parse(saved?.forecast?.fetchedAt ?? "");
      if (dataAt) consider({ dataAt, cachedAt: saved?.receivedAt ?? dataAt, url: key });
    }
  } catch {
    // stockage illisible ou bloqué : on regarde seulement le service worker
  }
  if (typeof caches !== "undefined") {
    try {
      if (await caches.has(DATA_CACHE)) {
        const cache = await caches.open(DATA_CACHE);
        for (const req of await cache.keys()) {
          if (new URL(req.url).pathname !== "/api/plan") continue;
          const res = await cache.match(req);
          if (!res) continue;
          const cachedAt = Number(res.headers.get("x-sakia-cached-at")) || 0;
          consider({ dataAt: Number(res.headers.get("x-sakia-data-at")) || cachedAt, cachedAt, url: req.url });
        }
      }
    } catch {
      // mémoire du navigateur indisponible
    }
  }
  return best;
}

export type PlanResult<T = unknown> = {
  plan: T;
  fromCache: boolean; // vrai = le réseau ne répondait pas, voici le dernier plan gardé
  ageMs: number; // âge de la donnée à cet instant
};

// Lit /api/plan et dit d'où vient la réponse et quel âge a la donnée. À utiliser à la place de fetch par les pages.
// Lance une erreur `offline` s'il n'y a ni réseau ni plan gardé pour ce choix.
export async function fetchPlanWithAge<T = unknown>(query: string): Promise<PlanResult<T>> {
  const res = await fetch(`/api/plan${query.startsWith("?") ? query : `?${query}`}`);
  if (res.status === 503 && res.headers.get("x-sakia-served-from") === "none") throw new Error("offline");
  if (!res.ok) throw new Error(`plan ${res.status}`);
  const body = (await res.json()) as T & { dataFetchedAt?: string };
  const dataAt = Number(res.headers.get("x-sakia-data-at")) || Date.parse(body.dataFetchedAt ?? "") || Date.now();
  return { plan: body, fromCache: res.headers.get("x-sakia-served-from") === "cache", ageMs: Date.now() - dataAt };
}

// « En ligne » ne veut pas dire « le serveur répond » : un téléphone sur un wifi sans internet a navigator.onLine = true.
// usePlan signale donc ici le résultat de ses téléchargements ; useOnline combine les deux.
let reachable = true;
const listeners = new Set<() => void>();
export function setReachable(value: boolean) {
  if (reachable === value) return;
  reachable = value;
  listeners.forEach((l) => l());
}

export const isReachable = () => reachable;

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine && reachable);
    sync();
    listeners.add(sync);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      listeners.delete(sync);
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  return online;
}

// Âge du dernier plan gardé, remis à jour chaque minute et quand le service worker en reçoit un nouveau.
export function usePlanAge(): { loaded: boolean; ageMs: number | null } {
  const [meta, setMeta] = useState<PlanMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      latestPlanMeta().then((m) => {
        if (!alive) return;
        setMeta(m);
        setLoaded(true);
        setNow(Date.now());
      });
    load();
    const tick = setInterval(() => (alive ? setNow(Date.now()) : undefined), 60000);
    window.addEventListener("online", load);
    window.addEventListener("sakia:plans-updated", load);
    return () => {
      alive = false;
      clearInterval(tick);
      window.removeEventListener("online", load);
      window.removeEventListener("sakia:plans-updated", load);
    };
  }, []);
  return { loaded, ageMs: meta && now ? Math.max(0, now - meta.dataAt) : null };
}
