"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import Assumptions from "@/components/ui/Assumptions";
import { cropName, regionName } from "@/components/ui/catalog";
import CropArt from "@/components/ui/CropArt";
import CropPicker from "@/components/ui/CropPicker";
import { DropIcon, SproutIcon, WaterBarIcon } from "@/components/ui/icons";
import { useLang } from "@/components/ui/LangProvider";
import { CountUp, Reveal, useInView } from "@/components/ui/motion";
import Plant from "@/components/ui/Plant";
import { EMPTY_PROFILE, loadProfile, saveProfile } from "@/components/ui/profile";
import type { Profile } from "@/components/ui/profile";
import RegionPicker from "@/components/ui/RegionPicker";
import { CROPS } from "@/lib/crops";
import type { Crop } from "@/lib/crops";
import { REGIONS } from "@/lib/regions";
import type { Region } from "@/lib/regions";
import type { BacktestResult } from "@/lib/backtest";

// La preuve : onze saisons de météo OBSERVÉE rejouées, la façon habituelle (un arrosage tous les 7 jours, notre hypothèse de
// référence) contre l'arrosage conseillé par Sakia. Une simulation, pas une mesure de terrain.
// Région et culture viennent du MÊME profil que l'accueil (obligatoires, aucune valeur par défaut) ; tout chiffre vient de
// /api/backtest, rien n'est écrit à la main.

const OTHER_IDS = ["piment", "oignon", "pomme-de-terre", "tomate"];

type Other = { id: string; fixed: number; adaptive: number; saved: number };

