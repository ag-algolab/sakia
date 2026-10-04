"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import FieldQuestions from "@/components/ui/FieldQuestions";
import FiveDoors from "@/components/ui/FiveDoors";
import HeroPanorama from "@/components/ui/HeroPanorama";
import HeroScene from "@/components/ui/HeroScene";
import { AlertIcon, RainIcon, SproutIcon, ThermoIcon, TunisiaFlagIcon } from "@/components/ui/icons";
import ListenHero from "@/components/ui/ListenHero";
import { useLang } from "@/components/ui/LangProvider";
import { Reveal } from "@/components/ui/motion";
import { EMPTY_PROFILE, agoFromDate, dateFromAgo, loadProfile, saveProfile, tunisToday, validDate } from "@/components/ui/profile";
import type { Profile } from "@/components/ui/profile";
import SpeedBand from "@/components/ui/SpeedBand";
import { irrigationSeasonOf, outOfIrrigationSeason } from "@/components/ui/season";
import StatBand from "@/components/ui/StatBand";
import WeekView from "@/components/ui/WeekView";
import { usePlan } from "@/components/phone/usePlan";
import { CROPS } from "@/lib/crops";
import type { Confidence, Plan } from "@/lib/plan";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

// Les types viennent du moteur (import de type seulement : aucune logique dupliquée).
const REPLAY_DATE = "2026-07-17";
const REPLAY_SCENE = { crop: "tomate", ago: "7" };
const STALE_AFTER_HOURS = 5;

// Où l'on est, en un coup d'œil : un petit drapeau et le nom du pays, discrets (le titre, lui, ne dit pas « Tunisie »).
function CountryTag() {
  const { t } = useLang();
  return (
    <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-black/20 py-1 ps-1.5 pe-3 text-sm font-semibold tracking-wide text-white/90 ring-1 ring-white/20">
      <TunisiaFlagIcon className="h-4 w-6 rounded-[3px]" />
      {t("heroTag")}
    </p>
  );
}

