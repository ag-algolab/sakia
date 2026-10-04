// Petits dessins du film. Copiés ici (pictogrammes, olivier, logo) pour que le film ne dépende d'AUCUN fichier de l'interface :
// le poste UI les réécrit en ce moment (un export déplacé a déjà fait tomber la page /story une fois). Mouvement : film.css.

import type { CSSProperties } from "react";

type P = { className?: string };

const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  "aria-hidden": true as const,
});

// goutte = arroser, main = attendre, triangle = demander à une personne
export const DropIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2.2c-.4 0-.8.2-1 .6C8.6 6.6 5 10.6 5 14.6a7 7 0 0 0 14 0c0-4-3.6-8-6-11.8-.2-.4-.6-.6-1-.6z" />
    <path d="M8.6 15.2a3.5 3.5 0 0 0 2.6 3.2" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" />
  </svg>
);

export const HandIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13m0-3a1.5 1.5 0 0 1 3 0v4.5c0 4-2.8 7-6.5 7-2.6 0-4.3-1.2-5.7-3.3L4 14.6a1.6 1.6 0 0 1 2.5-2L8 14" />
  </svg>
);

export const AlertIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </svg>
);

export const PersonIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <circle cx="12" cy="6.2" r="3.2" />
    <path d="M5.5 21v-5.3a6.5 6.5 0 0 1 13 0V21z" />
  </svg>
);

// Rotation d'un élément SVG autour de son propre centre.
export const spin = (origin: string): CSSProperties => ({ transformBox: "fill-box", transformOrigin: origin });

// Olivier qui se balance dans le vent (la plus grosse partie du décor).
export function Olive({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="film-sway" style={{ ...spin("50% 100%"), animationDelay: `${delay}s` }}>
        <path d="M-2.2 0 L-1.4 -13 L1.6 -13 L2.4 0Z" fill="#5a3d22" />
        <ellipse cx="0" cy="-20" rx="15" ry="11" fill="#2f7a47" />
        <ellipse cx="-6" cy="-23" rx="9" ry="7" fill="#3f9559" />
        <ellipse cx="6" cy="-18" rx="8" ry="6" fill="#4fa868" opacity=".9" />
        <ellipse cx="-2" cy="-27" rx="5" ry="3.4" fill="#8fd09a" opacity=".55" />
      </g>
    </g>
  );
}

// Logo : la sakia, roue à godets qui tourne lentement, sur un trait d'eau.
export function Logo({ size = 36 }: { size?: number }) {
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <g className="film-spin" style={{ transformOrigin: "24px 24px", transformBox: "view-box" }}>
        <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        {spokes.map((a) => (
          <g key={a} transform={`rotate(${a} 24 24)`}>
            <line x1="24" y1="24" x2="24" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <rect x="21" y="2.6" width="6" height="5.4" rx="1.4" fill="#f2b33d" />
          </g>
        ))}
      </g>
      <path d="M4 43c4-3 7-3 10 0s6 3 10 0 7-3 10 0 6 3 10 0" fill="none" stroke="#7fc4ee" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// Pictogrammes du film technique.
export const ListIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <circle cx="4.5" cy="6" r="1.3" fill="currentColor" />
    <circle cx="4.5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="4.5" cy="18" r="1.3" fill="currentColor" />
  </svg>
);

export const ShieldIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    <path d="M8.5 12.2l2.5 2.5 4.5-5" />
  </svg>
);
