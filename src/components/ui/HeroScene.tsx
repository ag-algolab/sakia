// Scène du haut de page, version téléphone : l'aube sur la plaine de Kairouan. Le minaret de la Grande Mosquée, des rangées
// d'oliviers qui bougent dans le vent, un soleil qui se lève et une sakia (roue à godets) qui puise l'eau dans le canal.
// Dessin vectoriel : quelques Ko, aucune image à télécharger. Tout est décoratif (aria-hidden).
// FLUIDITÉ : décor immobile = un seul SVG ; chaque élément qui bouge est une couche à part animée par la carte graphique
// (voir SceneKit.tsx). Les collines dépassent du cadre : sur grand écran le paysage se prolonge jusqu'aux bords.
// Les morceaux de dessin (arbre, roue, mosquée…) sont exportés pour la version panoramique (HeroPanorama.tsx).

import { RainClouds, RainLayer } from "./DaySky";
import type { DaySky } from "./DaySky";
import { Layer, Scene, StaticLayer } from "./SceneKit";
import type { Box } from "./SceneKit";

// Utilisé aussi par le film (src/components/story) : API inchangée.
export const spin = (origin: string): React.CSSProperties => ({ transformBox: "fill-box", transformOrigin: origin });

function Crown() {
  return (
    <>
      <path d="M-2.2 0 L-1.4 -13 L1.6 -13 L2.4 0Z" fill="#5a3d22" />
      <ellipse cx="0" cy="-20" rx="15" ry="11" fill="#2f7a47" />
      <ellipse cx="-6" cy="-23" rx="9" ry="7" fill="#3f9559" />
      <ellipse cx="6" cy="-18" rx="8" ry="6" fill="#4fa868" opacity=".9" />
      <ellipse cx="-2" cy="-27" rx="5" ry="3.4" fill="#8fd09a" opacity=".55" />
    </>
  );
}

// Olivier qui se balance tout seul (utilisé par le film). API inchangée.
export function Olive({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sk-sway" style={{ ...spin("50% 100%"), animationDelay: `${delay}s` }}>
        <Crown />
      </g>
    </g>
  );
}

// Olivier immobile : dans les scènes du héros, c'est la COUCHE qui le contient qui se balance (un seul élément animé pour tous).
export function StaticOlive({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Crown />
    </g>
  );
}

export function Drop({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className="sk-drop" style={{ animationDelay: `${delay}s` }} d="M0 -4 C2.6 0 3.2 2.4 0 4.4 C-3.2 2.4 -2.6 0 0 -4Z" fill="#8fd0f5" />
    </g>
  );
}

// La roue de la sakia, dessinée autour de l'origine (rayon du cadre 31, godets jusqu'à ~37).
export function WheelArt() {
  return (
    <>
      <circle r="31" fill="none" stroke="#d9a441" strokeWidth="3" />
      <circle r="5" fill="#d9a441" />
      {Array.from({ length: 8 }, (_, i) => i * 45).map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <line x1="0" y1="0" x2="0" y2="-31" stroke="#d9a441" strokeWidth="2" strokeLinecap="round" />
          <rect x="-4.5" y="-37" width="9" height="9" rx="2" fill="#f2b33d" stroke="#b9801c" strokeWidth="1" />
        </g>
      ))}
    </>
  );
}

// Le chevalet qui porte la roue (immobile), dessiné autour de l'origine.
export function Legs() {
  return <path d="M0 0 L-22 58 M0 0 L22 58 M-14 30 L14 30" stroke="#5a3d22" strokeWidth="3.4" strokeLinecap="round" fill="none" />;
}

