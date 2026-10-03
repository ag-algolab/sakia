// Scène du haut de page : l'aube sur la plaine de Kairouan. Le minaret de la Grande Mosquée, des rangées d'oliviers qui
// bougent dans le vent, un soleil qui se lève et une sakia (roue à godets) qui puise l'eau dans le canal.
// Dessin vectoriel : quelques Ko, aucune image à télécharger. Tout est décoratif (aria-hidden).

const spin = (origin: string): React.CSSProperties => ({ transformBox: "fill-box", transformOrigin: origin });

function Olive({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g className="sk-sway" style={{ ...spin("50% 100%"), animationDelay: `${delay}s` }}>
        <path d="M-2.2 0 L-1.4 -13 L1.6 -13 L2.4 0Z" fill="#5a3d22" />
        <ellipse cx="0" cy="-20" rx="15" ry="11" fill="#2f7a47" />
        <ellipse cx="-6" cy="-23" rx="9" ry="7" fill="#3f9559" />
        <ellipse cx="6" cy="-18" rx="8" ry="6" fill="#4fa868" opacity=".9" />
        <ellipse cx="-2" cy="-27" rx="5" ry="3.4" fill="#8fd09a" opacity=".55" />
      </g>
    </g>
  );
}

function Drop({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path className="sk-drop" style={{ animationDelay: `${delay}s` }} d="M0 -4 C2.6 0 3.2 2.4 0 4.4 C-3.2 2.4 -2.6 0 0 -4Z" fill="#8fd0f5" />
    </g>
  );
}

export default function HeroScene({ className }: { className?: string }) {
  const rays = Array.from({ length: 18 }, (_, i) => i * 20);
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg
      viewBox="0 0 400 260"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sk-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".95" />
          <stop offset="45%" stopColor="#ffd36e" stopOpacity=".35" />
          <stop offset="100%" stopColor="#ffd36e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sk-water" x1="0" x2="1">
          <stop offset="0" stopColor="#5eb2e6" />
          <stop offset="1" stopColor="#2f8fd0" />
        </linearGradient>
      </defs>

      {/* nuages */}
      <g className="sk-drift" opacity=".16" fill="#fff">
        <ellipse cx="90" cy="58" rx="34" ry="8" />
        <ellipse cx="112" cy="52" rx="22" ry="8" />
      </g>
      <g className="sk-drift-slow" opacity=".12" fill="#fff">
        <ellipse cx="300" cy="40" rx="30" ry="7" />
        <ellipse cx="320" cy="35" rx="18" ry="7" />
      </g>

      {/* soleil : halo qui respire, rayons qui tournent, disque */}
      <g transform="translate(300 150)">
        <circle className="sk-sun-pulse" r="78" fill="url(#sk-glow)" style={spin("50% 50%")} />
        <g className="sk-spin-rev" style={spin("50% 50%")}>
          {rays.map((a) => (
            <line key={a} x1="0" y1="-36" x2="0" y2={a % 40 === 0 ? -56 : -48} stroke="#ffd36e" strokeWidth="2" strokeLinecap="round" opacity=".6" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="26" fill="#ffd770" />
        <circle r="18" fill="#fff0b3" opacity=".8" />
      </g>

      {/* oiseaux */}
      <g className="sk-drift-slow" fill="none" stroke="#0d2e22" strokeWidth="1.4" strokeLinecap="round" opacity=".5">
        <path d="M150 88 q4 -5 8 0 q4 -5 8 0" />
        <path d="M176 100 q3 -4 6 0 q3 -4 6 0" />
      </g>

      {/* collines lointaines */}
      <path d="M0 176 C60 150 110 168 170 160 S300 148 400 170 V260 H0Z" fill="#1d6648" />

      {/* Grande Mosquée de Kairouan : minaret à trois étages et enceinte */}
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

      {/* collines proches */}
      <path d="M0 196 C70 178 140 192 210 184 S340 176 400 192 V260 H0Z" fill="#0f4631" />

      {/* champ d'oliviers : sol et rangées en perspective */}
      <path d="M0 206 C100 197 300 197 400 206 V260 H0Z" fill="#0a3023" />
      <g fill="#12402e">
        <path d="M200 204 L-40 260 L10 260Z" />
        <path d="M200 204 L60 260 L120 260Z" />
        <path d="M200 204 L170 260 L230 260Z" />
        <path d="M200 204 L280 260 L340 260Z" />
        <path d="M200 204 L390 260 L450 260Z" />
      </g>

      {/* oliviers (plus loin = plus petit) */}
      <Olive x={150} y={212} s={0.42} delay={0.2} />
      <Olive x={188} y={210} s={0.38} delay={1.1} />
      <Olive x={226} y={210} s={0.38} delay={0.6} />
      <Olive x={112} y={218} s={0.56} delay={1.6} />
      <Olive x={70} y={228} s={0.8} delay={0.9} />
      <Olive x={26} y={246} s={1.1} delay={0.1} />
      <Olive x={256} y={214} s={0.5} delay={1.3} />

      {/* canal et sakia */}
      <path className="sk-flow" d="M250 238 C280 232 300 244 330 238 S380 232 410 238" fill="none" stroke="url(#sk-water)" strokeWidth="5" strokeLinecap="round" strokeDasharray="14 10" />
      <path d="M248 244 C280 238 300 250 330 244 S380 238 410 244" fill="none" stroke="#2f8fd0" strokeWidth="2" opacity=".5" />
      <g transform="translate(318 178)">
        {/* chevalet */}
        <path d="M0 0 L-22 58 M0 0 L22 58 M-14 30 L14 30" stroke="#5a3d22" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        {/* roue */}
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
      {/* gouttes qui retombent vers le canal */}
      <Drop x={300} y={206} delay={0} />
      <Drop x={312} y={204} delay={0.5} />
      <Drop x={326} y={206} delay={1} />
      <Drop x={338} y={204} delay={1.5} />
    </svg>
  );
}
