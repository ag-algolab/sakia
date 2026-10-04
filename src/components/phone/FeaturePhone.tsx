"use client";

// Téléphone à touches SIMULÉ. Le SMS du matin ARRIVE tout seul (enveloppe, « 1 nouveau message », petite secousse, aucun son),
// puis s'ouvre. On répond avec les touches seulement : chaque touche envoie un court SMS que le serveur comprend déjà
// (voir smsKeys.ts), à POST /api/sms/incoming, et le téléphone affiche la réponse du VRAI gestionnaire, telle quelle.
// Le texte du SMS du matin est celui que produit planSms (src/lib/messages.ts), calculé sur l'appareil avec la météo du jour :
// aucune phrase de conseil n'est écrite ici. Aucun vrai SMS, aucun vrai appel : tout reste dans le navigateur.

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CROPS } from "@/lib/crops";
import { planSms } from "@/lib/messages";
import type { Plan } from "@/lib/planCore";
import { REGIONS } from "@/lib/regions";
import Lcd, { Envelope, Handset } from "./Lcd";
import type { KeyDef, Msg, Screen } from "./Lcd";
import s from "./phone.module.css";
import { getSimNumber } from "./simNumber";
import { HELP_TEXT, SMS_LANGS, STOP_TEXT, asSent, languageText } from "./smsKeys";
import type { SmsLang } from "./smsKeys";
import { STRINGS } from "./strings";
import type { Strings, UiLang } from "./strings";
import type { PlanState } from "./usePlan";

export type SmsFeed = { status: PlanState["status"]; plan: Plan | null };

type Props = {
  lang: UiLang;
  regionId: string; // "" tant que la personne n'a pas choisi
  cropId: string;
  ago?: string; // dernier arrosage ("" = inconnu) : quand il change, le SMS du matin revient avec le plan recalculé
  feed: SmsFeed | null; // null tant que région et culture ne sont pas choisies
  onNeedChoice: () => void;
};

type LogLine = { id: number; dir: "out" | "in"; text: string; auto: boolean };

const TZ = "Africa/Tunis"; // l'heure affichée est celle d'un téléphone en Tunisie
const LOCALE: Record<UiLang, string> = { fr: "fr-FR", en: "en-GB", ar: "ar-TN-u-nu-latn" };
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const AUTO_ARRIVAL_MS = 2500; // le SMS arrive de lui-même peu après le choix
const ALERT_MS = 2300; // durée de « 1 nouveau message » avant l'ouverture du message
const RING_MS = 3400; // la sonnerie dure un moment, puis on « décroche »

// Minutes depuis minuit en Tunisie.
function tunisMinutes(ms: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(ms);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}
const hhmm = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

type SimClock = { base: number; at: number }; // minutes affichées à l'instant `at` (le 06:00 de la simulation)
const minutesNow = (now: number, sim: SimClock | null): number =>
  sim ? sim.base + Math.floor(Math.max(0, now - sim.at) / 60000) : now ? tunisMinutes(now) : 0;

function useNow(stepMs: number): number {
  const [now, setNow] = useState(0); // 0 avant l'hydratation : l'horloge de l'appareil n'existe pas côté serveur
  useEffect(() => {
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const tick = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(tick);
    };
  }, [stepMs]);
  return now;
}

// Touches utiles sur chaque écran (légende de l'écran, sous-titres des touches, liste à côté du téléphone).
function keysFor(screen: Screen, t: Strings): KeyDef[] {
  switch (screen.id) {
    case "msg":
      return [
        { key: "1", label: t.kHelp },
        { key: "2", label: t.kLang },
        { key: "3", label: t.kStop },
      ];
    case "lang":
      return [
        { key: "1", label: "Français" },
        { key: "2", label: "العربية" },
        { key: "3", label: "English" },
      ];
    case "stop":
      return [
        { key: "1", label: t.lcdYes },
        { key: "2", label: t.lcdNo },
      ];
    default:
      return [];
  }
}

