"use client";

import { useRef, useState } from "react";
import { REGIONS } from "@/lib/regions";
import { regionName } from "./catalog";
import { PinIcon } from "./icons";
import { useLang } from "./LangProvider";

// Choix de la région : obligatoire, donc visible d'emblée. Deux chemins :
//  - « Utiliser ma position » : un seul appui, sans lire ; le téléphone donne sa position (le GPS marche aussi sans internet)
//    et on prend le gouvernorat dont le chef-lieu est le plus proche. La position reste sur l'appareil, rien n'est envoyé.
//  - la liste des 24 gouvernorats, en grosses touches.
// La liste vient du code (src/lib/regions.ts) : aucun téléchargement, tout marche sans internet.

const MAX_KM = 250; // au-delà, la personne n'est probablement pas en Tunisie

function distKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export default function RegionPicker({
  value,
  onChange,
  attention = false,
}: {
  value: string;
  onChange: (id: string) => void;
  attention?: boolean;
}) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [geo, setGeo] = useState<"idle" | "locating" | "failed" | "outside">("idle");
  const current = REGIONS.find((r) => r.id === value);

  const close = () => ref.current?.close();
  const pick = (id: string) => {
    onChange(id);
    setGeo("idle");
    close();
  };

  const locate = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeo("failed");
      return;
    }
    setGeo("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let best = REGIONS[0];
        let bestKm = Infinity;
        for (const r of REGIONS) {
          const d = distKm(latitude, longitude, r.lat, r.lon);
          if (d < bestKm) {
            best = r;
            bestKm = d;
          }
        }
        if (bestKm > MAX_KM) setGeo("outside");
        else pick(best.id);
      },
      () => setGeo("failed"),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 600000 },
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className={`sk-press flex w-full items-center gap-2 rounded-3xl border-2 p-2.5 text-start min-[360px]:gap-3 min-[360px]:p-3 sm:gap-4 ${
          current
            ? "border-sakia-sand-dark bg-white hover:border-sakia-green"
            : "border-dashed border-sakia-alert bg-sakia-alert-light/50"
        } ${attention && !current ? "ring-4 ring-sakia-alert/60 motion-safe:animate-pulse" : ""}`}
      >
        <span
          className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl min-[360px]:h-16 min-[360px]:w-16 sm:h-20 sm:w-20 ${
            current ? "bg-sakia-water-light text-sakia-water-deep" : "bg-white text-sakia-alert"
          }`}
        >
          <PinIcon className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-11 sm:w-11" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-sakia-brown">{t("region")}</span>
          {current ? (
            <span className="font-display block break-words text-xl font-bold leading-tight text-sakia-green-deep sm:text-2xl">{regionName(current, lang)}</span>
          ) : (
            <span className="block text-lg font-extrabold uppercase leading-tight tracking-wide text-sakia-alert">{t("requiredBadge")}</span>
          )}
        </span>
        <span className="shrink-0 rounded-full bg-sakia-green px-3 py-2 text-sm font-bold text-white sm:px-4">{current ? t("change") : t("choose")}</span>
      </button>

      <dialog
        ref={ref}
        aria-label={t("qWhere")}
        onClick={(e) => e.target === ref.current && close()}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90vh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-0 text-sakia-ink shadow-2xl backdrop:bg-black/55 sm:inset-0 sm:m-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sakia-sand-dark/60 bg-white px-4 py-3">
          <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("qWhere")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid h-11 w-11 place-items-center rounded-full bg-sakia-sand text-2xl font-bold text-sakia-brown"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* le chemin sans lecture : un appui */}
          <div>
            <button
              type="button"
              onClick={locate}
              disabled={geo === "locating"}
              className="sk-press flex min-h-16 w-full items-center justify-center gap-3 rounded-2xl bg-sakia-water px-4 text-lg font-bold text-white shadow-md disabled:opacity-70"
            >
              <PinIcon className="h-8 w-8" />
              {geo === "locating" ? t("locating") : t("useLocation")}
            </button>
            <p className="mt-2 text-xs leading-snug text-sakia-brown">{t("locationPrivacy")}</p>
            {geo === "failed" && (
              <p role="alert" className="mt-2 rounded-xl bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert">
                {t("locationFailed")}
              </p>
            )}
            {geo === "outside" && (
              <p role="alert" className="mt-2 rounded-xl bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert">
                {t("outsideTunisia")}
              </p>
            )}
          </div>

          <section aria-label={t("regionsList")}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-sakia-brown">{t("regionsList")}</h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {REGIONS.map((r) => {
                const on = r.id === value;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => pick(r.id)}
                      aria-pressed={on}
                      className={`sk-press relative flex min-h-14 w-full items-center justify-center rounded-2xl border-2 px-2 py-2 text-center text-base font-bold ${
                        on
                          ? "border-sakia-green bg-sakia-green-light ring-4 ring-sakia-green/30"
                          : "border-sakia-sand-dark/70 bg-sakia-sand/40 hover:border-sakia-green"
                      }`}
                    >
                      {regionName(r, lang)}
                      {on && (
                        <span aria-hidden className="absolute -end-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-sakia-green text-sm text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </dialog>
    </>
  );
}
