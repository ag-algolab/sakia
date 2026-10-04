"use client";

// Page /call/talk : conversation vocale avec l'agent ElevenLabs. L'agent comprend ; le moteur calcule ; l'agent lit le résultat.
// Simple d'abord (demande d'Anthony, 4 oct. : « trop de texte, trop confus ») : un titre, une ligne, UN gros bouton rond. La conversation
// et la réponse n'apparaissent que lorsqu'elles existent ; « pourquoi l'IA », la mesure et les limites sont repliés en bas.
// Ce que l'agent a compris (culture, région, dernier arrosage) devient le champ de la personne sur tout le site.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MicIcon } from "@/components/ui/icons";
import { useLang } from "@/components/ui/LangProvider";
import { dateFromAgo, loadProfile, saveProfile, tunisToday } from "@/components/ui/profile";
import { getCrop } from "@/lib/crops";
import { digitsForDisplay } from "@/lib/voice/numberDisplay";
import { getRegion } from "@/lib/regions";
import { AgentCall } from "./agentClient";
import type { AgentEvent, AgentToolResult } from "./agentClient";
import { uiLangOf } from "./strings";
import type { UiLang } from "./strings";
import { tt } from "./talkStrings";

export type EvalSummary = { phrases: number; passed: number; plan_both_ok: string; plan_read_verbatim: string; median_ms_to_tool_call: number | null } | null;

type Line = { id: number; who: "you" | "agent"; text: string };
type Status = "idle" | "connecting" | "live" | "ended" | "error";