export default function FeaturePhone({ lang, regionId, cropId, ago = "", feed, onNeedChoice }: Props) {
  const t = STRINGS[lang];
  const router = useRouter();
  const ready = regionId !== "" && cropId !== "";
  const now = useNow(10_000);

  const [screen, setScreen] = useState<Screen>({ id: "idle" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [stopped, setStopped] = useState(false);
  const [langChoice, setLangChoice] = useState<{ base: UiLang; lang: SmsLang } | null>(null);
  const [sim, setSim] = useState<SimClock | null>(null);
  const [shaking, setShaking] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [sid, setSid] = useState("");

  // Langue des SMS : celle de l'interface, tant que la personne n'en a pas choisi une autre avec la touche 3 sur CETTE langue d'interface.
  const smsLang: SmsLang = langChoice && langChoice.base === lang ? langChoice.lang : lang;

  const timers = useRef<Set<number>>(new Set());
  const busy = useRef(false); // un envoi est en cours : les touches attendent la réponse
  const serverLang = useRef<SmsLang | null>(null); // langue que le serveur a, croit-on, pour ce numéro ; null = inconnue
  const sidRef = useRef("");
  const logId = useRef(0);
  const msgsRef = useRef<Msg[]>([]);
  const startedFor = useRef("");
  const waiting = useRef(false); // le SMS attend que la météo arrive
  const inCall = useRef(false); // l'appel simulé sonne : l'arrivée automatique du SMS ne doit pas le couper
  const retry = useRef<{ kind: "reply"; text: string; isStop: boolean } | { kind: "lang"; to: SmsLang } | null>(null); // « Réessayer » rejoue le dernier envoi
  const live = useRef({ t, lang, smsLang, regionId, cropId, ago, ready, feed, now, sim, onNeedChoice });
  useEffect(() => {
    live.current = { t, lang, smsLang, regionId, cropId, ago, ready, feed, now, sim, onNeedChoice };
  });

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current.clear();
  }, []);
  useEffect(() => {
    const set = timers.current;
    return () => {
      set.forEach((id) => window.clearTimeout(id));
      set.clear();
    };
  }, []);

  useEffect(() => {
    const id = getSimNumber();
    sidRef.current = id;
    const tm = window.setTimeout(() => setSid(id), 0);
    return () => window.clearTimeout(tm);
  }, []);

  // ---------- messages ----------
  const addMsg = useCallback((kind: Msg["kind"], text: string, msgLang: SmsLang): Msg => {
    const L = live.current;
    const msg: Msg = { id: Math.random().toString(36).slice(2, 9), kind, text, lang: msgLang, time: hhmm(minutesNow(L.now, L.sim)) };
    msgsRef.current = [...msgsRef.current.slice(-19), msg];
    setMsgs(msgsRef.current);
    return msg;
  }, []);

  const openMsg = useCallback((id: string) => {
    const m = msgsRef.current.find((x) => x.id === id);
    setScreen({ id: "msg", msgId: id });
    if (m) setAnnounce(m.text);
  }, []);

  const goBack = useCallback(() => {
    const last = msgsRef.current[msgsRef.current.length - 1];
    if (last) openMsg(last.id);
    else setScreen({ id: "idle" });
  }, [openMsg]);

  // ---------- le SMS du matin ----------
  const deliverDaily = useCallback(() => {
    const L = live.current;
    const f = L.feed;
    if (!f || f.status === "loading") {
      waiting.current = true;
      setScreen({ id: "wait" });
      setAnnounce(L.t.lcdWaitingPlan);
      return;
    }
    if (f.status !== "ready" || !f.plan) {
      const text = f.status === "no-data" ? L.t.noData : f.status === "too-old" ? L.t.tooOld : L.t.lcdUnavailable;
      setScreen({ id: "notice", text });
      setAnnounce(text);
      return;
    }
    // le texte EST celui du service SMS : planSms, puis la même mise en forme (GSM, 160 caractères) que la réponse du serveur
    const text = asSent(planSms(f.plan, L.smsLang), L.smsLang);
    const msg = addMsg("daily", text, L.smsLang);
    setScreen({ id: "alert", msgId: msg.id });
    setAnnounce(L.t.srNewMessage);
    setShaking(true);
    later(() => setShaking(false), 900);
    later(() => openMsg(msg.id), ALERT_MS);
  }, [addMsg, later, openMsg]);
  const deliverDailyRef = useRef(deliverDaily);
  useEffect(() => {
    deliverDailyRef.current = deliverDaily;
  }, [deliverDaily]);

  const startMorning = useCallback(() => {
    const L = live.current;
    if (!L.ready) {
      L.onNeedChoice();
      return;
    }
    if (busy.current) return;
    clearTimers();
    waiting.current = false;
    startedFor.current = `${L.regionId}|${L.cropId}|${L.ago}`;
    setStopped(false);
    setScreen({ id: "idle" });
    // l'horloge du téléphone passe à 06:00 juste avant l'arrivée du SMS
    setSim({ base: 5 * 60 + 59, at: Date.now() });
    later(() => setSim({ base: 6 * 60, at: Date.now() }), 1000);
    later(() => deliverDailyRef.current(), 1700);
  }, [clearTimers, later]);
  const startMorningRef = useRef(startMorning);
  useEffect(() => {
    startMorningRef.current = startMorning;
  }, [startMorning]);

  // Peu après le choix de la région et de la culture (ou à l'arrivée sur la page avec un profil enregistré), le SMS arrive de lui-même ;
  // il revient quand le dernier arrosage change (le plan, et donc le SMS, en dépendent).
  useEffect(() => {
    if (!ready) return;
    const sig = `${regionId}|${cropId}|${ago}`;
    const id = window.setTimeout(() => {
      if (startedFor.current !== sig && !inCall.current) startMorningRef.current();
    }, AUTO_ARRIVAL_MS);
    return () => window.clearTimeout(id);
  }, [ready, regionId, cropId, ago]);

  // La météo arrive alors que le SMS l'attendait.
  const feedStatus = feed?.status ?? null;
  const feedPlan = feed?.plan ?? null;
  useEffect(() => {
    if (!waiting.current || feedStatus === null || feedStatus === "loading") return;
    waiting.current = false;
    later(() => deliverDailyRef.current(), 0);
  }, [feedStatus, feedPlan, later]);

  // ---------- échanges avec le serveur ----------
  const post = useCallback(async (text: string, auto: boolean): Promise<string> => {
    const push = (dir: LogLine["dir"], line: string) => setLog((l) => [...l.slice(-39), { id: ++logId.current, dir, text: line, auto }]);
    push("out", text);
    const res = await fetch("/api/sms/incoming", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: sidRef.current, text }),
      signal: AbortSignal.timeout(15000), // une requête qui ne répond pas ne doit pas bloquer le téléphone
    });
    if (!res.ok) throw new Error(`serveur ${res.status}`);
    const body = (await res.json()) as { reply?: unknown };
    if (typeof body.reply !== "string") throw new Error("réponse illisible");
    push("in", body.reply);
    return body.reply;
  }, []);

  // Une réponse arrive : elle s'affiche tout de suite comme un message (la personne l'attend).
  const receive = useCallback(
    (text: string, replyLang: SmsLang) => {
      const msg = addMsg("reply", text, replyLang);
      openMsg(msg.id);
    },
    [addMsg, openMsg],
  );

  // Envoie un SMS préparé par une touche. Le serveur répond dans la langue de la conversation : on la règle d'abord (« LANGUE EN »)
  // quand elle a changé ; en anglais on la règle à chaque fois, la mémoire du serveur pouvant avoir été remise à zéro.
  const sendReply = useCallback(
    async (text: string, isStop = false) => {
      if (busy.current) return;
      busy.current = true;
      clearTimers();
      const L = live.current;
      retry.current = { kind: "reply", text, isStop };
      setScreen({ id: "sending", text });
      setAnnounce(L.t.lcdSending);
      try {
        if (serverLang.current !== L.smsLang || L.smsLang === "en") {
          await post(languageText(L.smsLang, L.smsLang), true);
          serverLang.current = L.smsLang;
        }
        const reply = await post(text, false);
        if (isStop) {
          serverLang.current = null; // STOP efface la conversation côté serveur, langue comprise
          setStopped(true);
        }
        receive(reply, L.smsLang);
      } catch {
        setScreen({ id: "error", text });
        setAnnounce(`${L.t.lcdFailed}. ${L.t.lcdFailedWhy}`);
      } finally {
        busy.current = false;
      }
    },
    [clearTimers, post, receive],
  );

  // Touche 3 : le choix de langue est lui-même un SMS que le serveur comprend (« LANGUE EN »), sa réponse s'affiche.
  const chooseLang = useCallback(
    async (to: SmsLang) => {
      if (busy.current) return;
      busy.current = true;
      const L = live.current;
      const text = languageText(L.smsLang, to);
      retry.current = { kind: "lang", to };
      setScreen({ id: "sending", text });
      setAnnounce(L.t.lcdSending);
      try {
        const reply = await post(text, false);
        serverLang.current = to;
        setLangChoice({ base: L.lang, lang: to });
        receive(reply, to);
      } catch {
        setScreen({ id: "error", text });
        setAnnounce(`${L.t.lcdFailed}. ${L.t.lcdFailedWhy}`);
      } finally {
        busy.current = false;
      }
    },
    [post, receive],
  );

  // ---------- appel simulé ----------
  const answerCall = useCallback(() => {
    clearTimers();
    setScreen({ id: "ring", phase: "connecting" });
    setAnnounce(live.current.t.lcdConnecting);
    // l'appel démarre tout seul sur la ligne vocale simulée (même onglet : le son déjà autorisé par le clic reste autorisé)
    later(() => router.push("/call?call=1"), 900);
  }, [clearTimers, later, router]);

  const startCall = useCallback(() => {
    if (busy.current) return;
    clearTimers();
    waiting.current = false;
    inCall.current = true;
    setScreen({ id: "ring", phase: "ringing" });
    setAnnounce(live.current.t.lcdRinging);
    later(() => answerCall(), RING_MS);
  }, [answerCall, clearTimers, later]);

  const hangUp = useCallback(() => {
    clearTimers();
    waiting.current = false;
    inCall.current = false;
    setScreen({ id: "idle" });
  }, [clearTimers]);

  // ---------- touches ----------
  const press = (k: string) => {
    if (busy.current) return;
    switch (screen.id) {
      case "alert":
        clearTimers();
        openMsg(screen.msgId);
        return;
      case "msg":
        if (k === "1") void sendReply(HELP_TEXT[smsLang]);
        else if (k === "2") setScreen({ id: "lang" });
        else if (k === "3") setScreen({ id: "stop" });
        else if (k === "*") setScreen({ id: "idle" });
        return;
      case "lang": {
        const n = Number(k);
        if (n >= 1 && n <= SMS_LANGS.length) void chooseLang(SMS_LANGS[n - 1]);
        else if (k === "*") goBack();
        return;
      }
      case "stop":
        if (k === "1") void sendReply(STOP_TEXT[smsLang], true);
        else if (k === "2" || k === "*") goBack();
        return;
      case "notice":
      case "error":
        if (k === "*") setScreen({ id: "idle" });
        return;
      case "wait":
      case "ring":
        if (k === "*") hangUp();
        return;
      default:
        return;
    }
  };

  // « Réessayer » : rejoue le dernier envoi qui a échoué
  const retryLast = () => {
    const r = retry.current;
    if (!r) setScreen({ id: "idle" });
    else if (r.kind === "lang") void chooseLang(r.to);
    else void sendReply(r.text, r.isStop);
  };

  // Les deux touches sous l'écran : leur libellé s'affiche sur l'écran (une touche sans libellé ne fait rien).
  const lastMsg = msgs[msgs.length - 1] ?? null;
  const soft = ((): { left: string; right: string } => {
    switch (screen.id) {
      case "idle":
        if (!ready) return { left: "", right: "" };
        if (stopped) return { left: t.softResume, right: "" };
        return { left: lastMsg ? t.softMessages : "", right: "" };
      case "alert":
        return { left: t.softRead, right: "" };
      case "msg":
      case "notice":
      case "lang":
      case "stop":
        return { left: "", right: t.softBack };
      case "error":
        return { left: t.retry, right: t.softBack };
      case "ring":
        return { left: t.softAnswer, right: t.softDecline };
      default:
        return { left: "", right: "" };
    }
  })();
  const pressSoft = (side: "left" | "right") => {
    if (busy.current) return;
    switch (screen.id) {
      case "idle":
        if (side !== "left") return;
        if (stopped) setStopped(false);
        else if (lastMsg) openMsg(lastMsg.id);
        return;
      case "alert":
        if (side === "left") press("1");
        return;
      case "msg":
      case "notice":
        if (side === "right") setScreen({ id: "idle" });
        return;
      case "lang":
      case "stop":
        if (side === "right") goBack();
        return;
      case "error":
        if (side === "left") retryLast();
        else setScreen({ id: "idle" });
        return;
      case "ring":
        if (side === "left") answerCall();
        else hangUp();
        return;
      default:
        return;
    }
  };

  const shownScreen: Screen = ready || screen.id === "ring" ? screen : { id: "idle" };
  const shownMsg = "msgId" in shownScreen ? (msgs.find((m) => m.id === shownScreen.msgId) ?? null) : null;
  const keys = keysFor(shownScreen, t);
  const keyLabel = (k: string) => keys.find((x) => x.key === k)?.label ?? "";
  const ringing = shownScreen.id === "ring" && shownScreen.phase === "ringing";

  const crop = CROPS.find((c) => c.id === cropId);
  const region = REGIONS.find((r) => r.id === regionId);
  const cropName = crop ? (lang === "ar" ? crop.nameAr : lang === "en" ? crop.nameEn : crop.nameFr) : "";
  const regionName = region ? (lang === "ar" ? region.nameAr : region.nameFr) : "";

  const minutes = minutesNow(now, sim);
  const clock = now || sim ? hhmm(minutes) : "--:--";
  // une fois le SMS de 6 h demandé, l'horloge montre « demain matin » (le message, lui, est calculé maintenant)
  const dayMs = (now || 0) + (sim ? 86_400_000 : 0);
  const day = now ? new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(dayMs) : "";
  const dateLabel = sim && day ? `${t.lcdTomorrow} · ${day}` : day;

  const primary =
    "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-bold leading-tight focus-visible:outline-offset-2";

  return (
    <div className={s.layout}>
      {/* ---------- les deux actions ---------- */}
      <div className={s.areaActions}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-sakia-sand-dark bg-white p-3">
            <button
              type="button"
              onClick={startMorning}
              aria-describedby={ready ? undefined : "signup-status"}
              className={`${primary} ${ready ? "bg-sakia-green text-white hover:bg-sakia-green-deep" : "border-2 border-sakia-brown bg-sakia-sand text-sakia-ink"}`}
            >
              <Envelope className="h-5 w-auto shrink-0" />
              <span>{t.seeSms}</span>
            </button>
            <p className="mt-2 text-sm leading-snug text-sakia-brown">{t.seeSmsNote}</p>
          </div>
          <div className="rounded-2xl border border-sakia-sand-dark bg-white p-3">
            <button type="button" onClick={startCall} className={`${primary} border-2 border-sakia-green bg-white text-sakia-green hover:bg-sakia-green-light`}>
              <Handset className="h-5 w-5 shrink-0" />
              <span>{t.simCall}</span>
            </button>
            <p className="mt-2 text-sm leading-snug text-sakia-brown">{t.simCallNote}</p>
          </div>
        </div>
      </div>

      {/* ---------- le téléphone ---------- */}
      <div className={s.areaPhone}>
        <div
          className="mx-auto w-full max-w-[19.5rem]"
          dir="ltr"
          onKeyDown={(e) => {
            // au clavier : les chiffres, * et # agissent comme les touches du téléphone
            if (/^[0-9*#]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault();
              press(e.key);
            }
          }}
        >
          <div
            role="group"
            aria-label={t.phoneLabel}
            className={`${s.body} rounded-[2.4rem] p-4 pb-5 shadow-2xl ring-1 ring-black/60 ${shaking ? s.shake : ""} ${ringing ? s.ringShake : ""}`}
          >
            <div className="mb-2 flex flex-col items-center gap-1.5" aria-hidden="true">
              <span className="h-1.5 w-14 rounded-full bg-[#10130f]" />
              <span className="text-[0.6875rem] font-bold tracking-[0.4em] text-[#d5ddd6]">SAKIA</span>
            </div>

            <Lcd
              t={t}
              ready={ready}
              stopped={stopped}
              screen={shownScreen}
              msg={shownMsg}
              clock={clock}
              dateLabel={dateLabel}
              cropName={cropName}
              regionName={regionName}
              keys={keys}
              soft={soft}
            />

            {/* touches sous l'écran : gauche / droite, appel (vert) et fin (rouge) ; le rond du milieu n'est que décoratif */}
            <div className="mt-3 grid grid-cols-3 grid-rows-2 items-center gap-2">
              <button
                type="button"
                aria-label={soft.left || t.keyLeft}
                aria-disabled={soft.left ? undefined : true}
                onClick={() => pressSoft("left")}
                className={`${s.key} h-12 rounded-full text-sm font-bold`}
              >
                <span aria-hidden="true" className="mx-auto block h-1 w-5 rounded-full bg-[#c9d1cb]" />
              </button>
              <span aria-hidden="true" className="row-span-2 mx-auto flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full border-2 border-[#151917] bg-[#2d3330] shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)]">
                <span className="h-9 w-9 rounded-full border-2 border-[#4a524d] bg-[#3a413d]" />
              </span>
              <button
                type="button"
                aria-label={soft.right || t.keyRight}
                aria-disabled={soft.right ? undefined : true}
                onClick={() => pressSoft("right")}
                className={`${s.key} h-12 rounded-full text-sm font-bold`}
              >
                <span aria-hidden="true" className="mx-auto block h-1 w-5 rounded-full bg-[#c9d1cb]" />
              </button>
              <button
                type="button"
                aria-label={t.keyCall}
                onClick={() => (screen.id === "ring" ? answerCall() : startCall())}
                className={`${s.key} ${s.keyCall} flex h-12 items-center justify-center rounded-full`}
              >
                <Handset className="h-6 w-6 text-white" />
              </button>
              <button
                type="button"
                aria-label={t.keyEnd}
                onClick={() => (screen.id === "ring" ? hangUp() : press("*"))}
                className={`${s.key} ${s.keyEnd} flex h-12 items-center justify-center rounded-full`}
              >
                <Handset className="h-6 w-6 rotate-[135deg] text-white" />
              </button>
            </div>

            <div role="group" aria-label={t.keypadLabel} className="mt-3 grid grid-cols-3 gap-x-2 gap-y-2">
              {KEYS.map((k) => {
                const sub = keyLabel(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={sub ? `${k} ${sub}` : k}
                    className={`${s.key} ${sub ? s.keyOn : ""} flex h-12 flex-col items-center justify-center rounded-xl leading-none`}
                  >
                    <span className="text-lg font-semibold">{k}</span>
                    <span aria-hidden="true" className="mt-0.5 block max-w-full truncate px-1 text-[0.625rem] leading-3 text-[#e1e7e2]">
                      {sub || " "}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-2 text-center text-sm font-bold text-sakia-alert">{t.simBadge}</p>
        </div>
        <p role="status" className="sr-only">
          {announce}
        </p>
      </div>

      {/* ---------- ce que font les touches, ce qui est simulé, journal ---------- */}
      <div className={`${s.areaInfo} space-y-6`}>
        <section aria-labelledby="keys-title">
          <h2 id="keys-title" className="text-xl font-bold text-sakia-green">
            {t.keysTitle}
          </h2>
          <p className="mt-1 text-base leading-7">{t.keysIntro}</p>
          <ul className="mt-3 space-y-3">
            {(
              [
                ["1", t.kHelp, t.kHelpDesc, HELP_TEXT[smsLang]],
                ["2", t.kLang, t.kLangDesc, languageText(smsLang, "en")],
                ["3", t.kStop, t.kStopDesc, STOP_TEXT[smsLang]],
                ["*", t.softBack, t.kBackDesc, ""],
              ] as const
            ).map(([k, label, desc, example]) => (
              <li key={k} className="flex items-start gap-3">
                <kbd className="mt-0.5 inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-[#373e3a] px-2 font-mono text-base font-bold text-white">{k}</kbd>
                <div className="min-w-0">
                  <p className="text-base font-bold leading-tight">{label}</p>
                  <p className="text-sm leading-snug text-sakia-brown">{desc}</p>
                  {example && (
                    <p className="mt-0.5 text-sm leading-snug text-sakia-ink">
                      <code dir="auto" className="rounded bg-sakia-sand px-1.5 py-0.5 font-mono text-[0.8125rem]">
                        {example}
                      </code>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-2 text-sm leading-6 text-sakia-ink">
          <p>{t.simulatedDetail}</p>
          <p>{t.limitNote}</p>
          <p>{t.install}</p>
          <p className="font-semibold">{t.truth}</p>
        </div>

        <details className="rounded-xl border border-sakia-sand-dark bg-white p-3">
          <summary className="flex min-h-11 cursor-pointer select-none items-center text-base font-bold text-sakia-green">{t.logTitle}</summary>
          <p className="mt-1 text-sm leading-snug text-sakia-brown">{t.logIntro}</p>
          {sid && (
            <p className="mt-1 text-sm text-sakia-brown">
              {t.fakeNumber} : <code className="font-mono">{sid}</code>
            </p>
          )}
          {log.length === 0 ? (
            <p className="mt-2 text-sm">{t.logEmpty}</p>
          ) : (
            <ol className="mt-2 max-h-72 space-y-2 overflow-y-auto" tabIndex={0} aria-label={t.logTitle}>
              {log.map((l) => (
                <li key={l.id} className="text-sm leading-snug">
                  <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-xs font-bold ${l.dir === "out" ? "bg-sakia-ink text-white" : "bg-sakia-green-light text-sakia-green-deep"}`}>
                    {l.dir === "out" ? t.logOut : t.logIn}
                  </span>
                  {l.auto && <span className="mr-2 text-xs text-sakia-brown">({t.logAuto})</span>}
                  <span dir="auto" className="whitespace-pre-line break-words font-mono text-[0.8125rem]">
                    {l.text}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </details>
      </div>
    </div>
  );
}
