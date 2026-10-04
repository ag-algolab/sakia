"use client";

// Page /call : faux téléphone à touches. Sous-titres dans la langue parlée (français ou arabe) et en anglais,
// transcription, source de la voix (en direct / enregistrement) dite en toutes lettres, garde-fou « pas sûr » en évidence.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useLang } from "@/components/ui/LangProvider";
import { getCrop } from "@/lib/crops";
import type { DemoItem } from "@/lib/ivr/demo";
import { KEYS } from "@/lib/ivr/flow";
import type { CallState, Key } from "@/lib/ivr/flow";
import { AGO_CHOICES, GROUPS, OTHER_REGIONS } from "@/lib/ivr/menu";
import { getRegion } from "@/lib/regions";
import { countCached, precache } from "./audioStore";
import { LOCALES, tr, uiLangOf } from "./strings";
import type { UiLang } from "./strings";
import { useIvrCall } from "./useIvrCall";
import type { Banner, Guard, Recordings, SourceMode } from "./useIvrCall";

export type CallStats = { promptCount: number; promptKb: number; planKb: number; voiceName: string };

const cropLabel = (id: string, ui: UiLang): string => {
  const c = getCrop(id);
  return c ? (ui === "ar" ? c.nameAr : ui === "en" ? c.nameEn : c.nameFr) : id;
};
const regionLabel = (id: string, ui: UiLang): string => {
  const r = getRegion(id);
  return r ? (ui === "ar" ? r.nameAr : r.nameFr) : id;
};

function hintsFor(state: CallState | null, ui: UiLang): { key: string; label: string }[] {
  const t = (k: string) => tr(ui, k);
  if (!state || state.node === "ended") return [];
  switch (state.node) {
    case "lang":
      return [{ key: "1", label: t("hint_lang_fr") }, { key: "2", label: t("hint_lang_ar") }];
    case "region":
      return [
        { key: "1", label: regionLabel("kairouan", ui) },
        { key: "2", label: t("hint_region_other") },
      ];
    case "region_list":
      return OTHER_REGIONS.map((id, i) => ({ key: String(i + 1), label: regionLabel(id, ui) }));
    case "group":
      return GROUPS.map((g, i) => ({ key: String(i + 1), label: t(`group_${g.id}`) }));
    case "crop":
      return (GROUPS.find((g) => g.id === state.groupId)?.crops ?? []).map((id, i) => ({ key: String(i + 1), label: cropLabel(id, ui) }));
    case "ago":
      return AGO_CHOICES.map((c) => ({ key: c.key, label: t(`ago_${c.key}`) }));
    case "plan":
    case "detail":
      return [{ key: "·", label: t("hint_skip") }];
    case "again":
      return [
        { key: "1", label: t("hint_again_yes") },
        { key: "2", label: t("hint_again_no") },
        { key: "3", label: t("hint_again_detail") },
      ];
  }
}

// Taille en mégaoctets : « 2.1 MB » en anglais, « 2,1 Mo » en français (l'arabe garde « Mo » : pas d'abréviation arabe nouvelle à faire valider).
const megabytes = (kb: number, ui: UiLang): string => {
  const n = (kb / 1024).toFixed(1);
  return ui === "en" ? `${n} MB` : ui === "fr" ? `${n.replace(".", ",")} Mo` : `${n} Mo`;
};

const mmss = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;

