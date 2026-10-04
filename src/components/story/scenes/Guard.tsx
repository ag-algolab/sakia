import { AlertIcon } from "../art";
import { Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, clamp, easeInOut, easeOut, prog } from "../timeline";

// Scène 5 : le garde-fou. Quand les données vieillissent, l'outil ne devine pas : il dit « pas sûr » (plus de 12 h) puis
// ne donne plus aucun conseil (plus de 48 h). Règles du moteur : src/lib/planCore.ts. Phrases fixes : src/lib/messages.ts.

const X0 = 140;
const W = 1360;
const SEG = [0.3, 0.4, 0.3]; // part de la barre pour 0–12 h, 12–48 h, plus de 48 h

function xOfAge(age: number): number {
  if (age <= 12) return X0 + (age / 12) * W * SEG[0];
  if (age <= 48) return X0 + W * SEG[0] + ((age - 12) / 36) * W * SEG[1];
  return X0 + W * (SEG[0] + SEG[1]) + (clamp((age - 48) / 24) * W * SEG[2]);
}

export default function Guard({ t }: SceneProps) {
  const age = 60 * easeInOut(prog(t, 1.8, 4.2));
  const x = xOfAge(age);
  const sure = age < 12;
  const none = age >= 48;
  const cardP = easeOut(clamp((age - 12) / 3));
  const segs = [
    { label: "Advice", bg: "#2b5a37", fg: "#ffffff" },
    { label: "Flagged “not sure”", bg: "#f2b33d", fg: "#14301f" },
    { label: "No advice", bg: "#7a2e0a", fg: "#ffffff" },
  ];
  let left = X0;
  return (
    <div className="film-layer f-light">
      <h2 className="f-display f-abs" style={{ left: 140, top: 92, margin: 0, width: 1500, fontSize: 100 }}>
        <Words text="When Sakia is not sure," t={t} start={0.3} step={0.1} />
        <br />
        <Words text="it says so." t={t} start={0.9} step={0.1} />
      </h2>

      <div className="f-kicker" style={{ left: 140, top: 372, ...appear(t, 1.0) }}>
        Age of the weather data
      </div>
      {/* barre en trois zones */}
      <div style={{ opacity: easeOut(prog(t, 1.0, 0.6)) }}>
        {segs.map((s, i) => {
          const w = W * SEG[i];
          const el = (
            <div
              key={s.label}
              className="f-abs"
              style={{
                left,
                top: 430,
                width: w - 4,
                height: 84,
                background: s.bg,
                color: s.fg,
                borderRadius: i === 0 ? "42px 0 0 42px" : i === 2 ? "0 42px 42px 0" : 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 800,
                textAlign: "center",
                lineHeight: 1.1,
              }}
            >
              {s.label}
            </div>
          );
          left += w;
          return el;
        })}
        {[
          { v: "0 h", at: 0 },
          { v: "12 h", at: 12 },
          { v: "48 h", at: 48 },
        ].map((m) => (
          <div key={m.v} className="f-abs" style={{ left: xOfAge(m.at) - 60, top: 524, width: 120, textAlign: "center", fontSize: 32, fontWeight: 800 }}>
            {m.v}
          </div>
        ))}
      </div>

      {/* repère qui avance avec l'âge des données */}
      <div className="f-abs" style={{ left: x - 70, top: 340, width: 140, textAlign: "center", opacity: easeOut(prog(t, 1.6, 0.4)) }}>
        <div style={{ fontSize: 40, fontWeight: 800 }}>{Math.round(age)} h</div>
        <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden style={{ display: "block", margin: "0 auto" }}>
          <path d="M20 36 L6 12 H34Z" fill="#14301f" />
        </svg>
      </div>

      {/* la réponse du garde-fou */}
      <div
        className="f-abs"
        style={{
          left: 140,
          top: 596,
          width: 1360,
          height: 232,
          borderRadius: 36,
          background: "#fbe4d2",
          border: "6px solid #7a2e0a",
          opacity: cardP,
          transform: `translateY(${(1 - cardP) * 30}px) scale(${0.97 + 0.03 * cardP})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 34,
            top: 50,
            width: 124,
            height: 124,
            borderRadius: "50%",
            background: "#7a2e0a",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AlertIcon className="h-[62%] w-[62%]" />
        </div>
        <div style={{ position: "absolute", left: 190, top: 28, right: 30 }}>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.15, color: "#14301f" }}>I am not sure: please ask an agricultural technician (CRDA).</div>
          <div style={{ marginTop: 10, fontSize: 36, fontWeight: 700, color: "#7a2e0a" }}>
            {sure ? "" : `Why: the weather data is more than ${none ? "48" : "12"} hours old${none ? ". No advice is given." : ""}`}
          </div>
        </div>
      </div>

      <p className="f-display f-abs" style={{ left: 140, top: 858, margin: 0, fontSize: 64, ...appear(t, 6.0) }}>
        A person always decides.
      </p>
      <Source style={{ bottom: 40 }}>Illustration of the engine’s rules: weather older than 12 h is flagged “not sure”, older than 48 h gets no advice · fixed sentences, never generated freely</Source>
    </div>
  );
}

