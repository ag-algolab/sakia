import type { ReactNode } from "react";
import { Words } from "../parts";
import type { SceneProps } from "../parts";
import { appear, clamp, easeOut, pop, prog } from "../timeline";

// Scène 4 : la même réponse arrive par quatre canaux. Les textes (SMS, Telegram, voix) sont ceux que fabriquent les
// vrais canaux à partir du conseil du jour. Ce qui est simulé le dit, en toutes lettres, sur la carte.

const H = 490;
const TOP = 222;
const GAP = 36;
// La carte de la voix est plus large : elle porte deux lignes de sous-titres (anglais, puis darija).
const WIDTHS = [470, 372, 372, 372];
const xOf = (i: number) => 140 + WIDTHS.slice(0, i).reduce((a, w) => a + w + GAP, 0);

const typed = (text: string, p: number) => text.slice(0, Math.floor(text.length * clamp(p)));

function Card({ i, at, t, title, sub, real, children }: { i: number; at: number; t: number; title: string; sub: string; real: boolean; children: ReactNode }) {
  const w = WIDTHS[i];
  return (
    <div className="f-card" style={{ left: xOf(i), top: TOP, width: w, height: H, ...pop(t, at, 0.6) }}>
      <div style={{ position: "absolute", left: 26, top: 20, right: 26 }}>
        <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1 }}>{title}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#34452f", marginTop: 4 }}>{sub}</div>
      </div>
      <div style={{ position: "absolute", left: 20, top: 112, width: w - 40, height: 300 }}>{children}</div>
      <div style={{ position: "absolute", left: 26, bottom: 22 }}>
        <span className={`f-badge ${real ? "f-badge-real" : "f-badge-sim"}`} style={{ fontSize: 26, padding: "8px 22px" }}>
          {real ? "Real" : "Simulated"}
        </span>
      </div>
    </div>
  );
}

// Les premières phrases du bulletin : en anglais la dose est dans la première, en darija elle est dans la deuxième.
const sentences = (s: string, n: number) => s.split(/(?<=[.!؟])\s+/).slice(0, n).join(" ").trim();

function Voice({ t, at, enText, arText }: { t: number; at: number; enText: string; arText: string }) {
  const bars = Array.from({ length: 13 }, (_, i) => i);
  const talk = easeOut(prog(t, at + 0.4, 0.5));
  const p = prog(t, at + 0.6, 3.0);
  const en = sentences(enText, 1);
  const ar = sentences(arText, 2);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: 50 }} dir="ltr">
        {bars.map((i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 10 + 38 * talk * (0.5 + 0.5 * Math.sin(t * 7 + i * 1.3)) ** 2,
              borderRadius: 9,
              background: "#0e4a75",
            }}
          />
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 28, fontWeight: 700, lineHeight: 1.2, minHeight: 70 }}>{typed(en, p)}</div>
      {ar && (
        <div className="f-ar" lang="ar" style={{ marginTop: 6, fontSize: 30, fontWeight: 700, lineHeight: 1.3, color: "#7a2e0a", minHeight: 160 }}>
          {typed(ar, clamp((p - 0.15) / 0.85))}
        </div>
      )}
    </div>
  );
}

