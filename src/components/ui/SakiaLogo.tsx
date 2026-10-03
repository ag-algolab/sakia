// Logo : la sakia, la roue à godets traditionnelle qui puise l'eau. Elle tourne doucement.

export default function SakiaLogo({ size = 36, spin = true, className }: { size?: number; spin?: boolean; className?: string }) {
  const spokes = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className={className}>
      <g className={spin ? "sk-spin" : undefined} style={{ transformOrigin: "24px 24px", transformBox: "view-box" }}>
        <circle cx="24" cy="24" r="17" fill="none" stroke="currentColor" strokeWidth="2.6" />
        <circle cx="24" cy="24" r="4" fill="currentColor" />
        {spokes.map((a) => (
          <g key={a} transform={`rotate(${a} 24 24)`}>
            <line x1="24" y1="24" x2="24" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            {/* godet */}
            <rect x="21" y="2.6" width="6" height="5.4" rx="1.4" fill="#f2b33d" />
          </g>
        ))}
      </g>
      <path d="M4 43c4-3 7-3 10 0s6 3 10 0 7-3 10 0 6 3 10 0" fill="none" stroke="#7fc4ee" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
