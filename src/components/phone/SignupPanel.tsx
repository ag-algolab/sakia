"use client";

// Inscription au SMS du matin : DEUX choix, région et culture, tous deux OBLIGATOIRES. Aucune valeur par défaut : tant que la
// personne n'a pas choisi, chaque choix le dit (bordure pointillée, « Obligatoire »). On réutilise les mêmes sélecteurs en images
// que l'accueil (RegionPicker, CropPicker : une position GPS ou la liste des 24 gouvernorats ; des dessins pour les cultures) et le
// même profil enregistré dans l'appareil : le choix n'est prérempli que s'il a déjà été fait, sur l'accueil ou ici.
// Puis, comme sur l'accueil, le dernier arrosage (AgoPicker), FACULTATIF : sans lui, le plan et donc le SMS disent « pas sûr ».

import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { cropName, regionName } from "@/components/ui/catalog";
import { useLang } from "@/components/ui/LangProvider";
import AgoPicker from "@/components/ui/AgoPicker";
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
  const { lang: siteLang, t: siteT } = useLang(); // les sélecteurs de l'accueil parlent les quatre langues du site, darija comprise
  const { profile, ready, fromSaved, patch, ago, setAgo } = usePhoneProfile();

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

      <div id="phone-ago-q" className="mt-4">
        <p className="mb-2 text-base font-bold">{siteT("qLast")}</p>
        <div className={`rounded-3xl border-2 p-3 ${ago === "" ? "border-sakia-alert bg-sakia-alert-light" : "border-sakia-green/40 bg-sakia-green-light"}`}>
          <p className={`mb-3 text-base font-semibold ${ago === "" ? "text-sakia-alert" : "text-sakia-green"}`}>
            {ago === "" ? `⚠ ${siteT("lastWateringMissing")}` : siteT("lastWateringSet")}
          </p>
          <AgoPicker value={ago} onChange={setAgo} />
        </div>
      </div>

      <p id="signup-status" role="status" className={`mt-4 text-base font-semibold ${ready ? "text-sakia-green" : "text-sakia-brown"}`}>
        {ready && region && crop ? `✓ ${t.signupDone(cropName(crop, siteLang), regionName(region, siteLang))}` : t.signupMissing}
      </p>
      {ready && fromSaved && <p className="mt-1 text-sm text-sakia-brown">{t.prefilled}</p>}
    </section>
  );
}
