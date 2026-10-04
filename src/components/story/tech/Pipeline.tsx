import { Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, lerp, pop } from "../timeline";

// Technique, scène 2 : les quatre étapes, de la voix au conseil. Bleu = IA (en nuage) ; sable = règles fixes, vérifiables.
// Sources : README, tableau « What the AI does » ; code : src/lib/sms (compréhension), src/lib/planCore.ts (calcul).

const STEPS = [
  {
    n: "1",
    name: "Listen",
    ai: true,
    body: "Speech recognition: Noor can speak instead of type. French, Arabic, Arabizi.",
    where: "Needs the network",
  },
  {
    n: "2",
    name: "Understand",
    ai: false,
    body: "Crop and place found by rules and fuzzy matching on a fixed list.",
    where: "Runs on our server, no model",
  },
  {
    n: "3",
    name: "Calculate",
    ai: false,
    body: "FAO-56 water balance on the weather forecast. Same input, same answer.",
    where: "Also runs in the browser, offline",
  },
  {
    n: "4",
    name: "Speak",
    ai: true,
    body: "Fixed sentences, numbers filled in, read in a Tunisian-accented voice.",
    where: "Needs the network. Recorded copy plays offline",
  },
];

const W = 400;
const GAP = 40;
const TOP = 224;
const H = 480;
const xOf = (i: number) => 140 + i * (W + GAP);

export default function Pipeline({ t }: SceneProps) {
  const dot = t > 11 ? ((t - 11) / 5) % 1 : 0;
  return (
    <div className="film-layer f-dark">
      <h2 className="f-display f-abs" style={{ left: 140, top: 84, margin: 0, fontSize: 82, width: 1600 }}>
        <Words text="Four steps, from voice to advice" t={t} start={0.2} step={0.1} />
      </h2>

      {/* le trajet d'une demande */}
      <svg viewBox="0 0 1920 1080" className="film-layer" aria-hidden style={{ pointerEvents: "none" }}>
        <line x1={xOf(0) + W / 2} x2={xOf(3) + W / 2} y1={202} y2={202} stroke="#7fc8f2" strokeWidth="4" strokeDasharray="14 12" opacity={t > 9.2 ? 0.9 : 0} />
        {t > 11 && <circle cx={lerp(xOf(0) + W / 2, xOf(3) + W / 2, dot)} cy={202} r={14} fill="#f2b33d" />}
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${xOf(i) + W + 8} ${TOP + H / 2 - 16} l24 16 l-24 16`} fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity={t > 1.0 + (i + 1) * 2.5 ? 1 : 0} />
        ))}
      </svg>

      {STEPS.map((s, i) => {
        const col = s.ai ? "#4aa9e8" : "#f0e5cb";
        return (
          <div
            key={s.n}
            className="f-abs"
            style={{
              left: xOf(i),
              top: TOP,
              width: W,
              height: H,
              borderRadius: 34,
              border: `5px solid ${col}`,
              background: "rgba(255,255,255,0.07)",
              boxSizing: "border-box",
              ...pop(t, 1.0 + i * 2.5, 0.6),
            }}
          >
            <span
              className="f-badge"
              style={{ position: "absolute", left: 24, top: 22, fontSize: 26, padding: "6px 20px", background: col, color: "#06120d" }}
            >
              {s.ai ? "AI · cloud" : "Not AI"}
            </span>
            <div className="f-display" style={{ position: "absolute", left: 28, top: 94, fontSize: 46, lineHeight: 1, whiteSpace: "nowrap" }}>
              {s.n}. {s.name}
            </div>
            <div style={{ position: "absolute", left: 28, right: 28, top: 172, fontSize: 31, fontWeight: 600, lineHeight: 1.28 }}>{s.body}</div>
            <div style={{ position: "absolute", left: 28, right: 28, bottom: 22, fontSize: 27, fontWeight: 800, lineHeight: 1.2, color: s.ai ? "#7fc8f2" : "#f0e5cb" }}>{s.where}</div>
          </div>
        );
      })}

      <p className="f-abs" style={{ left: 140, top: 748, width: 1380, margin: 0, fontSize: 52, fontWeight: 800, lineHeight: 1.2, ...appear(t, 12.2, 0.8) }}>
        The AI is at both ends. The middle can be checked: it cannot hallucinate.
      </p>
      <Source style={{ width: 1400 }}>
        Optional voice agent: a language model told to read our server’s answer. An instruction, not a guarantee: 15 of 15 plan answers were read word for word on 20 typed test phrases.
      </Source>
    </div>
  );
}