function Keypad({ t, at }: { t: number; at: number }) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
  const press = t > at + 1.6 && t < at + 2.6;
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, height: 66 }}>
        Press 1 for French
        <br />
        <span className="f-ar" lang="ar" style={{ color: "#7a2e0a" }}>
          2 للعربية
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 84px)", gap: 10, justifyContent: "center", marginTop: 4 }}>
        {keys.map((k) => {
          const hot = press && k === "2";
          return (
            <div
              key={k}
              style={{
                height: 44,
                borderRadius: 22,
                background: hot ? "#f2b33d" : "#123524",
                color: hot ? "#06120d" : "#ffffff",
                fontSize: 28,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: hot ? "scale(1.12)" : undefined,
              }}
            >
              {k}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sms({ t, at, text, request }: { t: number; at: number; text: string; request: string }) {
  const out = easeOut(prog(t, at + 0.5, 0.4));
  const reply = prog(t, at + 1.8, 1.8);
  return (
    <div style={{ background: "#102a1e", borderRadius: 28, padding: 16, height: 300, boxSizing: "border-box" }}>
      <div style={{ background: "#e7f1e3", borderRadius: 14, height: "100%", padding: 14, boxSizing: "border-box", color: "#14301f", overflow: "hidden" }}>
        <div style={{ textAlign: "right", opacity: out }}>
          <span style={{ display: "inline-block", background: "#123524", color: "#fff", borderRadius: 12, padding: "6px 14px", fontSize: 26, fontWeight: 800 }}>{request}</span>
        </div>
        <div style={{ marginTop: 12, opacity: reply > 0 ? 1 : 0 }}>
          <span style={{ display: "inline-block", background: "#ffffff", border: "3px solid #14301f", borderRadius: 12, padding: "6px 12px", fontSize: 27, fontWeight: 700, lineHeight: 1.22 }}>
            {typed(text, reply)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Telegram({ t, at, lines }: { t: number; at: number; lines: string[] }) {
  const typing = t > at + 0.4 && t < at + 1.5;
  const show = easeOut(prog(t, at + 1.5, 0.4));
  const body = lines.slice(0, 3);
  return (
    <div style={{ background: "#dcebf7", borderRadius: 28, padding: 16, height: 300, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0e4a75", marginBottom: 10 }}>@sakia_tn_bot</div>
      {typing && (
        <div style={{ display: "inline-flex", gap: 8, background: "#fff", padding: "14px 18px", borderRadius: 18 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 14, height: 14, borderRadius: 7, background: "#0e4a75", opacity: 0.4 + 0.6 * Math.abs(Math.sin(t * 6 - i)) }} />
          ))}
        </div>
      )}
      <div style={{ opacity: show, transform: `translateY(${(1 - show) * 14}px)`, background: "#ffffff", borderRadius: 18, padding: "10px 14px", color: "#14301f", fontSize: 27, fontWeight: 700, lineHeight: 1.25 }}>
        {body.map((l, i) => (
          <div key={i} style={{ fontWeight: i === 0 ? 800 : 600 }}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Channels({ t, data }: SceneProps) {
  return (
    <div className="film-layer f-light">
      <h2 className="f-display f-abs" style={{ left: 140, top: 88, margin: 0, fontSize: 100 }}>
        <Words text="Same answer. Wherever Noor is." t={t} start={0.3} step={0.1} />
      </h2>

      <Card i={0} at={1.0} t={t} title="Spoken bulletin" sub="Tunisian Arabic (Darija)" real>
        <Voice t={t} at={1.0} enText={data.adviceEn} arText={data.adviceAeb} />
      </Card>
      <Card i={1} at={3.8} t={t} title="Voice line" sub="Keypad call, in the browser" real={false}>
        <Keypad t={t} at={3.8} />
      </Card>
      <Card i={2} at={6.4} t={t} title="Basic phone" sub="SMS, reply shown in English" real={false}>
        <Sms t={t} at={6.4} text={data.sms} request={`${data.cropEn} ${data.region}`.toUpperCase()} />
      </Card>
      <Card i={3} at={9.0} t={t} title="Telegram" sub="t.me/sakia_tn_bot" real>
        <Telegram t={t} at={9.0} lines={data.telegram} />
      </Card>

      {/* hors connexion : c'est l'appli web installable qui recalcule, pas le téléphone de base */}
      <div className="f-abs" style={{ left: 140, top: 752, width: 1380, display: "flex", gap: 28, alignItems: "center", ...appear(t, 12.0, 0.7) }}>
        <svg viewBox="0 0 48 48" width="96" height="96" aria-hidden style={{ flex: "none" }}>
          <g fill="none" stroke="#14301f" strokeWidth="4" strokeLinecap="round">
            <path d="M5 18 C15 8 33 8 43 18" />
            <path d="M11 25 C18 18 30 18 37 25" />
            <path d="M17 32 C21 28 27 28 31 32" />
          </g>
          <circle cx="24" cy="39" r="3" fill="#14301f" />
          <line x1="7" y1="5" x2="41" y2="43" stroke="#7a2e0a" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15 }}>No network? The installable web app recomputes the plan itself.</div>
          <div style={{ fontSize: 30, fontWeight: 600, color: "#34452f", marginTop: 6 }}>From the last saved forecast. Tested in Chrome with the server stopped.</div>
        </div>
      </div>

      {/* le manque comblé dans la journée de Noor : le conseil est prêt avant qu'il parte aux champs */}
      <p className="f-abs" style={{ left: 140, top: 902, width: 1380, margin: 0, fontSize: 36, fontWeight: 800, ...appear(t, 12.8, 0.7) }}>
        Ready every morning, before Noor goes to the field.
      </p>
    </div>
  );
}
