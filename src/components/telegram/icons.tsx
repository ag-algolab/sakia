// Pictogrammes de la page /telegram (SVG dessinés à la main, en `currentColor`, décoratifs : lus par personne).

type P = { className?: string };

// Avion en papier : l'emblème de Telegram, en plein.
export const PlaneIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M21.6 3.3 2.7 10.6c-1 .4-.9 1.8.1 2.1l4.7 1.5 1.8 5.6c.3.9 1.4 1.1 2 .4l2.6-2.6 4.7 3.5c.8.6 1.9.1 2.1-.8l3.1-15.2c.2-1.1-.8-1.9-1.8-1.5zM9.3 13.4l8.3-6.1c.2-.1.4.1.2.3l-6.7 6.5-.3 3.6-1.5-4.3z" />
  </svg>
);

// Flèche d'envoi (zone de saisie). Elle se retourne en lecture de droite à gauche.
export const SendIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`${className ?? ""} rtl:-scale-x-100`}>
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);

export const ChevronDownIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const InfoIcon = ({ className }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v5.5M12 7.6v.1" />
  </svg>
);
