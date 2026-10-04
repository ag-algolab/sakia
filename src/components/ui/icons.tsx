// Pictogrammes dessinés à la main (SVG), tous en `currentColor`. Pensés pour être compris sans lire :
// goutte = arroser, main = attendre, point d'exclamation = demander à une personne.

type P = { className?: string; title?: string; style?: React.CSSProperties };

const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: p.className,
  style: p.style,
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

export const QuestionIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M9.2 9.4a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.2-2.8 4.1" />
    <path d="M12 17.8v.1" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21.5s7-6.1 7-11.7a7 7 0 1 0-14 0c0 5.6 7 11.7 7 11.7z" fill="currentColor" fillOpacity=".15" />
    <circle cx="12" cy="9.8" r="2.6" />
  </svg>
);

export const SproutIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21v-9" />
    <path d="M12 13c-4.5 0-7-2.6-7-6.5 4.2 0 7 2.4 7 6.5z" fill="currentColor" fillOpacity=".2" />
    <path d="M12 11.2c0-3.7 2.4-6.2 7-6.2 0 3.7-2.6 6.2-7 6.2z" fill="currentColor" fillOpacity=".2" />
  </svg>
);

export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.4" fill="currentColor" fillOpacity=".15" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14.6v2.4" />
  </svg>
);

export const PhoneIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6.6 3.5h2.7l1.4 4-1.8 1.3a11 11 0 0 0 5.8 5.8l1.3-1.8 4 1.4v2.7a2 2 0 0 1-2.1 2A15.5 15.5 0 0 1 4.6 5.6a2 2 0 0 1 2-2.1z" fill="currentColor" fillOpacity=".15" />
  </svg>
);

export const SmsIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 20 17H10.5L6 20.5V17H4A1.5 1.5 0 0 1 2.5 15.5V7A1.5 1.5 0 0 1 4 5.5z" fill="currentColor" fillOpacity=".15" />
    <path d="M7 10h10M7 13h6" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M21 3.5 3 10.8l6.3 2.3 2.3 6.2L21 3.5z" fill="currentColor" fillOpacity=".15" />
    <path d="M9.3 13.1 21 3.5" />
  </svg>
);

export const GlobeIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M2.5 12h19M12 2.5c2.6 2.7 3.9 5.9 3.9 9.5s-1.3 6.8-3.9 9.5c-2.6-2.7-3.9-5.9-3.9-9.5s1.3-6.8 3.9-9.5z" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="2.5" width="12" height="19" rx="2.5" fill="currentColor" fillOpacity=".12" />
    <path d="M12 7v7M8.8 11.2 12 14.4l3.2-3.2M10 18.5h4" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4.5 12.8 9.6 18 19.5 6.5" />
  </svg>
);

// Micro : « parler à Sakia » (l'agent vocal).
export const MicIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" fillOpacity=".15" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
  </svg>
);

export const BellIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15L6 16.5z" fill="currentColor" fillOpacity=".15" />
    <path d="M10 21a2.2 2.2 0 0 0 4 0" />
  </svg>
);

// Drapeau de la Tunisie, tout petit, pour dire OÙ on est sans un mot (les emojis de drapeau s'affichent « TN » sous Windows : on le dessine).
// Fond rouge, disque blanc, croissant rouge ouvert vers la droite, étoile rouge dans l'ouverture.
export const TunisiaFlagIcon = (p: P) => (
  <svg
    viewBox="0 0 36 24"
    className={p.className}
    style={p.style}
    role={p.title ? "img" : undefined}
    aria-hidden={p.title ? undefined : true}
    aria-label={p.title}
  >
    <rect width="36" height="24" rx="3" fill="#e70013" />
    <circle cx="18" cy="12" r="7.2" fill="#fff" />
    <circle cx="17.1" cy="12" r="5.4" fill="#e70013" />
    <circle cx="18.6" cy="12" r="4.4" fill="#fff" />
    <path d="M19.20 9.00 L19.91 11.03 L22.05 11.07 L20.34 12.37 L20.96 14.43 L19.20 13.20 L17.44 14.43 L18.06 12.37 L16.35 11.07 L18.49 11.03Z" fill="#e70013" />
  </svg>
);
