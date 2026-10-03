"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { CropSelect, Field, regionName, selectClass, useCatalog } from "@/components/ui/catalog";
import ListenHero from "@/components/ui/ListenHero";
import { useLang } from "@/components/ui/LangProvider";
import { usePlan } from "@/components/phone/usePlan";
import type { Confidence, Plan, PlanDay } from "@/lib/plan";
import type { IrrigationSystem, SoilName } from "@/lib/waterBalance";

// Les types viennent du moteur (import de type seulement : aucune logique dupliquée).
const REPLAY_DATE = "2026-07-17";
const REPLAY_SCENE = { crop: "tomate", ago: "7" };
const STALE_AFTER_HOURS = 5;

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
    planting: form.planting || undefined,
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
    if (form.planting) q.set("planting", form.planting);
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-5">
      <ListenHero
        query={{ ...form, asOf: replay ? REPLAY_DATE : undefined }}
        plan={plan}
      />

      {replay && (
        <div role="status" className="rounded-xl border-2 border-sakia-alert bg-sakia-alert-light p-3 text-sakia-alert">
          <p className="text-base font-extrabold">{t("replayBadge")}</p>
          <p className="text-sm">{t("replayDate", { d: fmtDate(REPLAY_DATE, { day: "numeric", month: "long", year: "numeric" }) })}</p>
        </div>
      )}

      <section
        aria-label={t("lastWatering")}
        className={`rounded-xl border-2 p-4 ${
          form.ago === "" ? "border-sakia-alert bg-sakia-alert-light" : "border-sakia-green bg-sakia-green-light"
        }`}
      >
        <Field
          label={t("lastWatering")}
          hint={form.ago === "" ? `⚠ ${t("lastWateringMissing")}` : t("lastWateringSet")}
        >
          <select className={selectClass} value={form.ago} onChange={(e) => set("ago")(e.target.value)}>
            <option value="">{t("unknown")}</option>
            <option value="0">{t("today")}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {t("daysAgo", { n })}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <section aria-label={t("crop")} className="grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2">
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
        <Field label={t("soil")}>
          <select className={selectClass} value={form.soil} onChange={(e) => set("soil")(e.target.value)}>
            {["sableux", "limoneux", "argileux"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("system")}>
          <select className={selectClass} value={form.system} onChange={(e) => set("system")(e.target.value)}>
            {["goutte", "aspersion", "gravitaire"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("planting")} hint={t("plantingHint")}>
          <input
            type="date"
            className={selectClass}
            value={form.planting}
            onChange={(e) => set("planting")(e.target.value)}
          />
        </Field>
      </section>

      <button
        type="button"
        onClick={toggleReplay}
        className={`min-h-14 w-full rounded-xl px-4 text-base font-bold ${
          replay
            ? "border-2 border-sakia-green bg-white text-sakia-green"
            : "bg-sakia-alert text-white hover:brightness-110"
        }`}
      >
        {replay ? t("replayBack") : `🔥 ${t("replayButton")}`}
      </button>

      {plan && !replay && ageMin != null && (
        <p
          role="status"
          className={`rounded-lg px-3 py-2 text-sm font-medium ${
            stale ? "border border-sakia-alert bg-sakia-alert-light text-sakia-alert" : "bg-sakia-green-light text-sakia-green"
          }`}
        >
          {stale
            ? `⚠ ${t("stale", { h: fmtAge(ageMin) })}`
            : ageMin < 2
              ? t("freshJustNow")
              : t("fresh", { h: fmtAge(ageMin) })}
        </p>
      )}

      {loading && !plan && <p className="py-8 text-center text-base text-sakia-brown">{t("loading")}</p>}

      {!replay && (local.status === "no-data" || local.status === "too-old") && (
        <div role="alert" className="rounded-xl border-4 border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
          <p className="text-lg font-extrabold">⚠ {t(local.status === "no-data" ? "noDataOffline" : "savedTooOld")}</p>
          <p className="mt-2 text-sm font-semibold">{t("askPerson")}</p>
        </div>
      )}

      {failed && (
        <div role="alert" className="rounded-xl border border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
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

      {plan && (
        <div className={loading ? "space-y-4 opacity-60" : "space-y-4"} aria-busy={loading}>
          {plan.confidence.askAPerson && <AskPerson confidence={plan.confidence} />}
          {plan.confidence.level === "none" ? null : plan.status === "hors_vegetation" ? (
            <div className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-5 text-sakia-brown">
              <p className="text-lg font-bold">{t("offSeason")}</p>
              <p className="mt-1 text-sm">{t("offSeasonHint")}</p>
            </div>
          ) : (
            <>
              <Summary plan={plan} />
              <ol className="space-y-3">
                {plan.days.map((d) => (
                  <DayCard key={d.date} day={d} />
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
        </div>
      )}
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
      className="rounded-xl border-4 border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert"
    >
      <h2 id="ask-title" className="text-xl font-extrabold leading-snug">
        ⚠ {t("askPerson")}
      </h2>
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
  return (
    <section aria-label={t("summary", { n: plan.days.length })} className="rounded-xl bg-sakia-green p-4 text-white">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">{t("summary", { n: plan.days.length })}</h2>
      <p className="mt-1 text-xl font-bold">
        {s.nextIrrigation ? `${t("nextIrrigation")} : ${fmtDate(s.nextIrrigation)}` : t("noIrrigation")}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <Stat label={t("irrigations")} value={fmtNum(s.irrigationCount)} />
        <Stat label={t("totalWater")} value={t("perHa", { n: fmtNum(s.totalM3PerHa) })} />
        <Stat label={t("rainExpected")} value={`${fmtNum(s.rainExpectedMm, 1)} ${t("mm")}`} />
        <Stat label={t("stressRisk")} value={t(`risk_${s.stressRisk}`)} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-white/80">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

function DayCard({ day }: { day: PlanDay }) {
  const { t, fmtDate, fmtNum } = useLang();
  const irrigate = day.action === "irriguer";
  return (
    <li
      className={`rounded-xl border-2 p-4 ${
        irrigate ? "border-sakia-water bg-sakia-water-light" : "border-sakia-sand-dark bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-sakia-ink">{fmtDate(day.date)}</p>
          <p className="mt-0.5 text-sm text-sakia-brown">
            {t("rain")} {fmtNum(day.rain, 1)} {t("mm")}
            {Number.isFinite(day.tmax) && <> · {t("tmax")} {fmtNum(day.tmax)} °C</>}
          </p>
        </div>
        <span
          className={`rounded-full px-4 py-1.5 text-base font-extrabold ${
            irrigate ? "bg-sakia-water text-white" : "bg-sakia-sand text-sakia-brown"
          }`}
        >
          {irrigate ? `💧 ${t("irrigate")}` : t("wait")}
        </span>
      </div>
      {irrigate && (
        <p className="mt-2 text-lg font-bold text-sakia-water">
          {t("dose")}:{" "}
          {day.litersPerTree != null
            ? t("perTree", { n: fmtNum(day.litersPerTree) })
            : t("perHa", { n: fmtNum(day.m3PerHa) })}
          {day.litersPerTree != null && (
            <span className="ms-2 text-sm font-medium text-sakia-brown">({t("perHa", { n: fmtNum(day.m3PerHa) })})</span>
          )}
        </p>
      )}
      {day.estimated && <p className="mt-2 text-xs font-semibold text-sakia-alert">{t("estimated")}</p>}
    </li>
  );
}
