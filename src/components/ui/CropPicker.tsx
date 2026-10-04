"use client";

import { useRef } from "react";
import { CROPS } from "@/lib/crops";
import { cropName } from "./catalog";
import CropArt from "./CropArt";
import { SproutIcon } from "./icons";
import { useLang } from "./LangProvider";

// Choix de la culture EN IMAGES, pensé pour quelqu'un qui ne lit pas : un grand bouton montre la culture actuelle
// (dessin + nom) ; un appui ouvre une grille de gros dessins. Les dessins sont du vectoriel intégré au code et la liste
// vient du code (src/lib/crops.ts) : rien à télécharger, tout marche sans internet.
// La culture est OBLIGATOIRE : tant qu'elle n'est pas choisie, le bouton le dit (bordure pointillée, « Obligatoire »).

const GROUPS: { kind: "annual" | "perennial"; key: string }[] = [
  { kind: "annual", key: "annuals" },
  { kind: "perennial", key: "perennials" },
];

export default function CropPicker({
  value,
  onChange,
  attention = false,
}: {
  value: string; // "" = pas encore choisie
  onChange: (id: string) => void;
  attention?: boolean;
}) {
  const { lang, t } = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const current = CROPS.find((c) => c.id === value);

  const close = () => ref.current?.close();
  const pick = (id: string) => {
    onChange(id);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-haspopup="dialog"
        className={`sk-press flex w-full items-center gap-2 rounded-3xl border-2 p-2.5 text-start min-[360px]:gap-3 min-[360px]:p-3 sm:gap-4 ${
          current
            ? "border-sakia-sand-dark bg-white hover:border-sakia-green"
            : "border-dashed border-sakia-alert bg-sakia-alert-light/50"
        } ${attention && !current ? "ring-4 ring-sakia-alert/60 motion-safe:animate-pulse" : ""}`}
      >
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl min-[360px]:h-16 min-[360px]:w-16 sm:h-20 sm:w-20 ${current ? "bg-sakia-green-light" : "bg-white text-sakia-alert"}`}>
          {current ? <CropArt id={current.id} className="h-10 w-10 min-[360px]:h-12 min-[360px]:w-12 sm:h-16 sm:w-16" /> : <SproutIcon className="h-8 w-8 min-[360px]:h-9 min-[360px]:w-9 sm:h-11 sm:w-11" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-sakia-brown">{t("crop")}</span>
          {current ? (
            <span className="font-display block break-words text-xl font-bold leading-tight text-sakia-green-deep sm:text-2xl">{cropName(current, lang)}</span>
          ) : (
            <span className="block text-lg font-extrabold uppercase leading-tight tracking-wide text-sakia-alert">{t("requiredBadge")}</span>
          )}
        </span>
        <span className="shrink-0 rounded-full bg-sakia-green px-3 py-2 text-sm font-bold text-white sm:px-4">{current ? t("change") : t("choose")}</span>
      </button>

      <dialog
        ref={ref}
        aria-label={t("pickCrop")}
        onClick={(e) => e.target === ref.current && close()}
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90vh] w-full max-w-none overflow-y-auto rounded-t-3xl bg-white p-0 text-sakia-ink shadow-2xl backdrop:bg-black/55 sm:inset-0 sm:m-auto sm:max-h-[85vh] sm:max-w-3xl sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-sakia-sand-dark/60 bg-white px-4 py-3">
          <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("pickCrop")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("close")}
            className="grid h-11 w-11 place-items-center rounded-full bg-sakia-sand text-2xl font-bold text-sakia-brown"
          >
            ×
          </button>
        </div>
        <div className="space-y-5 p-4">
          {GROUPS.map((g) => (
            <section key={g.kind} aria-label={t(g.key)}>
              <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-sakia-brown">{t(g.key)}</h3>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {CROPS.filter((c) => c.kind === g.kind).map((c) => {
                  const on = c.id === value;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pick(c.id)}
                        aria-pressed={on}
                        className={`sk-press relative flex w-full flex-col items-center gap-1 rounded-2xl border-2 p-2 ${
                          on ? "border-sakia-green bg-sakia-green-light ring-4 ring-sakia-green/30" : "border-sakia-sand-dark/70 bg-sakia-sand/40 hover:border-sakia-green"
                        }`}
                      >
                        <CropArt id={c.id} className="h-16 w-16 sm:h-20 sm:w-20" />
                        <span className="text-center text-sm font-bold leading-tight">{cropName(c, lang)}</span>
                        {on && (
                          <span aria-hidden className="absolute -end-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-sakia-green text-sm text-white">
                            ✓
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </>
  );
}
