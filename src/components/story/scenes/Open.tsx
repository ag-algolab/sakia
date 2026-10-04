import { Logo, Olive, spin } from "../art";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeInOut, easeOut, lerp, pop, prog, windowed } from "../timeline";

// Scène 1 : logo, puis l'aube sur Kairouan. Noor, deux hectares, un puits, un téléphone basique : doit-il arroser ?

const OLIVE_ROWS = [
  { y: 930, s: 1.6, gap: 190, off: 40 },
  { y: 962, s: 2.2, gap: 250, off: 130 },
  { y: 1008, s: 3.0, gap: 340, off: 20 },
  { y: 1068, s: 4.0, gap: 470, off: 210 },
];

export default function Open({ t }: SceneProps) {
  const cam = easeInOut(prog(t, 2, 9.4));
  const sunY = lerp(1010, 548, easeInOut(prog(t, 2, 6.5)));
  const dawn = prog(t, 2, 1.4);
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  const phonePulse = 0.55 + 0.45 * Math.sin(t * 3.2);

  return (
    <div className="film-layer f-dark">
      {/* l'aube */}
      <svg
        viewBox="0 0 1920 1080"
        width={1920}
        height={1080}
        aria-hidden
        className="film-layer"
        style={{ opacity: dawn, transform: `scale(${1 + cam * 0.06})`, transformOrigin: "50% 100%" }}
      >
        <defs>
          <radialGradient id="open-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".95" />
            <stop offset="45%" stopColor="#ffd36e" stopOpacity=".38" />
            <stop offset="100%" stopColor="#ffd36e" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="open-phone" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8fd0f5" stopOpacity=".8" />
            <stop offset="100%" stopColor="#8fd0f5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* soleil : halo, rayons, disque */}
        <g transform={`translate(1330 ${sunY})`}>
          <circle r={420} fill="url(#open-glow)" />
          <g className="film-spin-rev" style={spin("50% 50%")}>
            {rays.map((a) => (
              <line key={a} x1="0" y1="-190" x2="0" y2={a % 30 === 0 ? -300 : -250} stroke="#ffd36e" strokeWidth="5" strokeLinecap="round" opacity=".5" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r={128} fill="#ffd770" />
          <circle r={90} fill="#fff0b3" opacity=".85" />
        </g>

        {/* collines lointaines */}
        <g style={{ transform: `translateX(${-cam * 16}px)` }}>
          <path d="M-60 800 C260 740 520 790 820 760 S1380 720 1620 770 S1860 770 1980 750 V1100 H-60Z" fill="#1d6648" />
        </g>

        {/* Grande Mosquée de Kairouan : enceinte, coupole, minaret à trois étages */}
        <g fill="#0f3b2c" style={{ transform: `translate(${927 - cam * 22}px, 202px) scale(3.4)` }}>
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

        {/* collines proches et champ d'oliviers */}
        <g style={{ transform: `translateX(${-cam * 34}px)` }}>
          <path d="M-80 880 C300 830 600 870 900 850 S1500 820 2000 850 V1100 H-80Z" fill="#0f4631" />
        </g>
        <path d="M0 930 C500 905 1200 915 1920 905 V1100 H0Z" fill="#0a3023" />
        <g fill="#12402e">
          {[-900, -420, 20, 360, 660, 960, 1260, 1560, 1900].map((x) => (
            <path key={x} d={`M960 912 L${x} 1100 L${x + 260} 1100Z`} />
          ))}
        </g>
        <g style={{ transform: `translateX(${-cam * 52}px)` }}>
          {OLIVE_ROWS.map((row, r) =>
            Array.from({ length: Math.ceil(2300 / row.gap) }, (_, i) => (
              <Olive key={`${r}-${i}`} x={row.off + i * row.gap - 100} y={row.y} s={row.s} delay={((r * 7 + i * 3) % 10) * 0.23} />
            )),
          )}
        </g>

        {/* la sakia, roue à godets, qui puise l'eau */}
        <g transform="translate(1680 760) scale(3.2)">
          <path d="M0 0 L-22 58 M0 0 L22 58 M-14 30 L14 30" stroke="#5a3d22" strokeWidth="3.4" strokeLinecap="round" fill="none" />
          <g className="film-spin-fast" style={spin("50% 50%")}>
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

        {/* Noor, de dos trois quarts, le téléphone à la main (personnage fictif) */}
        <g transform="translate(300 1086)">
          <ellipse cx="0" cy="0" rx="150" ry="24" fill="#040c08" opacity=".5" />
          <path d="M-72 0 C-70 -150 -62 -250 -34 -300 Q0 -326 34 -300 C62 -250 70 -150 72 0 Z" fill="#040c08" />
          <circle cx="0" cy="-356" r="38" fill="#040c08" />
          <path d="M34 -300 C62 -250 70 -150 72 0" fill="none" stroke="#f2b33d" strokeWidth="4" opacity=".7" />
          <path d="M26 -388 A38 38 0 0 1 38 -356" fill="none" stroke="#f2b33d" strokeWidth="4" opacity=".7" />
          <path d="M26 -292 L62 -222" stroke="#040c08" strokeWidth="24" strokeLinecap="round" fill="none" />
          <circle cx="76" cy="-232" r="46" fill="url(#open-phone)" opacity={phonePulse} />
          <rect x="66" y="-254" width="22" height="38" rx="5" fill="#8fd0f5" opacity={0.65 + phonePulse * 0.35} />
        </g>
      </svg>

      {/* texte */}
      <div className="f-kicker" style={{ left: 140, top: 112, ...appear(t, 2.8) }}>
        Kairouan · Tunisia · at dawn
      </div>
      <div className="f-abs" style={{ right: 140, top: 100, ...appear(t, 2.8) }}>
        <span className="f-badge f-badge-dark">Fictional persona · challenge brief</span>
      </div>

      <h1 className="f-display f-h1 f-abs" style={{ left: 140, top: 168, margin: 0, ...windowed(t, 3.0, 7.7, 0.2, 0.5) }}>
        <Words text="Meet Noor." t={t} start={3.2} />
      </h1>
      {/* Noor tel que le décrit le cahier des charges : 38 ans, 2 ha, deux téléphones dont un basique, pas de Wi-Fi, aux champs toute la journée */}
      <div className="f-body f-abs" style={{ left: 140, top: 392, width: 1000, margin: 0 }}>
        {["38 years old.", "Two hectares and a well.", "Two phones, one basic. No Wi-Fi.", "In the field all day."].map((line, i) => (
          <div key={line} style={windowed(t, 4.5 + i * 0.55, 7.7, 0.5, 0.5, 20)}>
            {line}
          </div>
        ))}
      </div>

      <h2 className="f-display f-abs" style={{ left: 140, top: 190, margin: 0, width: 1150, fontSize: 128, ...windowed(t, 7.9, 99, 0.3, 0.5) }}>
        <Words text="Irrigate today… or wait?" t={t} start={8.0} step={0.12} />
      </h2>
      <p className="f-body f-abs" style={{ left: 140, top: 480, width: 1000, margin: 0, ...appear(t, 9.8) }}>
        Noor decides by habit, or by waiting for rain.
      </p>

      {/* logo de départ, puis fondu vers l'aube */}
      {t < 3.1 && (
        <div
          className="film-layer"
          style={{
            background: "#030806",
            opacity: 1 - easeInOut(prog(t, 1.9, 0.9)),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 18,
            color: "#fff",
          }}
        >
          <div style={pop(t, 0.2, 0.9)}>
            <Logo size={300} />
          </div>
          <div
            className="f-display"
            style={{ fontSize: 170, letterSpacing: `${lerp(0.5, 0.05, easeOut(prog(t, 0.6, 1.4)))}em`, opacity: prog(t, 0.6, 0.8), paddingLeft: "0.3em" }}
          >
            Sakia
          </div>
          <div style={{ fontSize: 34, letterSpacing: "0.3em", color: "#f2b33d", fontWeight: 800, textTransform: "uppercase", opacity: prog(t, 1.3, 0.6) }}>
            A daily irrigation decision
          </div>
        </div>
      )}
    </div>
  );
}
