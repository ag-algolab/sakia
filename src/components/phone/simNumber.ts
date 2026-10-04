"use client";

// Le numéro FICTIF de ce navigateur (« sim-xxxxxx ») : seule clé de la conversation côté serveur. Il est gardé dans l'appareil pour
// qu'un même navigateur reste « une seule personne » (un seul signalement de pluie par région et par jour), au lieu d'en créer une
// nouvelle à chaque rechargement. Jamais un vrai numéro. Le faux téléphone « à écrire » le réutilise (même conversation).

const KEY = "sakia.phone.sid.v1";
const OLD_STORE = "sakia.phone.v1"; // ancienne conversation écrite à la main : { sid, msgs }
const FORMAT = /^sim-[a-z0-9]{6}$/;

const random = () => Math.random().toString(36).slice(2, 8).padEnd(6, "0");

export function getSimNumber(): string {
  try {
    const known = localStorage.getItem(KEY);
    if (known && FORMAT.test(known)) return known;
    const old = (JSON.parse(localStorage.getItem(OLD_STORE) ?? "null") as { sid?: unknown } | null)?.sid;
    const sid = typeof old === "string" && FORMAT.test(old) ? old : `sim-${random()}`;
    localStorage.setItem(KEY, sid);
    return sid;
  } catch {
    return `sim-${random()}`; // stockage bloqué : un numéro pour cette visite seulement
  }
}
