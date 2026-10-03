"use client";

// Enregistre le service worker (public/sw.js) et déclenche la mise à jour des plans gardés.
// À importer par le poste UI dans layout.tsx : <ServiceWorkerRegister />. Peut aussi être posé sur plusieurs pages (sans effet double).
//
// Mises à jour : à l'ouverture, au retour du réseau et au retour sur l'application, si un plan a plus de 5 h.
// En plus, on demande au navigateur une synchronisation périodique : Chrome sur Android, application installée, au moment
// qu'il choisit. Absente sur iPhone. Rien n'est garanti toutes les 5 heures.

import { useEffect } from "react";

type PeriodicSyncRegistration = ServiceWorkerRegistration & {
  periodicSync?: { register(tag: string, options: { minInterval: number }): Promise<void> };
};

let started = false;

function send(message: unknown) {
  navigator.serviceWorker.ready.then((reg) => (navigator.serviceWorker.controller ?? reg.active)?.postMessage(message)).catch(() => {});
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (started || !("serviceWorker" in navigator)) return;
    started = true;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "PLANS_REFRESHED") window.dispatchEvent(new Event("sakia:plans-updated"));
    };
    const refresh = () => send({ type: "REFRESH_STALE" });
    const onVisible = () => document.visibilityState === "visible" && refresh();

    navigator.serviceWorker.addEventListener("message", onMessage);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);

    const start = async () => {
      try {
        const reg = (await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })) as PeriodicSyncRegistration;
        await navigator.serviceWorker.ready;
        // Les fichiers déjà chargés avant que le service worker prenne la main : on les lui indique pour qu'ils soient gardés.
        const urls = performance
          .getEntriesByType("resource")
          .map((e) => new URL(e.name, location.href))
          .filter((u) => u.origin === location.origin)
          .map((u) => u.pathname + u.search);
        send({ type: "PRECACHE", urls, pages: [location.pathname] });
        refresh();
        try {
          const status = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
          if (status.state === "granted" && reg.periodicSync) await reg.periodicSync.register("sakia-refresh", { minInterval: 5 * 60 * 60 * 1000 });
        } catch {
          // navigateur sans synchronisation périodique : la mise à jour se fait à l'ouverture et au retour du réseau
        }
      } catch {
        // enregistrement refusé (navigation privée, navigateur ancien) : l'application marche, sans mémoire hors connexion
      }
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);
  return null;
}
