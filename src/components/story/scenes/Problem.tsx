import { PersonIcon } from "../art";
import { Beat, Num, Source, Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, clamp, easeInOut, easeOut, pop, prog } from "../timeline";

// Scène 2 : le problème, en quatre chiffres. Un chiffre à la fois, chacun avec sa source à l'écran.
// Sources et réserves : docs/DATA-CARD.md, section A.

const BIG: React.CSSProperties = { position: "absolute", left: 140, top: 168, margin: 0, fontSize: 290, lineHeight: 1 };
const DESC: React.CSSProperties = { position: "absolute", left: 140, top: 520, width: 900, margin: 0 };

// « About » en petit au-dessus d'un chiffre arrondi (« about 1 in 4 »).
function About({ lt }: { lt: number }) {
  return (
    <div className="f-display f-abs" style={{ left: 140, top: 158, fontSize: 60, fontWeight: 700, color: "var(--accent)", ...appear(lt, 0.2) }}>
      about
    </div>
  );
}

function Kicker({ lt, children }: { lt: number; children: React.ReactNode }) {
  return (
    <div className="f-kicker" style={{ left: 140, top: 104, ...appear(lt, 0.1) }}>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- A : un adulte sur quatre ne lit pas
function Reading({ lt }: { lt: number }) {
  const ring = (lt * 0.9) % 1;
  const strike = easeInOut(prog(lt, 3.4, 0.8));
  return (
    <>
      <Kicker lt={lt}>Who it must reach</Kicker>
      <h2 className="f-display" style={{ ...BIG, fontSize: 236, top: 190 }}>
        <Words text="27.9 %" t={lt} start={0.3} step={0.25} />
      </h2>
      <p className="f-body" style={{ ...DESC, width: 820, ...appear(lt, 1.4) }}>
        of people aged 10+ in Kairouan cannot read. More than 1 in 4.
      </p>
      <p className="f-body" style={{ ...DESC, top: 700, color: "var(--accent)", fontWeight: 800, ...appear(lt, 3.8) }}>
        A written bulletin does not reach them.
      </p>

      {/* quatre personnes, la quatrième s'allume */}
      {[0, 1, 2, 3].map((i) => {
        const lit = i === 3 ? easeOut(prog(lt, 2.4, 0.6)) : 0;
        return (
          <div key={i} className="f-abs" style={{ left: 1020 + i * 210, top: 200, width: 190, height: 220, ...pop(lt, 0.7 + i * 0.16) }}>
            {i === 3 && (
              <div
                style={{
                  position: "absolute",
                  left: 5,
                  top: 10,
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  border: "6px solid #f2b33d",
                  opacity: lit * (1 - ring) * 0.8,
                  transform: `scale(${1 + ring * 0.55})`,
                }}
              />
            )}
            <div style={{ position: "absolute", inset: 0, color: lit > 0.5 ? "#f2b33d" : "#9db5a5" }}>
              <PersonIcon className="h-full w-full" />
            </div>
          </div>
        );
      })}

      {/* le bulletin écrit, barré */}
      <div className="f-card" style={{ left: 1020, top: 480, width: 840, height: 210, borderRadius: 28, ...appear(lt, 2.6, 0.7) }}>
        <div style={{ padding: "26px 40px 0", fontSize: 36, fontWeight: 800, color: "#14301f" }}>Weather bulletin · 7 days</div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ margin: "18px 40px 0", height: 20, borderRadius: 10, background: "#b9cbbd", width: `${92 - i * 18}%` }} />
        ))}
      </div>
      <svg viewBox="0 0 1920 1080" className="film-layer" style={{ pointerEvents: "none" }} aria-hidden>
        <path
          d="M1000 700 L1880 480"
          stroke="#e0642d"
          strokeWidth="18"
          strokeLinecap="round"
          strokeDasharray="920"
          strokeDashoffset={920 * (1 - strike)}
          fill="none"
        />
      </svg>

      <Source>People aged 10+ who cannot read, Kairouan: 27.9 % (Tunisia: 17.3 %) · INS, 2024 census; the Kairouan figure as reported by the press, the official bulletin gives 25.5–28.5 % for the five highest governorates</Source>
    </>
  );
}

