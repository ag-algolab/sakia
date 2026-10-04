"use client";

// Page « Téléphone » : inscription (région et culture, obligatoires) puis téléphone à touches simulé qui REÇOIT le SMS du matin
// (FeaturePhone). La personne n'écrit rien : elle choisit, le SMS arrive, elle répond avec les touches, ou « appelle » la ligne vocale.
// L'ancienne saisie à la main (« zitoun kairouan ») reste dans TypedSmsDemo, repliée en bas de page pour les curieux.

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import FeaturePhone from "./FeaturePhone";
import type { SmsFeed } from "./FeaturePhone";
import { useProfile } from "./profile";
import SignupPanel from "./SignupPanel";
import { STRINGS } from "./strings";
import { useUiLang } from "./useUiLang";
import { usePlan } from "./usePlan";

// Le plan du SMS est calculé sur l'appareil avec la météo du jour (même calcul que le serveur), SANS « dernier arrosage » :
// un SMS ne le connaît pas. Monté seulement quand région et culture sont choisies : aucune météo n'est téléchargée pour un choix par défaut.
function SmsSource({ regionId, cropId, children }: { regionId: string; cropId: string; children: (feed: SmsFeed) => ReactNode }) {
  const state = usePlan({ regionId, cropId });
  return <>{children({ status: state.status, plan: state.plan })}</>;
}

export default function PhoneSimulator() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const { profile, ready } = useProfile();
  const [showErrors, setShowErrors] = useState(false);
  const regionRef = useRef<HTMLSelectElement>(null);
  const cropRef = useRef<HTMLSelectElement>(null);

  // Un bouton est pressé alors qu'il manque un choix : on le dit et on place le curseur sur la première liste à remplir.
  const needChoice = useCallback(() => {
    setShowErrors(true);
    (profile.regionId ? cropRef : regionRef).current?.focus();
  }, [profile.regionId]);

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8">
      <h1 className="font-display text-2xl font-bold text-sakia-green sm:text-3xl">{t.phoneTitle}</h1>
      <p className="mt-2 max-w-3xl text-lg leading-8">{t.phoneIntro}</p>
      <p role="note" className="mt-3 max-w-3xl rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base font-semibold text-sakia-alert">
        {t.simulated}
      </p>

      <div className="mt-6">
        <SignupPanel lang={lang} showErrors={showErrors} regionRef={regionRef} cropRef={cropRef} />
      </div>

      <div className="mt-6">
        {ready ? (
          <SmsSource regionId={profile.regionId} cropId={profile.cropId}>
            {(feed) => <FeaturePhone lang={lang} regionId={profile.regionId} cropId={profile.cropId} feed={feed} onNeedChoice={needChoice} />}
          </SmsSource>
        ) : (
          <FeaturePhone lang={lang} regionId="" cropId="" feed={null} onNeedChoice={needChoice} />
        )}
      </div>
    </div>
  );
}
