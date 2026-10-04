"use client";

// « Pour les curieux : écrire un SMS en arabizi » : l'ancien faux téléphone où l'on écrit soi-même le message, replié en bas de page.
// Il montre l'analyse des messages écrits à la main (une vraie fonction du service) ; ce n'est pas le parcours principal.

import TypedSmsDemo from "./TypedSmsDemo";
import { STRINGS } from "./strings";
import { useUiLang } from "./useUiLang";

export default function CuriousDetails() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 pb-12">
      <details className="rounded-2xl border border-sakia-sand-dark bg-white p-4 sm:p-5">
        <summary className="flex min-h-11 cursor-pointer select-none items-center text-lg font-bold text-sakia-green">{t.curiousSummary}</summary>
        <div className="mt-4">
          <TypedSmsDemo />
        </div>
      </details>
    </section>
  );
}
