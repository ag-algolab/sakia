"use client";

import { useEffect, useRef, useState } from "react";

// Mouvement de l'interface. Tout est décoratif : sans JavaScript, ou avec « réduire les animations » activé,
// tout reste affiché, immédiatement, avec la valeur finale.

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Active les apparitions à l'entrée dans l'écran (classe sur <html>), une fois la page hydratée.
export function MotionRoot() {
  useEffect(() => {
    if (reducedMotion()) return;
    document.documentElement.classList.add("sk-motion");
    return () => document.documentElement.classList.remove("sk-motion");
  }, []);
  return null;
}

export function useInView<T extends Element>(threshold = 0.15): [React.RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // navigateur très ancien : tout s'affiche tout de suite
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // « vu » = dans l'écran, ou déjà dépassé par le haut (la personne a sauté plus bas : rien ne doit rester caché derrière elle)
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen];
}

// Fait apparaître son contenu (glissement + fondu) quand il entre dans l'écran. `delay` en ms pour échelonner une liste.
export function Reveal({
  children,
  delay = 0,
  pop = false,
  className,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  pop?: boolean;
  className?: string;
  as?: "div" | "li" | "section" | "p";
}) {
  const [ref, seen] = useInView<HTMLElement>(0.12);
  return (
    <Tag
      ref={ref as React.RefObject<never>}
      data-reveal={pop ? "pop" : ""}
      data-in={seen ? "" : undefined}
      style={{ "--d": `${delay}ms` } as React.CSSProperties}
      className={className}
    >
      {children}
    </Tag>
  );
}

// Nombre qui monte de 0 à sa valeur quand il entre dans l'écran.
export function CountUp({
  value,
  duration = 1500,
  format,
  className,
}: {
  value: number;
  duration?: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLSpanElement>(0.3);
  const [shown, setShown] = useState<number>(value);
  useEffect(() => {
    // Le compteur se synchronise avec l'entrée dans l'écran (système extérieur) : il montre la valeur finale tant qu'il n'est pas
    // vu (page sans JavaScript, animations réduites), puis repart de 0.
    if (!seen || reducedMotion() || !Number.isFinite(value)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, duration]);
  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}
