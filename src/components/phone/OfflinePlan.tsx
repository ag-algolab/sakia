"use client";

// « Mon plan » : choisir la région, la culture et le dernier arrosage, et obtenir le plan des 7 jours CALCULÉ SUR L'APPAREIL
// (hook usePlan). Marche sans réseau avec la dernière météo gardée ; le garde-fou « pas sûr : demandez à une personne »
// vient du moteur (plan.confidence) et s'affiche tel quel.

import { useEffect, useState } from "react";
import { CROPS } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import { planMessage, planSms } from "@/lib/messages";
import { smsInfo } from "@/lib/sms/encoding";
import { STRINGS, formatAge } from "./strings";
import { useUiLang } from "./useUiLang";
import { usePlan } from "./usePlan";
import RainReport from "./RainReport";

const CHOICE = "sakia.phone.choice.v1";
type Choice = { regionId: string; cropId: string; ago: string }; // ago : "" = inconnu, "0".."7"

function readChoice(): Choice {
  try {
    const c = JSON.parse(localStorage.getItem(CHOICE) ?? "null") as Choice | null;
    if (c && REGIONS.some((r) => r.id === c.regionId) && CROPS.some((x) => x.id === c.cropId) && /^[0-7]?$/.test(c.ago)) return c;
  } catch {
    // choix illisible : valeurs par défaut
  }
  return { regionId: "kairouan", cropId: "olivier", ago: "" };
}

export default function OfflinePlan() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const [choice, setChoice] = useState<Choice>({ regionId: "kairouan", cropId: "olivier", ago: "" });
  useEffect(() => {
    // le choix mémorisé n'existe que dans le navigateur : lu après l'hydratation
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readChoice());
  }, []);
  const update = (patch: Partial<Choice>) =>
    setChoice((c) => {
      const next = { ...c, ...patch };
      try {
        localStorage.setItem(CHOICE, JSON.stringify(next));
      } catch {
        // stockage bloqué : le choix vaut pour cette page seulement
      }
      return next;
    });

  const state = usePlan({
    regionId: choice.regionId,
    cropId: choice.cropId,
    lastIrrigationDaysAgo: choice.ago === "" ? undefined : Number(choice.ago),
  });
  const { plan } = state;
  const ageText = plan ? formatAge(plan.dataAgeHours * 3600 * 1000, lang) : "";
  const dir = lang === "ar" ? "rtl" : "ltr";
  const cropName = (c: (typeof CROPS)[number]) => (lang === "ar" ? c.nameAr : lang === "en" ? c.nameEn : c.nameFr);
  const sms = plan ? planSms(plan, lang) : "";
  const smsMeta = smsInfo(sms);
  const select = "w-full rounded-md border border-neutral-400 bg-white px-2 py-2 text-sm text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100";

  return (
    <section dir={dir} aria-labelledby="plan-title" className="mx-auto w-full max-w-5xl px-4 pb-10">
      <h2 id="plan-title" className="text-xl font-semibold">
        {t.planTitle}
      </h2>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{t.planIntro}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium">{t.regionLabel}</span>
          <select className={select} value={choice.regionId} onChange={(e) => update({ regionId: e.target.value })}>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {lang === "ar" ? r.nameAr : r.nameFr}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{t.cropLabel}</span>
          <select className={select} value={choice.cropId} onChange={(e) => update({ cropId: e.target.value })}>
            {CROPS.map((c) => (
              <option key={c.id} value={c.id}>
                {cropName(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">{t.lastIrrigLabel}</span>
          <select className={select} value={choice.ago} onChange={(e) => update({ ago: e.target.value })}>
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
        className={`mt-3 rounded-md px-3 py-2 text-sm ${state.online ? "bg-[#2f6b3a]/10 text-[#25562e] dark:text-[#9ccfa6]" : "bg-[#8a5a2b] font-medium text-white"}`}
      >
        {state.status === "no-data"
          ? `${t.offline} · ${t.noData}`
          : state.status === "too-old"
            ? t.tooOld
            : plan
              ? state.online
                ? t.onlineNote(ageText)
                : t.offlineNote(ageText)
              : "…"}
        {state.online && (
          <button type="button" onClick={() => void state.refresh()} disabled={state.refreshing} className="ms-3 underline disabled:opacity-50">
            {t.refresh}
          </button>
        )}
      </p>

      {plan && plan.confidence.askAPerson && (
        <p role="alert" className="mt-3 rounded-md border-2 border-[#b4701c] bg-[#fff4e0] px-3 py-2 text-sm font-semibold text-[#6b3d00] dark:bg-[#3a2a10] dark:text-[#ffd9a0]">
          ⚠ {t.askPerson}
        </p>
      )}

      {plan && (
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <pre dir="auto" className="whitespace-pre-wrap rounded-md bg-white/70 p-3 font-sans text-sm leading-6 dark:bg-neutral-900">
            {planMessage(plan, lang)}
          </pre>
          <div>
            <p className="mb-1 text-sm font-medium">{t.smsPreview}</p>
            <p dir="auto" className="rounded-md border border-neutral-400 bg-[#cdd9b2] p-3 font-mono text-[13px] leading-5 text-[#1d2814]">
              {sms}
            </p>
            <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
              {sms.length} · {t.smsCount(smsMeta.segments)}
            </p>
          </div>
        </div>
      )}
      <RainReport regionId={choice.regionId} />
    </section>
  );
}
