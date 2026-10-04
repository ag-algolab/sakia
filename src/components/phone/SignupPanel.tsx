"use client";

// Inscription au SMS du matin : DEUX choix, région et culture, tous deux OBLIGATOIRES. Aucune valeur par défaut : tant que la
// personne n'a pas choisi, chaque choix le dit (bordure pointillée, « Obligatoire »). On réutilise les mêmes sélecteurs en images
// que l'accueil (RegionPicker, CropPicker : une position GPS ou la liste des 24 gouvernorats ; des dessins pour les cultures) et le
// même profil enregistré dans l'appareil : le choix n'est prérempli que s'il a déjà été fait, sur l'accueil ou ici.

import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { cropName, regionName } from "@/components/ui/catalog";
import { useLang } from "@/components/ui/LangProvider";
import CropPicker from "@/components/ui/CropPicker";
import RegionPicker from "@/components/ui/RegionPicker";
import { usePhoneProfile } from "./phoneProfile";
import { STRINGS } from "./strings";
import type { UiLang } from "./strings";

type Props = {
  lang: UiLang;
  showErrors: boolean; // vrai après un essai sans choix : on dit ce qui manque
};

export default function SignupPanel({ lang, showErrors }: Props) {
  const t = STRINGS[lang];
  const { lang: siteLang } = useLang(); // les sélecteurs de l'accueil parlent les quatre langues du site, darija comprise
  const { profile, ready, fromSaved, patch } = usePhoneProfile();

  const region = REGIONS.find((r) => r.id === profile.region);
  const crop = CROPS.find((c) => c.id === profile.crop);

  return (
    <section aria-labelledby="signup-title" className="rounded-2xl border border-sakia-sand-dark bg-white p-4 shadow-sm sm:p-5">
      <h2 id="signup-title" className="text-xl font-bold text-sakia-green">
        {t.signupTitle}
      </h2>
      <p className="mt-1 text-base text-sakia-brown">{t.signupIntro}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div id="phone-region-q">
          <RegionPicker value={profile.region} onChange={(id) => patch({ region: id })} attention={showErrors} />
          {showErrors && !profile.region && (
            <p role="alert" className="mt-1 text-base font-bold text-sakia-alert">
              {t.regionError}
            </p>
          )}
        </div>
        <div id="phone-crop-q">
          <CropPicker value={profile.crop} onChange={(id) => patch({ crop: id, planting: "" })} attention={showErrors} />
          {showErrors && !profile.crop && (
            <p role="alert" className="mt-1 text-base font-bold text-sakia-alert">
              {t.cropError}
            </p>
          )}
        </div>
      </div>

      <p id="signup-status" role="status" className={`mt-4 text-base font-semibold ${ready ? "text-sakia-green" : "text-sakia-brown"}`}>
        {ready && region && crop ? `✓ ${t.signupDone(cropName(crop, siteLang), regionName(region, siteLang))}` : t.signupMissing}
      </p>
      {ready && fromSaved && <p className="mt-1 text-sm text-sakia-brown">{t.prefilled}</p>}
    </section>
  );
}
