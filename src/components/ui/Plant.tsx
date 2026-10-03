// Une plante qui raconte l'effet du stress hydrique : flétrie (calendrier fixe qui arrose trop tard) ou en pleine santé (arrosage conseillé).
// Dessin vectoriel, animé doucement. Décoratif : le chiffre qui l'accompagne porte l'information.

export default function Plant({ wilted, className }: { wilted: boolean; className?: string }) {
  const leaf = wilted ? "#b9a24a" : "#4aa263";
  const leafDark = wilted ? "#8f7a2e" : "#2f7a47";
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={className}>
      {/* sol fissuré ou humide */}
      <ellipse cx="60" cy="108" rx="44" ry="9" fill={wilted ? "#b98a55" : "#6b4a2a"} />
      {wilted ? (
        <path d="M30 108 l8 -4 l6 3 M70 107 l10 -3 l8 4" stroke="#8a6238" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <ellipse cx="60" cy="106" rx="34" ry="5" fill="#4d3419" />
      )}
      <g className={wilted ? "sk-wilt" : "sk-sway"} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        {wilted ? (
          <>
            {/* tige courbée, feuilles qui pendent */}
            <path d="M60 106 C60 84 66 68 82 58" stroke={leafDark} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M82 58 C96 58 100 72 94 84 C86 80 82 70 82 58Z" fill={leaf} />
            <path d="M66 82 C54 80 44 88 44 98 C56 98 64 92 66 82Z" fill={leaf} />
            <path d="M70 70 C60 64 50 68 46 76 C56 80 66 78 70 70Z" fill={leafDark} opacity=".8" />
          </>
        ) : (
          <>
            {/* tige droite, feuilles vers le ciel */}
            <path d="M60 106 C60 84 60 64 60 40" stroke={leafDark} strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M60 40 C48 30 50 14 62 10 C72 20 70 34 60 40Z" fill={leaf} />
            <path d="M60 64 C44 62 34 50 36 38 C50 38 60 48 60 64Z" fill={leaf} />
            <path d="M60 74 C76 72 88 60 86 46 C70 46 60 58 60 74Z" fill={leafDark} />
            <path d="M60 90 C48 90 40 82 40 72 C52 72 60 78 60 90Z" fill={leaf} />
          </>
        )}
      </g>
      {/* soleil brûlant ou goutte */}
      {wilted ? (
        <g stroke="#e0642d" strokeWidth="3" strokeLinecap="round">
          <circle cx="98" cy="22" r="8" fill="#f2b33d" stroke="none" />
          <path d="M98 6v5M98 33v5M82 22h5M109 22h5M87 11l3 3M106 30l3 3M109 11l-3 3M90 30l-3 3" />
        </g>
      ) : (
        <g fill="#5eb2e6">
          <path className="sk-drop" d="M96 18 c3 4 4 7 0 10 c-4 -3 -3 -6 0 -10z" />
          <path className="sk-drop" style={{ animationDelay: "0.9s" }} d="M22 20 c2.4 3.4 3.2 5.6 0 8 c-3.2 -2.4 -2.4 -4.6 0 -8z" />
        </g>
      )}
    </svg>
  );
}
