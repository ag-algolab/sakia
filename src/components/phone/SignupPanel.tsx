"use client";

// Inscription au SMS du matin : DEUX choix, région et culture, tous deux OBLIGATOIRES. Aucune valeur par défaut : la liste commence
// par une invite (« Choisir une région… »). Le choix n'est prérempli que s'il vient du profil déjà enregistré sur l'appareil.

import { useMemo } from "react";
import type { Ref } from "react";
import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { useProfile } from "./profile";
import { STRINGS } from "./strings";
import type { UiLang } from "./strings";

type Props = {
  lang: UiLang;
  showErrors: boolean; // vrai après un essai sans choix : on dit ce qui manque
  regionRef: Ref<HTMLSelectElement>;
  cropRef: Ref<HTMLSelectElement>;
};

const selectBase = "min-h-12 w-full rounded-lg border-2 bg-white px-3 text-base text-sakia-ink";

export default function SignupPanel({ lang, showErrors, regionRef, cropRef }: Props) {
  const t = STRINGS[lang];
  const { profile, ready, fromHome, setRegion, setCrop } = useProfile();

  const collator = lang === "ar" ? "ar" : "fr";
  const regions = useMemo(
    () =>
      REGIONS.map((r) => ({ id: r.id, name: lang === "ar" ? r.nameAr : r.nameFr })).sort((a, b) => a.name.localeCompare(b.name, collator)),
    [lang, collator],
  );
  const crops = useMemo(() => {
    const named = CROPS.map((c) => ({ id: c.id, kind: c.kind, name: lang === "ar" ? c.nameAr : lang === "en" ? c.nameEn : c.nameFr }));
    const sorted = (kind: "annual" | "perennial") => named.filter((c) => c.kind === kind).sort((a, b) => a.name.localeCompare(b.name, lang === "ar" ? "ar" : lang));
    return { annual: sorted("annual"), perennial: sorted("perennial") };
  }, [lang]);

  const regionMissing = !profile.regionId;
  const cropMissing = !profile.cropId;
  const regionName = regions.find((r) => r.id === profile.regionId)?.name ?? "";
  const cropName = [...crops.annual, ...crops.perennial].find((c) => c.id === profile.cropId)?.name ?? "";

  const label = (text: string, forId: string) => (
    <label htmlFor={forId} className="mb-1 block text-base font-bold text-sakia-ink">
      {text} <span aria-hidden="true" className="text-sakia-alert">*</span>{" "}
      <span className="text-sm font-semibold text-sakia-brown">({t.required})</span>
    </label>
  );

  return (
    <section aria-labelledby="signup-title" className="rounded-2xl border border-sakia-sand-dark bg-white p-4 shadow-sm sm:p-5">
      <h2 id="signup-title" className="text-xl font-bold text-sakia-green">
        {t.signupTitle}
      </h2>
      <p className="mt-1 text-base text-sakia-brown">{t.signupIntro}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          {label(t.regionLabel, "phone-region")}
          <select
            id="phone-region"
            ref={regionRef}
            required
            aria-required="true"
            aria-invalid={showErrors && regionMissing ? true : undefined}
            aria-describedby={showErrors && regionMissing ? "phone-region-error" : undefined}
            value={profile.regionId}
            onChange={(e) => setRegion(e.target.value)}
            className={`${selectBase} ${showErrors && regionMissing ? "border-sakia-alert" : "border-sakia-sand-dark"}`}
          >
            <option value="" disabled>
              {t.regionPlaceholder}
            </option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {showErrors && regionMissing && (
            <p id="phone-region-error" role="alert" className="mt-1 text-sm font-bold text-sakia-alert">
              {t.regionError}
            </p>
          )}
        </div>

        <div>
          {label(t.cropLabel, "phone-crop")}
          <select
            id="phone-crop"
            ref={cropRef}
            required
            aria-required="true"
            aria-invalid={showErrors && cropMissing ? true : undefined}
            aria-describedby={showErrors && cropMissing ? "phone-crop-error" : undefined}
            value={profile.cropId}
            onChange={(e) => setCrop(e.target.value)}
            className={`${selectBase} ${showErrors && cropMissing ? "border-sakia-alert" : "border-sakia-sand-dark"}`}
          >
            <option value="" disabled>
              {t.cropPlaceholder}
            </option>
            <optgroup label={t.annuals}>
              {crops.annual.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
            <optgroup label={t.perennials}>
              {crops.perennial.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
          {showErrors && cropMissing && (
            <p id="phone-crop-error" role="alert" className="mt-1 text-sm font-bold text-sakia-alert">
              {t.cropError}
            </p>
          )}
        </div>
      </div>

      <p role="status" className={`mt-4 text-base font-semibold ${ready ? "text-sakia-green" : "text-sakia-brown"}`}>
        {ready ? `✓ ${t.signupDone(cropName, regionName)}` : t.signupMissing}
      </p>
      {ready && fromHome && <p className="mt-1 text-sm text-sakia-brown">{t.prefilled}</p>}
    </section>
  );
}
