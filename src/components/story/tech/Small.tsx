import { Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeOut, prog } from "../timeline";

// Technique, scène 3 : petit par conception. Tailles mesurées en production le 3 octobre 2026 (docs/DATA-CARD.md, section F).
// Échelle logarithmique : de 1 Ko à 1 000 Ko sur la barre entière.

const ROWS = [
  { label: "Forecast, one region", kb: 1.9, value: "1.9 KB" },
  { label: "7-day plan", kb: 2.4, value: "2.4 KB (about 1 KB compressed)" },
  { label: "Spoken advice, 13 to 25 seconds", kb: 98, value: "50 to 98 KB" },
  { label: "The app, first visit", kb: 390, value: "390 KB, then kept on the device" },
];
const BAR = 760; // longueur de la barre pour 1 000 Ko

export default function Small({ t }: SceneProps) {
  return (
    <div className="film-layer f-dark">
      <h2 className="f-display f-abs" style={{ left: 140, top: 84, margin: 0, fontSize: 78, width: 1700 }}>
        <Words text="Small enough for a weak connection" t={t} start={0.2} step={0.1} />
      </h2>
      {ROWS.map((r, i) => {
        const at = 1.4 + i * 1.0;
        const p = easeOut(prog(t, at, 0.9));
        const len = (Math.log10(r.kb) / 3) * BAR;
        return (
          <div key={r.label} className="f-abs" style={{ left: 140, top: 262 + i * 112, width: 1380, ...appear(t, at - 0.2, 0.4, 10) }}>
            <div style={{ fontSize: 34, fontWeight: 800 }}>{r.label}</div>
            <div style={{ position: "relative", marginTop: 6, height: 40 }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: Math.max(14, len * p), height: 40, borderRadius: 20, background: "#4aa9e8" }} />
              <div style={{ position: "absolute", left: Math.max(14, len * p) + 18, top: -2, fontSize: 38, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap", opacity: p }}>{r.value}</div>
            </div>
          </div>
        );
      })}
      <p className="f-abs" style={{ left: 140, top: 738, width: 1380, margin: 0, fontSize: 44, fontWeight: 800, lineHeight: 1.2, ...appear(t, 6.0, 0.7) }}>
        Nothing to train, no model to download. No connection? The plan is recomputed in the browser from the last saved forecast.
      </p>
      <Source>Measured on production, 3 Oct 2026 · data card, section F · logarithmic scale: the whole bar is 1 MB</Source>
    </div>
  );
}
