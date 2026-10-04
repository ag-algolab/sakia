import { ImageResponse } from "next/og";

// L'image qui s'affiche quand on colle l'adresse du site dans une conversation, un réseau social ou la page de rendu :
// la marque, la promesse en une phrase, et ce qui est réel ou simulé (même honnêteté que l'accueil).

export const alt = "Sakia: one irrigation decision a day, by voice, SMS or chat, for Tunisian smallholders";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const chip = (text: string, bg: string, color: string) => (
    <div style={{ display: "flex", padding: "10px 22px", borderRadius: 14, background: bg, color, fontSize: 28, fontWeight: 800, letterSpacing: 1 }}>{text}</div>
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
          background: "linear-gradient(180deg, #0d2e22 0%, #1f4a33 52%, #c9892c 100%)",
          color: "#ffffff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="31" fill="none" stroke="#f2b33d" strokeWidth="5" />
            <circle cx="38" cy="38" r="6" fill="#f2b33d" />
            <path d="M38 7V69M7 38H69M16 16L60 60M16 60L60 16" stroke="#f2b33d" strokeWidth="3.5" />
            <path d="M0 70C12 62 24 78 38 70C52 62 64 78 76 70" fill="none" stroke="#7fc8f2" strokeWidth="4" />
          </svg>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800 }}>Sakia</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 104, fontWeight: 800, lineHeight: 1.02 }}>One decision a day.</div>
          <div style={{ display: "flex", fontSize: 38, lineHeight: 1.3, color: "#f4ecd8", maxWidth: 940 }}>
            Which day to irrigate, and how much. By voice, SMS or chat: no smartphone, no reading needed.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            {chip("REAL: Telegram · Web · App", "#2b5a37", "#ffffff")}
            {chip("SIMULATED: Call · SMS", "#f2b33d", "#24301f")}
          </div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#f4ecd8" }}>Kairouan, Tunisia</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
