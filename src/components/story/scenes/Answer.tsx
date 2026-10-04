import { AlertIcon, DropIcon, HandIcon } from "../art";
import { dayLong, dayShort } from "../data";
import type { Mode } from "../data";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, easeInOut, easeOut, pop, prog, windowed } from "../timeline";

// Scène 3 : la réponse. Deux questions, puis le conseil du jour calculé par le moteur de ce site.

const HEAD: Record<Mode, { title: string; color: string }> = {
  irrigate: { title: "Irrigate", color: "#0e4a75" },
  wait: { title: "Wait", color: "#5a3d22" },
  ask: { title: "Ask a person", color: "#7a2e0a" },
  off: { title: "Out of season", color: "#5a3d22" },
};

function Picto({ mode, className }: { mode: Mode; className?: string }) {
  if (mode === "irrigate") return <DropIcon className={className} />;
  if (mode === "ask") return <AlertIcon className={className} />;
  return <HandIcon className={className} />;
}

function whenLabel(today: string, date: string): string {
  const diff = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
  const prefix = diff === 0 ? "Today · " : diff === 1 ? "Tomorrow · " : "";
  return prefix + dayLong(date);
}

const tunisClock = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

const tunisTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Tunis", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

export default function Answer({ t, data }: SceneProps) {
  const { plan, mode, first, cropEn } = data;
  const collapse = easeInOut(prog(t, 4.2, 0.9));
  const head = HEAD[mode];
  const pulse = 1 + 0.05 * Math.sin(t * 3);
  const days = plan.days.slice(0, 7);
  const ago = plan.summary.daysSinceLastIrrigation;

  const sub =
    mode === "irrigate" && first
      ? whenLabel(plan.today, first.date)
      : mode === "wait"
        ? "No irrigation this week"
        : mode === "ask"
          ? "Not sure: ask the technician (CRDA)"
          : `${cropEn} is not in its growing season`;
  const dose = mode === "irrigate" && first ? `about ${Math.round(first.m3PerHa)} m³/ha` : null;

  return (
    <div className="film-layer f-light">
      <h2 className="f-display f-abs" style={{ left: 140, top: 128, margin: 0, fontSize: 118, ...windowed(t, 0.3, 4.0, 0.2, 0.5) }}>
        <Words text="Sakia asks Noor two things." t={t} start={0.3} step={0.12} />
      </h2>

      {/* les deux questions : elles grossissent puis se rangent en haut */}
      <div
        className="f-abs"
        style={{
          left: 140,
          top: 400,
          width: 1500,
          height: 230,
          transformOrigin: "0 0",
          transform: `translateY(${-340 * collapse}px) scale(${1 - 0.42 * collapse})`,
        }}
      >
        {[
          { label: "Crop", value: cropEn, x: 0, at: 1.3 },
          { label: "Last irrigation", value: ago != null ? `${ago} ${ago === 1 ? "day" : "days"} ago` : "not known", x: 780, at: 2.4 },
        ].map((c) => {
          const tick = easeOut(prog(t, c.at + 0.7, 0.4));
          return (
            <div key={c.label} className="f-card" style={{ left: c.x, top: 0, width: 720, height: 230, ...pop(t, c.at) }}>
              <div style={{ position: "absolute", left: 44, top: 28, fontSize: 32, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#7a2e0a" }}>{c.label}</div>
              <div className="f-display" style={{ position: "absolute", left: 44, top: 82, fontSize: 96 }}>
                {c.value}
              </div>
              <svg viewBox="0 0 60 60" width="84" height="84" aria-hidden style={{ position: "absolute", right: 36, top: 70, opacity: tick, transform: `scale(${0.6 + 0.4 * tick})` }}>
                <circle cx="30" cy="30" r="27" fill="#123524" />
                <path d="M17 31 L26 40 L43 21" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          );
        })}
      </div>
      <p className="f-body f-abs" style={{ left: 140, top: 700, margin: 0, ...windowed(t, 3.2, 4.1, 0.5, 0.4) }}>
        That’s all. No form.
      </p>

      {/* la réponse */}
      <div className="f-card" style={{ left: 140, top: 190, width: 1340, height: 380, ...appear(t, 4.7, 0.7, 50) }}>
        <div
          style={{
            position: "absolute",
            left: 46,
            top: 46,
            width: 288,
            height: 288,
            borderRadius: "50%",
            background: head.color,
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${pulse * easeOut(prog(t, 5.0, 0.7))})`,
            boxShadow: `0 0 0 ${10 + 8 * Math.sin(t * 3)}px rgba(14,74,117,0.14)`,
          }}
        >
          <Picto mode={mode} className="h-[58%] w-[58%]" />
        </div>
        <div className="f-abs" style={{ left: 390, top: 38, fontSize: 30, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7a2e0a", ...appear(t, 5.4) }}>
          Advice · {data.region} · {cropEn}
        </div>
        <div className="f-display f-abs" style={{ left: 390, top: 84, fontSize: 132, ...appear(t, 5.6) }}>
          {head.title}
        </div>
        <div className="f-abs" style={{ left: 390, top: 238, fontSize: 58, fontWeight: 700, whiteSpace: "nowrap", ...appear(t, 6.0) }}>
          {sub}
        </div>
        {dose && (
          <div className="f-abs" style={{ left: 390, top: 304, fontSize: 58, fontWeight: 800, color: "#0e4a75", whiteSpace: "nowrap", ...appear(t, 6.3) }}>
            {dose}
          </div>
        )}
        <div className="f-abs" style={{ right: 36, bottom: 18, ...appear(t, 7.0) }}>
          <span className={`f-badge ${data.live ? "f-badge-real" : "f-badge-sim"}`} style={{ fontSize: 24, padding: "6px 20px" }}>
            {data.live ? `Live · ${tunisClock(plan.generatedAt)} Tunis time` : "Snapshot · 3 Oct 2026"}
          </span>
        </div>
        {data.cautious && (
          <div className="f-abs" style={{ left: 390, bottom: 30, fontSize: 30, fontWeight: 800, color: "#7a2e0a", ...appear(t, 7.4) }}>
            Not sure: ask the technician (CRDA).
          </div>
        )}
      </div>

      {/* les sept jours */}
      {days.map((d, i) => {
        const irr = d.action === "irriguer";
        const isFirst = first && d.date === first.date;
        return (
          <div
            key={d.date}
            className="f-abs"
            style={{
              left: 140 + i * 192,
              top: 612,
              width: 184,
              height: 196,
              borderRadius: 28,
              background: irr ? "#0e4a75" : "#ffffff",
              color: irr ? "#ffffff" : "#14301f",
              border: `4px solid ${irr ? "#0e4a75" : "#14301f"}`,
              textAlign: "center",
              boxShadow: isFirst ? `0 0 0 ${8 + 6 * Math.sin(t * 4)}px rgba(14,74,117,0.22)` : undefined,
              ...pop(t, 6.6 + i * 0.16),
            }}
          >
            <div style={{ fontSize: 36, fontWeight: 800, marginTop: 14 }}>{dayShort(d.date)}</div>
            <div style={{ height: 70, margin: "8px auto 0", width: 70 }}>
              {irr ? <DropIcon className="h-full w-full" /> : <HandIcon className="h-full w-full" />}
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>{Number.isFinite(d.tmax) ? `${Math.round(d.tmax)}°C` : "–"}</div>
          </div>
        );
      })}

      {/* trade-off assumé : deux questions, moins de précision */}
      <p className="f-abs" style={{ left: 1060, top: 66, width: 820, margin: 0, fontSize: 30, fontWeight: 700, lineHeight: 1.3, ...appear(t, 5.0) }}>
        Two questions, not ten: Sakia assumes loamy soil and drip irrigation. Less precision, so the advice is indicative.
      </p>

      {/* ce que fait l'IA, et ce qu'elle ne fait pas : le calcul est fixe, la parole est l'IA */}
      <div className="f-abs" style={{ left: 1530, top: 196, width: 350 }}>
        {[
          { word: "Listens", tag: "AI, in the cloud", at: 7.4, bg: "#0e4a75", fg: "#ffffff" },
          { word: "Calculates", tag: "not AI: fixed rules", at: 8.2, bg: "#ffffff", fg: "#14301f" },
          { word: "Speaks", tag: "AI, in the cloud", at: 9.0, bg: "#0e4a75", fg: "#ffffff" },
        ].map((c, i) => (
          <div
            key={c.word}
            style={{
              height: 104,
              marginBottom: 14,
              borderRadius: 26,
              padding: "12px 24px",
              background: c.bg,
              color: c.fg,
              border: "4px solid #0e4a75",
              boxSizing: "border-box",
              ...pop(t, c.at),
            }}
          >
            <div className="f-display" style={{ fontSize: 44, lineHeight: 1 }}>
              {i + 1}. {c.word}
            </div>
            <div style={{ fontSize: 27, fontWeight: 700, marginTop: 4 }}>{c.tag}</div>
          </div>
        ))}
        <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.28, ...appear(t, 10.0) }}>
          A spreadsheet can do the middle. It cannot do the ends. The sums can be checked: they cannot hallucinate.
        </div>
      </div>

      <p className="f-abs" style={{ left: 140, top: 832, width: 1340, margin: 0, fontSize: 34, fontWeight: 700, lineHeight: 1.3, ...appear(t, 8.8) }}>
        Indicative advice, calculated from the forecast weather (it can change). The decision is yours.
      </p>
      <p className="f-src" style={{ color: "var(--ink2)", bottom: 34 }}>
        {data.live
          ? `FAO-56 water balance on the Open-Meteo forecast · computed live by this site, ${tunisTime(plan.generatedAt)} (Tunis time)`
          : "FAO-56 water balance on the Open-Meteo forecast · real engine output of 3 October 2026 (live answer not reachable)"}
      </p>
    </div>
  );
}
