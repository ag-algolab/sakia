// Version panoramique de la scène du haut de page, pour les grands écrans : toute la largeur est dessinée (minaret à gauche,
// plaine d'oliviers au centre, soleil et sakia à droite), sans zone vide ni bord net. Les collines dépassent du cadre
// (overflow visible) : au-delà de 1500 px, le paysage se prolonge simplement jusqu'aux bords de l'écran.
// Décoratif (aria-hidden). Même langage visuel que HeroScene (version téléphone).

import { Drop, Olive, spin } from "./HeroScene";

const VP = { x: 600, y: 246 }; // point de fuite des rangées d'oliviers

export default function HeroPanorama({ className }: { className?: string }) {
  const rays = Array.from({ length: 20 }, (_, i) => i * 18);
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  const rowsX = [-200, 40, 280, 520, 760, 1000, 1240, 1480];
  // oliviers : plus ils sont près de l'horizon, plus ils sont petits
  const trees = rowsX.flatMap((rx, r) =>
    [0.28, 0.5, 0.74, 1].map((t, k) => ({
      x: VP.x + (rx - VP.x) * t * 0.62,
      y: VP.y + 6 + (300 - VP.y) * t,
      s: 0.34 + 0.95 * t,
      delay: ((r * 7 + k * 3) % 11) / 5,
    })),
  );
  return (
    <svg viewBox="0 0 1200 300" preserveAspectRatio="xMidYMax meet" aria-hidden className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pk-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".95" />
          <stop offset="45%" stopColor="#ffd36e" stopOpacity=".35" />
          <stop offset="100%" stopColor="#ffd36e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pk-water" x1="0" x2="1">
          <stop offset="0" stopColor="#5eb2e6" />
          <stop offset="1" stopColor="#2f8fd0" />
        </linearGradient>
      </defs>

      {/* nuages */}
      <g className="sk-drift" opacity=".16" fill="#fff">
        <ellipse cx="170" cy="86" rx="70" ry="12" />
        <ellipse cx="215" cy="76" rx="44" ry="12" />
      </g>
      <g className="sk-drift-slow" opacity=".13" fill="#fff">
        <ellipse cx="640" cy="52" rx="60" ry="10" />
        <ellipse cx="682" cy="44" rx="34" ry="10" />
      </g>
      <g className="sk-drift" opacity=".12" fill="#fff" style={{ animationDelay: "-12s" }}>
        <ellipse cx="1040" cy="96" rx="64" ry="11" />
      </g>

      {/* soleil */}
      <g transform="translate(850 176)">
        <circle className="sk-sun-pulse" r="120" fill="url(#pk-glow)" style={spin("50% 50%")} />
        <g className="sk-spin-rev" style={spin("50% 50%")}>
          {rays.map((a) => (
            <line key={a} x1="0" y1="-56" x2="0" y2={a % 36 === 0 ? -92 : -78} stroke="#ffd36e" strokeWidth="3" strokeLinecap="round" opacity=".6" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="42" fill="#ffd770" />
        <circle r="29" fill="#fff0b3" opacity=".8" />
      </g>

      {/* oiseaux */}
      <g className="sk-drift-slow" fill="none" stroke="#0d2e22" strokeWidth="2" strokeLinecap="round" opacity=".5">
        <path d="M470 110 q6 -7 12 0 q6 -7 12 0" />
        <path d="M510 130 q4 -5 8 0 q4 -5 8 0" />
        <path d="M980 70 q5 -6 10 0 q5 -6 10 0" />
      </g>

      {/* collines lointaines (elles dépassent du cadre) */}
      <path d="M-2000 208 C-1000 188 -300 214 0 204 C180 176 330 206 520 190 S760 166 960 196 S1160 178 1200 190 C1600 214 2400 184 3200 204 V420 H-2000Z" fill="#1d6648" />

      {/* Grande Mosquée de Kairouan : minaret à trois étages et enceinte */}
      <g transform="translate(150 -26) scale(1.45)" fill="#0f3b2c">
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
        <rect x="93" y="112" width="4" height="7" rx="2" fill="#f7d58a" opacity=".5" />
        <rect x="93" y="134" width="4" height="9" rx="2" fill="#f7d58a" opacity=".5" />
      </g>

      {/* collines proches */}
      <path d="M-2000 232 C-1000 214 -300 238 0 230 C250 208 480 232 700 222 S1040 208 1200 226 C1700 244 2400 214 3200 230 V420 H-2000Z" fill="#0f4631" />

      {/* champ : sol et rangées en perspective */}
      <path d="M-2000 252 C-800 244 -200 250 0 248 C400 240 800 240 1200 248 C1800 252 2600 244 3200 252 V420 H-2000Z" fill="#0a3023" />
      <g fill="#12402e">
        {rowsX.map((rx) => (
          <path key={rx} d={`M${VP.x} ${VP.y} L${rx - 60} 340 L${rx + 60} 340Z`} />
        ))}
      </g>

      {/* oliviers */}
      {trees.map((t, i) => (
        <Olive key={i} x={t.x} y={t.y} s={t.s} delay={t.delay} />
      ))}

      {/* canal et sakia */}
      <path className="sk-flow" d="M880 286 C940 278 990 292 1050 284 S1160 276 1260 286" fill="none" stroke="url(#pk-water)" strokeWidth="7" strokeLinecap="round" strokeDasharray="20 14" />
      <path d="M880 294 C940 286 990 300 1050 292 S1160 284 1260 294" fill="none" stroke="#2f8fd0" strokeWidth="3" opacity=".5" />
      <g transform="translate(980 214) scale(1.35)">
        <path d="M0 0 L-22 58 M0 0 L22 58 M-14 30 L14 30" stroke="#5a3d22" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <g className="sk-spin-fast" style={spin("50% 50%")}>
          <circle r="31" fill="none" stroke="#d9a441" strokeWidth="3" />
          <circle r="5" fill="#d9a441" />
          {spokes.map((a) => (
            <g key={a} transform={`rotate(${a})`}>
              <line x1="0" y1="0" x2="0" y2="-31" stroke="#d9a441" strokeWidth="2" strokeLinecap="round" />
              <rect x="-4.5" y="-37" width="9" height="9" rx="2" fill="#f2b33d" stroke="#b9801c" strokeWidth="1" />
            </g>
          ))}
        </g>
      </g>
      <Drop x={944} y={262} delay={0} />
      <Drop x={968} y={258} delay={0.5} />
      <Drop x={994} y={262} delay={1} />
      <Drop x={1018} y={258} delay={1.5} />
    </svg>
  );
}
