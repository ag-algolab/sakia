import { Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, pop } from "../timeline";

// Technique, scène 4 : la pile et ce que les données ne couvrent pas. Source : docs/DATA-CARD.md (sections B, C, E).

const STACK = [
  "Next.js 16 · TypeScript",
  "Open-Meteo forecast and ERA5 (CC BY 4.0)",
  "FAO-56 method, 18 crops",
  "ElevenLabs: speech recognition, voice, agent",
  "Supabase · Telegram · Vercel",
];

const LIMITS = [
  "No field trial in Tunisia: crop coefficients are generic.",
  "No weather station in the calculation. On heavy-rain days the model sees about half of the rain.",
  "Speech recognition of the Tunisian dialect: not measured on real farmers.",
  "The saved water is a simulation, not a field result.",
];

export default function Stack({ t }: SceneProps) {
  return (
    <div className="film-layer f-dark">
      <h2 className="f-display f-abs" style={{ left: 140, top: 84, margin: 0, fontSize: 80, width: 800 }}>
        <Words text="Built with" t={t} start={0.2} step={0.1} />
      </h2>
      {STACK.map((s, i) => (
        <div
          key={s}
          className="f-abs"
          style={{
            left: 140,
            top: 220 + i * 98,
            width: 800,
            padding: "14px 26px",
            boxSizing: "border-box",
            borderRadius: 22,
            border: "4px solid #4aa9e8",
            background: "rgba(74,169,232,0.12)",
            fontSize: 34,
            fontWeight: 700,
            lineHeight: 1.15,
            ...pop(t, 0.8 + i * 0.45, 0.5),
          }}
        >
          {s}
        </div>
      ))}

      <h2 className="f-display f-abs" style={{ left: 1030, top: 84, margin: 0, fontSize: 80, width: 830, color: "var(--accent)", ...appear(t, 2.0) }}>
        What the data does not cover
      </h2>
      <div className="f-abs" style={{ left: 1030, top: 290, width: 830 }}>
        {LIMITS.map((l, i) => (
          <div key={l} style={{ fontSize: 33, fontWeight: 700, lineHeight: 1.25, marginBottom: 22, paddingLeft: 38, position: "relative", ...appear(t, 2.6 + i * 0.7, 0.5, 14) }}>
            <span style={{ position: "absolute", left: 0, top: 11, width: 16, height: 16, borderRadius: 8, background: "#f2b33d" }} />
            {l}
          </div>
        ))}
      </div>
      <Source style={{ width: 1400 }}>Data card: every dataset with its source, licence, size and what it does not cover · weather checked against Tunisian stations (Kairouan and Oueslatia)</Source>
    </div>
  );
}
