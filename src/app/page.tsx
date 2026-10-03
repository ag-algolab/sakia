"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { CropSelect, Field, regionName, selectClass, useCatalog } from "@/components/ui/catalog";
import { Chips, Segmented } from "@/components/ui/controls";
import HeroScene from "@/components/ui/HeroScene";
import { AlertIcon, DropIcon, HandIcon, RainIcon, SunIcon, ThermoIcon } from "@/components/ui/icons";
import ListenHero from "@/components/ui/ListenHero";
import { useLang } from "@/components/ui/LangProvider";
import { Reveal } from "@/components/ui/motion";
import StatBand from "@/components/ui/StatBand";
import WaterTank from "@/components/ui/WaterTank";
import { usePlan } from "@/components/phone/usePlan";
import type { Confidence, Plan, PlanDay } from "@/lib/plan";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

// Les types viennent du moteur (import de type seulement : aucune logique dupliquée).
const REPLAY_DATE = "2026-07-17";
const REPLAY_SCENE = { crop: "tomate", ago: "7" };
const STALE_AFTER_HOURS = 5;

// Vraie date AAAA-MM-JJ (le champ date du navigateur en donne une, mais une valeur mémorisée ou collée peut être fausse).
// L'écran et la voix reçoivent la même valeur, ou aucune : sinon ils pourraient se contredire.
function validDate(s: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? "" : s;
}

type Form = {
  region: string;
  crop: string;
  soil: string;
  system: string;
  ago: string; // "" = inconnu
  planting: string;
};

const DEFAULT_FORM: Form = { region: "kairouan", crop: "olivier", soil: "limoneux", system: "goutte", ago: "", planting: "" };