function BannerView({ banner, ui, demos }: { banner: Banner; ui: UiLang; demos: DemoItem[] }) {
  const t = (k: string, v?: Record<string, string | number>) => tr(ui, k, v);
  const date = (iso: string) => new Intl.DateTimeFormat(LOCALES[ui], { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  let text = "";
  let tone = "bg-sakia-water-light text-sakia-ink border-sakia-water";
  switch (banner.kind) {
    case "live":
      text = t("bannerLive", { date: date(banner.date) });
      break;
    case "cache":
      text = t("bannerCache", { date: date(banner.date) });
      break;
    case "rec":
      text = t("bannerRec", { date: date(banner.date) });
      tone = "bg-sakia-sand text-sakia-ink border-sakia-brown";
      break;
    case "novoice":
      text = t(banner.budget ? "bannerNoVoiceBudget" : "bannerNoVoice");
      tone = "bg-sakia-alert-light text-sakia-alert border-sakia-alert";
      break;
    case "norec":
      text = t("bannerNoRec", { list: recordedChoices(demos, ui) });
      tone = "bg-sakia-alert-light text-sakia-alert border-sakia-alert";
      break;
    case "error":
      text = t("bannerError");
      tone = "bg-sakia-alert-light text-sakia-alert border-sakia-alert";
      break;
  }
  return (
    <p role="status" className={`rounded-lg border px-3 py-2 text-base font-semibold ${tone}`}>
      {text}
    </p>
  );
}

// « touche 2 : Piment, Tomate… · touche 9 : Piment, Olivier »
function recordedChoices(demos: DemoItem[], ui: UiLang): string {
  const names = (ago: number | null) => [...new Set(demos.filter((d) => d.ago === ago).map((d) => cropLabel(d.crop, ui)))].join(", ");
  const parts: string[] = [];
  if (names(2)) parts.push(tr(ui, "recList2", { crops: names(2) }));
  if (names(null)) parts.push(tr(ui, "recList9", { crops: names(null) }));
  return parts.join(" · ");
}

function GuardView({ guard, ui }: { guard: Guard | null; ui: UiLang }) {
  const t = (k: string) => tr(ui, k);
  if (!guard) return <p className="text-base text-sakia-brown">{t("guardWaiting")}</p>;
  if (guard.level === "none") {
    return (
      <div className="rounded-lg border-2 border-sakia-alert bg-sakia-alert-light p-3 text-sakia-alert">
        <p className="text-lg font-bold">⚠ {t("guardNone")}</p>
        <Reasons reasons={guard.reasons} ui={ui} />
      </div>
    );
  }
  if (guard.askAPerson) {
    return (
      <div className="rounded-lg border-2 border-sakia-alert bg-sakia-alert-light p-3 text-sakia-alert">
        <p className="text-lg font-bold">⚠ {t("guardAsk")}</p>
        <Reasons reasons={guard.reasons} ui={ui} />
      </div>
    );
  }
  return <p className="rounded-lg border border-sakia-green bg-sakia-green-light px-3 py-2 text-base text-sakia-ink">{t("guardOk")}</p>;
}

function Reasons({ reasons, ui }: { reasons: string[]; ui: UiLang }) {
  if (reasons.length === 0) return null;
  return (
    <p className="mt-1 text-base">
      {tr(ui, "guardWhy")} {reasons.map((r) => tr(ui, `reason_${r}`)).join(" ; ")}
    </p>
  );
}

export default function CallPhone({ recordings, demos, stats, agentReady }: { recordings: Recordings; demos: DemoItem[]; stats: CallStats; agentReady: boolean }) {
  const { lang: siteLang } = useLang();
  const ui = uiLangOf(siteLang);
  const t = (k: string, v?: Record<string, string | number>) => tr(ui, k, v);
  const [mode, setMode] = useState<SourceMode>("auto");
  const c = useIvrCall({ recordings, demos, mode });

  // Arrivée depuis le téléphone à touches de /phone (« Simuler un appel », adresse /call?call=1) : l'appel démarre tout seul.
  // L'adresse redevient /call, pour qu'un rechargement ne relance pas un appel.
  const startCall = c.start;
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get("call") !== "1") return;
      window.history.replaceState(null, "", window.location.pathname);
      void startCall();
    } catch {
      // adresse illisible : l'appel se lance avec le bouton, comme d'habitude
    }
  }, [startCall]);

  // clavier : 0-9, * et # comme sur un téléphone
  const press = c.press;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      const type = (el as HTMLInputElement | null)?.type;
      if (tag === "TEXTAREA" || tag === "SELECT" || (tag === "INPUT" && type !== "radio" && type !== "checkbox")) return;
      if ((KEYS as string[]).includes(e.key)) press(e.key as Key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const active = c.phase === "active";
  const hints = hintsFor(c.call, ui);
  const status =
    c.phase === "ringing" ? t("ringing") : c.phase === "active" ? t("active") : c.phase === "ended" ? t("ended") : t("idleHint");
  const lastPlan = c.planView;

  // --- préparation du mode hors connexion
  const offlineUrls = useMemo(() => [...Object.values(recordings).map((r) => r.url), ...demos.flatMap((d) => [d.file, d.json])], [recordings, demos]);
  const offlineKb = useMemo(() => Math.round((Object.values(recordings).reduce((n, r) => n + r.bytes, 0) + demos.reduce((n, d) => n + d.bytes, 0)) / 1024), [recordings, demos]);
  const [prep, setPrep] = useState<{ state: "idle" | "running" | "done" | "partial"; done: number; kept: number }>({ state: "idle", done: 0, kept: 0 });
  useEffect(() => {
    let alive = true;
    countCached(offlineUrls).then((n) => {
      if (alive && n === offlineUrls.length && n > 0) setPrep({ state: "done", done: n, kept: n });
    });
    return () => {
      alive = false;
    };
  }, [offlineUrls]);
  const runPrep = async () => {
    setPrep({ state: "running", done: 0, kept: 0 });
    const { failed } = await precache(offlineUrls, (done) => setPrep((p) => ({ ...p, state: "running", done })));
    const kept = offlineUrls.length - failed;
    setPrep({ state: failed === 0 ? "done" : "partial", done: offlineUrls.length, kept });
  };

  return (
    <main dir={ui === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold text-sakia-green">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-lg">{t("intro")}</p>
      <p className="mt-2 max-w-3xl text-base text-sakia-brown">{t("stat")}</p>
      <p role="note" className="mt-3 max-w-3xl rounded-lg border border-sakia-green bg-sakia-green-light px-3 py-2 text-base text-sakia-ink">
        <strong className="block">{t("langOrderTitle")}</strong> {t("langOrder")}
      </p>
      <p role="note" className="mt-3 max-w-3xl rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base font-semibold text-sakia-alert">
        {t("simulated")}
      </p>

      <div className="mt-6 grid items-start gap-6 md:grid-cols-[22rem_1fr]">
        {/* ---------- le téléphone ---------- */}
        <section aria-label="Sakia" className="mx-auto w-full max-w-[22rem]" dir="ltr">
          <div className="rounded-[2rem] bg-[#1d2a22] p-3 shadow-xl">
            <div className="flex min-h-[21rem] flex-col rounded-2xl bg-[#eaf1e6] p-3 text-sakia-ink">
              <div className="flex items-center justify-between text-sm font-semibold text-sakia-green" dir={ui === "ar" ? "rtl" : "ltr"}>
                <span>{c.phase === "idle" ? "Sakia ☸" : status}</span>
                {c.phase !== "idle" && <span className="font-mono">{mmss(c.call?.elapsedMs ?? 0)}</span>}
              </div>

              <div aria-live="polite" className="mt-2 flex-1">
                {c.phase === "idle" && <p className="text-base" dir={ui === "ar" ? "rtl" : "ltr"}>{t("idleHint")}</p>}
                {c.phase === "ringing" && <p className="text-xl font-semibold">☎ {t("ringing")}</p>}
                {c.loadingPlan && (
                  <p className="text-lg font-semibold text-sakia-water-deep" dir={ui === "ar" ? "rtl" : "ltr"}>⏳ {t("loadingPlan")}</p>
                )}
                {!c.loadingPlan && c.now && c.phase !== "idle" && (
                  <div>
                    <p className="text-xl font-semibold leading-snug" lang="en" dir="ltr">
                      {c.now.en}
                    </p>
                    <p className="mt-2 border-t border-sakia-green/20 pt-2 text-lg text-sakia-brown" lang={c.now.lang} dir={c.now.lang === "ar" ? "rtl" : "ltr"}>
                      {c.now.text}
                    </p>
                  </div>
                )}
                {c.phase === "ended" && <p className="mt-2 text-base font-semibold" dir={ui === "ar" ? "rtl" : "ltr"}>{t("duration")} {mmss(c.call?.elapsedMs ?? 0)}</p>}
              </div>

              {active && (
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-sakia-green" dir={ui === "ar" ? "rtl" : "ltr"}>
                  {c.speaking ? (
                    <>
                      <span aria-hidden className="flex items-end gap-0.5">
                        <span className="h-3 w-1 animate-pulse rounded bg-sakia-green" />
                        <span className="h-5 w-1 animate-pulse rounded bg-sakia-green [animation-delay:150ms]" />
                        <span className="h-4 w-1 animate-pulse rounded bg-sakia-green [animation-delay:300ms]" />
                      </span>
                      {t("speaking")}
                    </>
                  ) : (
                    <>⌨ {t("listening")}</>
                  )}
                </div>
              )}
            </div>

            <div role="group" aria-label={t("keypad")} className="mt-3 grid grid-cols-3 gap-2">
              {(["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"] as Key[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={!active}
                  onClick={() => c.press(k)}
                  aria-label={k === "*" ? "*" : k === "#" ? "#" : k}
                  className="min-h-14 rounded-xl bg-white text-2xl font-semibold text-sakia-ink shadow disabled:opacity-40 enabled:hover:bg-sakia-green-light enabled:active:bg-sakia-green-light"
                >
                  {k}
                </button>
              ))}
            </div>

            <div className="mt-3">
              {c.phase === "idle" || c.phase === "ended" ? (
                <button type="button" onClick={c.start} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#1d7a3b] text-lg font-bold text-white hover:bg-[#17652f]">
                  <span aria-hidden>📞</span> {c.phase === "ended" ? t("callAgain") : t("callBtn")}
                </button>
              ) : (
                <button type="button" onClick={c.hangup} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#c43b2b] text-lg font-bold text-white hover:bg-[#a83123]">
                  <span aria-hidden>📵</span> {t("hangBtn")}
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-center text-sm text-sakia-brown" dir={ui === "ar" ? "rtl" : "ltr"}>
            {t("maxCall")} {t("alwaysKeys")}
          </p>
          {agentReady && (
            <p className="mt-3 text-center">
              <Link href="/call/talk" className="inline-flex min-h-11 items-center rounded-lg border border-sakia-green px-4 text-base font-semibold text-sakia-green hover:bg-sakia-green-light">
                🎙 {t("talkLink")}
              </Link>
            </p>
          )}
        </section>

        {/* ---------- à droite : aide, source, conseil, garde-fou, transcription ---------- */}
        <section className="space-y-4">
          {active && hints.length > 0 && (
            <div className="rounded-xl border border-sakia-sand-dark bg-white p-3">
              <h2 className="text-base font-bold text-sakia-green">{t("keysNow")}</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {hints.map((h) => (
                  <li key={`${h.key}-${h.label}`} className="flex items-center gap-2 rounded-lg bg-sakia-sand px-2 py-1 text-base">
                    <kbd className="rounded bg-white px-2 font-mono font-bold">{h.key}</kbd>
                    <span>{h.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-sakia-sand-dark bg-white p-3">
            <h2 id="call-source-title" className="text-base font-bold text-sakia-green">{t("sourceTitle")}</h2>
            {/* le vrai bouton radio couvre toute la ligne (transparent) : la zone à toucher fait au moins 44 px, le rond dessiné n'est que visuel */}
            <fieldset aria-labelledby="call-source-title" className="mt-2 space-y-1">
              {(
                [
                  ["auto", "sourceAuto"],
                  ["recorded", "sourceRec"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="relative flex min-h-11 cursor-pointer items-start gap-3 py-1.5 text-base">
                  <input
                    type="radio"
                    name="mode"
                    className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    checked={mode === value}
                    onChange={() => setMode(value)}
                  />
                  <span
                    aria-hidden="true"
                    className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-sakia-green bg-white peer-checked:bg-sakia-green peer-checked:shadow-[inset_0_0_0_3px_#fff] peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sakia-water-deep"
                  />
                  <span>{t(label)}</span>
                </label>
              ))}
            </fieldset>
            <p className={`mt-1 text-sm font-semibold ${c.online ? "text-sakia-green" : "text-sakia-alert"}`}>{c.online ? t("online") : t("offline")}</p>
            {mode === "recorded" && <p className="mt-1 text-sm text-sakia-brown">{t("bannerRecChoices", { list: recordedChoices(demos, ui) })}</p>}
          </div>

          <div className="space-y-2">
            {c.banner && <BannerView banner={c.banner} ui={ui} demos={demos} />}
            <div className="rounded-xl border border-sakia-sand-dark bg-white p-3">
              <h2 className="text-base font-bold text-sakia-green">{t("guardTitle")}</h2>
              <div className="mt-2">
                <GuardView guard={c.guard} ui={ui} />
              </div>
            </div>
          </div>

          {lastPlan && (
            <div className="rounded-xl border border-sakia-sand-dark bg-white p-3">
              <ol className="space-y-2">
                {lastPlan.lines.map((l, i) => (
                  <li key={l.id} className={`rounded-lg px-2 py-1 ${i === lastPlan.active ? "bg-sakia-green-light" : ""} ${l.id === "unsure" ? "border-l-4 border-sakia-alert bg-sakia-alert-light" : ""}`}>
                    <p className="text-lg" lang="en" dir="ltr">{l.en}</p>
                    <p className="text-base text-sakia-brown" lang={lastPlan.lang} dir={lastPlan.lang === "ar" ? "rtl" : "ltr"}>{l.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <details className="rounded-xl border border-sakia-sand-dark bg-white p-3" open={c.log.length > 0}>
            <summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-sakia-green">{t("transcript")}</summary>
            <ol tabIndex={0} aria-label={t("transcript")} className="mt-2 max-h-72 space-y-2 overflow-y-auto">
              {c.log.map((e) => (
                <li key={e.id} className="text-base">
                  {e.kind === "key" && <span className="rounded bg-sakia-sand px-2 py-0.5 font-mono">{t("youPressed", { k: e.key })}</span>}
                  {e.kind === "system" && <span className="italic text-sakia-brown">{t("noHang")}</span>}
                  {e.kind === "prompt" && (
                    <>
                      <span lang="en" dir="ltr" className="block">☸ {e.en}</span>
                      <span lang={e.lang} dir={e.lang === "ar" ? "rtl" : "ltr"} className="block text-sm text-sakia-brown">{e.text}</span>
                    </>
                  )}
                  {e.kind === "plan" && (
                    <>
                      <span lang="en" dir="ltr" className="block">☸ {e.lines.map((l) => l.en).join(" ")}</span>
                      <span lang={e.lang} dir={e.lang === "ar" ? "rtl" : "ltr"} className="block text-sm text-sakia-brown">{e.lines.map((l) => l.text).join(" ")}</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </section>
      </div>

      {/* ---------- hors connexion, branchement réel, ce qui est réel ---------- */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-sakia-sand-dark bg-white p-4">
          <h2 className="text-lg font-bold text-sakia-green">{t("prepTitle")}</h2>
          <p className="mt-1 text-base">{t("prepText", { n: offlineUrls.length, size: megabytes(offlineKb, ui) })}</p>
          <button
            type="button"
            onClick={runPrep}
            disabled={prep.state === "running"}
            className="mt-3 min-h-11 rounded-lg bg-sakia-green px-4 text-base font-semibold text-white disabled:opacity-60"
          >
            {t("prepBtn")}
          </button>
          <p role="status" className="mt-2 text-base font-semibold">
            {prep.state === "running" && t("prepRunning", { done: prep.done, total: offlineUrls.length })}
            {prep.state === "done" && t("prepDone", { n: prep.kept })}
            {prep.state === "partial" && t("prepPartial", { n: prep.kept, total: offlineUrls.length })}
          </p>
          <p className="mt-2 text-sm text-sakia-brown">{t("sizes", { n: stats.promptCount, kb: stats.promptKb, planKb: stats.planKb })}</p>
        </section>

        <section className="rounded-xl border border-sakia-sand-dark bg-white p-4">
          <h2 className="text-lg font-bold text-sakia-green">{t("realTitle")}</h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-base">
            <li>{t("real1")}</li>
            <li>{t("real2")}</li>
            <li>{t("real3")}</li>
            <li>{t("real4")}</li>
          </ul>
          <p className="mt-2 text-sm text-sakia-brown">{t("voiceFootnote", { voice: stats.voiceName })}</p>
        </section>

        <section className="rounded-xl border border-sakia-sand-dark bg-white p-4 md:col-span-2">
          <h2 className="text-lg font-bold text-sakia-green">{t("plugTitle")}</h2>
          <ol className="mt-2 list-decimal space-y-1 ps-5 text-base">
            <li>{t("plug1")}</li>
            <li>{t("plug2")}</li>
            <li>{t("plug3")}</li>
            <li>{t("plug4")}</li>
            <li>{t("plug5")}</li>
          </ol>
        </section>
      </div>
    </main>
  );
}
