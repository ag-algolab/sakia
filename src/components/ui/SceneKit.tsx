"use client";

import { useEffect, useRef } from "react";

// Outillage des scènes animées (héros). POURQUOI : une animation CSS sur un élément DANS un SVG est dessinée par le fil
// principal du navigateur, image par image ; avec des dizaines d'éléments qui bougent (arbres, roue, soleil, nuages, gouttes),
// la page tombait à ~26 images par seconde avec des saccades (la roue « s'arrêtait et reprenait »).
// À la place : le décor immobile est UN seul SVG dessiné une fois, et chaque élément qui bouge (roue, rayons, nuages, arbres)
// est une petite COUCHE à part (un élément HTML positionné sur un rectangle de la scène). Une couche qui tourne ou glisse est
// animée par la carte graphique (compositeur), sans redessin : fluide même quand la page est chargée.
// Les dessins gardent leurs coordonnées d'origine : chaque couche a pour viewBox son rectangle dans la scène.

export type Box = { x: number; y: number; w: number; h: number };

const vb = (b: Box) => `${b.x} ${b.y} ${b.w} ${b.h}`;

// Racine : prend le rapport largeur/hauteur de la scène. Se met en pause hors écran (économie de batterie).
export function Scene({ box, className, children }: { box: Box; className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.setAttribute("data-paused", e.isIntersecting ? "false" : "true"), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} aria-hidden className={`relative ${className ?? ""}`} style={{ aspectRatio: `${box.w} / ${box.h}` }}>
      {children}
    </div>
  );
}

// Décor immobile : couvre toute la scène (peut dépasser le cadre : les collines se prolongent jusqu'aux bords de l'écran).
export function StaticLayer({ box, children }: { box: Box; children: React.ReactNode }) {
  return (
    <svg viewBox={vb(box)} className="absolute inset-0 block h-full w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
}

// Couche qui bouge : un rectangle de la scène. `className` porte l'animation (classes « sk-l-… » de globals.css).
// `clip` + `innerClassName` : le rectangle rogne ce qui dépasse et c'est un élément INTÉRIEUR qui bouge (canal d'eau : les tirets
// glissent d'une période à l'intérieur d'une fenêtre fixe).
export function Layer({
  scene,
  box,
  className,
  clip = false,
  innerClassName,
  innerStyle,
  children,
}: {
  scene: Box;
  box: Box;
  className?: string;
  clip?: boolean;
  innerClassName?: string;
  innerStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const svg = (
    <svg viewBox={vb(box)} className="block h-full w-full overflow-visible" xmlns="http://www.w3.org/2000/svg">
      {children}
    </svg>
  );
  return (
    <div
      className={`absolute ${innerClassName ? "" : "sk-l"} ${clip ? "overflow-hidden" : ""} ${className ?? ""}`}
      style={{ left: pct(box.x - scene.x, scene.w), top: pct(box.y - scene.y, scene.h), width: pct(box.w, scene.w), height: pct(box.h, scene.h) }}
    >
      {innerClassName ? (
        <div className={`sk-l h-full w-full ${innerClassName}`} style={innerStyle}>
          {svg}
        </div>
      ) : (
        svg
      )}
    </div>
  );
}