export default function BacktestPage() {
  const { t, fmtNum } = useLang();
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [result, setResult] = useState<{ key: string; data?: BacktestResult; failed?: boolean } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    // Lu après l'hydratation : le serveur ne connaît pas le profil gardé sur l'appareil.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(loadProfile());
    setProfileLoaded(true);
  }, []);
  useEffect(() => {
    if (profileLoaded) saveProfile(profile);
  }, [profile, profileLoaded]);
  const onProfile = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), []);

  const { region, crop, soil, system } = profile;
  const ready = !!region && !!crop;
  const url = useCallback(
    (c: string) => `/api/backtest?region=${encodeURIComponent(region)}&crop=${encodeURIComponent(c)}&soil=${soil}&system=${system}`,
    [region, soil, system],
  );

  // La réponse est rangée sous la clé de la demande ; « en cours » = pas encore de réponse pour la clé courante. En attendant,
  // les chiffres de la demande précédente restent affichés, un peu pâles.
  const key = ready ? `${region}|${crop}|${soil}|${system}|${reload}` : "";
  const current = result && key !== "" && result.key === key ? result : null;
  const data = ready ? (current?.data ?? result?.data ?? null) : null;
  const loading = ready && current == null;
  const failed = !!current?.failed;
  const loaded = current?.data ?? null; // les chiffres de CE choix (et non ceux, pâles, du choix précédent)

  useEffect(() => {
    if (!key) return;
    const ctrl = new AbortController();
    fetch(url(crop), { signal: ctrl.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as BacktestResult;
      })
      .then((d) => setResult({ key, data: d }))
      .catch((e) => {
        if (e.name === "AbortError") return;
        setResult((prev) => ({ key, data: prev?.data, failed: true }));
      });
    return () => ctrl.abort();
  }, [key, crop, url]);

  const s = data?.summary;
  const maxMm = data ? Math.max(1, ...data.seasons.flatMap((x) => [x.fixed.grossMm, x.adaptive.grossMm])) : 1;
  const cropObj = CROPS.find((c) => c.id === crop);
  const regionObj = REGIONS.find((r) => r.id === region);
  const stressFixed = s?.meanStressDaysFixed ?? 0;
  const stressAdaptive = s?.meanStressDaysAdaptive ?? 0;
  const noStress = stressFixed < 0.5 && stressAdaptive < 0.5;
  const thirstFirst = stressFixed - stressAdaptive >= 10 && !(s && s.waterSavedPct >= 10);

  return (
    // Un seul repère <main> pour toute la page (bandeau et titre compris) : un lecteur d'écran saute directement au contenu.
    <main className="sk-type flex flex-1 flex-col">
      {/* Bandeau permanent : toujours visible, jamais masqué par un état de chargement. */}
      <div role="note" className="bg-sakia-alert-light px-4 py-3 text-center text-base font-extrabold text-sakia-alert">
        {t("proofBanner")}
      </div>

      {/* ---------- en-tête : un titre, une phrase, sur toute la largeur (la réserve « simulation » est dans le bandeau du haut) ---------- */}
      <section className="sk-hero-sky relative overflow-hidden px-4 pb-16 pt-7 text-white sm:pb-20">
        <div aria-hidden className="pointer-events-none absolute -end-10 top-4 h-44 w-44 rounded-full bg-sakia-sun/25 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <h1 className="font-display text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">{t("proofHeadline")}</h1>
          <p className="mt-3 text-pretty text-base leading-snug text-white/90 sm:text-lg">{t("proofSub")}</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-10 w-full max-w-5xl flex-1 space-y-6 px-4 pb-10 sm:-mt-12">
        {/* région et culture : les mêmes que sur l'accueil, obligatoires */}
        <div className="grid gap-4 rounded-3xl bg-white p-4 shadow-lg ring-1 ring-black/5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-lg font-bold text-sakia-ink">{t("qWhere")}</p>
            <RegionPicker value={region} onChange={(id) => onProfile({ region: id })} />
          </div>
          <div>
            <p className="mb-2 text-lg font-bold text-sakia-ink">{t("pickCrop")}</p>
            <CropPicker value={crop} onChange={(id) => onProfile({ crop: id, planting: "" })} />
          </div>
        </div>

        {!ready && profileLoaded && (
          <div className="rounded-3xl border-2 border-dashed border-sakia-sand-dark bg-white/60 p-6 text-center">
            <SproutIcon className="mx-auto h-12 w-12 text-sakia-green" />
            <p className="mt-2 text-lg font-bold text-sakia-brown">{t("proofPick")}</p>
          </div>
        )}

        {ready && loading && !data && <p className="py-10 text-center text-base text-sakia-brown">{t("loading")}</p>}

        {failed && (
          <div role="alert" className="rounded-2xl border border-sakia-alert bg-sakia-alert-light p-4 text-sakia-alert">
            <p className="font-semibold">{t("error")}</p>
            <button
              type="button"
              onClick={() => setReload((n) => n + 1)}
              className="mt-2 min-h-11 rounded-lg bg-sakia-alert px-4 font-semibold text-white"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {ready && data && s && (
          <div className={loading ? "space-y-6 opacity-60" : "space-y-6"} aria-busy={loading} key={`${region}-${crop}`}>
            {data.seasons.length === 0 ? (
              <p className="rounded-2xl bg-sakia-sand p-4 text-sakia-brown">{t("noSeasons")}</p>
            ) : (
              <>
                {/* comment lire : deux phrases, en mots simples */}
                <Reveal className="grid gap-2 rounded-3xl bg-sakia-sand p-4 text-sm font-semibold leading-snug text-sakia-brown sm:grid-cols-2">
                  <p className="flex items-start gap-2">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-sakia-sand-dark" />
                    {t("usualWayDef")}
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#2b8fd6]" />
                    {t("withSakiaDef")}
                  </p>
                </Reveal>

                {/* les deux chiffres clés : celui qui raconte le mieux l'histoire de cette culture passe en premier
                    (le piment : de 63 à 4 jours de soif, pour 3 % d'eau seulement ; l'olivier : 25 % d'eau, aucun jour de soif) */}
                <div className="grid gap-6 lg:grid-cols-2">
                  {thirstFirst ? (
                    <>
                      <ThirstTile stressFixed={stressFixed} stressAdaptive={stressAdaptive} noStress={noStress} cropObj={cropObj} regionObj={regionObj} />
                      <WaterTile s={s} />
                    </>
                  ) : (
                    <>
                      <WaterTile s={s} cropObj={cropObj} regionObj={regionObj} />
                      <ThirstTile stressFixed={stressFixed} stressAdaptive={stressAdaptive} noStress={noStress} />
                    </>
                  )}
                </div>

                {loaded && <OtherCrops key={`${region}|${crop}|${soil}|${system}`} crop={crop} url={url} />}

                {/* 4. rendement relatif estimé (si publié pour cette culture) */}
                {s.meanRelYieldAdaptive != null && s.meanRelYieldFixed != null && (
                  <Reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                    <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("relYield")}</h2>
                    <p className="text-sm text-sakia-brown">{t("relYieldSub")}</p>
                    <div className="mt-4 space-y-3" dir="ltr">
                      {[
                        { label: t("fixedLabel"), v: s.meanRelYieldFixed, color: "bg-sakia-sand-dark", d: 0 },
                        { label: t("adaptiveLabel"), v: s.meanRelYieldAdaptive, color: "bg-[#4aa263]", d: 250 },
                      ].map((bar) => (
                        <div key={bar.label} className="flex items-center gap-3">
                          <span className="w-28 shrink-0 text-xs font-semibold text-sakia-brown">{bar.label}</span>
                          <div className="h-5 flex-1 rounded-full bg-sakia-sand">
                            <div className={`sk-bar-x h-5 rounded-full ${bar.color}`} style={{ width: `${Math.max(2, bar.v * 100)}%`, ["--d" as string]: `${bar.d}ms` }} />
                          </div>
                          <span className="w-12 shrink-0 text-end text-sm font-extrabold">{fmtNum(bar.v * 100)} %</span>
                        </div>
                      ))}
                    </div>
                  </Reveal>
                )}

                {/* 5. eau pompée, saison par saison */}
                <section aria-labelledby="chart-title" className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                  <div className="flex items-center gap-2">
                    <WaterBarIcon className="h-6 w-6 text-sakia-water" />
                    <h2 id="chart-title" className="font-display text-2xl font-bold text-sakia-green-deep">
                      {t("chartTitle")}
                    </h2>
                  </div>
                  <div className="mt-2 flex gap-4 text-sm">
                    <Legend color="bg-sakia-sand-dark" label={t("fixedLabel")} />
                    <Legend color="bg-[#2b8fd6]" label={t("adaptiveLabel")} />
                  </div>
                  <ul
                    className="mt-4 space-y-3 lg:grid lg:grid-flow-col lg:grid-cols-2 lg:gap-x-10 lg:gap-y-3 lg:space-y-0"
                    style={{ gridTemplateRows: `repeat(${Math.ceil(data.seasons.length / 2)}, auto)` }}
                  >
                    {data.seasons.map((x, i) => (
                      <Reveal as="li" key={x.year} delay={Math.min(i, 6) * 40} className="grid grid-cols-[3rem_1fr] items-center gap-2">
                        <span className="text-sm font-bold text-sakia-ink" dir="ltr">
                          {x.year}
                        </span>
                        <div className="space-y-1" dir="ltr">
                          <Bar value={x.fixed.grossMm} max={maxMm} color="bg-sakia-sand-dark" unit={t("mm")} fmt={fmtNum} />
                          <Bar value={x.adaptive.grossMm} max={maxMm} color="bg-[#2b8fd6]" unit={t("mm")} fmt={fmtNum} delay={150} />
                        </div>
                      </Reveal>
                    ))}
                  </ul>
                </section>
              </>
            )}
            <Assumptions items={data.assumptions} />
          </div>
        )}

        <Link href="/" className="sk-press flex min-h-14 items-center justify-center rounded-2xl bg-sakia-green px-4 text-lg font-bold text-white shadow-md">
          {t("seeAdvice")}
        </Link>
      </div>
    </main>
  );
}

