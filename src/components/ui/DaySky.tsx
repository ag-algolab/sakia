// Le ciel du jour, en haut de page. Demande d'Anthony (4 oct.) : « sinon ça se ressemble tous les jours ». Le paysage suit la météo
// du jour (celle du plan affiché) : ciel d'aube, de chaleur ou de pluie (nuages gris et pluie qui tombe à la place du soleil).
// (Un agriculteur dessiné l'accompagnait le matin du 4 oct. ; retiré à la demande d'Anthony : « il est moche ».)
// Même technique que le reste de la scène (SceneKit.tsx) : couches animées par la carte graphique, arrêtées avec « réduire les
// animations ». Décoratif (aria-hidden, comme toute la scène).

import { Layer } from "./SceneKit";
import type { Box } from "./SceneKit";
import type { PlanDay } from "@/lib/plan";

export type DaySky = "dawn" | "heat" | "rain";

const HOT_C = 35; // à partir de 35 °C, une journée « chaude » pour l'image (l'alerte de forte chaleur du moteur, elle, est à 42 °C)
const RAIN_MM = 2; // pluie qui mouille vraiment le sol (moins : quelques gouttes)

export function skyOf(day: PlanDay | null | undefined, replay: boolean): DaySky {
  if (replay || (day && Number.isFinite(day.tmax) && day.tmax >= HOT_C)) return "heat";
  return day && day.rain >= RAIN_MM ? "rain" : "dawn";
}

// Pluie : des traits fins qui tombent sans fin (un motif qui glisse d'une période vers le bas, dans une fenêtre fixe).
// z-[1] : devant le décor animé, mais sous le titre du héros (z-10).
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
