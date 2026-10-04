"use client";

// Contenu de la page /telegram : héros avec le bouton vers le vrai bot, chat de démonstration, trois étapes, note d'honnêteté.
// Textes dans la langue du site (useLang) ; les messages du bot, eux, restent dans la langue du bot.

import { useLang } from "@/components/ui/LangProvider";
import { Reveal } from "@/components/ui/motion";
import { InfoIcon, PlaneIcon } from "./icons";
import { STRINGS } from "./strings";
import TelegramChat from "./TelegramChat";
import type { Welcome } from "./TelegramChat";

const BOT_HANDLE = "@sakia_tn_bot";
const BOT_URL = "https://t.me/sakia_tn_bot";

// Les commandes du bot (« /stop ») gardent leur sens de lecture, même au milieu d'une phrase arabe.
function withCommands(text: string): React.ReactNode {
  return text.split(/(\/[a-z]+)/g).map((part, i) =>
    i % 2 ? (
      <bdi key={i} dir="ltr" className="font-mono text-[0.92em] font-bold">
        {part}
      </bdi>
    ) : (
      part
    ),
  );
}

export default function TelegramView({ welcome }: { welcome: Welcome }) {
  const { lang } = useLang();
  const s = STRINGS[lang];

  return (
    <>
      <section aria-labelledby="tg-title" className="relative overflow-hidden rounded-b-[2rem] bg-gradient-to-b from-[#0d2e22] to-[#14503a] text-white lg:rounded-b-[3rem]">
        <div aria-hidden className="pointer-events-none absolute -end-20 -top-20 h-72 w-72 rounded-full bg-sakia-sun/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-5xl gap-8 px-4 pb-10 pt-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-14 lg:pb-14 lg:pt-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/25">
              <PlaneIcon className="h-4 w-4" />
              {s.eyebrow}
            </p>
            <h1 id="tg-title" className="font-display mt-4 text-[2.2rem] font-bold leading-[1.05] sm:text-5xl">
              {s.title}
            </h1>
            <p className="mt-3 max-w-xl text-lg leading-relaxed text-white/90">{s.lead}</p>
            <div className="mt-6">
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby="tg-open-hint"
                className="sk-press inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-sakia-water px-6 py-3 text-lg font-bold text-white shadow-lg ring-1 ring-white/25 hover:bg-sakia-water-deep sm:w-auto"
              >
                <PlaneIcon className="h-6 w-6 shrink-0" />
                <span>
                  {s.open} <bdi dir="ltr">{BOT_HANDLE}</bdi>
                </span>
              </a>
              <p id="tg-open-hint" className="mt-2 text-sm text-white/80">
                {s.openHint}
              </p>
            </div>
            {/* l'invitation à essayer vient juste avant le chat sur mobile, et sous le bouton à côté du chat sur ordinateur */}
            <div className="mt-8 border-t border-white/15 pt-6">
              <h2 id="tg-demo-title" className="font-display text-2xl font-bold">
                {s.demoTitle}
              </h2>
              <p className="mt-1 max-w-xl text-base leading-snug text-white/85">{s.demoLead}</p>
            </div>
          </div>

          <TelegramChat welcome={welcome} labelledBy="tg-demo-title" />
        </div>
      </section>

      <section aria-labelledby="tg-how" className="mx-auto w-full max-w-5xl px-4 pb-6 pt-10">
        <h2 id="tg-how" className="font-display text-3xl font-bold leading-tight text-sakia-green-deep">
          {s.howTitle}
        </h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-3">
          {s.steps.map((step, i) => (
            <Reveal key={i} as="li" delay={i * 120} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-sakia-green text-lg font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="font-display mt-3 text-xl font-bold leading-snug text-sakia-green-deep">{step.title}</h3>
              <p className="mt-1 text-base leading-relaxed text-sakia-ink">{withCommands(step.body)}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      <section aria-labelledby="tg-note" className="mx-auto w-full max-w-5xl px-4 pb-14 pt-4">
        <Reveal className="rounded-2xl border-2 border-sakia-sand-dark bg-sakia-sand/60 p-5">
          <h2 id="tg-note" className="font-display flex items-center gap-2 text-2xl font-bold leading-tight text-sakia-brown">
            <InfoIcon className="h-6 w-6 shrink-0" />
            {s.noteTitle}
          </h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-base leading-relaxed text-sakia-ink marker:text-sakia-brown">
            {s.notes.map((note, i) => (
              <li key={i}>{withCommands(note)}</li>
            ))}
          </ul>
        </Reveal>
      </section>
    </>
  );
}
