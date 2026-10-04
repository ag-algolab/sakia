"use client";

// Chat Telegram intégré à la page /telegram. Le VRAI code du bot tourne sur notre serveur (POST /api/telegram/sim) :
// pas de compte Telegram, rien n'est envoyé à Telegram, rien n'est gardé côté serveur.
// L'état vit ici : bulles dans React, copie dans localStorage, et « abonné » renvoyé au serveur à chaque appel.
// Les boutons renvoient leur callback_data tel quel, comme Telegram ; « edit » remplace la bulle du bouton pressé.

import { useCallback, useEffect, useRef, useState } from "react";
import { isArabic } from "@/components/ui/i18n";
import { RetryIcon } from "@/components/ui/icons";
import { useLang } from "@/components/ui/LangProvider";
import SakiaLogo from "@/components/ui/SakiaLogo";
import type { SimMessage } from "@/lib/telegram/sim";
import type { Subscriber } from "@/lib/telegram/store";
import type { InlineKeyboard } from "@/lib/telegram/types";
import { ChevronDownIcon, SendIcon } from "./icons";
import { STRINGS } from "./strings";

export type Welcome = { text: string; markup: InlineKeyboard };

type Bubble = { id: number; who: "bot" | "me"; text: string; markup?: InlineKeyboard };
type Req = { update: object; pressed?: { id: number; data: string }; focusBubble?: number; expectReply: boolean };
type NoticeKind = "busy" | "tooMany" | "offline" | "timeout";
type Notice = { kind: NoticeKind; req: Req };
type Reply = { ok: true; messages: SimMessage[]; subscriber: Subscriber | null } | { ok: false; kind: NoticeKind; dropSubscriber?: boolean };

const STORE = "sakia.telegram.v1";
const MAX_BUBBLES = 60;
const MAX_TEXT = 200; // même plafond que le serveur
const TYPING_MIN = 400; // « Sakia écrit… » entre deux messages du bot : 400 à 700 ms
const TYPING_RANGE = 300;
const TOAST_MS = 2800;
const FETCH_MS = 25_000;
const FAKE_CHAT = { id: 1, type: "private" }; // le serveur fabrique ses propres identifiants : ceux-ci ne servent à rien

// ---------- lecture prudente de ce qui vient du stockage ou du serveur ----------

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function isKeyboard(x: unknown): x is InlineKeyboard {
  return (
    isObj(x) &&
    Array.isArray(x.inline_keyboard) &&
    x.inline_keyboard.length <= 40 &&
    x.inline_keyboard.every((row) => Array.isArray(row) && row.length <= 8 && row.every((b) => isObj(b) && typeof b.text === "string" && typeof b.callback_data === "string"))
  );
}

const isBubble = (x: unknown): x is Bubble =>
  isObj(x) && Number.isSafeInteger(x.id) && (x.who === "bot" || x.who === "me") && typeof x.text === "string" && (x.markup === undefined || isKeyboard(x.markup));

const isSub = (x: unknown): x is Subscriber =>
  isObj(x) && (x.lang === "fr" || x.lang === "ar" || x.lang === "en") && typeof x.region_id === "string" && typeof x.crop_id === "string" && typeof x.soil === "string" && typeof x.system === "string" && typeof x.daily_bulletin === "boolean" && (x.last_irrigation === null || typeof x.last_irrigation === "string");

const isSimMessage = (x: unknown): x is SimMessage =>
  isObj(x) && (x.kind === "send" || x.kind === "edit" || x.kind === "answer" || x.kind === "audio") && typeof x.text === "string" && (x.markup === undefined || isKeyboard(x.markup)) && (x.messageId === undefined || Number.isSafeInteger(x.messageId));

function readSaved(): { bubbles: Bubble[]; subscriber: Subscriber | null; next: number } | null {
  try {
    const d: unknown = JSON.parse(localStorage.getItem(STORE) ?? "null");
    if (!isObj(d) || d.v !== 1 || !Array.isArray(d.bubbles) || d.bubbles.length === 0 || !d.bubbles.every(isBubble)) return null;
    const bubbles = d.bubbles.slice(-MAX_BUBBLES);
    const top = Math.max(...bubbles.map((b) => b.id));
    return { bubbles, subscriber: isSub(d.subscriber) ? d.subscriber : null, next: typeof d.next === "number" && Number.isSafeInteger(d.next) && d.next > top ? d.next : top };
  } catch {
    return null; // stockage illisible ou bloqué : on repart d'une conversation neuve
  }
}

