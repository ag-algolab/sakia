"use client";

// Page /call/talk : conversation vocale avec l'agent ElevenLabs. L'agent comprend ; le moteur calcule ; l'agent lit le résultat.
// Le panneau « ce que l'agent a compris » montre ce qui a été passé au moteur (culture, région, dernier arrosage) et la réponse
// du moteur avec son sous-titre anglais, ainsi que le garde-fou « pas sûr ».

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLang } from "@/components/ui/LangProvider";
import { getCrop } from "@/lib/crops";
import { getRegion } from "@/lib/regions";
import { AgentCall } from "./agentClient";
import type { AgentEvent, AgentToolResult } from "./agentClient";
import { tr, uiLangOf } from "./strings";
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

  const onEvent = useCallback((e: AgentEvent) => {
    if (e.type === "status") {
      setStatus(e.status);
      if (e.detail) setDetail(e.detail);
      if (e.mic !== undefined) setMic(e.mic);
    } else if (e.type === "user") setLines((l) => [...l, { id: ++nextId.current, who: "you", text: e.text }]);
    else if (e.type === "agent") setLines((l) => [...l, { id: ++nextId.current, who: "agent", text: e.text }]);
    else if (e.type === "tool") setTool({ args: e.args, result: e.result });
    else if (e.type === "speaking") setSpeaking(e.value);
  }, []);

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

  return (
    <main dir={ui === "ar" ? "rtl" : "ltr"} className="mx-auto w-full max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-bold text-sakia-green">{t("title")}</h1>
      <p className="mt-2 max-w-3xl text-lg">{t("intro")}</p>
      <p className="mt-2 max-w-3xl text-base text-sakia-brown">{t("whyAi")}</p>
      <p role="note" className="mt-3 max-w-3xl rounded-lg border border-sakia-green bg-sakia-green-light px-3 py-2 text-base">
        <strong className="block">{tr(ui, "langOrderTitle")}</strong> {t("langOrder")}
      </p>

      {!agentReady && <p className="mt-4 rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 font-semibold text-sakia-alert">{t("noAgent")}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!active ? (
          <button type="button" onClick={start} disabled={!agentReady} className="min-h-12 rounded-xl bg-[#1d7a3b] px-6 text-lg font-bold text-white hover:bg-[#17652f] disabled:opacity-50">
            🎙 {status === "ended" || status === "error" ? t("again") : t("start")}
          </button>
        ) : (
          <button type="button" onClick={stop} className="min-h-12 rounded-xl bg-[#c43b2b] px-6 text-lg font-bold text-white hover:bg-[#a83123]">
            📵 {t("stop")}
          </button>
        )}
        <p role="status" className="text-base font-semibold" aria-live="polite">
          {status === "connecting" && t("connecting")}
          {status === "live" && (speaking ? `🔊 ${t("speaking")}` : mic ? `🎙 ${t("live")}` : t("liveNoMic"))}
          {status === "live" && <span className="ms-3 font-mono text-sakia-brown">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</span>}
          {status === "ended" && t("ended")}
        </p>
      </div>
      <p className="mt-1 text-sm text-sakia-brown">{t("maxCall")}</p>
      {status === "error" && (
        <p className="mt-3 rounded-lg border border-sakia-alert bg-sakia-alert-light px-3 py-2 text-base text-sakia-alert">
          <strong>{t("errorTitle")}</strong> {detail}
        </p>
      )}

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-sakia-sand-dark bg-white p-3">
          <ol tabIndex={0} aria-label={t("title")} className="max-h-80 space-y-2 overflow-y-auto">
            {lines.length === 0 && <li className="text-base text-sakia-brown">{t("waiting")}</li>}
            {lines.map((l) => (
              <li key={l.id} className={`rounded-lg px-3 py-2 text-lg ${l.who === "you" ? "bg-sakia-sand" : "bg-sakia-green-light"}`}>
                <span className="block text-xs font-bold uppercase tracking-wide text-sakia-brown">{l.who === "you" ? t("you") : t("agent")}</span>
                <span dir="auto">{l.text}</span>
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

        <section className="rounded-xl border border-sakia-sand-dark bg-white p-3">
          <h2 className="text-base font-bold text-sakia-green">{t("understoodTitle")}</h2>
          {!tool ? (
            <p className="mt-2 text-base text-sakia-brown">{t("waiting")}</p>
          ) : (
            <div className="mt-2 space-y-2 text-base">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <dt className="font-semibold">{t("crop")}</dt>
                <dd>{cropName(tool.result.crop_id)}</dd>
                <dt className="font-semibold">{t("region")}</dt>
                <dd>{regionName(tool.result.region_id)}</dd>
                <dt className="font-semibold">{t("lastIrrigation")}</dt>
                <dd>{ago == null ? t("unknownIrrigation") : ago === 0 ? t("today") : ago === 1 ? t("dayAgo") : t("daysAgo", { n: ago })}</dd>
                <dt className="font-semibold">{t("spokenLanguage")}</dt>
                <dd>{tool.result.language === "ar" ? "العربية" : "Français"}</dd>
              </dl>
              <div>
                <h3 className="text-sm font-bold text-sakia-brown">{t("engineAnswer")}</h3>
                <p className="mt-1 text-lg" lang="en" dir="ltr">{tool.result.english_text}</p>
                <p className="mt-1 text-base text-sakia-brown" lang={tool.result.language} dir={tool.result.language === "ar" ? "rtl" : "ltr"}>{tool.result.spoken_text}</p>
              </div>
              {tool.result.ask_a_person ? (
                <p className="rounded-lg border-2 border-sakia-alert bg-sakia-alert-light p-2 font-bold text-sakia-alert">⚠ {t("guardAsk")}</p>
              ) : (
                <p className="rounded-lg border border-sakia-green bg-sakia-green-light p-2">{t("guardOk")}</p>
              )}
            </div>
          )}
        </section>
      </div>

      {evalSummary && (
        <section className="mt-5 rounded-xl border border-sakia-sand-dark bg-white p-4">
          <h2 className="text-lg font-bold text-sakia-green">{t("measuredTitle")}</h2>
          <p className="mt-1 text-base">
            {t("measured", {
              passed: evalSummary.passed,
              n: evalSummary.phrases,
              both: evalSummary.plan_both_ok,
              verbatim: evalSummary.plan_read_verbatim,
              ms: evalSummary.median_ms_to_tool_call ?? "?",
            })}
          </p>
        </section>
      )}
      <p className="mt-4 text-sm text-sakia-brown">{t("limits")}</p>
      <p className="mt-3">
        <Link href="/call" className="inline-flex min-h-11 items-center font-semibold text-sakia-water-deep underline">← {t("backToKeypad")}</Link>
      </p>
    </main>
  );
}
