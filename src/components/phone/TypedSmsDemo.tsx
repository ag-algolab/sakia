"use client";

// Pour les curieux et les techniciens : écrire SOI-MÊME un SMS (« zitoun kairouan », « olivier القيروان », « 9amh sfax »...).
// Montre l'analyse des messages écrits à la main : c'est une vraie fonction du service, mais ce n'est PAS le parcours principal
// de la page (le SMS du matin arrive tout seul : voir FeaturePhone.tsx). Écrit le SMS, l'envoie à POST /api/sms/incoming et affiche la réponse.
// Sans réseau (ou signal coupé à la main), le message reste « en attente » et part dès que le signal revient, comme un vrai SMS.
// La conversation est gardée dans ce navigateur seulement (localStorage), avec le numéro fictif « sim-xxxxxx » du navigateur.

import { useCallback, useEffect, useRef, useState } from "react";
import { smsInfo } from "@/lib/sms/encoding";
import s from "./phone.module.css";
import { getSimNumber } from "./simNumber";
import { STRINGS, formatAge } from "./strings";
import { useUiLang } from "./useUiLang";
import { setReachable, useOnline } from "./offline";

type Status = "pending" | "sending" | "sent" | "failed";
type Msg = { id: string; dir: "out" | "in"; text: string; at: number; status?: Status };
type Saved = { sid: string; msgs: Msg[] };

const STORE = "sakia.phone.v1";
const MAX_CHARS = 160;
const MAX_KEPT = 60;
const EXAMPLES = ["zitoun kairouan", "olivier القيروان", "9amh sfax", "*123#", "AIDE"];

const KEYS: [string, string][] = [
  ["1", ""], ["2", "abc"], ["3", "def"],
  ["4", "ghi"], ["5", "jkl"], ["6", "mno"],
  ["7", "pqrs"], ["8", "tuv"], ["9", "wxyz"],
  ["*", ""], ["0", "+"], ["#", ""],
];

const newId = () => Math.random().toString(36).slice(2, 10);

function load(): Saved {
  const sid = getSimNumber();
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? "null") as Saved | null;
    if (saved && Array.isArray(saved.msgs)) {
      // un envoi interrompu par la fermeture de la page repart en attente
      return { sid, msgs: saved.msgs.map((m) => (m.status === "sending" ? { ...m, status: "pending" as const } : m)) };
    }
  } catch {
    // stockage illisible ou bloqué : on repart d'une conversation vide
  }
  return { sid, msgs: [] };
}

