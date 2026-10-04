import { Num, Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeOut, lerp, prog } from "../timeline";

// Scène 6 : la preuve. Rejeu de chaque saison de 2015 à 2026 sur la météo réelle : eau pompée avec un calendrier fixe
// (notre référence, pas le calendrier de l'État) contre le conseil de Sakia. C'est une SIMULATION et l'écran le répète.
// Les pourcentages viennent de /api/backtest (recalculés à l'ouverture de la page) ; copie du 3 octobre 2026 sinon.

const BAR_X = 1300;
const BAR_W = 440;

export default function Proof({ t, data }: SceneProps) {
  const lo = Math.round(Math.min(...data.proof.map((r) => r.pct)));
  const hi = Math.round(Math.max(...data.proof.map((r) => r.pct)));
  const pNum = prog(t, 1.8, 2.4);
  return (
    <div className="film-layer f-dark">
      <div className="f-abs" style={{ left: 140, top: 78, ...appear(t, 0.3) }}>
        <span className="f-badge" style={{ background: "#f2b33d", color: "#06120d", fontSize: 34, padding: "12px 30px" }}>
          Simulation on observed weather · not a field measurement
        </span>
      </div>

      <h2 className="f-display f-abs" style={{ left: 140, top: 168, margin: 0, width: 1100, fontSize: 92 }}>
        <Words text="2015–2026, replayed on observed weather." t={t} start={0.7} step={0.1} />
      </h2>

      <div className="f-display f-abs" style={{ left: 140, top: 372, margin: 0, fontSize: 236, lineHeight: 1, whiteSpace: "nowrap", color: "var(--accent)", ...appear(t, 1.6) }}>
        <Num value={lo} p={pNum} /> to <Num value={hi} p={pNum} /> %
      </div>
      <p className="f-body f-abs" style={{ left: 140, top: 640, width: 1100, margin: 0, ...appear(t, 3.2) }}>
        less water pumped, depending on the crop.
      </p>
      <p className="f-abs" style={{ left: 140, top: 716, width: 1100, margin: 0, fontSize: 44, fontWeight: 800, lineHeight: 1.22, ...appear(t, 4.2) }}>
        Almost no stress days: a best case, with the weather known in advance.
      </p>
      <div className="f-abs" style={{ left: 140, top: 836, display: "flex", gap: 18, fontSize: 28, fontWeight: 800, ...appear(t, 6.2) }}>
        {["No field trial yet", "Voice line and SMS simulated", "Indicative advice"].map((c) => (
          <span key={c} style={{ border: "3px solid #ffffff", borderRadius: 999, padding: "6px 22px", whiteSpace: "nowrap" }}>
            {c}
          </span>
        ))}
      </div>

      {/* légende et barres */}
      <div className="f-abs" style={{ left: BAR_X, top: 150, width: 560, fontSize: 28, fontWeight: 700, lineHeight: 1.3, ...appear(t, 1.2) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <i style={{ width: 28, height: 28, borderRadius: 7, background: "#d8c7a4", display: "inline-block", flex: "none" }} />
          Fixed weekly schedule (our benchmark)
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
          <i style={{ width: 28, height: 28, borderRadius: 7, background: "#4aa9e8", display: "inline-block", flex: "none" }} />
          Advised by Sakia
        </div>
      </div>
      {data.proof.map((r, i) => {
        const at = 2.0 + i * 0.3;
        const p = easeOut(prog(t, at, 1.1));
        const top = 290 + i * 100;
        return (
          <div key={r.name} className="f-abs" style={{ left: BAR_X, top, width: 560, ...appear(t, at - 0.3, 0.4, 10) }}>
            <div style={{ fontSize: 32, fontWeight: 800 }}>{r.name}</div>
            <div style={{ position: "relative", marginTop: 6, height: 38, width: BAR_W }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 19, background: "#d8c7a4" }} />
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: BAR_W * lerp(1, 1 - r.pct / 100, p), borderRadius: 19, background: "#4aa9e8" }} />
              <div style={{ position: "absolute", left: BAR_W + 16, top: -2, fontSize: 38, fontWeight: 800, color: "var(--accent)", whiteSpace: "nowrap" }}>
                −<Num value={r.pct} p={p} /> %
              </div>
            </div>
          </div>
        );
      })}

      <Source style={{ width: 1400 }}>
        Our backtest · ERA5 observed weather (Open-Meteo) 2015–2026, not past forecasts · Kairouan, drip, loam · 4 of 18 crops shown · fixed schedule = our benchmark, not the State’s calendar
        {data.proofLive ? "" : " · values of 3 Oct 2026"}
      </Source>
    </div>
  );
}
