"use client";

import Link from "next/link";
import { CheckIcon } from "./icons";
import { useLang } from "./LangProvider";
import { Reveal } from "./motion";

// Fait pour un réseau faible : trois chiffres MESURÉS le 4 oct. 2026 (docs/NOTES-chiffres.md, section F, mot pour mot) et un lien vers
// /speed, la mesure complète face à cinq sites (page de la session principale, en anglais). Jamais « dix fois plus léger que tout le
// monde » : c'est environ deux fois face aux sites légers.
const FIRST_VISIT_KB = 383; // F1 : première visite, navigateur réel, téléphone d'entrée de gamme simulé, depuis Tunis

export default function SpeedBand() {
  const { t, fmtNum } = useLang();
  const tile = "rounded-2xl bg-sakia-sand/60 p-3 sm:p-4";
  return (
    <section aria-labelledby="speed-title" className="mx-auto w-full max-w-5xl px-4 pt-6">
      <Reveal className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 id="speed-title" className="font-display text-2xl font-bold leading-tight text-sakia-green-deep">
            {t("speedTitle")}
          </h2>
          <Link href="/speed" hrefLang="en" className="min-h-11 content-center text-base font-bold text-sakia-water-deep underline underline-offset-2">
            {t("speedLink")} <span aria-hidden className="inline-block rtl:-scale-x-100">→</span>
          </Link>
        </div>
        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.6fr]">
          <li className={tile}>
            <p className="font-display whitespace-nowrap text-3xl font-extrabold leading-none text-sakia-green-deep sm:text-4xl" dir="ltr">
              {fmtNum(FIRST_VISIT_KB)} {t("kbUnit")}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-sakia-brown">{t("speedFirst")}</p>
          </li>
          <li className={tile}>
            <p className="font-display whitespace-nowrap text-3xl font-extrabold leading-none text-sakia-water-deep sm:text-4xl" dir="ltr">
              {fmtNum(0)} {t("kbUnit")}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-sakia-brown">{t("speedAfter")}</p>
          </li>
          <li className={`${tile} col-span-2 flex items-center gap-3 bg-sakia-green-light sm:col-span-1`}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sakia-green text-white">
              <CheckIcon className="h-6 w-6" />
            </span>
            <p className="text-base font-bold leading-snug text-sakia-green-deep">{t("speedOffline")}</p>
          </li>
        </ul>
      </Reveal>
    </section>
  );
}
