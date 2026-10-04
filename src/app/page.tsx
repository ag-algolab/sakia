"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { regionName } from "@/components/ui/catalog";
import { skyOf } from "@/components/ui/DaySky";
import type { DaySky } from "@/components/ui/DaySky";
import FieldQuestions from "@/components/ui/FieldQuestions";
import FiveDoors from "@/components/ui/FiveDoors";
import HeroPanorama from "@/components/ui/HeroPanorama";
import HeroScene from "@/components/ui/HeroScene";
import { AlertIcon, RainIcon, RetryIcon, SproutIcon, SunIcon, ThermoIcon, TunisiaFlagIcon } from "@/components/ui/icons";
import ListenHero from "@/components/ui/ListenHero";
import { useLang } from "@/components/ui/LangProvider";
import { Reveal } from "@/components/ui/motion";
import { EMPTY_PROFILE, agoFromDate, dateFromAgo, loadProfileOrFirstVisit, saveProfile, tunisToday, validDate } from "@/components/ui/profile";
import type { Profile } from "@/components/ui/profile";
import SpeedBand from "@/components/ui/SpeedBand";
import { irrigationSeasonOf, outOfIrrigationSeason } from "@/components/ui/season";
import StatBand from "@/components/ui/StatBand";
import WeekView from "@/components/ui/WeekView";
import { usePlan } from "@/components/phone/usePlan";
import { CROPS } from "@/lib/crops";
import type { Confidence, Plan, PlanDay } from "@/lib/plan";
import { getRegion } from "@/lib/regions";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

// Les types viennent du moteur (import de type seulement : aucune logique dupliquée).
const REPLAY_DATE = "2026-07-17";
const REPLAY_SCENE = { crop: "tomate", ago: "7" };
const STALE_AFTER_HOURS = 5;

// Où l'on est, en un coup d'œil : un petit drapeau et le nom du pays, discrets (le titre, lui, ne dit pas « Tunisie »).
function CountryTag() {
  const { t } = useLang();
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1 ps-1.5 pe-3 text-sm font-semibold tracking-wide text-white/90 ring-1 ring-white/20">
      <TunisiaFlagIcon className="h-4 w-6 rounded-[3px]" />
      {t("heroTag")}
    </p>
  );
}

// Le temps du jour, à côté du pays : « Kairouan · today · 28 °C ». C'est ce qui change d'un jour à l'autre (avec le paysage et
// son ciel, DaySky.tsx) : le site n'a plus l'air identique tous les jours. Rejeu : la date de la canicule à la place de « today ».
function WeatherTag({ plan, day, sky, replay }: { plan: Plan | null; day: PlanDay | null; sky: DaySky; replay: boolean }) {
  const { t, lang, fmtNum, fmtDate } = useLang();
  const region = plan ? getRegion(plan.regionId) : undefined;
  if (!plan || !region) return null;
  const Icon = sky === "rain" ? RainIcon : sky === "heat" ? ThermoIcon : SunIcon;
  const when = replay ? fmtDate(plan.today, { day: "numeric", month: "long" }) : t("today");
  const temp = day && Number.isFinite(day.tmax) ? ` · ${fmtNum(Math.round(day.tmax))} °C` : "";
  return (
    <p className="inline-flex items-center gap-2 rounded-full bg-black/20 py-1 ps-2 pe-3 text-sm font-semibold text-white/90 ring-1 ring-white/20">
      <Icon className="h-4 w-4 shrink-0" />
      <span>
        {regionName(region, lang)} · {when}
        <span dir="ltr">{temp}</span>
      </span>
    </p>
  );
}

// La journée du plan : le jour « aujourd'hui » du plan (ou le premier jour s'il manque).
function todayOf(plan: Plan | null): PlanDay | null {
  if (!plan) return null;
  return plan.days.find((d) => d.date === plan.today) ?? plan.days[0] ?? null;
}

