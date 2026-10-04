"use client";

import { useEffect } from "react";
import { CROPS, defaultCropForMonth } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";

// Profil de l'agriculteur, gardé sur l'appareil (localStorage, clé « sakia-form ») : région, culture, sol, irrigation,
// date de semis, DATE du dernier arrosage. Écrit par l'accueil ; lu par l'accueil et par la page Bulletin.
//
// Le dernier arrosage est gardé comme une DATE (`agoDate`), pas comme « il y a 3 jours » : sinon la réponse serait fausse le
// lendemain. `ago` (« il y a N jours », 0 à 7) est recalculé à partir de la date et réécrit dans la même clé par
// <ProfileSync /> à chaque ouverture d'une page, pour que tout lecteur de `ago` (le poste Bulletin) ait une valeur à jour.
// Au-delà de 7 jours, le moteur ne sait pas représenter l'état du sol : on redemande (« pas sûr »).
//
// Région et culture sont obligatoires. À la PREMIÈRE visite seulement (ni région ni culture gardées), un champ d'exemple est
// prérempli et affiché en clair (« Your field : Kairouan · Pepper · 6 d ago », bouton « Change ») : voir firstVisitProfile.

export const PROFILE_KEY = "sakia-form";
export const SOILS = ["sableux", "limoneux", "argileux"] as const;
export const SYSTEMS = ["goutte", "aspersion", "gravitaire"] as const;

export type Profile = {
  region: string; // "" = pas encore choisie
  crop: string; // "" = pas encore choisie
  soil: string;
  system: string;
  planting: string; // AAAA-MM-JJ ou ""
  agoDate: string; // AAAA-MM-JJ du dernier arrosage, ou "" = inconnu
};

export const EMPTY_PROFILE: Profile = { region: "", crop: "", soil: "limoneux", system: "goutte", planting: "", agoDate: "" };

// Date du jour en Tunisie (l'appareil peut être réglé sur un autre fuseau).
export function tunisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(now);
}

// Vraie date AAAA-MM-JJ, sinon "".
export function validDate(s: unknown): string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
}

export function dayMinus(today: string, n: number): string {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// « il y a N jours » (0 à 7) d'après la date du dernier arrosage ; `stale` = plus de 7 jours : à redemander.
export function agoFromDate(agoDate: string, today: string): { ago: string; stale: boolean } {
  const a = validDate(agoDate);
  if (!a) return { ago: "", stale: false };
  const diff = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
  if (diff < 0) return { ago: "", stale: false };
  if (diff > 7) return { ago: "", stale: true };
  return { ago: String(diff), stale: false };
}

export function dateFromAgo(ago: string, today: string): string {
  return /^[0-7]$/.test(ago) ? dayMinus(today, Number(ago)) : "";
}

export function loadProfile(): Profile {
  try {
    const f = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null") as Record<string, unknown> | null;
    if (!f || typeof f !== "object") return EMPTY_PROFILE;
    const s = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      region: REGIONS.some((r) => r.id === s(f.region)) ? s(f.region) : "",
      crop: CROPS.some((c) => c.id === s(f.crop)) ? s(f.crop) : "",
      soil: (SOILS as readonly string[]).includes(s(f.soil)) ? s(f.soil) : EMPTY_PROFILE.soil,
      system: (SYSTEMS as readonly string[]).includes(s(f.system)) ? s(f.system) : EMPTY_PROFILE.system,
      planting: validDate(f.planting),
      agoDate: validDate(f.agoDate), // un ancien « ago » sans date est ignoré : on ne sait pas de quand il date
    };
  } catch {
    return EMPTY_PROFILE;
  }
}

// Le champ d'exemple de la première visite. Décision d'Anthony (4 oct., 09 h 30) : « par défaut, Kairouan, Pepper, arrosé lundi :
// ça dit d'arroser aujourd'hui, puis encore dans la semaine ». La culture est celle de la saison (le piment en octobre : la même que
// le bouton d'exemple), le dernier arrosage 6 jours avant le jour de la visite. Vérifié le 4 oct. : arroser aujourd'hui (319 m³/ha)
// et jeudi (206 m³/ha).
export const FIRST_VISIT_AGO = "6";

export function firstVisitProfile(today: string = tunisToday()): Profile {
  return { ...EMPTY_PROFILE, region: "kairouan", crop: defaultCropForMonth(Number(today.slice(5, 7))), agoDate: dateFromAgo(FIRST_VISIT_AGO, today) };
}

// Profil gardé ; s'il n'a ni région ni culture (première visite), le champ d'exemple (sol, système et semis gardés s'ils existent).
export function loadProfileOrFirstVisit(): Profile {
  const p = loadProfile();
  if (p.region || p.crop) return p;
  return { ...firstVisitProfile(), soil: p.soil, system: p.system, planting: p.planting };
}

export function saveProfile(p: Profile) {
  try {
    let old: Record<string, unknown> = {};
    try {
      const o = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
      if (o && typeof o === "object") old = o as Record<string, unknown>;
    } catch {}
    const { ago } = agoFromDate(p.agoDate, tunisToday());
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...old, ...p, ago }));
  } catch {}
}

// Garde `ago` à jour dans le profil (voir plus haut). Posé une fois dans la mise en page.
export function ProfileSync() {
  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem(PROFILE_KEY);
        if (!raw) return;
        const o = JSON.parse(raw) as Record<string, unknown> | null;
        if (!o || typeof o !== "object" || typeof o.agoDate !== "string" || !o.agoDate) return;
        const { ago } = agoFromDate(o.agoDate, tunisToday());
        if (o.ago !== ago) localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...o, ago }));
      } catch {}
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    const id = window.setInterval(sync, 10 * 60 * 1000);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.clearInterval(id);
    };
  }, []);
  return null;
}