// Les autres cultures de la même région : là où la façon habituelle laisse le plus souffrir. Chaque culture est un calcul qui rejoue
// onze ans de météo : on ne les lance que quand la personne arrive à cette partie de la page (et une fois les chiffres de sa culture là).
function OtherCrops({ crop, url }: { crop: string; url: (c: string) => string }) {
  const { lang, t, fmtNum } = useLang();
  const [ref, seen] = useInView<HTMLDivElement>(0);
  const [others, setOthers] = useState<Other[]>([]);

  useEffect(() => {
    if (!seen) return;
    const ctrl = new AbortController();
    Promise.all(
      OTHER_IDS.filter((id) => id !== crop).map(async (id): Promise<Other | null> => {
        try {
          const r = await fetch(url(id), { signal: ctrl.signal });
          if (!r.ok) return null;
          const d = (await r.json()) as BacktestResult;
          if (!d.seasons.length) return null;
          return { id, fixed: d.summary.meanStressDaysFixed, adaptive: d.summary.meanStressDaysAdaptive, saved: d.summary.waterSavedPct };
        } catch {
          return null;
        }
      }),
    ).then((rows) => {
      if (ctrl.signal.aborted) return;
      // seulement celles où l'écart se voit (au moins 1 jour de soif de moins par saison), les plus marquées d'abord
      setOthers(rows.filter((r): r is Other => r != null && r.fixed - r.adaptive >= 1).sort((a, b) => b.fixed - a.fixed));
    });
    return () => ctrl.abort();
  }, [seen, crop, url]);

  const maxStress = useMemo(() => Math.max(1, ...others.map((o) => o.fixed)), [others]);

  return (
    <div ref={ref} className="min-h-px">
      {others.length > 0 && (
        <Reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
          <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("otherCrops")}</h2>
          <p className="text-sm text-sakia-brown">{t("otherCropsSub")}</p>
          <ul className="mt-4 grid gap-x-10 gap-y-4 lg:grid-cols-2">
            {others.map((o, i) => {
              const c = CROPS.find((x) => x.id === o.id);
              if (!c) return null;
              return (
                <li key={o.id} className="grid grid-cols-[3rem_1fr] items-center gap-3">
                  <CropArt id={o.id} className="h-12 w-12" />
                  <div>
                    <p className="flex items-baseline justify-between gap-2 text-base font-bold text-sakia-ink">
                      <span>{cropName(c, lang)}</span>
                      <span dir="ltr" className="text-base font-extrabold">
                        <span className="text-sakia-alert">{fmtNum(o.fixed, o.fixed < 10 ? 1 : 0)}</span>
                        <span className="mx-1 text-sakia-brown">→</span>
                        <span className="text-sakia-green">{fmtNum(o.adaptive, o.adaptive < 10 ? 1 : 0)}</span>
                      </span>
                    </p>
                    <div className="mt-1 space-y-1" dir="ltr">
                      <div className="h-2.5 rounded-full bg-sakia-sand">
                        <div className="sk-bar-x h-2.5 rounded-full bg-[#d2552a]" style={{ width: `${Math.max(2, (o.fixed / maxStress) * 100)}%`, ["--d" as string]: `${i * 100}ms` }} />
                      </div>
                      <div className="h-2.5 rounded-full bg-sakia-sand">
                        <div className="sk-bar-x h-2.5 rounded-full bg-[#4aa263]" style={{ width: `${Math.max(2, (o.adaptive / maxStress) * 100)}%`, ["--d" as string]: `${i * 100 + 200}ms` }} />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

        </Reveal>
      )}
    </div>
  );
}

function WaterTile({ s, cropObj, regionObj }: { s: BacktestResult["summary"]; cropObj?: Crop; regionObj?: Region }) {
  const { t, fmtNum } = useLang();
  return (
    <Reveal className="relative flex flex-col overflow-hidden rounded-3xl bg-sakia-green-deep p-6 text-white shadow-md">
      <DropIcon className="sk-sway pointer-events-none absolute -end-6 -top-6 h-44 w-44 text-white/[0.07]" />
      {cropObj && regionObj && <CropLine cropObj={cropObj} regionObj={regionObj} className="relative flex items-center gap-2 text-sm font-semibold text-white/80" />}
      <p className="font-display relative text-[5.5rem] font-extrabold leading-none text-[#7fc8f2] sm:text-[7rem]" dir="ltr">
        {Number.isFinite(s.waterSavedPct) ? <CountUp value={Math.max(0, s.waterSavedPct)} format={(n) => `−${fmtNum(n)} %`} /> : "–"}
      </p>
      <p className="relative mt-1 text-lg font-bold">{t("waterSaved")}</p>
      <p className="relative text-sm text-white/70">
        {t("waterSavedSub")} · {s.seasons} {t("seasons")}
      </p>
      <div className="relative mt-auto space-y-2 pt-5" dir="ltr">
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs font-semibold text-white/75">{t("fixedLabel")}</span>
          <div className="h-4 flex-1 rounded-full bg-white/10">
            <div className="sk-bar-x h-4 w-full rounded-full bg-sakia-sand-dark" />
          </div>
          <span className="w-16 shrink-0 text-end text-xs font-bold">
            {fmtNum(s.meanGrossFixed)} {t("mm")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-28 shrink-0 text-xs font-semibold text-white/75">{t("adaptiveLabel")}</span>
          <div className="h-4 flex-1 rounded-full bg-white/10">
            <div
              className="sk-bar-x h-4 rounded-full bg-[#4aa9e8]"
              style={{ width: `${s.meanGrossFixed > 0 ? (s.meanGrossAdaptive / s.meanGrossFixed) * 100 : 0}%`, ["--d" as string]: "250ms" }}
            />
          </div>
          <span className="w-16 shrink-0 text-end text-xs font-bold">
            {fmtNum(s.meanGrossAdaptive)} {t("mm")}
          </span>
        </div>
      </div>
    </Reveal>
  );
}

function ThirstTile({
  stressFixed,
  stressAdaptive,
  noStress,
  cropObj,
  regionObj,
}: {
  stressFixed: number;
  stressAdaptive: number;
  noStress: boolean;
  cropObj?: Crop; // seulement quand cette tuile passe en premier : elle porte alors la ligne « culture · région »
  regionObj?: Region;
}) {
  const { t, fmtNum } = useLang();
  return (
    <Reveal className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      {cropObj && regionObj && <CropLine cropObj={cropObj} regionObj={regionObj} className="mb-2 flex items-center gap-2 text-sm font-semibold text-sakia-brown" />}
      <h2 className="font-display text-2xl font-bold text-sakia-green-deep">{t("stressDays")}</h2>
      <p className="text-sm text-sakia-brown">{t("stressSub")}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-3 text-center ${stressFixed >= 10 ? "bg-sakia-alert-light text-sakia-alert" : "bg-sakia-sand text-sakia-brown"}`}>
          <Plant wilted={stressFixed >= 10} className="mx-auto h-28 w-28" />
          <p className="font-display text-4xl font-extrabold leading-none" dir="ltr">
            <CountUp value={stressFixed} format={(n) => fmtNum(n, n < 10 ? 1 : 0)} />
          </p>
          <p className="mt-1 text-xs font-bold">{t("fixedLabel")}</p>
        </div>
        <div className="rounded-2xl bg-sakia-green-light p-3 text-center text-sakia-green">
          <Plant wilted={false} className="mx-auto h-28 w-28" />
          <p className="font-display text-4xl font-extrabold leading-none" dir="ltr">
            <CountUp value={stressAdaptive} format={(n) => fmtNum(n, n < 10 ? 1 : 0)} />
          </p>
          <p className="mt-1 text-xs font-bold">{t("adaptiveLabel")}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-sm font-semibold text-sakia-brown">
        {noStress ? t("thirstyNone") : stressAdaptive < 0.5 ? t("plantNone") : t("plantStress", { n: fmtNum(stressAdaptive, 1) })}
      </p>
    </Reveal>
  );
}

function CropLine({ cropObj, regionObj, className }: { cropObj: Crop; regionObj: Region; className: string }) {
  const { lang } = useLang();
  return (
    <p className={className}>
      <CropArt id={cropObj.id} className="h-7 w-7" />
      {cropName(cropObj, lang)} · {regionName(regionObj, lang)}
    </p>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 font-semibold text-sakia-ink">
      <span className={`inline-block h-3 w-3 rounded-sm ${color}`} /> {label}
    </span>
  );
}

function Bar({
  value,
  max,
  color,
  unit,
  fmt,
  delay = 0,
}: {
  value: number;
  max: number;
  color: string;
  unit: string;
  fmt: (n: number, d?: number) => string;
  delay?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 flex-1 rounded-full bg-sakia-sand/70">
        <div className={`sk-bar-x h-4 rounded-full ${color}`} style={{ width: `${Math.max(1, (value / max) * 100)}%`, ["--d" as string]: `${delay}ms` }} />
      </div>
      <span className="w-16 text-end text-xs font-semibold text-sakia-ink">
        {fmt(value)} {unit}
      </span>
    </div>
  );
}
