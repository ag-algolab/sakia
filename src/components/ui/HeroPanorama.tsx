// Version panoramique de la scène du haut de page, pour les grands écrans : toute la largeur est dessinée (minaret à gauche,
// plaine d'oliviers au centre, soleil et sakia à droite), sans zone vide ni bord net. Les collines dépassent du cadre
// (overflow visible) : au-delà de 1500 px, le paysage se prolonge simplement jusqu'aux bords de l'écran.
// Décoratif (aria-hidden). Même langage visuel que HeroScene (version téléphone).
// FLUIDITÉ : décor immobile = un seul SVG ; ce qui bouge (roue, rayons, nuages, arbres, canal) = petites couches animées par
// la carte graphique (voir SceneKit.tsx). Mesuré avant : 44 animations dans un SVG = ~26 images/s avec des saccades.

import { Drop, GLOW_STOPS, Legs, Mosque, Rays, StaticOlive, WATER_STOPS, WheelArt } from "./HeroScene";
import { Layer, Scene, StaticLayer } from "./SceneKit";
import type { Box } from "./SceneKit";

const SCENE: Box = { x: 0, y: 0, w: 1200, h: 300 };
const VP = { x: 600, y: 246 }; // point de fuite des rangées d'oliviers
const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

export default function HeroPanorama({ className, hot = false }: { className?: string; hot?: boolean }) {
  const rowsX = [-200, 40, 280, 520, 760, 1000, 1240, 1480];
  // oliviers : plus ils sont près de l'horizon, plus ils sont petits (4 profondeurs par rangée)
  const trees = rowsX.flatMap((rx) =>
    [0.28, 0.5, 0.74, 1].map((t) => ({
      t,
      x: VP.x + (rx - VP.x) * t * 0.62,
      y: VP.y + 6 + (300 - VP.y) * t,
      s: 0.34 + 0.95 * t,
    })),
  );
  const far = trees.filter((t) => t.t <= 0.5);
  const near = trees.filter((t) => t.t > 0.5);

  return (
    <Scene box={SCENE} className={className}>
      <div className={`absolute inset-0 ${hot ? "sk-l sk-l-haze" : ""}`}>
        {/* nuages et oiseaux */}
        <Layer scene={SCENE} box={b(90, 60, 200, 40)} className="sk-l-drift">
          <g opacity=".16" fill="#fff">
            <ellipse cx="170" cy="86" rx="70" ry="12" />
            <ellipse cx="215" cy="76" rx="44" ry="12" />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(570, 30, 180, 35)} className="sk-l-drift-slow">
          <g opacity=".13" fill="#fff">
            <ellipse cx="640" cy="52" rx="60" ry="10" />
            <ellipse cx="682" cy="44" rx="34" ry="10" />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(970, 78, 150, 34)} className="sk-l-drift">
          <g opacity=".12" fill="#fff">
            <ellipse cx="1040" cy="96" rx="64" ry="11" />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(460, 60, 540, 80)} className="sk-l-drift-slow">
          <g fill="none" stroke="#0d2e22" strokeWidth="2" strokeLinecap="round" opacity=".5">
            <path d="M470 110 q6 -7 12 0 q6 -7 12 0" />
            <path d="M510 130 q4 -5 8 0 q4 -5 8 0" />
            <path d="M980 70 q5 -6 10 0 q5 -6 10 0" />
          </g>
        </Layer>

        {/* soleil : halo qui respire, rayons qui tournent, disque */}
        <Layer scene={SCENE} box={b(730, 56, 240, 240)} className="sk-l-pulse">
          <defs>
            <radialGradient id="pk-glow" cx="50%" cy="50%" r="50%">
              {GLOW_STOPS}
            </radialGradient>
          </defs>
          <circle cx="850" cy="176" r="120" fill="url(#pk-glow)" />
        </Layer>
        <Layer scene={SCENE} box={b(750, 76, 200, 200)} className="sk-l-spin-rev">
          <g transform="translate(850 176)">
            <Rays n={20} r1={56} rLong={92} rShort={78} width={3} />
          </g>
        </Layer>
        <StaticLayer box={SCENE}>
          <circle cx="850" cy="176" r="42" fill="#ffd770" />
          <circle cx="850" cy="176" r="29" fill="#fff0b3" opacity=".8" />
        </StaticLayer>

        {/* décor immobile : collines (elles dépassent du cadre), mosquée, champ, chevalet */}
        <StaticLayer box={SCENE}>
          <path d="M-2000 208 C-1000 188 -300 214 0 204 C180 176 330 206 520 190 S760 166 960 196 S1160 178 1200 190 C1600 214 2400 184 3200 204 V420 H-2000Z" fill="#1d6648" />
          <g transform="translate(150 -26) scale(1.45)">
            <Mosque />
          </g>
          <path d="M-2000 232 C-1000 214 -300 238 0 230 C250 208 480 232 700 222 S1040 208 1200 226 C1700 244 2400 214 3200 230 V420 H-2000Z" fill="#0f4631" />
          <path d="M-2000 252 C-800 244 -200 250 0 248 C400 240 800 240 1200 248 C1800 252 2600 244 3200 252 V420 H-2000Z" fill="#0a3023" />
          <g fill="#12402e">
            {rowsX.map((rx) => (
              <path key={rx} d={`M${VP.x} ${VP.y} L${rx - 60} 340 L${rx + 60} 340Z`} />
            ))}
          </g>
          <path d="M880 294 C940 286 990 300 1050 292 S1160 284 1260 294" fill="none" stroke="#2f8fd0" strokeWidth="3" opacity=".5" />
          <g transform="translate(980 214) scale(1.35)">
            <Legs />
          </g>
        </StaticLayer>

        {/* oliviers : deux couches (loin, près) qui se balancent à des rythmes différents */}
        <Layer scene={SCENE} box={b(100, 230, 1000, 60)} className="sk-l-wind-b">
          {far.map((t, i) => (
            <StaticOlive key={i} x={t.x} y={t.y} s={t.s} />
          ))}
        </Layer>
        <Layer scene={SCENE} box={b(40, 250, 1130, 76)} className="sk-l-wind">
          {near.map((t, i) => (
            <StaticOlive key={i} x={t.x} y={t.y} s={t.s} />
          ))}
        </Layer>

        {/* canal : l'eau coule (les tirets glissent d'une période, sans fin) */}
        <Layer scene={SCENE} box={b(860, 274, 420, 34)} clip innerClassName="sk-l-flow" innerStyle={{ ["--shift" as string]: `${(34 / 420) * 100}%` }}>
          <defs>
            <linearGradient id="pk-water" x1="0" x2="1">
              {WATER_STOPS}
            </linearGradient>
          </defs>
          <path d="M826 286 L880 286 C940 278 990 292 1050 284 S1160 276 1260 286 L1340 286" fill="none" stroke="url(#pk-water)" strokeWidth="7" strokeLinecap="round" strokeDasharray="20 14" />
        </Layer>

        {/* la roue tourne ; les gouttes retombent vers le canal */}
        <Layer scene={SCENE} box={b(922, 156, 116, 116)} className="sk-l-spin">
          <g transform="translate(980 214) scale(1.35)">
            <WheelArt />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(930, 244, 100, 70)}>
          <Drop x={944} y={262} delay={0} />
          <Drop x={968} y={258} delay={0.5} />
          <Drop x={994} y={262} delay={1} />
          <Drop x={1018} y={258} delay={1.5} />
        </Layer>
      </div>
    </Scene>
  );
}
