"use client";

import { useEffect } from "react";

// Les sections détaillées de la page sont repliées. Un lien vers l'une d'elles (/about#data depuis l'accueil et le pied de page)
// doit la montrer ouverte : on ouvre la section qui porte l'ancre, ou qui la contient, puis on la fait venir à l'écran.
export default function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      const box = target instanceof HTMLDetailsElement ? target : target?.closest("details");
      if (!target || !box) return;
      box.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