export default function Home() {
  const { t, fmtDate, fmtNum, colon } = useLang();

  // Profil de l'agriculteur, gardé sur l'appareil. Région et culture n'ont AUCUNE valeur par défaut : elles sont obligatoires,
  // et le questionnaire passe avant l'écoute (on n'écoute pas un conseil pour une région qu'on n'a pas dite).
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [replay, setReplay] = useState(false);
  const [attention, setAttention] = useState(0); // augmente quand on touche « écouter » trop tôt
  const [now, setNow] = useState<number | null>(null);
  // Rejeu : plan calculé par le serveur (météo observée). Sinon : plan calculé SUR L'APPAREIL (usePlan, poste Téléphone),
  // donc qui continue de marcher hors connexion avec la dernière météo gardée.
  const [replayRes, setReplayRes] = useState<{ key: string; plan?: Plan; bytes?: number; failed?: boolean } | null>(null);
  const [reload, setReload] = useState(0);

  const today = useMemo(() => (now == null ? null : tunisToday(new Date(now))), [now]);
  // Le dernier arrosage est gardé comme une DATE ; « il y a N jours » est recalculé chaque jour (au-delà de 7 jours : à redemander).
  const agoInfo = useMemo(() => (today ? agoFromDate(profile.agoDate, today) : { ago: "", stale: false }), [profile.agoDate, today]);

  const chosen = !!profile.region && !!profile.crop;
  const ready = replay || chosen;
  const annual = CROPS.find((c) => c.id === profile.crop)?.kind === "annual";

  // Ce qui part vraiment au calcul et à la voix. En rejeu : la scène de la vidéo (tomate, dernier arrosage 7 jours avant).
  const eff = useMemo(
    () =>
      replay
        ? { region: profile.region || "kairouan", crop: REPLAY_SCENE.crop, soil: profile.soil, system: profile.system, planting: "", ago: REPLAY_SCENE.ago }
        : {
            region: profile.region,
            crop: profile.crop,
            soil: profile.soil,
            system: profile.system,
            planting: annual ? validDate(profile.planting) : "", // la date de semis ne concerne que les cultures annuelles
            ago: agoInfo.ago,
          },
    [replay, profile, annual, agoInfo.ago],
  );

  const local = usePlan({
    regionId: eff.region || "kairouan", // valeurs de repli : le résultat est ignoré tant que région et culture ne sont pas choisies
    cropId: eff.crop || "olivier",
    soil: eff.soil as SoilName,
    system: eff.system as IrrigationSystem,
    planting: eff.planting || undefined,
    lastIrrigationDaysAgo: eff.ago === "" ? undefined : Number(eff.ago),
  });
  // Rejeu : la réponse est rangée sous la clé de la demande ; tant qu'il n'y en a pas pour la clé courante, on charge.
  // (replayKey vient plus bas dans le fichier : il ne dépend que de eff et de reload.)
  const effKey = JSON.stringify(eff);
  const replayKey = `${effKey}#${reload}`;
  const replayCur = replayRes && replayRes.key === replayKey ? replayRes : null;
  const replayPlan = replayCur?.plan ?? replayRes?.plan ?? null; // le plan précédent reste affiché pendant le rechargement
  const plan = !ready ? null : replay ? replayPlan : local.plan;
  const loading = !ready ? false : replay ? replayCur == null : local.status === "loading";
  const failed = !ready ? false : replay ? !!replayCur?.failed : local.status === "error";
  const bytes = useMemo(
    () => (replay ? (replayCur?.bytes ?? replayRes?.bytes ?? null) : local.plan ? new TextEncoder().encode(JSON.stringify(local.plan)).length : null),
    [replay, replayCur, replayRes, local.plan],
  );

  useEffect(() => {
    // Lu après l'hydratation : le serveur ne connaît pas le profil gardé sur l'appareil.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
    setProfileLoaded(true);
  }, []);
  useEffect(() => {
    if (profileLoaded) saveProfile(profile); // le rejeu ne touche jamais au profil : il a ses propres valeurs (eff)
  }, [profile, profileLoaded]);

  const onProfile = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);
  const onAgo = useCallback((v: string) => setProfile((p) => ({ ...p, agoDate: v === "" ? "" : dateFromAgo(v, tunisToday()) })), []);
  const onLockedTap = useCallback(() => {
    setAttention((n) => n + 1);
    document.getElementById("field")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  useEffect(() => {
    if (!replay) return;
    const ctrl = new AbortController();
    const e = JSON.parse(effKey) as typeof eff;
    const q = new URLSearchParams({ region: e.region, crop: e.crop, soil: e.soil, system: e.system });
    if (e.ago !== "") q.set("ago", e.ago);
    if (e.planting) q.set("planting", e.planting);
    q.set("asOf", REPLAY_DATE);
    fetch(`/api/plan?${q}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const text = await r.text();
        return { plan: JSON.parse(text) as Plan, bytes: new TextEncoder().encode(text).length };
      })
      .then(({ plan: p, bytes: b }) => setReplayRes({ key: replayKey, plan: p, bytes: b }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setReplayRes((prev) => ({ key: replayKey, plan: prev?.plan, bytes: prev?.bytes, failed: true }));
      });
    return () => ctrl.abort();
  }, [replay, effKey, replayKey]);

  // Horloge pour « mis à jour il y a X heures » et pour « il y a N jours » (rafraîchie chaque minute).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- l'heure se lit après l'hydratation (le serveur n'a pas la même)
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const fmtAge = useCallback(
    (minutes: number) =>
      minutes < 60
        ? t("minutesShort", { n: Math.max(1, Math.round(minutes)) })
        : t("hoursShort", { n: fmtNum(minutes / 60, minutes < 600 ? 1 : 0) }),
    [t, fmtNum],
  );

  const ageMin = plan && now != null ? Math.max(0, (now - Date.parse(plan.dataFetchedAt)) / 60000) : null;
  const stale = ageMin != null && ageMin > STALE_AFTER_HOURS * 60;

  const hot = replay;

  // Un seul repère <main> pour toute la page (héros compris) : un lecteur d'écran saute ainsi directement au contenu.
  return (
    <main className="sk-type flex flex-1 flex-col">
      {/* ---------- héros : l'aube sur Kairouan ---------- */}
      <section className={`${hot ? "sk-hero-heat" : "sk-hero-sky"} relative overflow-hidden text-white`}>
        {/* téléphone et tablette : texte, puis scène */}
        <div className="relative mx-auto max-w-3xl px-4 pt-6 md:hidden">
          <CountryTag />
          <h1 className="font-display text-[2.2rem] font-bold leading-[1.04]">{t("heroTitle")}</h1>
          <p className="mt-3 max-w-md text-base leading-snug text-white/90">{t("heroSub")}</p>
          <div className="relative mt-3">
            <HeroScene hot={hot} className="pointer-events-none block w-full" />
          </div>
        </div>

        {/* ordinateur : panorama pleine largeur, texte posé sur le ciel */}
        <div className="relative hidden md:block">
          <div className="relative z-10 mx-auto max-w-5xl px-6 pt-12" style={{ paddingBottom: "min(19vw, 300px)" }}>
            <CountryTag />
            <h1 className="font-display text-6xl font-bold leading-[1.03]">{t("heroTitle")}</h1>
            <p className="mt-4 max-w-4xl text-xl leading-snug text-white/90">{t("heroSub")}</p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1500px]">
            <HeroPanorama hot={hot} className="block w-full" />
          </div>
        </div>
      </section>

      {/* ---------- d'abord les questions (où, quelle culture, dernier arrosage), PUIS l'écoute ---------- */}
      <div className="relative z-20 mx-auto -mt-12 w-full max-w-3xl space-y-4 px-4 md:-mt-6">
        {!replay && (
          <FieldQuestions
            profile={profile}
            ago={agoInfo.ago}
            agoStale={agoInfo.stale}
            loaded={profileLoaded && today !== null}
            attention={attention}
            onProfile={onProfile}
            onAgo={onAgo}
          />
        )}
        <ListenHero
          key={JSON.stringify([eff.region, eff.crop, eff.ago, eff.soil, eff.system, eff.planting, replay])}
          locked={!ready}
          onLockedTap={onLockedTap}
          query={{ region: eff.region, crop: eff.crop, ago: eff.ago, soil: eff.soil, system: eff.system, planting: eff.planting, asOf: replay ? REPLAY_DATE : undefined }}
          plan={plan}
        />
      </div>

      <FiveDoors />
      <SpeedBand />

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 pt-5">
        {/* rejeu de la canicule : la scène de la vidéo */}
        <button
          type="button"
          onClick={() => setReplay((r) => !r)}
          className={`sk-press flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-start shadow-md ${
            replay
              ? "border-2 border-sakia-green bg-white text-sakia-green"
              : "bg-gradient-to-r from-[#a63d16] to-[#e0832a] text-white"
          }`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/10">
            <ThermoIcon className="h-6 w-6" />
          </span>
          <span className="font-display text-base font-bold leading-tight sm:text-lg">{replay ? t("replayBack") : t("replayButton")}</span>
        </button>

        {replay && (
          <div role="status" className="rounded-2xl border-2 border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
            <p className="text-base font-extrabold tracking-wide">{t("replayBadge")}</p>
            <p className="text-sm font-medium">{t("replayDate", { d: fmtDate(REPLAY_DATE, { day: "numeric", month: "long", year: "numeric" }) })}</p>
          </div>
        )}

        {/* garde-fou éliminatoire : « pas sûr, demandez à une personne » */}
        {plan?.confidence.askAPerson && <AskPerson confidence={plan.confidence} />}

        {plan && !replay && ageMin != null && (
          <p
            role="status"
            className={`rounded-xl px-3 py-2 text-sm font-semibold ${
              stale ? "border border-sakia-alert bg-sakia-alert-light text-sakia-alert" : "bg-sakia-green-light text-sakia-green-deep"
            }`}
          >
            {stale ? `⚠ ${t("stale", { h: fmtAge(ageMin) })}` : ageMin < 2 ? t("freshJustNow") : t("fresh", { h: fmtAge(ageMin) })}
          </p>
        )}

        {ready && !replay && (local.status === "no-data" || local.status === "too-old") && (
          <div role="alert" className="rounded-2xl border-4 border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
            <p className="text-lg font-extrabold">⚠ {t(local.status === "no-data" ? "noDataOffline" : "savedTooOld")}</p>
            <p className="mt-2 text-sm font-semibold">{t("askPerson")}</p>
          </div>
        )}

        {failed && (
          <div role="alert" className="rounded-2xl border border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
            <p className="font-semibold">{t("error")}</p>
            <button
              type="button"
              onClick={() => (replay ? setReload((n) => n + 1) : void local.refresh())}
              className="mt-2 min-h-11 rounded-lg bg-sakia-alert px-4 font-semibold text-white"
            >
              {t("retry")}
            </button>
          </div>
        )}
      </div>

      {/* ---------- pourquoi c'est important ---------- */}
      <div className="mt-8">
        <StatBand region={eff.region || "kairouan"} crop={eff.crop || "olivier"} example={!eff.region || !eff.crop} />
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
        {/* ---------- les 7 prochains jours ---------- */}
        {!ready && (
          <section aria-label={t("planTitle")}>
            <div className="rounded-3xl border-2 border-dashed border-sakia-sand-dark bg-white/60 p-6 text-center">
              <SproutIcon className="mx-auto h-12 w-12 text-sakia-green" />
              <p className="mt-2 text-lg font-bold text-sakia-brown">{t("planEmpty")}</p>
              <button type="button" onClick={onLockedTap} className="sk-press mt-3 min-h-12 rounded-full bg-sakia-green px-6 text-base font-bold text-white">
                {t("choose")}
              </button>
            </div>
          </section>
        )}

        {plan && (
          <section aria-labelledby="plan-title" className={loading ? "space-y-4 opacity-60" : "space-y-4"} aria-busy={loading}>
            {plan.confidence.level !== "none" && (
              <Reveal>
                <h2 id="plan-title" className="font-display text-3xl font-bold text-sakia-green-deep">
                  {t("planTitle")}
                </h2>
              </Reveal>
            )}
            {plan.confidence.level === "none" ? null : plan.status === "hors_vegetation" ? (
              <div className="rounded-3xl border border-sakia-sand-dark bg-sakia-sand p-5 text-sakia-brown">
                <p className="text-lg font-bold">{t("offSeason")}</p>
                <p className="mt-1 text-sm">{t("offSeasonHint")}</p>
              </div>
            ) : (
              <>
                <SeasonNote plan={plan} />
                <Summary plan={plan} />
                <Notes confidence={plan.confidence} />
                <WeekView plan={plan} />
              </>
            )}
            <Assumptions items={plan.assumptions} folded />
            <p className="text-center text-xs text-sakia-brown/80">{t("indicative")}</p>
            {!replay && <p className="text-center text-xs font-semibold text-sakia-green">{t("computedOnDevice")}</p>}
            <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-sakia-brown/80">
              <div className="flex flex-wrap justify-center gap-x-1">
                <dt className="whitespace-nowrap font-semibold">
                  {t("planSize")}
                  {colon}
                </dt>
                <dd>
                  <span dir="ltr">{bytes != null ? `${fmtNum(bytes / 1024, 1)} ${t("kbUnit")}` : "–"}</span> ({t("sizeNote")})
                </dd>
              </div>
              <div className="flex flex-wrap justify-center gap-x-1">
                <dt className="whitespace-nowrap font-semibold">
                  {t("dataAge")}
                  {colon}
                </dt>
                <dd>{replay ? t("replayDataNote") : ageMin != null ? fmtAge(ageMin) : "–"}</dd>
              </div>
            </dl>
          </section>
        )}

        {ready && loading && !plan && <p className="py-8 text-center text-base text-sakia-brown">{t("loading")}</p>}
      </div>
    </main>
  );
}

// Garde-fou éliminatoire : « pas sûr, demandez à une personne ». Phrases fixes, jamais générées.
function AskPerson({ confidence }: { confidence: Confidence }) {
  const { t } = useLang();
  const none = confidence.level === "none";
  return (
    <section
      role="alert"
      aria-labelledby="ask-title"
      className="rounded-2xl border-4 border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert"
    >
      <div className="flex items-start gap-3">
        <AlertIcon className="mt-1 h-9 w-9 shrink-0" />
        <h2 id="ask-title" className="text-xl font-extrabold leading-snug">
          {t("askPerson")}
        </h2>
      </div>
      {confidence.reasons.length > 0 && (
        <div className="mt-2">
          <p className="text-sm font-bold">{t("askWhy")}</p>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-base text-sakia-ink">
            {confidence.reasons.map((r) => (
              <li key={r}>{t(`reason_${r}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-sm font-semibold">{none ? t("noAdvice") : t("planStillReadable")}</p>
    </section>
  );
}

// Remarques sans alarme : pluie possible, très forte chaleur. Le conseil ne change pas (ce n'est pas un « pas sûr »), on le dit simplement.
function Notes({ confidence }: { confidence: Confidence }) {
  const { t } = useLang();
  const notes = (confidence.notes ?? []).filter((n) => n === "uncertain_rain" || n === "extreme_heat");
  if (notes.length === 0) return null;
  return (
    <section aria-label={t("noteTitle")} className="rounded-2xl bg-sakia-sand p-4 text-sakia-brown">
      <h3 className="text-sm font-bold uppercase tracking-wide text-sakia-brown/80">{t("noteTitle")}</h3>
      <ul className="mt-2 space-y-2">
        {notes.map((n) => (
          <li key={n} className="flex items-start gap-3 text-base font-semibold leading-snug">
            {n === "extreme_heat" ? (
              <ThermoIcon className="mt-0.5 h-6 w-6 shrink-0 text-sakia-sun-deep" />
            ) : (
              <RainIcon className="mt-0.5 h-6 w-6 shrink-0 text-sakia-water" />
            )}
            <span>{t(`note_${n}`)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// La culture est encore en végétation mais hors de sa saison d'arrosage (la vigne en octobre, après la vendange) : le moteur ne prévoit
// alors AUCUN arrosage (irrigationSeason, src/lib/crops.ts). On le dit, sinon « pas d'arrosage cette semaine » laisserait croire que
// c'est le sol qui suffit.
function SeasonNote({ plan }: { plan: Plan }) {
  const { t, fmtDate } = useLang();
  const season = irrigationSeasonOf(plan.cropId);
  if (!season || plan.status === "hors_vegetation" || !outOfIrrigationSeason(plan.cropId, plan.today)) return null;
  const monthName = (m: number) => fmtDate(`2026-${String(m).padStart(2, "0")}-15`, { month: "long" });
  return (
    <p role="note" className="rounded-2xl border border-sakia-sand-dark bg-sakia-sand p-4 text-base font-semibold text-sakia-brown">
      {t("outOfSeason", { from: monthName(season.from), to: monthName(season.to) })}
    </p>
  );
}

// Quatre chiffres de la semaine. Le prochain arrosage n'est pas redit ici : le verdict sous le bouton d'écoute et les cartes des jours
// d'arrosage le disent déjà (une phrase, un seul endroit).
function Summary({ plan }: { plan: Plan }) {
  const { t, fmtNum } = useLang();
  const s = plan.summary;
  const risk = { faible: "bg-[#4aa263]", moyen: "bg-sakia-sun", eleve: "bg-[#d2552a]" }[s.stressRisk];
  return (
    <Reveal>
      <div className="overflow-hidden rounded-3xl bg-sakia-green-deep text-white shadow-md">
        <dl className="grid grid-cols-2 gap-px bg-white/10 text-sm sm:grid-cols-4">
          <Stat label={t("irrigations")} value={fmtNum(s.irrigationCount)} />
          <Stat label={t("totalWater")} value={t("perHa", { n: fmtNum(s.totalM3PerHa) })} />
          <Stat label={t("rainExpected")} value={`${fmtNum(s.rainExpectedMm, 1)} ${t("mm")}`} />
          <Stat
            label={t("stressRisk")}
            value={
              <span className="inline-flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full ${risk}`} />
                {t(`risk_${s.stressRisk}`)}
              </span>
            }
          />
        </dl>
      </div>
    </Reveal>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-sakia-green-deep p-4">
      <dt className="text-white/70">{label}</dt>
      <dd className="mt-0.5 text-lg font-extrabold">{value}</dd>
    </div>
  );
}
