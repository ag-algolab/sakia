"use client";

// Le profil de la personne sur cette page : région et culture (OBLIGATOIRES : aucune valeur par défaut, jamais de choix fait à sa place)
// et dernier arrosage (facultatif). Partagé par l'inscription, le téléphone et « Mon plan ».
// Au premier passage, il est repris du profil enregistré par l'accueil (clé « sakia-form », lue seulement : on n'y écrit pas) ;
// ensuite la page retient son propre choix (clé « sakia.phone.profile.v2 », propre à cette page).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";

export type Profile = { regionId: string; cropId: string; ago: string }; // "" = pas choisi ; ago : "" = inconnu, "0".."7"

const OWN_KEY = "sakia.phone.profile.v2";
const HOME_KEY = "sakia-form"; // écrite par l'accueil : { region, crop, soil, system, ago, planting }
const EMPTY: Profile = { regionId: "", cropId: "", ago: "" };

const validRegion = (v: unknown): v is string => typeof v === "string" && REGIONS.some((r) => r.id === v);
const validCrop = (v: unknown): v is string => typeof v === "string" && CROPS.some((c) => c.id === v);
const validAgo = (v: unknown): v is string => typeof v === "string" && /^[0-7]?$/.test(v);

function readJson(key: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "null") as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null; // stockage illisible ou bloqué : on repart sans profil
  }
}

function readProfile(): { profile: Profile; fromHome: boolean } {
  const own = readJson(OWN_KEY);
  if (own && (validRegion(own.regionId) || validCrop(own.cropId))) {
    return {
      profile: { regionId: validRegion(own.regionId) ? own.regionId : "", cropId: validCrop(own.cropId) ? own.cropId : "", ago: validAgo(own.ago) ? own.ago : "" },
      fromHome: false,
    };
  }
  const home = readJson(HOME_KEY);
  if (home && (validRegion(home.region) || validCrop(home.crop))) {
    const ago = typeof home.ago === "number" ? String(home.ago) : home.ago;
    return {
      profile: { regionId: validRegion(home.region) ? home.region : "", cropId: validCrop(home.crop) ? home.crop : "", ago: validAgo(ago) ? ago : "" },
      fromHome: true,
    };
  }
  return { profile: EMPTY, fromHome: false };
}

type Ctx = {
  profile: Profile;
  loaded: boolean; // faux avant la lecture du stockage (le serveur n'a pas le profil : rien n'est affiché de travers)
  fromHome: boolean; // les choix viennent du profil de l'accueil et n'ont pas encore été touchés ici
  ready: boolean; // région ET culture choisies
  setRegion: (id: string) => void;
  setCrop: (id: string) => void;
  setAgo: (ago: string) => void;
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ profile: Profile; loaded: boolean; fromHome: boolean }>({ profile: EMPTY, loaded: false, fromHome: false });

  useEffect(() => {
    // le stockage n'existe que dans le navigateur : lu APRÈS l'hydratation, sinon le serveur et la page ne se ressembleraient plus
    const { profile, fromHome } = readProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ profile, loaded: true, fromHome });
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setState((s) => {
      const profile = { ...s.profile, ...patch };
      try {
        localStorage.setItem(OWN_KEY, JSON.stringify(profile));
      } catch {
        // stockage plein ou bloqué : le choix vaut pour cette visite seulement
      }
      return { profile, loaded: true, fromHome: false };
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      profile: state.profile,
      loaded: state.loaded,
      fromHome: state.fromHome,
      ready: validRegion(state.profile.regionId) && validCrop(state.profile.cropId),
      setRegion: (regionId) => update({ regionId }),
      setCrop: (cropId) => update({ cropId }),
      setAgo: (ago) => update({ ago }),
    }),
    [state, update],
  );
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Ctx {
  const c = useContext(ProfileContext);
  if (!c) throw new Error("useProfile doit être utilisé dans ProfileProvider");
  return c;
}