// ---------------------------------------------------------------- B : la nappe, à 230 %
function Aquifer({ lt }: { lt: number }) {
  const p = prog(lt, 1.0, 2.8);
  const level = easeInOut(p) * 230; // en % de ce que la nappe renouvelle
  const px = 2.44; // pixels par pour cent
  const base = 740;
  const yTop = base - level * px;
  const y100 = base - 100 * px;
  const phase = Math.sin(lt * 2.4) * 10;
  const surface = `M1160 ${yTop} q40 ${-9 + phase * 0.3} 80 0 t80 0 t80 0 t80 0 V${base} H1160Z`;
  const over = clamp((level - 100) / 130);
  return (
    <>
      <Kicker lt={lt}>What is at stake</Kicker>
      <h2 className="f-display" style={{ ...BIG, color: over > 0.02 ? "var(--accent)" : "var(--ink)" }}>
        <Num value={230} p={p} /> %
      </h2>
      <p className="f-body" style={{ ...DESC, ...appear(lt, 1.2) }}>
        Kairouan’s aquifer is drawn at 230 % of its renewable volume.
      </p>
      <p className="f-body" style={{ ...DESC, top: 760, width: 1150, ...appear(lt, 4.0) }}>
        <span style={{ color: "var(--accent)", fontWeight: 800 }}>Farming takes about three quarters</span> of Tunisia’s water withdrawals.
      </p>

      <svg viewBox="0 0 1920 1080" className="film-layer" aria-hidden>
        <defs>
          <clipPath id="tank-clip">
            <rect x="1180" y="130" width="300" height="610" rx="34" />
          </clipPath>
          <linearGradient id="tank-blue" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#7fc8f2" />
            <stop offset="1" stopColor="#2f8fd0" />
          </linearGradient>
          <linearGradient id="tank-heat" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#ff8a4a" />
            <stop offset="1" stopColor="#e0642d" />
          </linearGradient>
        </defs>
        <g clipPath="url(#tank-clip)">
          <rect x="1180" y="130" width="300" height="610" fill="#0a1f17" />
          <path d={surface} fill="url(#tank-blue)" transform="translate(0 0)" />
          {/* au-dessus de la ligne des 100 % : la part qu'on prend en trop */}
          <clipPath id="tank-over">
            <rect x="1160" y="0" width="360" height={y100} />
          </clipPath>
          <g clipPath="url(#tank-over)">
            <path d={surface} fill="url(#tank-heat)" />
          </g>
        </g>
        <rect x="1180" y="130" width="300" height="610" rx="34" fill="none" stroke="#ffffff" strokeWidth="7" />
        {/* graduations */}
        {[0, 100, 200].map((v) => (
          <g key={v} style={{ opacity: easeOut(prog(lt, 0.6, 0.6)) }}>
            <line x1="1480" x2="1514" y1={base - v * px} y2={base - v * px} stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
            <text x="1528" y={base - v * px + 12} fill="#ffffff" fontSize="34" fontWeight="800">
              {v} %
            </text>
          </g>
        ))}
        <line x1="1160" x2="1500" y1={y100} y2={y100} stroke="#ffffff" strokeWidth="5" strokeDasharray="14 12" />
      </svg>
      <div className="f-abs" style={{ left: 1610, top: y100 - 150, width: 270, fontSize: 32, fontWeight: 700, lineHeight: 1.25, ...appear(lt, 3.4) }}>
        100 % is what the aquifer renews
      </div>

      <Source>Kairouan aquifer: 230 % of its renewable volume · African Manager, 2024 (press report). Agriculture: 75.5 % of national withdrawals · FAO AQUASTAT, 2022</Source>
    </>
  );
}