export default function Talk({ agentReady, evalSummary }: { agentReady: boolean; evalSummary: EvalSummary }) {
  const { lang: siteLang } = useLang();
  const ui: UiLang = uiLangOf(siteLang);
  const t = (k: string, v?: Record<string, string | number>) => tt(ui, k, v);
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");
  const [mic, setMic] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [tool, setTool] = useState<{ args: Record<string, unknown>; result: AgentToolResult } | null>(null);
  const [text, setText] = useState("");
  const [left, setLeft] = useState(120);
  const call = useRef<AgentCall | null>(null);
  const nextId = useRef(0);
  const logEnd = useRef<HTMLLIElement | null>(null);

  // Ce que l'agent a compris devient le champ de la personne sur tout le site (accueil, preuve, téléphone) : on change ses réglages
  // en PARLANT (décision d'Anthony, 4 oct. : sur un téléphone à touches on ne tape pas « olivier kairouan hier », on appelle et on le dit).
  const [saved, setSaved] = useState<{ crop: string; region: string } | null>(null);
  const remember = useCallback((r: AgentToolResult) => {
    if (!getCrop(r.crop_id) || !getRegion(r.region_id)) return;
    const prev = loadProfile();
    const ago = r.last_irrigation_days_ago;
    saveProfile({
      ...prev,
      region: r.region_id,
      crop: r.crop_id,
      planting: prev.crop === r.crop_id ? prev.planting : "",
      agoDate: ago != null ? dateFromAgo(String(Math.min(7, Math.max(0, Math.round(ago)))), tunisToday()) : prev.agoDate,
    });
    setSaved({ crop: r.crop_id, region: r.region_id });
  }, []);

  const onEvent = useCallback(
    (e: AgentEvent) => {
      if (e.type === "status") {
        setStatus(e.status);
        if (e.detail) setDetail(e.detail);
        if (e.mic !== undefined) setMic(e.mic);
      } else if (e.type === "user") setLines((l) => [...l, { id: ++nextId.current, who: "you", text: e.text }]);
      else if (e.type === "agent") setLines((l) => [...l, { id: ++nextId.current, who: "agent", text: e.text }]);
      else if (e.type === "tool") {
        setTool({ args: e.args, result: e.result });
        remember(e.result);
      } else if (e.type === "speaking") setSpeaking(e.value);
    },
    [remember],
  );

  useEffect(() => () => call.current?.stop(), []);
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);
  useEffect(() => {
    if (status !== "live") return;
    const end = Date.now() + 120_000;
    const id = window.setInterval(() => setLeft(Math.max(0, Math.round((end - Date.now()) / 1000))), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const start = () => {
    setLines([]);
    setTool(null);
    setDetail("");
    setLeft(120);
    const c = new AgentCall(onEvent);
    call.current = c;
    void c.start();
  };
  const stop = () => call.current?.stop();
  const send = (ev: React.FormEvent) => {
    ev.preventDefault();
    call.current?.sendText(text);
    setText("");
  };

  const cropName = (id: string) => {
    const c = getCrop(id);
    return c ? (ui === "ar" ? c.nameAr : ui === "fr" ? c.nameFr : c.nameEn) : id;
  };
  const regionName = (id: string) => {
    const r = getRegion(id);
    return r ? (ui === "ar" ? r.nameAr : r.nameFr) : id;
  };
  const active = status === "connecting" || status === "live";
  const ago = tool?.result.last_irrigation_days_ago;
  const agoText = ago == null ? t("unknownIrrigation") : ago === 0 ? t("today") : ago === 1 ? t("dayAgo") : t("daysAgo", { n: ago });
  const answerLang = tool?.result.language ?? "en";

  return (
    <main dir={ui === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* d'où l'on vient et comment repartir : cette page n'est pas dans le menu (Anthony, 4 oct. : « on ne sait pas où on est arrivé ») */}
      <Link href="/" className="inline-flex min-h-11 items-center gap-1.5 text-base font-bold text-sakia-water-deep underline-offset-2 hover:underline">
        <span aria-hidden className="inline-block rtl:-scale-x-100">←</span> {t("backHome")}
      </Link>
      {/* ---------- un titre, une ligne, un gros bouton ---------- */}
      <div className="flex flex-col items-center text-center">
        <h1 className="font-display text-3xl font-bold text-sakia-green-deep sm:text-4xl">{t("title")}</h1>
        <p className="mt-2 max-w-xl text-lg text-sakia-ink">{t("intro")}</p>

        {!agentReady && <p className="mt-4 rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 font-semibold text-sakia-alert">{t("noAgent")}</p>}

        {!active ? (
          <button
            type="button"
            onClick={start}
            disabled={!agentReady}
            className="sk-press mt-6 flex h-36 w-36 flex-col items-center justify-center gap-1 rounded-full bg-gradient-to-br from-[#4aa263] via-sakia-green to-sakia-green-deep text-white shadow-[0_12px_28px_-8px_rgba(18,53,36,0.7)] ring-4 ring-white disabled:opacity-50"
          >
            <MicIcon className="h-14 w-14" />
            <span className="text-base font-bold">{status === "ended" || status === "error" ? t("again") : t("start")}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="sk-press mt-6 flex h-36 w-36 flex-col items-center justify-center gap-1 rounded-full bg-[#c43b2b] text-white shadow-[0_12px_28px_-8px_rgba(120,30,20,0.7)] ring-4 ring-white"
          >
            <span aria-hidden className="text-4xl leading-none">■</span>
            <span className="text-base font-bold">{t("stop")}</span>
          </button>
        )}

        <p role="status" aria-live="polite" className="mt-3 min-h-7 text-lg font-semibold text-sakia-green-deep">
          {status === "connecting" && t("connecting")}
          {status === "live" && (speaking ? `🔊 ${t("speaking")}` : mic ? `🎙 ${t("live")}` : t("liveNoMic"))}
          {status === "live" && <span className="ms-3 font-mono text-base text-sakia-brown">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>}
          {status === "ended" && t("ended")}
        </p>
        {status === "error" && (
          <p className="mt-2 rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base text-sakia-alert">
            <strong>{t("errorTitle")}</strong> {detail}
          </p>
        )}
      </div>

      {/* ---------- la conversation, quand elle existe ---------- */}
      {(lines.length > 0 || status === "live") && (
        <section className="mt-6 rounded-2xl border border-sakia-sand-dark bg-white p-3">
          <ol tabIndex={0} aria-label={t("title")} className="max-h-72 space-y-2 overflow-y-auto">
            {lines.map((l) => (
              <li key={l.id} className={`rounded-lg px-3 py-2 text-lg ${l.who === "you" ? "ms-8 bg-sakia-sand" : "me-8 bg-sakia-green-light"}`}>
                <span className="block text-xs font-bold uppercase tracking-wide text-sakia-brown">{l.who === "you" ? t("you") : t("agent")}</span>
                <span dir="auto">{digitsForDisplay(l.text)}</span>
              </li>
            ))}
            <li ref={logEnd} aria-hidden />
          </ol>
          {status === "live" && (
            <form onSubmit={send} className="mt-3 flex gap-2">
              <label className="sr-only" htmlFor="talk-text">{t("typeLabel")}</label>
              <input
                id="talk-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t("typePlaceholder")}
                className="min-h-11 flex-1 rounded-lg border border-sakia-sand-dark px-3 text-base"
                dir="auto"
              />
              <button type="submit" className="min-h-11 rounded-lg bg-sakia-green px-4 text-base font-semibold text-white">{t("send")}</button>
            </form>
          )}
        </section>
      )}

      {/* ---------- la réponse : ce qui a été compris, la réponse du moteur, le champ enregistré ---------- */}
      {tool && (
        <section className="mt-4 space-y-3 rounded-2xl border border-sakia-sand-dark bg-white p-4">
          <p className="flex flex-wrap gap-2 text-base font-bold">
            <span className="rounded-full bg-sakia-sand px-3 py-1">{cropName(tool.result.crop_id)}</span>
            <span className="rounded-full bg-sakia-sand px-3 py-1">{regionName(tool.result.region_id)}</span>
            <span className="rounded-full bg-sakia-water-light px-3 py-1 text-sakia-water-deep">{agoText}</span>
          </p>
          <p className="text-lg" lang="en" dir="ltr">
            {tool.result.english_text}
          </p>
          {tool.result.spoken_text !== tool.result.english_text && (
            <p className="text-base text-sakia-brown" lang={answerLang} dir={answerLang === "ar" ? "rtl" : "ltr"}>
              {digitsForDisplay(tool.result.spoken_text)}
            </p>
          )}
          {tool.result.ask_a_person && <p className="rounded-lg border-2 border-sakia-alert bg-sakia-alert-light p-2 font-bold text-sakia-alert">⚠ {t("guardAsk")}</p>}
          {saved && (
            <p role="status" className="rounded-lg bg-sakia-green p-3 text-base font-bold text-white">
              ✓ {t("fieldSaved", { crop: cropName(saved.crop), region: regionName(saved.region) })}{" "}
              <Link href="/" className="underline underline-offset-2">
                {t("seePlan")}
              </Link>
            </p>
          )}
        </section>
      )}

      {/* ---------- le reste, replié ---------- */}
      <details className="mt-8 rounded-2xl border border-sakia-sand-dark bg-white p-4">
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-sakia-green">{t("moreTitle")}</summary>
        <div className="mt-2 space-y-3 text-base text-sakia-ink">
          <p>{t("whyAi")}</p>
          {evalSummary && (
            <p>
              {t("measured", {
                passed: evalSummary.passed,
                n: evalSummary.phrases,
                both: evalSummary.plan_both_ok,
                verbatim: evalSummary.plan_read_verbatim,
                ms: evalSummary.median_ms_to_tool_call ?? "?",
              })}
            </p>
          )}
          <p className="text-sm text-sakia-brown">{t("limits")}</p>
          <p className="text-sm text-sakia-brown">{t("maxCall")}</p>
          <Link href="/call" className="inline-flex min-h-11 items-center font-semibold text-sakia-water-deep underline">
            ← {t("backToKeypad")}
          </Link>
        </div>
      </details>
    </main>
  );
}
