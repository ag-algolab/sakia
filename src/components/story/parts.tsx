import { Fragment } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { FilmData } from "./data";
import { easeOut, easeInOut, prog } from "./timeline";

// Toutes les scènes reçoivent `t` : les secondes écoulées DEPUIS LE DÉBUT DE LA SCÈNE (peut être légèrement négatif
// pendant le fondu d'entrée).
export type SceneProps = { t: number; data: FilmData };

// Un texte dont les mots arrivent l'un après l'autre (montée + netteté).
export function Words({
  text,
  t,
  start,
  step = 0.08,
  dur = 0.7,
  className,
  style,
}: {
  text: string;
  t: number;
  start: number;
  step?: number;
  dur?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span className={className} style={style}>
      {text.split(" ").map((w, i, all) => {
        const p = easeOut(prog(t, start + i * step, dur));
        return (
          <Fragment key={i}>
            <span
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 0.35}em)`,
                filter: p < 1 ? `blur(${(1 - p) * 10}px)` : undefined,
              }}
            >
              {w}
            </span>
            {i < all.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </span>
  );
}

// Un temps fort d'une scène : entre par la droite, sort par la gauche. `children` reçoit le temps local du temps fort.
export function Beat({ t, s, e, children }: { t: number; s: number; e: number; children: (lt: number) => ReactNode }) {
  if (t < s - 0.05 || t > e + 0.05) return null;
  const inn = easeOut(prog(t, s, 0.55));
  const out = easeInOut(prog(t, e - 0.5, 0.5));
  return (
    <div className="film-layer" style={{ opacity: inn * (1 - out), transform: `translateX(${(1 - inn) * 90 - out * 90}px)` }}>
      {children(t - s)}
    </div>
  );
}

// Ligne de source, en bas à gauche : chaque chiffre dit à voix haute a sa source à l'écran.
export function Source({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <p className="f-src" style={style}>
      {children}
    </p>
  );
}

// Nombre qui monte vers sa valeur.
export function Num({ value, p, digits = 0 }: { value: number; p: number; digits?: number }) {
  const v = value * easeOut(p);
  return <>{v.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits })}</>;
}