export default function Home() {
  const { lang, t, fmtDate, fmtNum } = useLang();
  const catalog = useCatalog();
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [replay, setReplay] = useState(false);
  // Rejeu : plan calculé par le serveur (météo observée). Sinon : plan calculé SUR L'APPAREIL (usePlan, poste Téléphone),
  // donc qui continue de marcher hors connexion avec la dernière météo gardée.
  const [replayPlan, setReplayPlan] = useState<Plan | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayFailed, setReplayFailed] = useState(false);
  const [replayBytes, setReplayBytes] = useState<number | null>(null);
  const [reload, setReload] = useState(0);
  const [now, setNow] = useState<number | null>(null);
  const local = usePlan({
    regionId: form.region,
    cropId: form.crop,
    soil: form.soil as SoilName,
    system: form.system as IrrigationSystem,
    planting: validDate(form.planting) || undefined,
    lastIrrigationDaysAgo: form.ago === "" ? undefined : Number(form.ago),
  });
  const plan = replay ? replayPlan : local.plan;
  const loading = replay ? replayLoading : local.status === "loading";
  const failed = replay ? replayFailed : local.status === "error";
  const bytes = useMemo(
    () => (replay ? replayBytes : local.plan ? new TextEncoder().encode(JSON.stringify(local.plan)).length : null),
    [replay, replayBytes, local.plan],
  );

  // Le formulaire est gardé sur l'appareil : réglé une fois (par la personne ou par un technicien), il est là à chaque visite.
  const [formLoaded, setFormLoaded] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sakia-form") ?? "null") as Partial<Form> | null;
      if (saved && typeof saved === "object") setForm((f) => ({ ...f, ...saved }));
    } catch {}
    setFormLoaded(true);
  }, []);
  useEffect(() => {
    if (!formLoaded || replay) return; // le rejeu (tomate, 7 jours) ne doit pas écraser le vrai profil
    try {
      localStorage.setItem("sakia-form", JSON.stringify(form));
    } catch {}
  }, [form, formLoaded, replay]);

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Scène de démo : tomate, dernier arrosage il y a 7 jours (le moteur y montre des irrigations).
  // On garde le formulaire d'avant pour le restaurer au retour.
  const [savedForm, setSavedForm] = useState<Form | null>(null);
  const toggleReplay = () => {
    if (!replay) {
      setSavedForm(form);
      setForm((f) => ({ ...f, crop: REPLAY_SCENE.crop, ago: REPLAY_SCENE.ago }));
      setReplay(true);
    } else {
      if (savedForm) setForm(savedForm);
      setReplay(false);
    }
  };

  useEffect(() => {
    if (!replay) return;
    const ctrl = new AbortController();
    const q = new URLSearchParams({ region: form.region, crop: form.crop, soil: form.soil, system: form.system });
    if (form.ago !== "") q.set("ago", form.ago);
    if (validDate(form.planting)) q.set("planting", validDate(form.planting));
    q.set("asOf", REPLAY_DATE);
    setReplayLoading(true);
    setReplayFailed(false);
    fetch(`/api/plan?${q}`, { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const text = await r.text();
        return { plan: JSON.parse(text) as Plan, bytes: new TextEncoder().encode(text).length };
      })
      .then(({ plan: p, bytes: b }) => {
        setReplayPlan(p);
        setReplayBytes(b);
        setReplayLoading(false);
      })
      .catch((e) => {
        if (e.name === "AbortError") return;
        setReplayFailed(true);
        setReplayLoading(false);
      });
    return () => ctrl.abort();
  }, [form, replay, reload]);

  // Horloge pour « mis à jour il y a X heures » (rafraîchie chaque minute).
  useEffect(() => {
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

  return (
    <>
      {/* ---------- héros : l'aube sur Kairouan ---------- */}
      <section className={`${hot ? "sk-hero-heat" : "sk-hero-sky"} relative overflow-hidden text-white`}>
        <div className="relative mx-auto max-w-3xl px-4 pt-6 sm:grid sm:grid-cols-2 sm:items-end sm:gap-6 sm:pt-10">
          <div className="relative z-10 sm:pb-20">
            <h1 className="font-display text-[2.2rem] font-bold leading-[1.04] sm:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-3 max-w-md text-base leading-snug text-white/90 sm:text-lg">{t("heroSub")}</p>
          </div>
          <div className="relative mt-3 sm:mt-0">
            <HeroScene className={`pointer-events-none block h-auto w-full overflow-visible ${hot ? "sk-haze" : ""}`} />
          </div>
        </div>
      </section>

      {/* ---------- bouton d'écoute : la première chose à toucher ---------- */}
      <div className="relative z-20 mx-auto -mt-12 w-full max-w-3xl px-4">
        <ListenHero query={{ ...form, planting: validDate(form.planting), asOf: replay ? REPLAY_DATE : undefined }} plan={plan} />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 pt-5">
        {/* rejeu de la canicule : la scène de la vidéo */}
        <button
          type="button"
          onClick={toggleReplay}
          className={`sk-press flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-start shadow-md ${
            replay
              ? "border-2 border-sakia-green bg-white text-sakia-green"
              : "bg-gradient-to-r from-[#a63d16] to-[#e0832a] text-white"
          }`}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/10">
            <ThermoIcon className="h-7 w-7" />
          </span>
          <span className="font-display text-lg font-bold leading-tight">{replay ? t("replayBack") : t("replayButton")}</span>
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
              stale ? "border border-sakia-alert bg-sakia-alert-light text-sakia-alert" : "bg-sakia-green-light text-sakia-green"
            }`}
          >
            {stale ? `⚠ ${t("stale", { h: fmtAge(ageMin) })}` : ageMin < 2 ? t("freshJustNow") : t("fresh", { h: fmtAge(ageMin) })}
          </p>
        )}

        {!replay && (local.status === "no-data" || local.status === "too-old") && (
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
      </main>

      {/* ---------- pourquoi c'est important ---------- */}
      <div className="mt-8">
        <StatBand crop={form.crop} />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
        {/* ---------- votre champ ---------- */}
        <section aria-labelledby="field-title" className="space-y-4">
          <Reveal>
            <h2 id="field-title" className="font-display text-3xl font-bold text-sakia-green-deep">
              {t("yourField")}
            </h2>
          </Reveal>

          <Reveal
            className={`rounded-3xl border-2 p-4 ${
              form.ago === "" ? "border-sakia-alert bg-sakia-alert-light" : "border-sakia-green/40 bg-sakia-green-light"
            }`}
          >
            <p className="text-lg font-bold text-sakia-ink">{t("lastWatering")}</p>
            <p className={`mb-3 text-sm font-semibold ${form.ago === "" ? "text-sakia-alert" : "text-sakia-green"}`}>
              {form.ago === "" ? `⚠ ${t("lastWateringMissing")}` : t("lastWateringSet")}
            </p>
            <Chips
              label={t("lastWatering")}
              value={form.ago}
              tone={form.ago === "" ? "alert" : "green"}
              onChange={set("ago")}
              options={[
                { value: "", label: t("unknown") },
                { value: "0", label: t("today") },
                ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: t("daysAgo", { n }) })),
              ]}
            />
          </Reveal>

          <Reveal delay={80} className="grid grid-cols-1 gap-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-black/5 sm:grid-cols-2">
            <Field label={t("region")}>
              <select className={selectClass} value={form.region} onChange={(e) => set("region")(e.target.value)}>
                {!catalog && <option value={form.region}>{form.region}</option>}
                {catalog?.regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {regionName(r, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <CropSelect catalog={catalog} value={form.crop} onChange={set("crop")} />
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-sakia-brown">{t("soil")}</span>
              <Segmented
                label={t("soil")}
                value={form.soil}
                onChange={set("soil")}
                options={["sableux", "limoneux", "argileux"].map((s) => ({ value: s, label: t(s) }))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-sakia-brown">{t("system")}</span>
              <Segmented
                label={t("system")}
                value={form.system}
                onChange={set("system")}
                options={["goutte", "aspersion", "gravitaire"].map((s) => ({ value: s, label: t(s) }))}
              />
            </div>
            <Field label={t("planting")} hint={t("plantingHint")}>
              <input type="date" className={selectClass} value={form.planting} onChange={(e) => set("planting")(e.target.value)} />
            </Field>
          </Reveal>
        </section>

        {/* ---------- les 7 prochains jours ---------- */}
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
                <Summary plan={plan} />
                <Reveal>
                  <WaterTank days={plan.days} />
                </Reveal>
                <ol className="space-y-3">
                  {plan.days.map((d, i) => (
                    <DayCard key={d.date} day={d} index={i} />
                  ))}
                </ol>
              </>
            )}
            <Assumptions items={plan.assumptions} />
            <p className="text-center text-xs text-sakia-brown/80">{t("indicative")}</p>
            {!replay && <p className="text-center text-xs font-semibold text-sakia-green">{t("computedOnDevice")}</p>}
            <dl className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-sakia-brown/80">
              <div className="flex gap-1">
                <dt className="font-semibold">{t("planSize")} :</dt>
                <dd dir="ltr">
                  {bytes != null ? `${fmtNum(bytes)} B (${fmtNum(bytes / 1024, 1)} KB)` : "–"} · {t("sizeNote")}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-semibold">{t("dataAge")} :</dt>
                <dd>{replay ? t("replayDataNote") : ageMin != null ? fmtAge(ageMin) : "–"}</dd>
              </div>
            </dl>
          </section>
        )}

        {loading && !plan && <p className="py-8 text-center text-base text-sakia-brown">{t("loading")}</p>}
      </main>
    </>
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

function Summary({ plan }: { plan: Plan }) {
  const { t, fmtDate, fmtNum } = useLang();
  const s = plan.summary;
  const risk = { faible: "bg-[#4aa263]", moyen: "bg-sakia-sun", eleve: "bg-[#d2552a]" }[s.stressRisk];
  return (
    <Reveal>
      <div className="overflow-hidden rounded-3xl bg-sakia-green-deep text-white shadow-md">
        <div className="relative p-5">
          <DropIcon className="sk-sway pointer-events-none absolute -end-3 -top-3 h-28 w-28 text-white/10" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white/70">{t("summary", { n: plan.days.length })}</h3>
          <p className="font-display mt-1 text-2xl font-bold leading-tight sm:text-3xl">
            {s.nextIrrigation ? `${t("nextIrrigation")} : ${fmtDate(s.nextIrrigation)}` : t("noIrrigation")}
          </p>
        </div>
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

function DayCard({ day, index }: { day: PlanDay; index: number }) {
  const { t, fmtDate, fmtNum } = useLang();
  const irrigate = day.action === "irriguer";
  const rainy = day.rain >= 1;
  const scorching = Number.isFinite(day.tmax) && day.tmax >= 40;
  return (
    <Reveal
      as="li"
      delay={Math.min(index, 4) * 70}
      className={`overflow-hidden rounded-3xl border-2 ${
        irrigate ? "border-sakia-water bg-sakia-water-light" : "border-transparent bg-white shadow-sm ring-1 ring-black/5"
      }`}
    >
      <div className="flex items-center gap-4 p-4">
        <span
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${
            rainy ? "bg-sakia-water-light text-sakia-water" : scorching ? "bg-sakia-alert-light text-sakia-alert" : "bg-[#fdf1cf] text-sakia-sun-deep"
          }`}
        >
          {rainy ? (
            <RainIcon className="h-10 w-10" />
          ) : (
            <SunIcon className={`h-10 w-10 ${scorching ? "sk-spin" : ""}`} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-tight text-sakia-ink">{fmtDate(day.date)}</p>
          <p className="mt-0.5 text-sm text-sakia-brown">
            {t("rain")} {fmtNum(day.rain, 1)} {t("mm")}
            {Number.isFinite(day.tmax) && (
              <span className={scorching ? "font-bold text-sakia-alert" : ""}>
                {" "}
                · {t("tmax")} {fmtNum(day.tmax)} °C
              </span>
            )}
          </p>
        </div>
        <span
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-base font-extrabold ${
            irrigate ? "bg-sakia-water text-white" : "bg-sakia-sand text-sakia-brown"
          }`}
        >
          {irrigate ? <DropIcon className="h-5 w-5" /> : <HandIcon className="h-5 w-5" />}
          {irrigate ? t("irrigate") : t("wait")}
        </span>
      </div>
      {irrigate && (
        <p className="border-t border-sakia-water/20 bg-white/50 px-4 py-3 text-xl font-extrabold text-sakia-water-deep">
          {t("dose")} :{" "}
          {day.litersPerTree != null ? t("perTree", { n: fmtNum(day.litersPerTree) }) : t("perHa", { n: fmtNum(day.m3PerHa) })}
          {day.litersPerTree != null && (
            <span className="ms-2 text-sm font-medium text-sakia-brown">({t("perHa", { n: fmtNum(day.m3PerHa) })})</span>
          )}
        </p>
      )}
      {day.estimated && <p className="px-4 pb-3 text-xs font-semibold text-sakia-alert">{t("estimated")}</p>}
    </Reveal>
  );
}