// Grande Mosquée de Kairouan : minaret à trois étages et enceinte (coordonnées d'origine : base à y = 170).
export function Mosque() {
  return (
    <>
      <g fill="#0f3b2c">
        <rect x="42" y="152" width="140" height="18" />
        <path d="M128 152 a14 14 0 0 1 28 0Z" />
        <rect x="84" y="126" width="22" height="44" />
        <rect x="87" y="106" width="16" height="22" />
        <rect x="90" y="92" width="10" height="15" />
        <path d="M89 92 h12 l-6 -9Z" />
        <rect x="94" y="78" width="2" height="6" />
        {[48, 62, 76, 112, 126, 140, 154, 168].map((x) => (
          <rect key={x} x={x} y="148" width="5" height="5" />
        ))}
      </g>
      <g fill="#f7d58a" opacity=".5">
        <rect x="93" y="112" width="4" height="7" rx="2" />
        <rect x="93" y="134" width="4" height="9" rx="2" />
      </g>
    </>
  );
}

// Rayons du soleil, autour de l'origine.
export function Rays({ n, r1, rLong, rShort, width }: { n: number; r1: number; rLong: number; rShort: number; width: number }) {
  const step = 360 / n;
  return (
    <>
      {Array.from({ length: n }, (_, i) => i * step).map((a, i) => (
        <line key={a} x1="0" y1={-r1} x2="0" y2={-(i % 2 === 0 ? rLong : rShort)} stroke="#ffd36e" strokeWidth={width} strokeLinecap="round" opacity=".6" transform={`rotate(${a})`} />
      ))}
    </>
  );
}

export const GLOW_STOPS = (
  <>
    <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".95" />
    <stop offset="45%" stopColor="#ffd36e" stopOpacity=".35" />
    <stop offset="100%" stopColor="#ffd36e" stopOpacity="0" />
  </>
);

export const WATER_STOPS = (
  <>
    <stop offset="0" stopColor="#5eb2e6" />
    <stop offset="1" stopColor="#2f8fd0" />
  </>
);

const SCENE: Box = { x: 0, y: 58, w: 400, h: 202 };
const b = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });

