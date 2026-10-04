import { Logo } from "../art";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeInOut, pop, prog } from "../timeline";

// Technique, scène 1 : la promesse. Une voix, puis un calcul fixe. L'onde irrégulière (la parole) devient une onde régulière
// (le calcul qu'on peut vérifier).

export default function Intro({ t }: SceneProps) {
  const env = easeInOut(prog(t, 0.8, 1.4));
  const calm = easeInOut(prog(t, 3.4, 1.2)); // 0 : parole ; 1 : calcul fixe
  const pts: string[] = [];
  for (let x = 140; x <= 1500; x += 10) {
    const speech = Math.sin(x * 0.031 + t * 5) * (0.5 + 0.5 * Math.sin(x * 0.011 - t * 2.1)) * 1.1;
    const fixed = Math.sin(x * 0.02 + t * 2) * 0.7;
    const y = 872 + 52 * env * ((1 - calm) * speech + calm * fixed);
    pts.push(`${x === 140 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return (
    <div className="film-layer f-dark">
      <div className="f-kicker" style={{ left: 140, top: 104, ...appear(t, 0.2) }}>
        Technical walkthrough
      </div>
      <div className="f-abs" style={{ right: 140, top: 84, ...pop(t, 0.4, 0.7) }}>
        <Logo size={120} />
      </div>
      <h1 className="f-display f-abs" style={{ left: 140, top: 176, margin: 0, width: 1560, fontSize: 132 }}>
        <Words text="A farmer speaks." t={t} start={0.6} step={0.14} />
        <br />
        <Words text="A fixed calculation answers." t={t} start={1.9} step={0.12} />
      </h1>
      <p className="f-body f-abs" style={{ left: 140, top: 640, width: 1400, margin: 0, color: "var(--accent)", fontWeight: 800, ...appear(t, 4.6) }}>
        AI only where a spreadsheet cannot help.
      </p>
      <svg viewBox="0 0 1920 1080" className="film-layer" aria-hidden style={{ pointerEvents: "none" }}>
        <path d={pts.join(" ")} fill="none" stroke={calm > 0.5 ? "#7fc8f2" : "#f2b33d"} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity={0.95 * env} />
      </svg>
    </div>
  );
}