export default function TypedSmsDemo() {
  const lang = useUiLang();
  const t = STRINGS[lang];
  const online = useOnline();
  const [signalCut, setSignalCut] = useState(false);
  const offline = signalCut || !online;
  const [ready, setReady] = useState(false);
  const [sid, setSid] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [now, setNow] = useState(0);
  const msgsRef = useRef<Msg[]>([]);
  const sidRef = useRef("");
  const flushing = useRef(false);
  const signalCutRef = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    signalCutRef.current = signalCut;
  }, [signalCut]);

  const commit = useCallback((next: Msg[]) => {
    // l'historique est limité, mais jamais au prix d'un message encore en attente
    let kept = next;
    for (let i = 0; kept.length > MAX_KEPT && i < kept.length; ) kept = kept[i].status === "pending" || kept[i].status === "sending" ? (i++, kept) : kept.filter((_, j) => j !== i);
    msgsRef.current = kept;
    setMsgs(kept);
    try {
      localStorage.setItem(STORE, JSON.stringify({ sid: sidRef.current, msgs: kept }));
    } catch {
      // stockage plein ou bloqué : la conversation reste à l'écran jusqu'au rechargement
    }
  }, []);

  const patch = useCallback((id: string, change: Partial<Msg>) => commit(msgsRef.current.map((m) => (m.id === id ? { ...m, ...change } : m))), [commit]);

  useEffect(() => {
    const saved = load();
    sidRef.current = saved.sid;
    msgsRef.current = saved.msgs;
    // lecture du navigateur après l'hydratation : évite un écart entre le serveur et la page
    /* eslint-disable react-hooks/set-state-in-effect */
    setSid(saved.sid);
    setMsgs(saved.msgs);
    setNow(Date.now());
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  // Envoie un message au serveur ; une coupure réseau le remet en attente, une erreur du serveur le marque en échec.
  const deliver = useCallback(
    async (m: Msg) => {
      if (!msgsRef.current.some((x) => x.id === m.id)) return true; // supprimé entre-temps (« vider la conversation »)
      patch(m.id, { status: "sending" });
      try {
        const res = await fetch("/api/sms/incoming", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: sidRef.current, text: m.text }),
          signal: AbortSignal.timeout(15000), // une requête qui ne répond pas ne doit pas bloquer les messages suivants
        });
        if (res.status >= 500 || res.status === 429) throw new TypeError(`serveur ${res.status}`); // service indisponible : on réessaiera
        if (!res.ok) throw new Error(String(res.status));
        const { reply } = (await res.json()) as { reply: string };
        commit([...msgsRef.current.map((x) => (x.id === m.id ? { ...x, status: "sent" as const } : x)), { id: newId(), dir: "in" as const, text: reply, at: Date.now() }]);
        setReachable(true);
        return true;
      } catch (e) {
        // true = on peut passer au message suivant (refus définitif du serveur) ; false = le réseau ne répond pas, on s'arrête là
        const refused = e instanceof Error && /^\d+$/.test(e.message);
        patch(m.id, { status: refused ? "failed" : "pending" });
        if (!refused) setReachable(false);
        return refused;
      }
    },
    [commit, patch],
  );

  // Envoi des messages en attente, dans l'ordre, dès que le signal revient.
  const flush = useCallback(async () => {
    if (flushing.current) return;
    flushing.current = true;
    try {
      // on relit la liste à chaque tour : un message écrit pendant l'envoi part tout de suite après
      for (let m = msgsRef.current.find((x) => x.dir === "out" && x.status === "pending"); m; m = msgsRef.current.find((x) => x.dir === "out" && x.status === "pending")) {
        if (signalCutRef.current || !navigator.onLine) break;
        if (!(await deliver(m))) break;
      }
    } finally {
      flushing.current = false;
    }
  }, [deliver]);

  useEffect(() => {
    if (!ready || signalCut) return;
    flush();
    const retry = setInterval(flush, 8000); // le réseau peut revenir sans que le navigateur le dise
    return () => clearInterval(retry);
  }, [ready, signalCut, flush]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs.length]);

  const send = useCallback(
    (text: string) => {
      const body = text.trim().slice(0, MAX_CHARS);
      if (!body || !ready) return;
      const m: Msg = { id: newId(), dir: "out", text: body, at: Date.now(), status: "pending" };
      commit([...msgsRef.current, m]);
      setDraft("");
      if (!signalCutRef.current) void flush();
    },
    [commit, flush, ready],
  );

  const press = (k: string) => setDraft((d) => (d.length < MAX_CHARS ? d + k : d));
  const info = smsInfo(draft);
  const lastIn = [...msgs].reverse().find((m) => m.dir === "in");
  const waiting = msgs.filter((m) => m.status === "pending").length;

  const ghost = "inline-flex min-h-11 items-center rounded-lg border-2 border-sakia-green bg-white px-4 text-base font-semibold text-sakia-green hover:bg-sakia-green-light";

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="grid w-full gap-6 md:grid-cols-[19.5rem_1fr]">
      {/* ---------- le téléphone ---------- */}
      <div className={`${s.body} mx-auto w-full max-w-[19.5rem] rounded-[2.4rem] p-4 pb-5 shadow-2xl ring-1 ring-black/60`} dir="ltr">
        <div className={`${s.lcd} rounded-md border-[3px] border-[#0d110e]`}>
          <div className={`${s.rule} flex items-center justify-between border-b px-2 py-1 text-[0.6875rem] font-bold leading-none`} aria-hidden="true">
            <span className="flex items-end gap-[2px]">
              {[4, 7, 10, 13].map((h, i) => (
                <span key={h} style={{ height: h, opacity: offline ? 0.25 : i < 4 ? 1 : 0 }} className={`${s.inv} w-[3px]`} />
              ))}
              {offline && <span className="ml-1 text-[0.625rem] font-bold">✕</span>}
            </span>
            <span className="tracking-[0.25em]">SAKIA</span>
            <span>▮▮▮</span>
          </div>

          {offline && (
            <div role="status" className={`${s.rule} border-b bg-[#1a2410]/10 px-2 py-1 text-[0.72rem] leading-tight`}>
              {t.noSignal}
              {waiting > 0 ? ` · ${waiting} ${t.waiting}` : ""}
              {lastIn && now ? ` · ${t.lastMessage} ${formatAge(now - lastIn.at, lang)}` : ""}
            </div>
          )}

          <div ref={logRef} role="log" aria-live="polite" aria-label={t.screenLabel} tabIndex={0} className="h-[14rem] space-y-2 overflow-y-auto px-2 py-2 text-[0.75rem] leading-snug">
            {ready && msgs.length === 0 && <p className={s.dim}>{t.placeholder}</p>}
            {msgs.map((m) => (
              <div key={m.id} className={m.dir === "out" ? "text-right" : "text-left"}>
                <div dir="auto" className={`inline-block max-w-[92%] whitespace-pre-wrap break-words rounded px-2 py-1 text-start ${m.dir === "out" ? s.inv : "border border-[#1a2410]/70"}`}>
                  {m.text}
                </div>
                <div className={`${s.dim} text-[0.6875rem]`}>
                  {m.dir === "out" ? t.fromYou : t.fromSakia} · {new Date(m.at).toLocaleTimeString(lang === "ar" ? "ar-TN-u-nu-latn" : lang, { hour: "2-digit", minute: "2-digit" })}
                  {m.status === "pending" && ` · ⏳ ${t.waiting}`}
                  {m.status === "sending" && " · …"}
                  {m.status === "failed" && ` · ⚠ ${t.failed}`}
                  {m.status === "sent" && ` · ✓ ${t.sentTo}`}
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(draft);
            }}
            className={`${s.rule} border-t p-2`}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_CHARS))}
              maxLength={MAX_CHARS}
              dir="auto"
              enterKeyHint="send"
              autoComplete="off"
              aria-label={t.placeholder}
              placeholder={t.placeholder}
              className="min-h-11 w-full border-b border-[#1a2410]/70 bg-transparent py-1 text-[0.8125rem] outline-none placeholder:text-[#36471f]"
            />
            <div className={`${s.dim} mt-1 flex justify-between text-[0.6875rem]`} aria-live="off">
              <span>
                {draft.length}/{MAX_CHARS}
              </span>
              <span title={t.limitNote}>
                {info.segments > 0 ? t.smsCount(info.segments) : ""}
                {info.encoding === "ucs2" && draft ? ` · ${info.units}/70` : ""}
              </span>
            </div>
          </form>
        </div>

        {/* touches de fonction */}
        <div className="mt-3 flex justify-between gap-2">
          <button type="button" onClick={() => send(draft)} className={`${s.key} min-h-11 flex-1 rounded-full px-4 text-sm font-semibold`}>
            {t.send}
          </button>
          <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} className={`${s.key} min-h-11 flex-1 rounded-full px-4 text-sm font-semibold`}>
            {t.erase}
          </button>
        </div>
        {/* pavé numérique : chiffres, étoile et dièse (menu *123# puis 1, 2, 3) */}
        <div role="group" aria-label={t.keypadLabel} className="mt-3 grid grid-cols-3 gap-2">
          {KEYS.map(([k, sub]) => (
            <button key={k} type="button" onClick={() => press(k)} aria-label={k} className={`${s.key} flex h-12 flex-col items-center justify-center rounded-xl text-lg font-semibold leading-none`}>
              {k}
              <span aria-hidden="true" className="mt-0.5 block text-[0.625rem] font-normal leading-3 tracking-wider text-[#e1e7e2]">
                {sub || " "}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- explications ---------- */}
      <div className="min-w-0 space-y-4 text-sakia-ink">
        <p className="text-base leading-7">{t.curiousIntro}</p>

        <div>
          <p className="mb-2 text-sm font-bold">{t.examples}</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" dir="auto" onClick={() => send(ex)} className={ghost}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSignalCut((v) => !v)}
            aria-pressed={signalCut}
            className="inline-flex min-h-11 items-center rounded-lg bg-sakia-brown px-4 text-base font-semibold text-white hover:bg-[#46301a]"
          >
            {signalCut ? t.signalOff : t.signalOn}
          </button>
          <button
            type="button"
            onClick={() => {
              commit([]);
            }}
            className="inline-flex min-h-11 items-center rounded-lg border-2 border-sakia-brown bg-white px-4 text-base font-semibold text-sakia-brown"
          >
            {t.clearHistory}
          </button>
          <span className="text-sm text-sakia-brown">
            {t.fakeNumber} : <code>{sid || "…"}</code>
          </span>
        </div>

        <p className="text-sm leading-6 text-sakia-brown">{t.limitNote}</p>
      </div>
    </div>
  );
}
