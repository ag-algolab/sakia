"use client";

// Page « Téléphone » : inscription (région et culture, obligatoires) puis téléphone à touches simulé qui REÇOIT le SMS du matin
// (FeaturePhone). La personne n'écrit rien : elle choisit, le SMS arrive, elle répond avec les touches, ou « appelle » la ligne vocale.
// L'ancienne saisie à la main (« zitoun kairouan ») reste dans TypedSmsDemo, repliée en bas de page pour les curieux.

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import FeaturePhone from "./FeaturePhone";
import type { SmsFeed } from "./FeaturePhone";
import { usePhoneProfile } from "./phoneProfile";
import SignupPanel from "./SignupPanel";
import { STRINGS } from "./strings";
import { useUiLang } from "./useUiLang";
import { usePlan } from "./usePlan";

// Le plan du SMS est calculé sur l'appareil avec la météo du jour (même calcul que le serveur) et le dernier arrosage s'il a été
// donné (inscription, « Mon plan » ou accueil) : le service SMS le connaît aussi, dit dans le message (« piment kairouan 3j ») ou en
// réponse à sa question. Monté seulement quand région et culture sont choisies : aucune météo n'est téléchargée pour un choix par défaut.
function SmsSource({ regionId, cropId, ago, children }: { regionId: string; cropId: string; ago: string; children: (feed: SmsFeed) => ReactNode }) {
  const state = usePlan({ regionId, cropId, lastIrrigationDaysAgo: ago === "" ? undefined : Number(ago) });
  return <>{children({ status: state.status, plan: state.plan })}</>;
}

export default function PhoneSimulator() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const { profile, ready, ago } = usePhoneProfile();
  const [showErrors, setShowErrors] = useState(false);

  // Un bouton est pressé alors qu'il manque un choix : on le dit et on place le curseur sur le premier choix à faire.
  const needChoice = useCallback(() => {
    setShowErrors(true);
    document.querySelector<HTMLElement>(profile.region ? "#phone-crop-q button" : "#phone-region-q button")?.focus();
  }, [profile.region]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold text-sakia-green sm:text-3xl">{t.phoneTitle}</h1>
      <p className="mt-2 max-w-3xl text-lg leading-8">{t.phoneIntro}</p>
      <p role="note" className="mt-3 max-w-3xl rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base font-semibold text-sakia-alert">
        {t.simulated}
      </p>

      <div className="mt-6">
        <SignupPanel lang={lang} showErrors={showErrors} />
      </div>

      <div className="mt-6">
        {ready ? (
          <SmsSource regionId={profile.region} cropId={profile.crop} ago={ago}>
            {(feed) => <FeaturePhone lang={lang} regionId={profile.region} cropId={profile.crop} ago={ago} feed={feed} onNeedChoice={needChoice} />}
          </SmsSource>
        ) : (
          <FeaturePhone lang={lang} regionId="" cropId="" feed={null} onNeedChoice={needChoice} />
        )}
      </div>
    </div>
  );
}
