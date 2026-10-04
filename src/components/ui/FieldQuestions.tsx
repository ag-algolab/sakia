"use client";

import { useEffect, useState } from "react";
import { CROPS, defaultCropForMonth } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import AgoPicker from "./AgoPicker";
import { Field, cropName, regionName, selectClass } from "./catalog";
import { Segmented } from "./controls";
import CropArt from "./CropArt";
import CropPicker from "./CropPicker";
import { AlertIcon, DropIcon, PinIcon } from "./icons";
import { useLang } from "./LangProvider";
import { FIRST_VISIT_AGO, tunisToday } from "./profile";
import type { Profile } from "./profile";
import RegionPicker from "./RegionPicker";

// Le questionnaire à choix, tout en haut de la page, AVANT l'écoute : on ne peut pas écouter un conseil pour une région
// qu'on n'a pas encore dite. Trois questions, toutes visibles d'emblée :
//   1. Où est votre champ ?            (obligatoire)
//   2. Que cultivez-vous ?             (obligatoire)
//   3. Quand avez-vous arrosé ?        (conseillé : sans réponse, le plan est signalé « pas sûr »)
// Sol, système d'arrosage et date de semis (cultures annuelles seulement) sont repliés : des valeurs par défaut suffisent.
// Une fois les réponses données et gardées sur l'appareil, le questionnaire se replie en une ligne de résumé.

const EXAMPLE_AGO = FIRST_VISIT_AGO; // dernier arrosage de l'exemple : le même que le champ prérempli de la première visite

