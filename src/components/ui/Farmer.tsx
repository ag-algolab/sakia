// L'agriculteur du haut de page, et l'humeur du jour. Demande d'Anthony (4 oct.) : « quelque chose d'un peu plus humain : sinon
// ça se ressemble tous les jours ». Le paysage suit maintenant la météo du jour (celle du plan affiché) : ciel d'aube, de chaleur
// ou de pluie, et un agriculteur coiffé de la mdhalla (le chapeau de paille des campagnes tunisiennes) qui salue, s'essuie le
// front quand il fait chaud, sort le parapluie quand il pleut, et ouvre le canal à la houe les jours où il faut arroser.
// Même technique que le reste de la scène (SceneKit.tsx) : le corps est dessiné une fois, seul le bras qui bouge est une couche
// animée par la carte graphique. Décoratif (aria-hidden, comme toute la scène).

import { Layer, StaticLayer } from "./SceneKit";
import type { Box } from "./SceneKit";
import type { PlanDay } from "@/lib/plan";

export type DayMood = { sky: "dawn" | "heat" | "rain"; pose: "wave" | "wipe" | "umbrella" | "hoe" };

export const CALM: DayMood = { sky: "dawn", pose: "wave" };
const HOT_C = 35; // à partir de 35 °C, une journée « chaude » pour l'image (l'alerte de forte chaleur du moteur, elle, est à 42 °C)
const RAIN_MM = 2; // pluie qui mouille vraiment le sol (moins : quelques gouttes)

// `water` : le plan de la personne (région ET culture choisies) dit d'arroser aujourd'hui.
export function moodOf(day: PlanDay | null | undefined, replay: boolean, water: boolean): DayMood {
  const sky: DayMood["sky"] =
    replay || (day && Number.isFinite(day.tmax) && day.tmax >= HOT_C) ? "heat" : day && day.rain >= RAIN_MM ? "rain" : "dawn";
  const pose: DayMood["pose"] = sky === "rain" ? "umbrella" : water ? "hoe" : sky === "heat" ? "wipe" : "wave";
  return { sky, pose };
}

const SKIN = "#c68a5c";
const SHIRT = "#2f6fa3";
const SHIRT_DARK = "#24577f";
const TROUSERS = "#3b3a36";
const SHOES = "#2a1d12";
const STRAW = "#e8c47a";
const STRAW_DARK = "#b9801c";
const WOOD = "#8a5a2b";
const METAL = "#9aa6aa";

