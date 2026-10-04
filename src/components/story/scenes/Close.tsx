import { Logo, Olive, spin } from "../art";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeInOut, lerp, pop, prog, windowed } from "../timeline";

// Scène 7 : clôture. Dit à voix haute l'ordre réel des langues (anglais d'abord pour le jury ; sur le terrain : darija,
// puis français), puis le nom, la promesse, les liens et l'honnêteté sur la façon dont tout cela a été construit.

export default function Close({ t }: SceneProps) {
  const sunY = lerp(760, 560, easeInOut(prog(t, 0, 7)));
  return (
    <div className="film-layer f-dark">
      <svg viewBox="0 0 1920 1080" width={1920} height={1080} className="film-layer" aria-hidden>
        <defs>
          <radialGradient id="close-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe9a8" stopOpacity=".95" />
            <stop offset="45%" stopColor="#ffd36e" stopOpacity=".34" />
            <stop offset="100%" stopColor="#ffd36e" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g transform={`translate(1620 ${sunY})`}>
          <circle r={400} fill="url(#close-glow)" />
          <g className="film-spin-rev" style={spin("50% 50%")}>
            {Array.from({ length: 24 }, (_, i) => i * 15).map((a) => (
              <line key={a} x1="0" y1="-170" x2="0" y2={a % 30 === 0 ? -280 : -230} stroke="#ffd36e" strokeWidth="5" strokeLinecap="round" opacity=".5" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r={118} fill="#ffd770" />
          <circle r={82} fill="#fff0b3" opacity=".85" />
        </g>
        <path d="M-60 810 C260 760 560 800 900 780 S1500 750 1980 790 V1100 H-60Z" fill="#165239" />
        <path d="M-60 860 C300 820 620 850 960 836 S1500 812 1980 846 V1100 H-60Z" fill="#0f4631" />
        <path d="M0 910 C520 888 1200 896 1920 886 V1100 H0Z" fill="#0a3023" />
        {[1560, 1700, 1840].map((x, i) => (
          <Olive key={x} x={x} y={900 + i * 8} s={2.4 + i * 0.5} delay={i * 0.6} />
        ))}
      </svg>

      <h2 className="f-display f-abs" style={{ left: 140, top: 130, margin: 0, width: 1560, fontSize: 118, ...windowed(t, 0.2, 4.5, 0.2, 0.6) }}>
        <Words text="English first, for the jury." t={t} start={0.3} step={0.12} />
      </h2>
      <h2 className="f-display f-abs" style={{ left: 140, top: 390, margin: 0, width: 1250, fontSize: 118, color: "var(--accent)", ...windowed(t, 2.0, 4.5, 0.2, 0.6) }}>
        <Words text="In reality: Darija first, then French." t={t} start={2.2} step={0.12} />
      </h2>
      <p className="f-abs" style={{ left: 140, top: 690, margin: 0, width: 1300, fontSize: 38, fontWeight: 700, ...windowed(t, 3.4, 4.5, 0.4, 0.6) }}>
        The spoken bulletin and the app. The keypad line today: French (1), Arabic (2).
      </p>

      <div className="f-abs" style={{ left: 140, top: 96, ...pop(t, 4.9, 0.8) }}>
        <Logo size={190} />
      </div>
      <div className="f-display f-abs" style={{ left: 380, top: 78, margin: 0, fontSize: 230, lineHeight: 1, ...appear(t, 5.1, 0.8, 40) }}>
        Sakia
      </div>
      <div className="f-display f-abs" style={{ left: 140, top: 350, margin: 0, fontSize: 112, color: "var(--accent)", ...appear(t, 5.7, 0.8, 40) }}>
        One decision a day.
      </div>
      <p className="f-body f-abs" style={{ left: 140, top: 520, width: 1150, margin: 0, ...appear(t, 6.5, 0.7) }}>
        Not a weather bulletin. A decision.
      </p>

      <div className="f-abs" style={{ left: 140, top: 804, display: "flex", gap: 56, fontSize: 52, fontWeight: 800, ...appear(t, 6.2, 0.7) }}>
        <span>sakia-opal.vercel.app</span>
        <span>t.me/sakia_tn_bot</span>
      </div>
      <div className="f-abs" style={{ left: 140, top: 892, width: 1400, fontSize: 29, fontWeight: 600, lineHeight: 1.35, color: "#ffffff", ...appear(t, 6.8, 0.7) }}>
        Small AI for Development · Agriculture · solo, from Tunisia · Anthony Gocmen (AG Algo Lab)
        <br />
        Built during the hackathon with an AI coding assistant, directed by the author · code WBGSmallAIGADS
      </div>
    </div>
  );
}