function Q({
  n,
  title,
  done,
  flash = false,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  flash?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className={`rounded-3xl p-1 ${flash ? "ring-4 ring-sakia-alert/50" : ""}`}>
      <div className="mb-2 flex items-center gap-3">
        <span
          aria-hidden
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-base font-extrabold ${
            done ? "bg-sakia-green text-white" : "border-2 border-sakia-green text-sakia-green"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <p className="text-lg font-bold leading-tight text-sakia-ink">{title}</p>
      </div>
      {children}
    </li>
  );
}

function Pill({ tone, icon, children }: { tone: "plain" | "alert" | "water"; icon: React.ReactNode; children: React.ReactNode }) {
  const tones = {
    plain: "bg-sakia-sand text-sakia-ink",
    alert: "bg-sakia-alert-light text-sakia-alert",
    water: "bg-sakia-water-light text-sakia-water-deep",
  };
  return (
    <span className={`flex min-h-11 items-center gap-2 rounded-full px-3.5 py-1.5 text-base font-bold ${tones[tone]}`}>
      {icon}
      <span className="first-letter:uppercase">{children}</span>
    </span>
  );
}

export default function FieldQuestions({
  profile,
  ago,
  agoStale,
  loaded,
  attention,
  onProfile,
  onAgo,
}: {
  profile: Profile;
  ago: string; // "" = inconnu, "0" à "7"
  agoStale: boolean;
  loaded: boolean;
  attention: number; // augmente quand la personne touche « écouter » trop tôt : on met en évidence ce qui manque
  onProfile: (patch: Partial<Profile>) => void;
  onAgo: (v: string) => void;
}) {
  const { lang, t } = useLang();
  const complete = !!profile.region && !!profile.crop;
  const [open, setOpen] = useState<boolean | null>(null);
  const [flash, setFlash] = useState(false);
  const [seenAttention, setSeenAttention] = useState(attention);

  // Premier affichage : ouvert tant que région et culture manquent ; replié en résumé si le profil est déjà là.
  // (Ajustement de l'état pendant le rendu : la manière recommandée de réagir à un changement de propriété.)
  if (loaded && open === null) setOpen(!complete);

  // La personne a touché « écouter » trop tôt : on ouvre le questionnaire et on met en évidence ce qui manque.
  if (attention !== seenAttention) {
    setSeenAttention(attention);
    if (attention) {
      setOpen(true);
      setFlash(true);
    }
  }
  useEffect(() => {
    if (!flash) return;
    const id = window.setTimeout(() => setFlash(false), 2400);
    return () => window.clearTimeout(id);
  }, [flash]);

  const region = REGIONS.find((r) => r.id === profile.region);
  const crop = CROPS.find((c) => c.id === profile.crop);
  const annual = crop?.kind === "annual";
  // L'exemple : la culture de saison à Kairouan (la même que celle du moteur pour « montrer d'abord »).
  const exampleRegion = REGIONS.find((r) => r.id === "kairouan");
  const exampleCrop = CROPS.find((c) => c.id === defaultCropForMonth(Number(tunisToday().slice(5, 7))));

  const cardClass = "rounded-3xl bg-white p-4 shadow-[0_18px_40px_-12px_rgba(10,40,25,0.35)] ring-1 ring-black/5 sm:p-5";

  if (!loaded || open === null) {
    // Espace réservé à la hauteur du questionnaire (premier visiteur, ~1 100 px) ou du résumé (profil complet : data-profile posé par
    // le script de layout.tsx) : sans cela, tout le reste de la page sautait vers le bas d'un millier de pixels à l'arrivée du profil.
    return (
      <section
        id="field"
        aria-hidden
        className={`${cardClass} min-h-[1100px] animate-pulse lg:min-h-[1190px] [html[data-profile]_&]:min-h-[190px] md:[html[data-profile]_&]:min-h-[140px]`}
      />
    );
  }

  // ---------- résumé (profil déjà donné) ----------
  if (!open && complete && region && crop) {
    const agoLabel = ago === "" ? t("unknown") : ago === "0" ? t("today") : ago === "1" ? t("yesterday") : t("daysAgo", { n: ago });
    return (
      <section id="field" aria-label={t("yourField")} className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold uppercase tracking-wide text-sakia-brown">{t("yourField")}</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="sk-press min-h-11 rounded-full bg-sakia-green px-5 text-sm font-bold text-white"
          >
            {t("change")}
          </button>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Pill tone="plain" icon={<PinIcon className="h-6 w-6 text-sakia-water-deep" />}>
            {regionName(region, lang)}
          </Pill>
          <Pill tone="plain" icon={<CropArt id={crop.id} className="h-7 w-7" />}>
            {cropName(crop, lang)}
          </Pill>
          <Pill tone={ago === "" ? "alert" : "water"} icon={ago === "" ? <AlertIcon className="h-6 w-6" /> : <DropIcon className="h-5 w-5" />}>
            {agoLabel}
          </Pill>
        </div>
        {ago === "" && (
          <p className="mt-2 text-sm font-semibold text-sakia-alert">
            ⚠ {agoStale ? t("agoStale") : t("lastWateringMissing")}
          </p>
        )}
      </section>
    );
  }

  // ---------- questionnaire ----------
  return (
    <section id="field" aria-labelledby="field-title" className={cardClass}>
      <h2 id="field-title" className="font-display text-2xl font-bold text-sakia-green-deep">
        {t("yourField")}
      </h2>

      <ol className="mt-4 space-y-5">
        <Q n={1} title={t("qWhere")} done={!!profile.region} flash={flash && !profile.region}>
          <RegionPicker value={profile.region} onChange={(id) => onProfile({ region: id })} attention={flash} />
        </Q>

        <Q n={2} title={t("pickCrop")} done={!!profile.crop} flash={flash && !profile.crop}>
          <CropPicker value={profile.crop} onChange={(id) => onProfile({ crop: id, planting: "" })} attention={flash} />
        </Q>

        <Q n={3} title={t("qLast")} done={ago !== ""}>
          <div className={`rounded-3xl border-2 p-3 ${ago === "" ? "border-sakia-alert bg-sakia-alert-light" : "border-sakia-green/40 bg-sakia-green-light"}`}>
            <p className={`mb-3 text-sm font-semibold ${ago === "" ? "text-sakia-alert" : "text-sakia-green"}`}>
              {ago === "" ? `⚠ ${agoStale ? t("agoStale") : t("lastWateringMissing")}` : t("lastWateringSet")}
            </p>
            <AgoPicker value={ago} onChange={onAgo} />
          </div>
        </Q>
      </ol>

      {/* réglages facultatifs : des valeurs par défaut suffisent */}
      <details className="group mt-5 rounded-2xl border border-sakia-sand-dark/70 bg-sakia-sand/40">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-base font-bold text-sakia-ink [&::-webkit-details-marker]:hidden">
          <span>
            {t("fieldMore")}
            <span className="mt-0.5 block text-sm font-medium text-sakia-brown">
              {t(profile.soil)} · {t(profile.system)}
            </span>
          </span>
          <span aria-hidden className="text-2xl leading-none text-sakia-green transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-4 px-4 pb-4 pt-2 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-sakia-brown">{t("soil")}</span>
            <Segmented
              label={t("soil")}
              value={profile.soil}
              onChange={(v) => onProfile({ soil: v })}
              options={["sableux", "limoneux", "argileux"].map((s) => ({ value: s, label: t(s) }))}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-sakia-brown">{t("system")}</span>
            <Segmented
              label={t("system")}
              value={profile.system}
              onChange={(v) => onProfile({ system: v })}
              options={["goutte", "aspersion", "gravitaire"].map((s) => ({ value: s, label: t(s) }))}
            />
          </div>
          {annual && (
            <Field label={t("planting")} hint={t("plantingHint")}>
              <input type="date" className={selectClass} value={profile.planting} onChange={(e) => onProfile({ planting: e.target.value })} />
            </Field>
          )}
        </div>
      </details>

      {!complete && <p className="mt-4 text-sm font-bold text-sakia-alert">{t("fieldRequired")}</p>}
      {/* pour qui veut juste voir (le jury, un technicien) : un exemple en un geste, si région et culture ont été vidées (à la première
          visite, ce même exemple est déjà prérempli). Il montre un VRAI conseil d'arrosage : la culture de saison (le piment en octobre,
          racines courtes : il boit vite) arrosée il y a 6 jours, donc arroser aujourd'hui (et pas « pas sûr », faute de dernier arrosage). */}
      {!profile.region && !profile.crop && exampleCrop && exampleRegion && (
        <button
          type="button"
          onClick={() => {
            onProfile({ region: exampleRegion.id, crop: exampleCrop.id, planting: "" });
            onAgo(EXAMPLE_AGO);
          }}
          className="sk-press mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-sakia-green px-4 py-2 text-center text-base font-bold text-sakia-green-deep"
        >
          <CropArt id={exampleCrop.id} className="h-7 w-7 shrink-0" />
          {t("tryExample", { crop: cropName(exampleCrop, lang), region: regionName(exampleRegion, lang) })}
        </button>
      )}
      <button
        type="button"
        disabled={!complete}
        onClick={() => {
          setOpen(false);
          window.setTimeout(() => document.getElementById("listen")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
        }}
        className="sk-press mt-3 min-h-14 w-full rounded-2xl bg-sakia-green px-4 text-lg font-bold text-white shadow-md disabled:cursor-not-allowed disabled:bg-sakia-sand disabled:text-sakia-brown disabled:shadow-none"
      >
        {t("fieldDone")}
      </button>
    </section>
  );
}
