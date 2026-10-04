"use client";

import { useId } from "react";
import type { Ref } from "react";

// Présentateur plus doux que l'ancien (yeux écarquillés, bouche en trait droit, regard fixe : « elle fait peur »).
// MÊME MÉCANIQUE que src/components/bulletin/Presenter.tsx : le parent anime les parties marquées data-part="..." en modifiant
// le DOM image par image (head : translate ; mouth : rx et ry ; eyeL / eyeR : ry ; browL / browR : d, avec les coordonnées
// « M72 y Q82 y-5 92 y » et « M108 y Q118 y-5 128 y » ; tongue : opacity). Pour le brancher, le poste Bulletin remplace une seule ligne :
//   import Presenter from "@/components/ui/FriendlyPresenter";
// Ce qui change : sourire permanent (la bouche s'ouvre SOUS la ligne du sourire), yeux ronds sans blanc visible (le clignement est
// un vrai clignement), joues rosées, sourcils fins et clairs, cheveux dégagés, couleurs chaudes du soleil de Sakia.

export default function FriendlyPresenter({ svgRef }: { svgRef: Ref<SVGSVGElement> }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const clip = `fp-mouth-${id}`;
  return (
    <svg ref={svgRef} viewBox="0 0 200 250" role="img" aria-label="Presenter" className="h-full w-auto drop-shadow-xl">
      <defs>
        {/* la bouche ne se voit que sous la ligne du sourire */}
        <clipPath id={clip}>
          <path d="M84 144 Q100 158 116 144 L134 190 L66 190 Z" />
        </clipPath>
      </defs>

      {/* cheveux derrière les épaules */}
      <path d="M44 122 C36 64 66 26 100 26 C134 26 164 64 156 122 C154 156 148 184 136 198 L64 198 C52 184 46 156 44 122 Z" fill="#3b2a22" />

      {/* épaules, veste verte, chemisier clair */}
      <path d="M8 250 C12 208 50 190 100 190 C150 190 188 208 192 250 Z" fill="#2f6b45" />
      <path d="M70 192 L100 236 L130 192 Z" fill="#f8f1e1" />
      <path d="M70 192 L100 236 L84 194 Z" fill="#245737" />
      <path d="M130 192 L100 236 L116 194 Z" fill="#245737" />
      {/* épingle : roue d'irrigation */}
      <g transform="translate(146 216)" stroke="#f2b33d" strokeWidth="1.6" fill="none" strokeLinecap="round">
        <circle r="7.5" />
        <path d="M-7.5 0H7.5M0 -7.5V7.5M-5.3 -5.3L5.3 5.3M-5.3 5.3L5.3 -5.3" />
      </g>

      {/* cou */}
      <path d="M85 158 H115 V196 C108 205 92 205 85 196 Z" fill="#cf9a72" />

      <g data-part="head">
        {/* visage */}
        <path d="M57 108 C57 70 76 53 100 53 C124 53 143 70 143 108 C143 146 124 171 100 171 C76 171 57 146 57 108 Z" fill="#e5b48d" />
        {/* cheveux de devant : front dégagé, raie sur le côté */}
        <path d="M54 102 C48 62 76 38 102 38 C132 38 154 62 146 102 C144 80 133 62 113 55 C94 62 68 66 59 86 C57 92 55 97 54 102 Z" fill="#3b2a22" />
        {/* joues */}
        <ellipse cx="72" cy="134" rx="9.5" ry="6" fill="#e0786b" opacity="0.32" />
        <ellipse cx="128" cy="134" rx="9.5" ry="6" fill="#e0786b" opacity="0.32" />
        {/* sourcils : fins et arrondis */}
        <path data-part="browL" d="M72 96 Q82 91 92 96" stroke="#5a4033" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path data-part="browR" d="M108 96 Q118 91 128 96" stroke="#5a4033" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* yeux : ronds, sans blanc visible */}
        <ellipse data-part="eyeL" cx="82" cy="110" rx="5.2" ry="5" fill="#2d1f19" />
        <ellipse data-part="eyeR" cx="118" cy="110" rx="5.2" ry="5" fill="#2d1f19" />
        <circle cx="84" cy="108.2" r="1.7" fill="#fff" opacity="0.9" />
        <circle cx="120" cy="108.2" r="1.7" fill="#fff" opacity="0.9" />
        {/* nez */}
        <path d="M100 119 C99 124 97.5 127 99.5 128.5 C101 129.5 102.8 129.2 104 128" stroke="#b98160" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* intérieur de la bouche : animé par le parent, découpé sous la ligne du sourire (au repos il est entièrement caché) */}
        <g clipPath={`url(#${clip})`}>
          <g transform="translate(100 143.5) scale(1 1.6) translate(-100 -143.5)">
            <ellipse data-part="mouth" cx="100" cy="143.5" rx="15" ry="1.3" fill="#6e2424" />
          </g>
        </g>
        {/* langue : le parent la montre quand la bouche est grande ; ici elle reste cachée (la bouche pleine suffit) */}
        <ellipse data-part="tongue" cx="100" cy="158" rx="7" ry="2.4" fill="#d97b73" opacity="0" style={{ display: "none" }} />
        {/* ligne du sourire (lèvres) : toujours visible */}
        <path d="M84 144 Q100 158 116 144" stroke="#a8443f" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}
