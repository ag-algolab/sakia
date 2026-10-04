import { AlertIcon, HandIcon, ListIcon, Logo, ShieldIcon } from "../art";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, pop } from "../timeline";

// Technique, scène 5 : garde-fous, puis signature. Source : README « Guardrails », docs/DATA-CARD.md section D.

const ITEMS = [
  { Icon: ListIcon, title: "Fixed sentences", body: "Replies come from a fixed list, with the numbers filled in." },
  { Icon: AlertIcon, title: "Not sure? It says so", body: "Weather older than 12 h: not sure. Older than 48 h: no advice." },
  { Icon: HandIcon, title: "A person decides", body: "Indicative advice. A technician (CRDA) is always the fallback." },
  { Icon: ShieldIcon, title: "Little data", body: "A pseudonymous chat ID, the governorate and a few settings. No name, no phone number." },
];

export default function Safeguards({ t }: SceneProps) {
  return (
    <div className="film-layer f-dark">
      <h2 className="f-display f-abs" style={{ left: 140, top: 84, margin: 0, fontSize: 90, width: 1600 }}>
        <Words text="Built so a person stays in charge" t={t} start={0.2} step={0.1} />
      </h2>
      {ITEMS.map(({ Icon, title, body }, i) => (
        <div
          key={title}
          className="f-abs"
          style={{
            left: 140 + i * 372,
            top: 240,
            width: 344,
            height: 360,
            borderRadius: 30,
            border: "5px solid #f0e5cb",
            background: "rgba(255,255,255,0.07)",
            boxSizing: "border-box",
            padding: "26px 26px",
            ...pop(t, 1.0 + i * 0.9, 0.6),
          }}
        >
          <div style={{ width: 84, height: 84, color: "#f2b33d" }}>
            <Icon className="h-full w-full" />
          </div>
          <div className="f-display" style={{ fontSize: 42, lineHeight: 1.05, marginTop: 14 }}>
            {title}
          </div>
          <div style={{ fontSize: 29, fontWeight: 600, lineHeight: 1.27, marginTop: 14 }}>{body}</div>
        </div>
      ))}
      <div className="f-abs" style={{ left: 140, top: 732, display: "flex", alignItems: "center", gap: 24, ...appear(t, 6.6, 0.8) }}>
        <Logo size={96} />
        <div>
          <div className="f-display" style={{ fontSize: 66, lineHeight: 1 }}>
            Sakia
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>Built during the hackathon with an AI coding assistant, directed by the author.</div>
        </div>
      </div>
      <div className="f-abs" style={{ left: 140, top: 900, fontSize: 32, fontWeight: 800, ...appear(t, 7.6, 0.7) }}>
        sakia-opal.vercel.app · github.com/ag-algolab/sakia
      </div>
    </div>
  );
}