export default function HeroScene({ className, sky = "dawn" }: { className?: string; sky?: DaySky }) {
  const rain = sky === "rain";
  return (
    <Scene box={SCENE} className={className}>
      {/* chaleur (jour chaud, rejeu de la canicule) : toute la scène ondule légèrement, en une seule couche */}
      <div className={`absolute inset-0 ${sky === "heat" ? "sk-l sk-l-haze" : ""}`}>
        {/* nuages et oiseaux : glissent lentement */}
        <Layer scene={SCENE} box={b(50, 40, 100, 30)} className="sk-l-drift">
          <g opacity=".16" fill="#fff">
            <ellipse cx="90" cy="58" rx="34" ry="8" />
            <ellipse cx="112" cy="52" rx="22" ry="8" />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(265, 25, 80, 25)} className="sk-l-drift-slow">
          <g opacity=".12" fill="#fff">
            <ellipse cx="300" cy="40" rx="30" ry="7" />
            <ellipse cx="320" cy="35" rx="18" ry="7" />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(140, 80, 60, 28)} className="sk-l-drift-slow">
          <g fill="none" stroke="#0d2e22" strokeWidth="1.4" strokeLinecap="round" opacity=".5">
            <path d="M150 88 q4 -5 8 0 q4 -5 8 0" />
            <path d="M176 100 q3 -4 6 0 q3 -4 6 0" />
          </g>
        </Layer>

        {/* soleil : halo qui respire, rayons qui tournent, disque ; un jour de pluie, des nuages gris à la place */}
        {rain ? (
          <RainClouds scene={SCENE} box={b(20, 60, 360, 70)} clouds={[[90, 92, 22], [222, 80, 26], [322, 98, 24]]} />
        ) : (
          <>
            <Layer scene={SCENE} box={b(222, 72, 156, 156)} className="sk-l-pulse">
              <defs>
                <radialGradient id="cs-glow" cx="50%" cy="50%" r="50%">
                  {GLOW_STOPS}
                </radialGradient>
              </defs>
              <circle cx="300" cy="150" r="78" fill="url(#cs-glow)" />
            </Layer>
            <Layer scene={SCENE} box={b(236, 86, 128, 128)} className="sk-l-spin-rev">
              <g transform="translate(300 150)">
                <Rays n={18} r1={36} rLong={56} rShort={48} width={2} />
              </g>
            </Layer>
            <StaticLayer box={SCENE}>
              <circle cx="300" cy="150" r="26" fill="#ffd770" />
              <circle cx="300" cy="150" r="18" fill="#fff0b3" opacity=".8" />
            </StaticLayer>
          </>
        )}

        {/* décor immobile : collines, mosquée, champ, chevalet de la roue */}
        <StaticLayer box={SCENE}>
          <path d="M-800 178 C-500 160 -200 180 0 176 C60 150 110 168 170 160 S300 148 400 170 C600 188 900 160 1200 176 V400 H-800Z" fill="#1d6648" />
          <Mosque />
          <path d="M-800 200 C-500 184 -200 200 0 196 C70 178 140 192 210 184 S340 176 400 192 C600 206 900 184 1200 198 V400 H-800Z" fill="#0f4631" />
          <path d="M-800 210 C-400 204 -100 208 0 206 C100 197 300 197 400 206 C700 212 1000 204 1200 210 V400 H-800Z" fill="#0a3023" />
          <g fill="#12402e">
            <path d="M200 204 L-40 260 L10 260Z" />
            <path d="M200 204 L60 260 L120 260Z" />
            <path d="M200 204 L170 260 L230 260Z" />
            <path d="M200 204 L280 260 L340 260Z" />
            <path d="M200 204 L390 260 L450 260Z" />
          </g>
          <path d="M248 244 C280 238 300 250 330 244 S380 238 410 244" fill="none" stroke="#2f8fd0" strokeWidth="2" opacity=".5" />
          <g transform="translate(318 178)">
            <Legs />
          </g>
        </StaticLayer>

        {/* oliviers : deux couches (loin, près) qui se balancent à des rythmes différents */}
        <Layer scene={SCENE} box={b(100, 180, 170, 48)} className="sk-l-wind-b">
          <StaticOlive x={150} y={212} s={0.42} />
          <StaticOlive x={188} y={210} s={0.38} />
          <StaticOlive x={226} y={210} s={0.38} />
          <StaticOlive x={112} y={218} s={0.56} />
          <StaticOlive x={256} y={214} s={0.5} />
        </Layer>
        <Layer scene={SCENE} box={b(0, 196, 100, 56)} className="sk-l-wind">
          <StaticOlive x={70} y={228} s={0.8} />
          <StaticOlive x={26} y={246} s={1.1} />
        </Layer>

        {/* canal : l'eau coule (les tirets glissent d'une période, sans fin) */}
        <Layer scene={SCENE} box={b(244, 228, 176, 22)} clip innerClassName="sk-l-flow" innerStyle={{ ["--shift" as string]: `${(24 / 176) * 100}%` }}>
          <defs>
            <linearGradient id="cs-water" x1="0" x2="1">
              {WATER_STOPS}
            </linearGradient>
          </defs>
          <path d="M226 238 L250 238 C280 232 300 244 330 238 S380 232 410 238 L470 238" fill="none" stroke="url(#cs-water)" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 10" />
        </Layer>

        {/* la roue tourne, ses godets puisent l'eau ; les gouttes retombent vers le canal */}
        <Layer scene={SCENE} box={b(274, 134, 88, 88)} className="sk-l-spin">
          <g transform="translate(318 178)">
            <WheelArt />
          </g>
        </Layer>
        <Layer scene={SCENE} box={b(290, 196, 60, 50)}>
          <Drop x={300} y={206} delay={0} />
          <Drop x={312} y={204} delay={0.5} />
          <Drop x={326} y={206} delay={1} />
          <Drop x={338} y={204} delay={1.5} />
        </Layer>
        {rain && <RainLayer scene={SCENE} box={b(0, 58, 400, 160)} id="cs-rain" />}
      </div>
    </Scene>
  );
}