// ---------------------------------------------------------------- C : un SMS sur six arrive au bon moment
function Envelope({ x, y, lt, i }: { x: number; y: number; lt: number; i: number }) {
  const onTime = i === 5;
  const settle = easeOut(prog(lt, 3.0 + i * 0.12, 0.5));
  const gold = onTime ? easeOut(prog(lt, 3.9, 0.6)) : 0;
  return (
    <div
      className="f-abs"
      style={{
        left: x,
        top: y,
        width: 230,
        height: 150,
        borderRadius: 26,
        background: onTime && gold > 0.5 ? "#f2b33d" : "#1d3a2c",
        border: `5px solid ${onTime && gold > 0.5 ? "#ffffff" : "#6f8f7b"}`,
        color: onTime && gold > 0.5 ? "#06120d" : "#c4d6c9",
        ...pop(lt, 0.9 + i * 0.16),
        boxShadow: onTime ? `0 0 ${gold * 60}px rgba(242,179,61,${gold * 0.7})` : undefined,
      }}
    >
      <svg viewBox="0 0 230 150" width="230" height="150" aria-hidden>
        <path d="M30 40 L115 98 L200 40" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="30" y="38" width="170" height="78" rx="10" fill="none" stroke="currentColor" strokeWidth="8" />
      </svg>
      {!onTime && (
        <svg viewBox="0 0 60 60" width="58" height="58" aria-hidden style={{ position: "absolute", right: 14, bottom: 12, opacity: settle }}>
          <circle cx="30" cy="30" r="25" fill="#7a2e0a" stroke="#ffffff" strokeWidth="4" />
          <path d="M30 16 V31 L40 37" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        </svg>
      )}
      {onTime && (
        <svg viewBox="0 0 60 60" width="58" height="58" aria-hidden style={{ position: "absolute", right: 14, bottom: 12, opacity: gold }}>
          <circle cx="30" cy="30" r="25" fill="#123524" stroke="#ffffff" strokeWidth="4" />
          <path d="M17 31 L26 40 L43 21" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Sms({ lt }: { lt: number }) {
  return (
    <>
      <Kicker lt={lt}>What has been tried</Kicker>
      <About lt={lt} />
      <h2 className="f-display" style={{ ...BIG, top: 214 }}>
        <Words text="1 in 6" t={lt} start={0.3} step={0.18} />
      </h2>
      <p className="f-body" style={{ ...DESC, top: 540, ...appear(lt, 1.4) }}>
        farmers said the SMS advice came on time.
      </p>
      <p className="f-body" style={{ ...DESC, top: 720, color: "var(--accent)", fontWeight: 800, ...appear(lt, 4.3) }}>
        Generic messages: too general.
      </p>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Envelope key={i} i={i} lt={lt} x={1040 + (i % 3) * 250} y={210 + Math.floor(i / 3) * 200} />
      ))}
      <div className="f-abs" style={{ left: 1040, top: 640, width: 760, fontSize: 36, fontWeight: 700, ...appear(lt, 4.6) }}>
        1 said on time · 5 did not
      </div>
      <Source>Past SMS pilot (ICARDA / GIZ, ICT2Scale): about 15–16 % of 421 respondents, 3 regions, said messages arrived at the right time (survey perception, not a delivery measurement) · evaluation 2021</Source>
    </>
  );
}

// ---------------------------------------------------------------- D : l'outil le plus proche demande plus de dix renseignements
const FIELDS = [
  "Plot name",
  "Location",
  "Sowing date",
  "Plot type",
  "Crop",
  "Initial water stock",
  "Irrigation system",
  "Flow (L/h)",
  "Sprinkler spacing",
  "Row spacing",
  "Efficiency (%)",
  "Water salinity (dS/m)",
];

function StateApp({ lt }: { lt: number }) {
  return (
    <>
      <Kicker lt={lt}>The closest tool</Kicker>
      <h2 className="f-display" style={BIG}>
        <Words text="10+" t={lt} start={0.3} />
      </h2>
      <p className="f-body" style={{ ...DESC, ...appear(lt, 1.2) }}>
        details to fill in before Irey Aqua, the state’s irrigation app, can advise.
      </p>
      <p className="f-body" style={{ ...DESC, top: 740, color: "var(--accent)", fontWeight: 800, width: 1100, ...appear(lt, 4.0) }}>
        Capable. Built for smartphone users.
      </p>

      <div className="f-card" style={{ left: 1000, top: 130, width: 860, height: 560, borderRadius: 30, ...appear(lt, 0.5, 0.6) }}>
        <div style={{ padding: "22px 34px", fontSize: 32, fontWeight: 800, background: "#123524", color: "#ffffff", borderRadius: "30px 30px 0 0" }}>
          New plot · Irey Aqua
        </div>
        {FIELDS.map((label, i) => {
          const col = i < 6 ? 0 : 1;
          const row = i % 6;
          const a = easeOut(prog(lt, 0.9 + i * 0.2, 0.4));
          const filled = easeOut(prog(lt, 1.5 + i * 0.2, 0.5));
          return (
            <div key={label} className="f-abs" style={{ left: 30 + col * 420, top: 96 + row * 74, width: 390, opacity: a }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: "#14301f", lineHeight: 1.1 }}>{label}</div>
              <div style={{ marginTop: 6, height: 28, borderRadius: 8, border: "3px solid #14301f", background: "#eef3ee", position: "relative" }}>
                <div style={{ position: "absolute", left: 8, top: 5, height: 12, width: `${filled * 55}%`, borderRadius: 6, background: "#14301f" }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="f-abs" style={{ left: 1000, top: 708, ...pop(lt, 3.2) }}>
        <span className="f-badge f-badge-dark" style={{ fontSize: 26 }}>
          Google Play: “100+” installs
        </span>
      </div>
      <Source>Irey Aqua (INGC), as observed by the author on 3 Oct 2026 (form redrawn, field names translated) · Google Play, 3 Oct 2026: “100+” installs (100 to 499), Android only, web users not counted: not a measure of real use</Source>
    </>
  );
}

export default function Problem({ t }: SceneProps) {
  return (
    <div className="film-layer f-dark">
      <Beat t={t} s={0.4} e={7.0}>{(lt) => <Reading lt={lt} />}</Beat>
      <Beat t={t} s={7.0} e={13.5}>{(lt) => <Aquifer lt={lt} />}</Beat>
      <Beat t={t} s={13.5} e={20.0}>{(lt) => <Sms lt={lt} />}</Beat>
      <Beat t={t} s={20.0} e={26.6}>{(lt) => <StateApp lt={lt} />}</Beat>
    </div>
  );
}