export default function Home() {
  const { t, fmtDate, fmtNum, colon } = useLang();

  // Profil de l'agriculteur, gardé sur l'appareil. Région et culture sont obligatoires et le questionnaire passe avant l'écoute ;
  // à la toute première visite, le champ d'exemple est prérempli et affiché en clair (firstVisitProfile, décision d'Anthony du 4 oct.).
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
    setProfile(loadProfileOrFirstVisit());
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
  // Rejeu de la canicule, aller et retour : on remonte en haut de page, là où tout change (ciel, temps du jour, réponse).
  // Sans ça, on restait sur le bouton et on ne voyait pas ce qui avait changé (Anthony, 4 oct.).
  const toggleReplay = useCallback(() => {
    setReplay((r) => !r);
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
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

  // Le haut de page suit la météo du jour, celle du plan affiché (avant tout choix : le plan de repli, Kairouan, calculé sur
  // l'appareil) : ciel d'aube, de chaleur ou de pluie.
  const heroPlan = replay ? replayPlan : local.plan;
  const heroDay = todayOf(heroPlan);
  const daySky = skyOf(heroDay, replay);
  const skyClass = daySky === "heat" ? "sk-hero-heat" : daySky === "rain" ? "sk-hero-rain" : "sk-hero-sky";
  const tags = (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <CountryTag />
      <WeatherTag plan={heroPlan} day={heroDay} sky={daySky} replay={replay} />
    </div>
  );

  // Un seul repère <main> pour toute la page (héros compris) : un lecteur d'écran saute ainsi directement au contenu.
  return (
    <main className="sk-type flex flex-1 flex-col">
      {/* ---------- héros : Kairouan, avec le temps du jour ---------- */}
      <section className={`${skyClass} relative overflow-hidden text-white transition-colors`}>
        {/* téléphone et tablette : texte, puis scène */}
        <div className="relative mx-auto max-w-3xl px-4 pt-6 md:hidden">
          {tags}
          <h1 className="font-display text-[2.2rem] font-bold leading-[1.04]">{t("heroTitle")}</h1>
          <p className="mt-3 max-w-md text-base leading-snug text-white/90">{t("heroSub")}</p>
          <div className="relative mt-3">
            <HeroScene sky={daySky} className="pointer-events-none block w-full" />
          </div>
        </div>

        {/* ordinateur : panorama pleine largeur, texte posé sur le ciel */}
        <div className="relative hidden md:block">
          <div className="relative z-10 mx-auto max-w-5xl px-6 pt-12" style={{ paddingBottom: "min(19vw, 300px)" }}>
            {tags}
            <h1 className="font-display text-6xl font-bold leading-[1.03]">{t("heroTitle")}</h1>
            <p className="mt-4 max-w-4xl text-xl leading-snug text-white/90">{t("heroSub")}</p>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1500px]">
            <HeroPanorama sky={daySky} className="block w-full" />
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
        {/* rejeu de la canicule : la scène de la vidéo. Un vrai bouton qui se voit : rond « lecture » à droite qui pulse, la main au
            survol, le bouton qui se soulève (Anthony, 4 oct. : « on ne voit pas qu'elle est cliquable »). */}
        <button
          type="button"
          onClick={toggleReplay}
          className={`group sk-press flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-start shadow-md transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sakia-sun ${
            replay
              ? "border-2 border-sakia-green bg-white text-sakia-green"
              : "bg-gradient-to-r from-[#a63d16] to-[#e0832a] text-white hover:brightness-110"
          }`}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/10">
            <ThermoIcon className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1 font-display text-base font-bold leading-tight sm:text-lg">{replay ? t("replayBack") : t("replayButton")}</span>
          <span
            aria-hidden
            className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-md transition-transform group-hover:scale-110 ${
              replay ? "bg-sakia-green text-white" : "bg-white text-[#a63d16]"
            }`}
          >
            {!replay && <span className="sk-ripple absolute inset-0 rounded-full bg-white" />}
            {replay ? (
              <RetryIcon className="relative h-5 w-5" />
            ) : (
              <svg viewBox="0 0 24 24" className="relative ml-0.5 h-5 w-5" fill="currentColor">
                <path d="M7 4.5v15l12.5-7.5z" />
              </svg>
            )}
          </span>
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
