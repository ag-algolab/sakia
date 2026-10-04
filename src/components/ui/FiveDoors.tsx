"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon, CheckIcon, DownloadIcon, DropIcon, GlobeIcon, HandIcon, PhoneIcon, SendIcon, SmsIcon } from "./icons";
import { useLang } from "./LangProvider";
import { Reveal } from "./motion";

// Les CINQ PORTES (décision d'Anthony, liste figée : on n'ajoute rien, on la met en valeur). Une décision par jour, reçue comme on peut :
// Appel, SMS, Telegram, Web, Appli. Chaque porte porte sa pastille d'honnêteté, TOUJOURS visible et jamais animée :
// RÉEL (Telegram, Web, Appli) ou SIMULÉ (Appel, SMS : une vraie ligne demande un opérateur). Ne jamais promettre un vrai numéro.
// Voir docs/MARKETING.md « Les cinq portes ».

type Door = { key: string; icon: React.ReactNode; real: boolean; href?: string; external?: boolean };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

function Badge({ real }: { real: boolean }) {
  const { t } = useLang();
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-xs font-extrabold uppercase tracking-wide ${
        real ? "bg-sakia-green text-white" : "bg-sakia-sun/90 text-sakia-ink"
      }`}
    >
      {real ? t("doorReal") : t("doorSimulated")}
    </span>
  );
}

export default function FiveDoors() {
  const { t } = useLang();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Chrome propose l'installation par un événement : on le garde pour l'offrir quand la personne touche « Appli ».
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", on);
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  const doors: Door[] = [
    { key: "call", icon: <PhoneIcon className="h-8 w-8" />, real: false, href: "/call" },
    { key: "sms", icon: <SmsIcon className="h-8 w-8" />, real: false, href: "/phone" },
    { key: "telegram", icon: <SendIcon className="h-8 w-8" />, real: true, href: "/telegram" },
    { key: "web", icon: <GlobeIcon className="h-8 w-8" />, real: true, href: "#listen" },
    { key: "app", icon: <DownloadIcon className="h-8 w-8" />, real: true },
  ];

  const card = (d: Door) => (
    <>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sakia-green-light text-sakia-green-deep">{d.icon}</span>
      <span className="mt-3 flex flex-wrap items-center gap-2">
        <span className="font-display text-xl font-bold text-sakia-green-deep">{t(`door_${d.key}`)}</span>
        <Badge real={d.real} />
      </span>
      <span className="mt-1 text-sm font-medium leading-snug text-sakia-brown">{t(`door_${d.key}_line`)}</span>
    </>
  );
  const cardClass =
    "sk-press flex h-full min-w-[15rem] snap-start flex-col items-start rounded-3xl bg-white p-4 text-start shadow-sm ring-1 ring-black/5 hover:ring-sakia-green sm:min-w-0";

  return (
    <section aria-labelledby="doors-title" className="mx-auto w-full max-w-5xl px-4 pt-8">
      <Reveal>
        <h2 id="doors-title" className="font-display text-3xl font-bold leading-tight text-sakia-green-deep sm:text-4xl">
          {t("doorsTitle")}
        </h2>
        <p className="mt-2 max-w-3xl text-lg font-semibold leading-snug text-sakia-brown">{t("doorsHook")}</p>
      </Reveal>

      <ul className="sk-noscrollbar -mx-4 mt-5 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:scroll-px-0 sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        {doors.map((d, i) => (
          <Reveal as="li" key={d.key} delay={i * 60} className="flex">
            {d.key === "app" ? (
              <button
                type="button"
                className={`${cardClass} w-full`}
                onClick={() => (deferred ? void deferred.prompt() : dialogRef.current?.showModal())}
                aria-haspopup="dialog"
              >
                {card(d)}
              </button>
            ) : d.external ? (
              <a href={d.href} target="_blank" rel="noopener noreferrer" className={`${cardClass} w-full`}>
                {card(d)}
              </a>
            ) : (
              <Link href={d.href ?? "/"} className={`${cardClass} w-full`}>
                {card(d)}
              </Link>
            )}
          </Reveal>
        ))}
      </ul>

      {/* trois étapes : le message du matin, arroser ou attendre, répondre « j'ai arrosé » */}
      <Reveal className="mt-4">
        <ol className="grid grid-cols-3 gap-2">
          {[
            { icon: <BellIcon className="h-6 w-6" />, label: t("step1") },
            { icon: <DropIcon className="h-5 w-5" />, label: t("step2"), alt: <HandIcon className="h-5 w-5" /> },
            { icon: <CheckIcon className="h-6 w-6" />, label: t("step3") },
          ].map((s, i) => (
            <li key={i} className="flex flex-col items-center gap-1.5 rounded-2xl bg-sakia-sand px-2 py-3 text-center text-sm font-bold leading-tight text-sakia-brown sm:flex-row sm:gap-3 sm:px-4 sm:text-start sm:text-base">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sakia-green text-sm font-extrabold text-white sm:h-9 sm:w-9">
                {i + 1}
              </span>
              <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-2">
                <span className="flex items-center gap-1">
                  {s.icon}
                  {s.alt}
                </span>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </Reveal>

      <dialog
        ref={dialogRef}
        aria-label={t("installTitle")}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none rounded-t-3xl bg-white p-0 text-sakia-ink shadow-2xl backdrop:bg-black/55 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-3xl"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-2xl font-bold text-sakia-green-deep">{t("installTitle")}</h3>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t("close")}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sakia-sand text-2xl font-bold text-sakia-brown"
            >
              ×
            </button>
          </div>
          <p className="mt-3 text-base leading-relaxed text-sakia-ink">{t("installBody")}</p>
        </div>
      </dialog>
    </section>
  );
}
