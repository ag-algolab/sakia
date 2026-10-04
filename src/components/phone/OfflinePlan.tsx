"use client";

// « Mon plan » : le plan des 7 jours CALCULÉ SUR L'APPAREIL (hook usePlan) pour la région et la culture choisies dans l'inscription
// (plus haut sur la page : région et culture sont obligatoires, ici on ne les redemande pas), avec le dernier arrosage en plus.
// Marche sans réseau avec la dernière météo gardée ; le garde-fou « pas sûr : demandez à une personne » vient du moteur
// (plan.confidence) et s'affiche tel quel.

import { CROPS } from "@/lib/crops";
import { planMessage, planSms } from "@/lib/messages";
import { REGIONS } from "@/lib/regions";
import { smsInfo } from "@/lib/sms/encoding";
import { usePhoneProfile } from "./phoneProfile";
import { asSent } from "./smsKeys";
import { STRINGS, formatAge } from "./strings";
import type { UiLang } from "./strings";
import { useUiLang } from "./useUiLang";
import { usePlan } from "./usePlan";

function PlanBody({ lang, regionId, cropId }: { lang: UiLang; regionId: string; cropId: string }) {
  const t = STRINGS[lang];
  const { ago, setAgo } = usePhoneProfile();
  const state = usePlan({ regionId, cropId, lastIrrigationDaysAgo: ago === "" ? undefined : Number(ago) });
  // L'aperçu du SMS part du même plan : le service SMS connaît lui aussi le dernier arrosage (dit dans le message ou en réponse à sa question).
  const { plan } = state;
  const ageText = plan ? formatAge(plan.dataAgeHours * 3600 * 1000, lang) : "";
  const crop = CROPS.find((c) => c.id === cropId);
  const region = REGIONS.find((r) => r.id === regionId);
  const cropName = crop ? (lang === "ar" ? crop.nameAr : lang === "en" ? crop.nameEn : crop.nameFr) : "";
  const regionName = region ? (lang === "ar" ? region.nameAr : region.nameFr) : "";
  const sms = plan ? asSent(planSms(plan, lang), lang) : "";
  const smsMeta = smsInfo(sms);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-3">
        <p className="text-base font-semibold" dir="auto">
          {t.regionLabel} : {regionName} · {t.cropLabel} : {cropName}{" "}
          <button
            type="button"
            onClick={() => document.querySelector<HTMLElement>("#phone-region-q button")?.focus()}
            className="ms-2 inline-flex min-h-11 items-center px-1 text-base font-semibold text-sakia-water-deep underline"
          >
            {t.changeChoice}
          </button>
        </p>
        <label className="block min-w-[12rem] text-base">
          <span className="mb-1 block font-bold">{t.lastIrrigLabel}</span>
          <select
            className="min-h-12 w-full rounded-lg border-2 border-sakia-sand-dark bg-white px-3 text-base text-sakia-ink"
            value={ago}
            onChange={(e) => setAgo(e.target.value)}
          >
            <option value="">{t.unknownOpt}</option>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={String(n)}>
                {n === 0 ? t.todayOpt : t.daysAgoOpt(n)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p
        role="status"
        className={`mt-3 flex flex-wrap items-center gap-x-3 rounded-lg px-3 py-2 text-base ${state.online ? "bg-sakia-green-light text-sakia-green-deep" : "bg-sakia-brown font-semibold text-white"}`}
      >
        <span>
          {state.status === "no-data"
            ? `${t.offline} · ${t.noData}`
            : state.status === "too-old"
              ? t.tooOld
              : plan
                ? state.online
                  ? t.onlineNote(ageText)
                  : t.offlineNote(ageText)
                : "…"}
        </span>
        {state.online && (
          <button
            type="button"
            onClick={() => void state.refresh()}
            disabled={state.refreshing}
            className="inline-flex min-h-11 items-center px-1 font-semibold underline disabled:opacity-60"
          >
            {t.refresh}
          </button>
        )}
      </p>

      {plan && plan.confidence.askAPerson && (
        <p role="alert" className="mt-3 rounded-lg border-2 border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base font-bold text-sakia-alert">
          ⚠ {t.askPerson}
        </p>
      )}

      {plan && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <pre dir="auto" className="whitespace-pre-wrap rounded-lg border border-sakia-sand-dark bg-white p-3 font-sans text-sm leading-6">
            {planMessage(plan, lang)}
          </pre>
          <div>
            <p className="mb-1 text-sm font-bold">{t.smsPreview}</p>
            {sms ? (
              <>
                <p dir="auto" className="rounded-lg border border-sakia-sand-dark bg-[#c8d6a6] p-3 font-mono text-[0.8125rem] leading-5 text-[#1a2410]">
                  {sms}
                </p>
                <p className="mt-1 text-sm text-sakia-brown">
                  {smsMeta.units}/{smsMeta.perSms} · {t.smsCount(smsMeta.segments)}
                </p>
              </>
            ) : (
              <p className="text-sm text-sakia-brown">…</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function OfflinePlan() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const { profile, ready } = usePhoneProfile();

  return (
    <section dir={lang === "ar" ? "rtl" : "ltr"} aria-labelledby="plan-title" className="mx-auto w-full max-w-5xl px-4 pb-10">
      <h2 id="plan-title" className="text-xl font-bold text-sakia-green">
        {t.planTitle}
      </h2>
      <p className="mt-1 text-base text-sakia-brown">{t.planIntro}</p>
      {ready ? (
        <PlanBody lang={lang} regionId={profile.region} cropId={profile.crop} />
      ) : (
        <p role="status" className="mt-4 rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base font-semibold text-sakia-alert">
          {t.planNeedChoice}
        </p>
      )}
    </section>
  );
}