const limb = { stroke: SHIRT, strokeWidth: 3.4, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;

// Le bras gauche qui tient la houe posée au sol (toutes les poses sauf « houe » où les deux mains travaillent).
function RestingHoe() {
  return (
    <>
      <line x1={-15} y1={0.5} x2={-10.5} y2={-41} stroke={WOOD} strokeWidth={1.6} strokeLinecap="round" />
      <path d="M-19.5 1.2 L-12.5 1.2 L-13.2 -2.4 L-18.4 -2.4Z" fill={METAL} />
      <path d="M-8 -43 L-11.6 -35 L-12.4 -28.6" {...limb} />
      <circle cx={-12.4} cy={-27.6} r={1.8} fill={SKIN} />
    </>
  );
}

// Corps, dessiné autour de l'origine : les pieds à (0, 0), la tête vers y = -54, le chapeau jusqu'à y = -67.
function Body({ pose }: { pose: DayMood["pose"] }) {
  return (
    <>
      <ellipse cx={0} cy={0.6} rx={14} ry={2.2} fill="#000" opacity={0.18} />
      {pose !== "hoe" && <RestingHoe />}
      <rect x={-6} y={-22} width={4.6} height={21} rx={1.5} fill={TROUSERS} />
      <rect x={1.4} y={-22} width={4.6} height={21} rx={1.5} fill={TROUSERS} />
      <ellipse cx={-3.9} cy={-0.7} rx={4} ry={1.7} fill={SHOES} />
      <ellipse cx={3.9} cy={-0.7} rx={4} ry={1.7} fill={SHOES} />
      <path d="M-9 -41 Q-9 -46 -4.5 -46.5 L4.5 -46.5 Q9 -46 9 -41 L8.6 -21 L-8.6 -21Z" fill={SHIRT} />
      <path d="M0 -46 L0 -23.5" stroke={SHIRT_DARK} strokeWidth={0.8} />
      <rect x={-8.7} y={-23.4} width={17.4} height={2.4} fill="#5a3d22" />
      <rect x={-2} y={-50} width={4} height={4.6} fill={SKIN} />
      <circle cx={0} cy={-54} r={5.6} fill={SKIN} />
      <circle cx={-2} cy={-54.1} r={0.62} fill={SHOES} />
      <circle cx={2} cy={-54.1} r={0.62} fill={SHOES} />
      <path d="M-2.8 -51.4 Q0 -49.9 2.8 -51.4" stroke="#3a2a1c" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      {/* la mdhalla : calotte haute, large bord de paille */}
      <path d="M-5.6 -58.2 Q-5.2 -66.5 0 -67.5 Q5.2 -66.5 5.6 -58.2Z" fill={STRAW} />
      <path d="M-5.5 -60 L5.5 -60 L5.6 -58.3 L-5.6 -58.3Z" fill={STRAW_DARK} />
      <ellipse cx={0} cy={-58} rx={13.5} ry={2.8} fill={STRAW} stroke="#c9963f" strokeWidth={0.6} />
      {pose === "wipe" && (
        <g fill="#8fd0f5">
          <path d="M-7.4 -55.6 c1 1.4 1.3 2.4 0 3 c-1.3 -0.6 -1 -1.6 0 -3Z" />
          <path d="M-8.6 -51.4 c0.8 1.1 1 1.9 0 2.4 c-1 -0.5 -0.8 -1.3 0 -2.4Z" />
        </g>
      )}
    </>
  );
}

// Ce qui bouge, par pose : le rectangle (coordonnées du personnage), le point de pivot, la classe d'animation, le dessin.
const MOVES: Record<DayMood["pose"], { box: Box; pivot: [number, number]; cls: string; art: React.ReactNode }> = {
  // il salue : bras levé qui s'agite de temps en temps
  wave: {
    box: { x: 4, y: -62, w: 16, h: 22 },
    pivot: [8, -43],
    cls: "sk-l-wave",
    art: (
      <>
        <path d="M8 -43 L13 -49 L15 -56.4" {...limb} />
        <circle cx={15.2} cy={-57.6} r={1.9} fill={SKIN} />
      </>
    ),
  },
  // il fait chaud : il s'essuie le front
  wipe: {
    box: { x: 2, y: -60, w: 14, h: 20 },
    pivot: [8, -43],
    cls: "sk-l-wipe",
    art: (
      <>
        <path d="M8 -43 L12.6 -48.4 L6.8 -55" {...limb} />
        <circle cx={6} cy={-55.6} r={1.9} fill={SKIN} />
      </>
    ),
  },
  // il pleut : le parapluie (la pluie est une bonne nouvelle : pas d'arrosage à payer)
  umbrella: {
    box: { x: -12, y: -84, w: 40, h: 44 },
    pivot: [8, -43],
    cls: "sk-l-umbrella",
    art: (
      <>
        <path d="M-10 -70 Q8 -88 26 -70 Q21.5 -72.6 17 -70 Q12.5 -72.6 8 -70 Q3.5 -72.6 -1 -70 Q-5.5 -72.6 -10 -70Z" fill="#1f5c43" />
        <path d="M8 -82 L8 -84" stroke="#1f5c43" strokeWidth={1.4} strokeLinecap="round" />
        <path d="M8 -71 L8 -50.6 Q8 -48.6 10 -48.6" stroke="#2a1d12" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <path d="M8 -43 L12.4 -46.6 L9.2 -51.6" {...limb} />
        <circle cx={8.8} cy={-52.4} r={1.9} fill={SKIN} />
      </>
    ),
  },
  // jour d'arrosage : les deux mains sur la houe, il ouvre le canal
  hoe: {
    box: { x: -10, y: -46, w: 40, h: 50 },
    pivot: [0, -43],
    cls: "sk-l-hoe",
    art: (
      <>
        <line x1={4} y1={-40} x2={23} y2={0} stroke={WOOD} strokeWidth={1.6} strokeLinecap="round" />
        <path d="M19.6 1.6 L27 -1.4 L26 -4.4 L20.2 -2.2Z" fill={METAL} />
        <path d="M-8 -43 L-2 -33.6 L9.6 -28.4" {...limb} />
        <path d="M8 -43 L13.4 -33.6 L12.6 -22.4" {...limb} />
        <circle cx={9.8} cy={-28} r={1.8} fill={SKIN} />
        <circle cx={12.6} cy={-21.8} r={1.8} fill={SKIN} />
      </>
    ),
  },
};

// Le personnage posé dans une scène : pieds en (x, y), échelle s.
export function FarmerLayers({ scene, x, y, s, pose }: { scene: Box; x: number; y: number; s: number; pose: DayMood["pose"] }) {
  const m = MOVES[pose];
  const place = `translate(${x} ${y}) scale(${s})`;
  const box: Box = { x: x + m.box.x * s, y: y + m.box.y * s, w: m.box.w * s, h: m.box.h * s };
  const origin = `${((m.pivot[0] - m.box.x) / m.box.w) * 100}% ${((m.pivot[1] - m.box.y) / m.box.h) * 100}%`;
  // z-[1] : devant le canal animé (une couche composée par la carte graphique pouvait passer devant ses jambes), mais sous le titre (z-10)
  return (
    <div className="absolute inset-0 z-[1]">
      <StaticLayer box={scene}>
        <g transform={place}>
          <Body pose={pose} />
        </g>
      </StaticLayer>
      <Layer scene={scene} box={box} innerClassName={m.cls} innerStyle={{ transformOrigin: origin }}>
        <g transform={place}>{m.art}</g>
      </Layer>
    </div>
  );
}

// Pluie : des traits fins qui tombent sans fin (un motif qui glisse d'une période vers le bas, dans une fenêtre fixe).
export function RainLayer({ scene, box, id }: { scene: Box; box: Box; id: string }) {
  const P = 24; // période verticale du motif
  return (
    <div className="absolute inset-0 z-[1]">
      <Layer scene={scene} box={box} clip innerClassName="sk-l-rain" innerStyle={{ ["--shift" as string]: `${(P / box.h) * 100}%` }}>
        <defs>
          <pattern id={id} width={14} height={P} patternUnits="userSpaceOnUse">
            <line x1={9} y1={2} x2={7} y2={10} stroke="#d6ecf8" strokeWidth={1} strokeLinecap="round" opacity={0.55} />
            <line x1={3} y1={14} x2={1} y2={22} stroke="#d6ecf8" strokeWidth={1} strokeLinecap="round" opacity={0.4} />
          </pattern>
        </defs>
        <rect x={box.x} y={box.y - P} width={box.w} height={box.h + P} fill={`url(#${id})`} />
      </Layer>
    </div>
  );
}

// Nuages gris d'un jour de pluie (ils remplacent le soleil).
export function RainClouds({ scene, box, clouds }: { scene: Box; box: Box; clouds: [number, number, number][] }) {
  return (
    <Layer scene={scene} box={box} className="sk-l-drift-slow">
      <g fill="#e4ebee" opacity={0.5}>
        {clouds.map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <ellipse cx={cx} cy={cy} rx={r * 2.2} ry={r * 0.62} />
            <ellipse cx={cx - r * 0.7} cy={cy - r * 0.42} rx={r} ry={r * 0.62} />
            <ellipse cx={cx + r * 0.55} cy={cy - r * 0.5} rx={r * 1.1} ry={r * 0.72} />
          </g>
        ))}
      </g>
    </Layer>
  );
}
