"use client";

// Présentateur dessiné en vectoriel. Le parent anime la bouche, les yeux et la tête en modifiant
// directement le DOM à chaque image (pas de rendu React 60 fois par seconde).

import type { Ref } from "react";

// Les parties animées portent data-part="..." : le parent les retrouve une fois à l'affichage.
export default function Presenter({ svgRef }: { svgRef: Ref<SVGSVGElement> }) {
  return (
    <svg ref={svgRef} viewBox="0 0 200 250" role="img" aria-label="Presenter" className="h-full w-auto drop-shadow-xl">
      {/* épaules et veste */}
      <path d="M10 250 C14 205 52 188 100 188 C148 188 186 205 190 250 Z" fill="#23463a" />
      <path d="M72 190 L100 232 L128 190 Z" fill="#f2ead8" />
      <path d="M72 190 L100 232 L86 192 Z" fill="#1a362c" />
      <path d="M128 190 L100 232 L114 192 Z" fill="#1a362c" />
      {/* épingle : roue d'irrigation */}
      <g transform="translate(142 214)" stroke="#e7c36a" strokeWidth="1.4" fill="none">
        <circle r="7" />
        <path d="M-7 0H7M0 -7V7M-5 -5L5 5M-5 5L5 -5" />
      </g>
      {/* cou */}
      <path d="M84 160 H116 V194 C108 202 92 202 84 194 Z" fill="#b98a66" />
      <g data-part="head">
        {/* oreilles */}
        <ellipse cx="54" cy="116" rx="7" ry="14" fill="#c9996f" />
        <ellipse cx="146" cy="116" rx="7" ry="14" fill="#c9996f" />
        {/* visage */}
        <path d="M56 106 C56 62 78 44 100 44 C122 44 144 62 144 106 C144 146 124 172 100 172 C76 172 56 146 56 106 Z" fill="#d6a67c" />
        {/* cheveux */}
        <path d="M54 104 C48 56 76 32 102 32 C128 32 152 54 146 104 C142 84 134 68 118 62 C102 70 76 70 62 80 C58 86 56 94 54 104 Z" fill="#2a2320" />
        {/* sourcils */}
        <path data-part="browL" d="M72 96 Q82 91 92 96" stroke="#2a2320" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path data-part="browR" d="M108 96 Q118 91 128 96" stroke="#2a2320" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        {/* yeux */}
        <ellipse cx="82" cy="110" rx="9" ry="5.5" fill="#fbf6ec" />
        <ellipse cx="118" cy="110" rx="9" ry="5.5" fill="#fbf6ec" />
        <ellipse data-part="eyeL" cx="82" cy="110" rx="4.2" ry="5" fill="#33241b" />
        <ellipse data-part="eyeR" cx="118" cy="110" rx="4.2" ry="5" fill="#33241b" />
        {/* nez */}
        <path d="M100 112 C97 126 95 132 99 134 C101 135 103 135 105 133" stroke="#a97650" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {/* bouche */}
        <ellipse cx="100" cy="150" rx="15" ry="1.3" fill="#5a1f1f" stroke="#a45448" strokeWidth="2.4" data-part="mouth" />
        <ellipse cx="100" cy="156" rx="8" ry="2" fill="#c8665f" opacity="0" data-part="tongue" />
      </g>
    </svg>
  );
}
