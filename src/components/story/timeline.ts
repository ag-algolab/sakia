// Le film « Sakia, l'histoire » est une fonction du temps : chaque image est calculée à partir d'un seul nombre `t`
// (secondes). Rien n'est lancé « au hasard » par le navigateur : on peut se placer à n'importe quel instant, revenir
// en arrière, filmer l'écran, et obtenir exactement la même image.

import type { CSSProperties } from "react";

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

// Avancement (0 → 1) d'un mouvement qui commence à `start` et dure `dur` secondes.
export const prog = (t: number, start: number, dur: number) => clamp((t - start) / dur);

export const easeOut = (p: number) => 1 - Math.pow(1 - p, 3);
export const easeInOut = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const easeOutBack = (p: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

// Apparition : fondu + glissement vers le haut.
export function appear(t: number, start: number, dur = 0.6, dy = 28): CSSProperties {
  const p = easeOut(prog(t, start, dur));
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

// Apparition « ressort » : l'élément arrive en grossissant, dépasse un peu, se pose.
export function pop(t: number, start: number, dur = 0.55): CSSProperties {
  const p = prog(t, start, dur);
  const s = easeOutBack(p);
  return { opacity: clamp(p * 3), transform: `scale(${s})` };
}

// Disparition vers le haut (fin d'un bloc de texte).
export function leave(t: number, start: number, dur = 0.5, dy = -30): CSSProperties {
  const p = easeInOut(prog(t, start, dur));
  return { opacity: 1 - p, transform: `translateY(${p * dy}px)` };
}

// Un bloc qui entre à `inAt` et sort à `outAt` (fondu + glissement).
export function windowed(t: number, inAt: number, outAt: number, dIn = 0.6, dOut = 0.5, dy = 28): CSSProperties {
  const pi = easeOut(prog(t, inAt, dIn));
  const po = easeInOut(prog(t, outAt, dOut));
  return { opacity: pi * (1 - po), transform: `translateY(${(1 - pi) * dy - po * dy}px)` };
}

export const fmt = (n: number, digits = 0) => n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// ------------------------------------------------------------------ chapitres

export type SceneId = "open" | "problem" | "answer" | "channels" | "guard" | "proof" | "close";

// `cuts[i]` : instant où commence la scène i ; la dernière valeur est la fin du film.
export const CUTS = [0, 11.4, 37.4, 53.4, 69.4, 77.4, 87.4, 97.4] as const;
export const TOTAL = CUTS[CUTS.length - 1];

export const SCENES: { id: SceneId; label: string; start: number; end: number }[] = (
  [
    ["open", "Meet Noor"],
    ["problem", "The problem"],
    ["answer", "The answer"],
    ["channels", "Where it reaches him"],
    ["guard", "When it is not sure"],
    ["proof", "The proof"],
    ["close", "Sakia"],
  ] as const
).map(([id, label], i) => ({ id, label, start: CUTS[i], end: CUTS[i + 1] }));

// Fondu enchaîné d'une demi-seconde de part et d'autre de la coupe : la scène qui arrive monte par-dessus la scène qui
// part, qui reste entière jusqu'à ce que la nouvelle soit complètement là (pas de « creux » où le fond apparaît).
export const FADE = 0.4;

export type SceneDef = { id: string; label: string; start: number; end: number };

// Opacité de la scène i d'un film quelconque (le film principal et le film technique partagent la même mécanique).
export function sceneOpacityOf(scenes: SceneDef[], i: number, t: number): number {
  const s = scenes[i];
  const fadeIn = i === 0 ? 1 : prog(t, s.start - FADE, FADE * 2);
  const stillOn = i === scenes.length - 1 || t < s.end + FADE ? 1 : 0;
  return fadeIn * stillOn;
}

export function sceneOpacity(i: number, t: number): number {
  return sceneOpacityOf(SCENES, i, t);
}

// Fabrique la liste de scènes d'un film à partir de ses instants de coupe.
export function makeScenes(cuts: readonly number[], labels: readonly (readonly [string, string])[]): SceneDef[] {
  return labels.map(([id, label], i) => ({ id, label, start: cuts[i], end: cuts[i + 1] }));
}

// Quand les animations sont réduites, on ne joue pas le film : on saute d'un arrêt à l'autre. Chaque arrêt est un instant
// « posé », où tout ce que le temps fort doit montrer est à l'écran. Les quatre chiffres du problème sont des arrêts séparés.
// (À revoir si on change les durées d'apparition dans les scènes.)
export const SETTLED = [10.9, 17.3, 23.9, 30.5, 36.9, 49.0, 67.5, 76.4, 85.2, 96.6] as const;

// ------------------------------------------------------------------ fond

type Stop = { t: number; c: [string, string, string] };

// Le fond change de couleur avec l'histoire : nuit, aube, problème (sombre), réponse (clair), garde-fou, preuve, aube.
const STOPS: Stop[] = [
  { t: 0, c: ["#030806", "#030806", "#030806"] },
  { t: 2.6, c: ["#071a13", "#0d2e22", "#14503a"] },
  { t: 7.0, c: ["#0d2e22", "#1a4f36", "#e3b25a"] },
  { t: 11.0, c: ["#0d2e22", "#1a4f36", "#e3b25a"] },
  { t: 12.4, c: ["#0b1b14", "#10281d", "#183024"] },
  { t: 17.6, c: ["#0b1b14", "#10281d", "#183024"] },
  { t: 19.0, c: ["#1c0f0a", "#2c140d", "#3f1b10"] },
  { t: 24.2, c: ["#1c0f0a", "#2c140d", "#3f1b10"] },
  { t: 25.6, c: ["#0b1b14", "#10281d", "#183024"] },
  { t: 37.0, c: ["#0b1b14", "#10281d", "#183024"] },
  { t: 38.4, c: ["#f8f2e4", "#f8f2e4", "#efe3c6"] },
  { t: 69.0, c: ["#f8f2e4", "#f8f2e4", "#efe3c6"] },
  { t: 70.2, c: ["#fbe9d8", "#f8f2e4", "#f8f2e4"] },
  { t: 77.0, c: ["#fbe9d8", "#f8f2e4", "#f8f2e4"] },
  { t: 78.4, c: ["#0b2a1e", "#123524", "#0d2e22"] },
  { t: 87.0, c: ["#0b2a1e", "#123524", "#0d2e22"] },
  { t: 89.2, c: ["#0d2e22", "#1a4f36", "#e3b25a"] },
  { t: 97.4, c: ["#0d2e22", "#1a4f36", "#e3b25a"] },
];

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, p: number) => {
  const x = hex(a);
  const y = hex(b);
  return `rgb(${Math.round(lerp(x[0], y[0], p))},${Math.round(lerp(x[1], y[1], p))},${Math.round(lerp(x[2], y[2], p))})`;
};

export function backdropAt(t: number): string {
  let i = 0;
  while (i < STOPS.length - 2 && t > STOPS[i + 1].t) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const p = easeInOut(prog(t, a.t, b.t - a.t));
  return `linear-gradient(180deg, ${mix(a.c[0], b.c[0], p)} 0%, ${mix(a.c[1], b.c[1], p)} 55%, ${mix(a.c[2], b.c[2], p)} 100%)`;
}
