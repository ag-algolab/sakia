"use client";

// Présentatrice dessinée en vectoriel : une illustration à plat, ronde et chaleureuse (grands yeux, joues roses, sourire doux),
// aux couleurs du site. Volontairement stylisée : ni foulard ni costume « typé », une animatrice souriante, comme une
// agronome à l'antenne. Quelques Ko de SVG, aucune image.
//
// Le parent l'anime à chaque image en posant des attributs dans le DOM (voir presenterPose.ts, qui garde TOUTE la géométrie
// des parties animées : tête, bouche, dents, langue, lèvres, yeux, sourcils). Les parties animées portent data-part="...".

import { memo } from "react";
import type { Ref } from "react";
import { EYE, HEAD_PIVOT, MOUTH, browPath, eyeTransform, mouthPaths, tongue } from "./presenterPose";

const HAIR = "#2d1b15"; // derrière : un peu plus sombre, pour que la frange se détache
const HAIR_FRONT = "#3b251d";
const SKIN = "#ebb691";

function Eye({ part, cx, flick }: { part: "eyeL" | "eyeR"; cx: number; flick: number }) {
  return (
    <g data-part={part} transform={eyeTransform(cx, 1)}>
      <ellipse cx={cx} cy={EYE.y + 1} rx="9.8" ry="11.4" fill="#36201a" />
      <ellipse cx={cx} cy={EYE.y + 7} rx="6.4" ry="4" fill="#7a4d38" opacity=".55" />
      <circle cx={cx + 3.4} cy={EYE.y - 3.8} r="3.7" fill="#fff" />
      <circle cx={cx - 3.4} cy={EYE.y + 5.2} r="1.7" fill="#fff" opacity=".9" />
      {/* petit cil au coin extérieur */}
      <path d={`M${cx + flick * 9.6} ${EYE.y - 4.6}Q${cx + flick * 13.6} ${EYE.y - 5} ${cx + flick * 15.6} ${EYE.y - 9.4}`} stroke="#36201a" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </g>
  );
}

function PresenterSvg({ svgRef }: { svgRef: Ref<SVGSVGElement> }) {
  const m = mouthPaths(0);
  const t = tongue(0);
  return (
    <svg ref={svgRef} viewBox="0 0 240 300" aria-hidden focusable="false" className="h-full w-auto">
      <defs>
        <radialGradient id="bl-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff9e0" stopOpacity=".95" />
          <stop offset=".55" stopColor="#ffeaa6" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffeaa6" stopOpacity="0" />
        </radialGradient>
        <clipPath id="bl-mouth">
          <path data-part="clip" d={m.inner} />
        </clipPath>
      </defs>

      {/* halo de lumière derrière la tête : détache les cheveux sombres du décor */}
      <circle cx="120" cy="132" r="118" fill="url(#bl-halo)" />

      {/* veste bleue (couleur de l'eau du site), chemisier crème, épingle en goutte d'eau dorée */}
      <path d="M10 300C10 252 38 226 86 214H154C202 226 230 252 230 300Z" fill="#1f6fae" />
      <path d="M90 214 120 268 150 214Z" fill="#fbf1d9" />
      <path d="M90 214 120 268 102 270 74 232Z" fill="#2a84c8" />
      <path d="M150 214 120 268 138 270 166 232Z" fill="#2a84c8" />
      <path d="M176 252c-6 8-7 11-7 14a7 7 0 0 0 14 0c0-3-1-6-7-14Z" fill="#f2b33d" />
      <path d="M174 263a3.4 3.4 0 0 0 2.4 3.2" stroke="#fff6d6" strokeWidth="1.8" strokeLinecap="round" fill="none" />

      <g data-part="head" transform={`translate(0 0)rotate(0 ${HEAD_PIVOT.x} ${HEAD_PIVOT.y})`}>
        {/* cheveux : masse ondulée derrière tout, qui retombe sur les épaules (le cou passe devant) */}
        <path d="M120 42C80 42 52 74 52 124C52 156 48 186 40 214C52 234 80 238 100 224C102 214 106 204 110 190H130C134 204 138 214 140 224C160 238 188 234 200 214C192 186 188 156 188 124C188 74 160 42 120 42Z" fill={HAIR} />
        {/* cou, court, avec l'ombre du menton */}
        <path d="M104 172H136V218Q120 232 104 218Z" fill="#dba27b" />
        <path d="M104 172H136V196Q120 210 104 196Z" fill="#c68a62" opacity=".5" />
        {/* visage rond */}
        <path d="M64 124C64 86 88 64 120 64C152 64 176 86 176 124C176 160 152 190 120 190C88 190 64 160 64 124Z" fill={SKIN} />
        {/* joues roses */}
        <ellipse cx="87" cy="159" rx="12.5" ry="7.8" fill="#ee7f70" opacity=".42" />
        <ellipse cx="153" cy="159" rx="12.5" ry="7.8" fill="#ee7f70" opacity=".42" />
        {/* sourcils */}
        <path data-part="browL" d={browPath("left", 0)} stroke="#44291e" strokeWidth="3.8" strokeLinecap="round" fill="none" />
        <path data-part="browR" d={browPath("right", 0)} stroke="#44291e" strokeWidth="3.8" strokeLinecap="round" fill="none" />
        {/* grands yeux doux, avec un reflet */}
        <Eye part="eyeL" cx={EYE.left} flick={-1} />
        <Eye part="eyeR" cx={EYE.right} flick={1} />
        {/* petit nez */}
        <path d="M115.5 151Q120 156.5 124.5 151" stroke="#c88a62" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* bouche : un sourire doux au repos, qui s'ouvre en parlant (intérieur, dents, langue, lèvre du bas, contour) */}
        <path data-part="mouth" d={m.inner} fill="#7a2c2c" />
        <g clipPath="url(#bl-mouth)">
          <path data-part="teeth" d={m.teeth} fill="#fffaf0" />
          <ellipse data-part="tongue" cx={MOUTH.x} cy={t.cy} rx={t.rx} ry={t.ry} fill="#e8837c" opacity={t.opacity} />
        </g>
        <path data-part="lower" d={m.lower} fill="#d9695f" />
        <path data-part="lips" d={m.inner} fill="none" stroke="#bb4a44" strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round" />
        {/* frange de côté et mèches qui encadrent le visage, d'un seul tenant */}
        <path d="M60 132C54 82 82 48 124 48C166 48 188 82 180 132C179 148 177 160 172 172C168 160 166 142 164 122C158 100 142 88 124 80C108 82 92 90 80 100C76 106 74 112 74 120C74 140 72 156 68 172C64 160 62 148 60 132Z" fill={HAIR_FRONT} />
      </g>
    </svg>
  );
}

// Jamais rendu de nouveau : tout le mouvement passe par le DOM, pas par React.
export default memo(PresenterSvg);
