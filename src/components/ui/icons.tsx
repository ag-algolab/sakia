// Pictogrammes dessinés à la main (SVG), tous en `currentColor`. Pensés pour être compris sans lire :
// goutte = arroser, main = attendre, point d'exclamation = demander à une personne.

type P = { className?: string; title?: string };

const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  role: p.title ? ("img" as const) : undefined,
  "aria-hidden": p.title ? undefined : true,
  "aria-label": p.title,
});

export const DropIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 2.2c-.4 0-.8.2-1 .6C8.6 6.6 5 10.6 5 14.6a7 7 0 0 0 14 0c0-4-3.6-8-6-11.8-.2-.4-.6-.6-1-.6z" />
    <path d="M8.6 15.2a3.5 3.5 0 0 0 2.6 3.2" stroke="#fff" strokeOpacity=".55" strokeWidth="1.6" fill="none" />
  </svg>
);

export const HandIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11m0-6.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V13m0-3a1.5 1.5 0 0 1 3 0v4.5c0 4-2.8 7-6.5 7-2.6 0-4.3-1.2-5.7-3.3L4 14.6a1.6 1.6 0 0 1 2.5-2L8 14" />
  </svg>
);

export const AlertIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5z" />
    <path d="M12 10v4.5M12 17.4v.1" />
  </svg>
);

export const SpeakerIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9.5v5h3.6L12.5 19V5L7.6 9.5H4z" fill="currentColor" />
    <path d="M16 8.5a5 5 0 0 1 0 7M18.6 5.8a9 9 0 0 1 0 12.4" />
  </svg>
);

export const PauseIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <rect x="6" y="5" width="4.2" height="14" rx="1.4" />
    <rect x="13.8" y="5" width="4.2" height="14" rx="1.4" />
  </svg>
);

export const RetryIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />
  </svg>
);

export const SunIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6" />
  </svg>
);

export const CloudIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 18a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 8.6 4.7 4.7 0 0 1 17 18H7z" fill="currentColor" fillOpacity=".18" />
  </svg>
);

export const RainIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 15a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 5.6 4.7 4.7 0 0 1 17 15H7z" fill="currentColor" fillOpacity=".18" />
    <path d="M8.5 18.2l-1 2.2M12.5 18.2l-1 2.2M16.5 18.2l-1 2.2" />
  </svg>
);

export const ThermoIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M10 14.2V5a2 2 0 1 1 4 0v9.2a4 4 0 1 1-4 0z" />
    <path d="M12 9v7" />
  </svg>
);

export const PersonIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <circle cx="12" cy="6.2" r="3.2" />
    <path d="M5.5 21v-5.3a6.5 6.5 0 0 1 13 0V21z" />
  </svg>
);

export const NoteIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" fill="currentColor" />
    <circle cx="16.5" cy="16" r="2.5" fill="currentColor" />
  </svg>
);

export const WaterBarIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 17c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 4.8-.4" />
    <path d="M3 12c2.2-2.4 4.4-2.4 6.6 0s4.4 2.4 6.6 0 4.4-2.4 4.8-.4" />
  </svg>
);
