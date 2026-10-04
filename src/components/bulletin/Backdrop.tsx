// Décor du plateau : un matin doré sur la plaine d'oliviers, aux couleurs du site (heure dorée, vert d'olivier, or de la sakia).
// Décoratif (aria-hidden) et immobile : rien à animer sur un téléphone modeste. Rempli à ras bord (slice) à toutes les largeurs.

const OLIVES: [x: number, y: number, s: number][] = [
  [130, 474, 0.9],
  [250, 458, 0.6],
  [610, 470, 0.7],
  [905, 482, 0.9],
  [965, 456, 0.5],
];

export default function Backdrop() {
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMax slice" aria-hidden focusable="false" className="absolute inset-0 h-full w-full">
      <defs>
        <linearGradient id="bl-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4d2" />
          <stop offset=".62" stopColor="#ffe1a0" />
          <stop offset="1" stopColor="#ffd488" />
        </linearGradient>
      </defs>
      <rect width="1000" height="600" fill="url(#bl-sky)" />
      {/* quelques nuages */}
      <g fill="#fff" opacity=".6">
        <ellipse cx="170" cy="130" rx="84" ry="14" />
        <ellipse cx="220" cy="117" rx="48" ry="13" />
        <ellipse cx="820" cy="190" rx="72" ry="12" />
        <ellipse cx="858" cy="178" rx="40" ry="11" />
      </g>
      {/* collines lointaines, puis du milieu */}
      <path d="M0 436C150 390 300 420 450 398S750 370 1000 410V600H0Z" fill="#cfdf9c" />
      <path d="M0 486C200 444 350 484 520 459S800 436 1000 476V600H0Z" fill="#94b972" />
      {/* la sakia : la roue à godets qui plonge dans son bassin (la même que le logo du site) */}
      <g transform="translate(800 446)" fill="none" stroke="#7d5d3c" strokeWidth="6" strokeLinecap="round">
        <circle r="62" />
        <circle r="8" fill="#7d5d3c" stroke="none" />
        {spokes.map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 0V-62" strokeWidth="4" />
            <rect x="-9" y="-76" width="18" height="15" rx="4" fill="#f2b33d" stroke="none" />
          </g>
        ))}
      </g>
      <path d="M690 490C730 478 770 494 810 484S890 476 930 488V540H690Z" fill="#8fd0f2" />
      <path d="M706 494C740 486 772 498 808 490S880 484 914 493" fill="none" stroke="#d6f0fb" strokeWidth="3" strokeLinecap="round" />
      {OLIVES.map(([x, y, s]) => (
        <g key={x} transform={`translate(${x} ${y})scale(${s})`}>
          <rect x="-4" y="-34" width="8" height="34" rx="3" fill="#7d5d3c" />
          <ellipse cx="0" cy="-52" rx="30" ry="22" fill="#86a56a" />
          <ellipse cx="-17" cy="-42" rx="19" ry="14" fill="#789a5d" />
          <ellipse cx="17" cy="-44" rx="19" ry="14" fill="#93b274" />
        </g>
      ))}
      {/* premier plan */}
      <path d="M0 538C220 506 420 546 600 526S880 500 1000 526V600H0Z" fill="#4f8a56" />
    </svg>
  );
}
