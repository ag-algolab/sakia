// Langue de l'interface (fr, ar, en). On suit le choix fait dans l'en-tête du site (clé « sakia-lang », écrite par LangProvider,
// qui met aussi à jour l'attribut lang de <html>) : pas de second sélecteur de langue à gérer ici.

"use client";

import { useEffect, useState } from "react";
import type { UiLang } from "./strings";

const isLang = (v: unknown): v is UiLang => v === "fr" || v === "ar" || v === "en";

function read(): UiLang {
  try {
    const stored = localStorage.getItem("sakia-lang");
    if (isLang(stored)) return stored;
  } catch {
    // stockage bloqué : on regarde la page, puis le navigateur
  }
  const attr = document.documentElement.lang.slice(0, 2);
  if (isLang(attr)) return attr;
  const nav = navigator.language.slice(0, 2);
  return isLang(nav) ? nav : "fr";
}

export function useUiLang(): UiLang {
  const [lang, setLang] = useState<UiLang>("fr");
  useEffect(() => {
    const sync = () => setLang(read());
    sync();
    // LangProvider change l'attribut lang de <html> quand la personne choisit une langue
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    window.addEventListener("storage", sync);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", sync);
    };
  }, []);
  return lang;
}
