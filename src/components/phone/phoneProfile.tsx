"use client";

// Le profil de la personne sur cette page : le MÊME profil que l'accueil et le bulletin (src/components/ui/profile.tsx, clé
// « sakia-form » dans l'appareil). Région et culture sont OBLIGATOIRES : aucune valeur par défaut, jamais de choix fait à sa place ;
// elles ne sont préremplies que si la personne les a déjà données (sur l'accueil ou ici). Partagé par l'inscription, le téléphone
// et « Mon plan ». On n'écrit dans le stockage que quand la personne change quelque chose.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_PROFILE, agoFromDate, dateFromAgo, loadProfile, saveProfile, tunisToday } from "@/components/ui/profile";
import type { Profile } from "@/components/ui/profile";

type State = { profile: Profile; loaded: boolean; fromSaved: boolean; dirty: boolean; today: string };

type Ctx = {
  profile: Profile;
  loaded: boolean; // faux avant la lecture du stockage (le serveur n'a pas le profil : rien n'est affiché de travers)
  fromSaved: boolean; // région et culture viennent du profil déjà enregistré et n'ont pas été touchées ici
  ready: boolean; // région ET culture choisies
  ago: string; // dernier arrosage : "" = inconnu, "0" à "7" jours
  patch: (change: Partial<Profile>) => void;
  setAgo: (ago: string) => void;
};

const PhoneProfileContext = createContext<Ctx | null>(null);

export function PhoneProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ profile: EMPTY_PROFILE, loaded: false, fromSaved: false, dirty: false, today: "" });

  useEffect(() => {
    // le stockage n'existe que dans le navigateur : lu APRÈS l'hydratation, sinon le serveur et la page ne se ressembleraient plus
    const profile = loadProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ profile, loaded: true, fromSaved: !!(profile.region && profile.crop), dirty: false, today: tunisToday() });
  }, []);

  // enregistré seulement après un changement fait par la personne (comme l'accueil, qui réécrit le même profil)
  useEffect(() => {
    if (state.loaded && state.dirty) saveProfile(state.profile);
  }, [state.loaded, state.dirty, state.profile]);

  const patch = useCallback((change: Partial<Profile>) => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...change }, fromSaved: false, dirty: true }));
  }, []);

  const value = useMemo<Ctx>(() => {
    const { profile, loaded, fromSaved, today } = state;
    return {
      profile,
      loaded,
      fromSaved,
      ready: !!profile.region && !!profile.crop,
      ago: today ? agoFromDate(profile.agoDate, today).ago : "",
      patch,
      setAgo: (ago) => patch({ agoDate: ago === "" ? "" : dateFromAgo(ago, tunisToday()) }),
    };
  }, [state, patch]);

  return <PhoneProfileContext.Provider value={value}>{children}</PhoneProfileContext.Provider>;
}

export function usePhoneProfile(): Ctx {
  const c = useContext(PhoneProfileContext);
  if (!c) throw new Error("usePhoneProfile doit être utilisé dans PhoneProfileProvider");
  return c;
}