// ---------- appel du serveur ----------

async function callSim(update: object, subscriber: Subscriber | null, ctl: AbortController): Promise<Reply> {
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, FETCH_MS);
  try {
    const res = await fetch("/api/telegram/sim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update, subscriber }),
      signal: ctl.signal,
      cache: "no-store",
    });
    if (res.status === 429) return { ok: false, kind: "tooMany" };
    if (res.status === 504) return { ok: false, kind: "timeout" };
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok || !isObj(data)) return { ok: false, kind: "busy", dropSubscriber: isObj(data) && data.error === "invalid_subscriber" };
    if (!Array.isArray(data.messages) || !data.messages.every(isSimMessage)) return { ok: false, kind: "busy" };
    return { ok: true, messages: data.messages, subscriber: isSub(data.subscriber) ? data.subscriber : null };
  } catch {
    return { ok: false, kind: timedOut ? "timeout" : typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "busy" };
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Défilement doux sauf si la personne a demandé « réduire les animations ».
const smoothOk = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- affichage ----------

// Langue d'un message du bot (arabe, français ou anglais), pour que le lecteur d'écran prenne la bonne voix même quand
// la page est dans une autre langue. Repère simple : les messages du bot sont des modèles fixes.
function langOf(text: string): "ar" | "fr" | "en" {
  const arabic = (text.match(/\p{Script=Arabic}/gu) ?? []).length;
  const latin = (text.match(/\p{Script=Latin}/gu) ?? []).length;
  if (arabic > latin) return "ar";
  return /[àâçéèêëîïôùûü]|\b(le|la|les|des|une?|vous|votre|dans|pour|avec|quelle?|il|elle|je|ne|pas|de|du|et|ou|aujourd|mettre|changer)\b/i.test(text) ? "fr" : "en";
}

function Keyboard({
  id,
  kb,
  locked,
  pending,
  onPress,
}: {
  id: number;
  kb: InlineKeyboard;
  locked: boolean;
  pending: string | null;
  onPress: (id: number, data: string, viaKeyboard: boolean) => void;
}) {
  return (
    <div className="mt-1 flex w-full flex-col gap-1">
      {kb.inline_keyboard.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((btn, c) => (
            <button
              key={c}
              type="button"
              aria-disabled={locked || undefined}
              // e.detail vaut 0 quand le clic vient du clavier (Entrée, Espace) : on rend alors le focus à la conversation
              onClick={(e) => {
                if (!locked) onPress(id, btn.callback_data, e.detail === 0);
              }}
              className={`sk-press relative flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-center text-[1rem] font-semibold leading-tight shadow-sm ring-1 ring-black/10 aria-disabled:cursor-wait ${
                pending === btn.callback_data ? "bg-sakia-green text-white" : "bg-white text-sakia-green-deep hover:bg-sakia-green-light aria-disabled:opacity-60"
              }`}
            >
              {/* roue d'attente dans le coin : elle ne pousse pas le texte du bouton */}
              {pending === btn.callback_data && (
                <span aria-hidden className="absolute start-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
              )}
              <span dir="auto" lang={langOf(btn.text)} className="min-w-0 [overflow-wrap:anywhere]">
                {btn.text}
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function TelegramChat({ welcome, labelledBy }: { welcome: Welcome; labelledBy?: string }) {
  const { lang } = useLang();
  const s = STRINGS[lang];
  const pageDir = isArabic(lang) ? "rtl" : "ltr";
  const code = lang === "fr" ? "fr" : lang === "en" ? "en" : "ar"; // langue « Telegram » de la personne : celle du site

  const [bubbles, setBubbles] = useState<Bubble[]>(() => [{ id: 1, who: "bot", text: welcome.text, markup: welcome.markup }]);
  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ id: number; data: string } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [away, setAway] = useState(false); // la conversation n'est pas défilée jusqu'en bas : on propose d'y aller

  const nextId = useRef(1);
  const subRef = useRef<Subscriber | null>(null);
  const busyRef = useRef(false);
  const runRef = useRef(0); // numéro de l'échange en cours : « Recommencer » ou le démontage l'invalident
  const ctlRef = useRef<AbortController | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const codeRef = useRef(code);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrolled = useRef(false);

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Reprise de la conversation gardée dans ce navigateur, APRÈS l'hydratation (le serveur affiche toujours l'accueil).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- le stockage n'existe que dans le navigateur : lecture après l'hydratation, volontaire */
    const saved = readSaved();
    if (saved) {
      setBubbles(saved.bubbles);
      setSubscriber(saved.subscriber);
      subRef.current = saved.subscriber;
      nextId.current = saved.next;
    }
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORE, JSON.stringify({ v: 1, bubbles, subscriber, next: nextId.current }));
    } catch {
      // stockage plein ou bloqué : la conversation reste à l'écran jusqu'au rechargement
    }
  }, [bubbles, subscriber, loaded]);

  useEffect(
    () => () => {
      runRef.current += 1; // plus rien ne s'affiche après le démontage
      ctlRef.current?.abort();
      clearTimeout(toastTimer.current);
    },
    [],
  );

  const measureAway = useCallback(() => {
    const el = logRef.current;
    if (el) setAway(el.scrollHeight - el.scrollTop - el.clientHeight > 40);
  }, []);

  // Défilement : en bas, sauf si la dernière bulle est plus haute que la fenêtre (région : 24 boutons), auquel cas on
  // aligne son début, pour que la question reste visible (le bouton flottant mène alors à la fin, boutons compris).
  useEffect(() => {
    const el = logRef.current;
    if (!el) return;
    const last = [...el.querySelectorAll<HTMLElement>("[data-bubble]")].pop();
    const tall = !!last && !typing && !notice && last.offsetHeight > el.clientHeight - 24;
    el.scrollTo({ top: tall ? last.offsetTop - 8 : el.scrollHeight, behavior: scrolled.current && smoothOk() ? "smooth" : "auto" });
    scrolled.current = true;
    requestAnimationFrame(measureAway);
  }, [bubbles, typing, notice, measureAway]);

  const commitSub = useCallback((sub: Subscriber | null) => {
    subRef.current = sub;
    setSubscriber(sub);
  }, []);

  const flash = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const pushBubble = useCallback((b: Omit<Bubble, "id">): number => {
    nextId.current += 1;
    const id = nextId.current;
    setBubbles((bs) => [...bs, { ...b, id }].slice(-MAX_BUBBLES));
    return id;
  }, []);

  // Après un appui au clavier le bouton a disparu (la bulle a été modifiée) : le focus passe au premier bouton de la
  // bulle, sinon à la zone de saisie, au lieu de retomber en haut de la page.
  const refocus = useCallback((bubbleId: number) => {
    requestAnimationFrame(() => {
      const btn = logRef.current?.querySelector<HTMLElement>(`[data-bubble="${bubbleId}"] button`);
      (btn ?? inputRef.current)?.focus({ preventScroll: true });
    });
  }, []);

  const run = useCallback(
    async (req: Req) => {
      if (busyRef.current) return;
      busyRef.current = true;
      runRef.current += 1;
      const token = runRef.current;
      setBusy(true);
      setNotice(null);
      setPending(req.pressed ?? null);
      if (req.expectReply) setTyping(true);
      const t0 = performance.now();
      const ctl = new AbortController();
      ctlRef.current = ctl;
      const end = () => {
        busyRef.current = false;
        setBusy(false);
        setPending(null);
        setTyping(false);
      };

      const out = await callSim(req.update, subRef.current, ctl);
      if (runRef.current !== token) return; // « Recommencer » ou démontage pendant l'attente
      if (!out.ok) {
        if (out.dropSubscriber) commitSub(null);
        setNotice({ kind: out.kind, req });
        end();
        return;
      }
      commitSub(out.subscriber);
      let first = true;
      for (const m of out.messages) {
        if (runRef.current !== token) return;
        if (m.kind === "answer") {
          flash(m.text); // la petite bulle que Telegram affiche en haut de l'écran après l'appui sur un bouton
          continue;
        }
        if (m.kind === "edit") {
          setBubbles((bs) => bs.map((b) => (b.id === m.messageId ? { ...b, text: m.text, markup: m.markup } : b)));
          continue;
        }
        setTyping(true);
        const elapsed = first ? performance.now() - t0 : 0; // le temps d'attente du serveur compte déjà
        await sleep(Math.max(0, TYPING_MIN + Math.random() * TYPING_RANGE - elapsed));
        if (runRef.current !== token) return;
        setTyping(false);
        pushBubble({ who: "bot", text: m.kind === "audio" ? `🔊 ${m.text}` : m.text, markup: m.markup });
        first = false;
      }
      end();
      if (req.focusBubble !== undefined) refocus(req.focusBubble);
    },
    [commitSub, flash, pushBubble, refocus],
  );

  const sendText = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_TEXT);
      if (!text || busyRef.current) return;
      const id = pushBubble({ who: "me", text });
      run({
        update: { update_id: id, message: { message_id: id, chat: FAKE_CHAT, from: { id: 1, language_code: codeRef.current }, date: Math.floor(Date.now() / 1000), text } },
        expectReply: true,
      });
    },
    [pushBubble, run],
  );

  const press = useCallback(
    (bubbleId: number, data: string, viaKeyboard: boolean) => {
      if (busyRef.current) return;
      const bubble = bubbles.find((b) => b.id === bubbleId);
      if (!bubble) return;
      nextId.current += 1;
      const n = nextId.current;
      run({
        update: {
          update_id: n,
          callback_query: {
            id: String(n),
            from: { id: 1, language_code: codeRef.current },
            data,
            message: { message_id: bubble.id, chat: FAKE_CHAT, date: Math.floor(Date.now() / 1000), text: bubble.text },
          },
        },
        pressed: { id: bubbleId, data },
        focusBubble: viaKeyboard ? bubbleId : undefined,
        expectReply: false,
      });
    },
    [bubbles, run],
  );

  const restart = useCallback(() => {
    runRef.current += 1; // invalide l'échange en cours
    ctlRef.current?.abort();
    busyRef.current = false;
    clearTimeout(toastTimer.current);
    nextId.current = 1;
    commitSub(null);
    setBusy(false);
    setPending(null);
    setTyping(false);
    setNotice(null);
    setToast(null);
    setDraft("");
    setBubbles([{ id: 1, who: "bot", text: welcome.text, markup: welcome.markup }]);
  }, [commitSub, welcome]);

  // Tailles en rem et non en text-sm/text-base : la page est dans l'échelle de texte agrandie (sk-type), mais la fenêtre du chat
  // garde ses proportions de téléphone (rien sous 14 px).
  const bubbleBase = "w-fit max-w-full rounded-2xl px-3 py-2 text-[1rem] leading-snug shadow-sm";
  const noticeText = notice ? { busy: s.errBusy, tooMany: s.errTooMany, offline: s.errOffline, timeout: s.errTimeout }[notice.kind] : "";
  const canSend = !busy && draft.trim().length > 0;

  return (
    <div
      role={labelledBy ? "group" : undefined}
      aria-labelledby={labelledBy}
      className="mx-auto w-full max-w-[22rem] rounded-[1.9rem] bg-[#0a2a1e] p-1.5 shadow-2xl ring-1 ring-white/25"
    >
      {/* hauteur fixe, plafonnée par la hauteur de l'écran (svh : stable quand la barre d'adresse se replie ; un navigateur qui ne connaît
          pas svh ignore le plafond et garde la hauteur fixe) */}
      <div className="flex h-[38rem] max-h-[calc(100svh-4rem)] min-h-[26rem] flex-col overflow-hidden rounded-[1.5rem] bg-[#e1ecd8] lg:h-[36rem] lg:max-h-[calc(100svh-11rem)]">
        {/* en-tête de conversation */}
        <div className="flex items-center gap-3 bg-sakia-green-deep px-3 py-2 text-white">
          <div aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15">
            <SakiaLogo size={30} spin={false} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1rem] font-bold leading-tight">Sakia · bot</p>
            <p className="truncate text-[0.875rem] leading-tight text-white/80">{s.chatSub}</p>
          </div>
        </div>
        <p className="bg-sakia-sun/25 px-3 py-1.5 text-center text-[0.875rem] font-bold leading-snug text-sakia-brown">{s.banner}</p>

        {/* conversation : sens physique fixe (bot à gauche, vous à droite) ; chaque ligne règle son propre sens d'écriture */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={logRef}
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
            aria-label={s.logLabel}
            aria-busy={busy}
            tabIndex={0}
            dir="ltr"
            onScroll={measureAway}
            className="relative flex h-full flex-col gap-2 overflow-y-auto overscroll-y-contain bg-[radial-gradient(circle_at_1px_1px,rgba(43,90,55,0.14)_1px,transparent_0)] bg-[length:18px_18px] p-3"
          >
            {bubbles.map((b) => (
              <div
                key={b.id}
                data-bubble={b.id}
                className={`flex flex-col ${b.who === "me" ? "items-end self-end" : "items-start self-start"} ${b.markup ? "w-[94%]" : "max-w-[92%]"}`}
              >
                <div className={`${bubbleBase} ${b.who === "me" ? "rounded-tr-md bg-sakia-green text-white" : "rounded-tl-md bg-white text-sakia-ink"}`}>
                  <span className="sr-only">{b.who === "me" ? s.you : s.bot}. </span>
                  {/* dir="auto" : chaque bulle prend le sens de sa première lettre (une bulle arabe se lit de droite à gauche) */}
                  <p dir="auto" lang={b.who === "bot" ? langOf(b.text) : undefined} className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {b.text}
                  </p>
                </div>
                {b.markup && <Keyboard id={b.id} kb={b.markup} locked={busy} pending={pending?.id === b.id ? pending.data : null} onPress={press} />}
              </div>
            ))}
            {typing && (
              <div aria-hidden className="flex w-fit items-center gap-1 self-start rounded-2xl rounded-tl-md bg-white px-3.5 py-3 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-sakia-green/70 motion-safe:animate-bounce" />
                <span className="h-2 w-2 rounded-full bg-sakia-green/50 motion-safe:animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-sakia-green/30 motion-safe:animate-bounce [animation-delay:300ms]" />
              </div>
            )}
            {notice && (
              <div dir={pageDir} className="self-center rounded-xl bg-sakia-alert-light px-3 py-2 text-center text-[0.9375rem] font-semibold leading-snug text-sakia-alert">
                <p>{noticeText}</p>
                <button type="button" onClick={() => run(notice.req)} className="mt-1 min-h-11 rounded-lg px-4 font-bold underline">
                  {s.retry}
                </button>
              </div>
            )}
          </div>
          <div role="status" dir="auto" className="pointer-events-none absolute inset-x-3 top-2 z-10 flex justify-center">
            {toast && <p className="rounded-full bg-black/80 px-3 py-1.5 text-center text-[0.9375rem] font-semibold leading-snug text-white shadow-lg">{toast}</p>}
          </div>
          {away && (
            <button
              type="button"
              onClick={() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: smoothOk() ? "smooth" : "auto" })}
              aria-label={s.jump}
              title={s.jump}
              className="absolute bottom-2 right-3 z-10 grid h-11 w-11 place-items-center rounded-full bg-white text-sakia-green-deep shadow-lg ring-1 ring-black/15 hover:bg-sakia-green-light"
            >
              <ChevronDownIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* saisie : texte libre (« zitoun kairouan »), /start et « Recommencer » */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSend) return;
            const text = draft;
            setDraft("");
            sendText(text);
          }}
          className="space-y-2 border-t border-black/10 bg-white p-2"
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => sendText("/start")}
              aria-label={s.startLabel}
              aria-disabled={busy || undefined}
              dir="ltr"
              className="sk-press min-h-11 rounded-full border-2 border-sakia-green/30 bg-sakia-green-light px-4 font-mono text-[0.9375rem] font-bold text-sakia-green-deep hover:border-sakia-green aria-disabled:opacity-60"
            >
              /start
            </button>
            <button
              type="button"
              onClick={restart}
              className="sk-press inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-sakia-sand-dark bg-white px-4 text-[0.9375rem] font-semibold text-sakia-ink hover:border-sakia-green"
            >
              <RetryIcon className="h-4 w-4" />
              {s.restart}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tg-input" className="sr-only">
              {s.inputLabel}
            </label>
            <input
              id="tg-input"
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_TEXT}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              dir={draft ? "auto" : pageDir}
              placeholder={s.placeholder}
              className="min-h-11 min-w-0 flex-1 rounded-full border-2 border-sakia-sand-dark bg-white px-4 text-[1rem] leading-normal text-sakia-ink placeholder:text-neutral-500 focus:border-sakia-green"
            />
            <button
              type="submit"
              aria-label={s.send}
              title={s.send}
              aria-disabled={!canSend || undefined}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sakia-green text-white hover:bg-sakia-green-deep aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            >
              <SendIcon className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
