"use client";

// Faux téléphone à touches. Écrit un SMS, l'envoie à POST /api/sms/incoming et affiche la réponse.
// Sans réseau (ou signal coupé à la main), le message reste « en attente » et part dès que le signal revient, comme un vrai SMS.
// La conversation est gardée dans ce navigateur seulement (localStorage), avec un numéro fictif « sim-xxxxxx ».

import { useCallback, useEffect, useRef, useState } from "react";
import { smsInfo } from "@/lib/sms/encoding";
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
  try {
    const s = JSON.parse(localStorage.getItem(STORE) ?? "null") as Saved | null;
    if (s && typeof s.sid === "string" && Array.isArray(s.msgs)) {
      // un envoi interrompu par la fermeture de la page repart en attente
      return { sid: s.sid, msgs: s.msgs.map((m) => (m.status === "sending" ? { ...m, status: "pending" as const } : m)) };
    }
  } catch {
    // stockage illisible ou bloqué : on repart d'une conversation vide
  }
  return { sid: `sim-${newId().slice(0, 6)}`, msgs: [] };
}

export default function PhoneSimulator() {
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

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-8 md:grid-cols-[330px_1fr]">
      {/* ---------- le téléphone ---------- */}
      <div className="mx-auto w-[310px] shrink-0 rounded-[2.4rem] bg-neutral-800 p-4 pb-6 shadow-2xl ring-1 ring-black/40" dir="ltr">
        <div className="rounded-xl border-4 border-neutral-950 bg-[#cdd9b2] font-mono text-[#1d2814]">
          <div className="flex items-center justify-between border-b border-[#1d2814]/30 px-2 py-1 text-[11px]">
            <button
              type="button"
              onClick={() => setSignalCut((v) => !v)}
              aria-pressed={signalCut}
              aria-label={signalCut ? t.signalOff : t.signalOn}
              title={signalCut ? t.signalOff : t.signalOn}
              className="flex items-end gap-[2px]"
            >
              {[5, 8, 11, 14].map((h, i) => (
                <span key={h} style={{ height: h }} className={`w-[3px] ${offline ? "bg-[#1d2814]/25" : i < 4 ? "bg-[#1d2814]" : ""}`} />
              ))}
              {offline && <span className="ml-1 text-[10px] font-bold">✕</span>}
            </button>
            <span className="font-bold tracking-widest">SAKIA</span>
            <span aria-hidden>▮▮▮</span>
          </div>

          {offline && (
            <div role="status" className="border-b border-[#1d2814]/30 bg-[#1d2814]/10 px-2 py-1 text-[11px] leading-tight">
              {t.noSignal}
              {waiting > 0 ? ` · ${waiting} ${t.waiting}` : ""}
              {lastIn && now ? ` · ${t.lastMessage} ${formatAge(now - lastIn.at, lang)}` : ""}
            </div>
          )}

          <div ref={logRef} role="log" aria-live="polite" className="h-[270px] space-y-2 overflow-y-auto px-2 py-2 text-[12px] leading-snug">
            {ready && msgs.length === 0 && <p className="opacity-70">{t.placeholder}</p>}
            {msgs.map((m) => (
              <div key={m.id} className={m.dir === "out" ? "text-right" : "text-left"}>
                <div
                  dir="auto"
                  className={`inline-block max-w-[92%] whitespace-pre-wrap break-words rounded px-2 py-1 text-start ${
                    m.dir === "out" ? "bg-[#1d2814] text-[#cdd9b2]" : "border border-[#1d2814]/60"
                  }`}
                >
                  {m.text}
                </div>
                <div className="text-[10px] opacity-70">
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
            className="border-t border-[#1d2814]/40 p-2"
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
              className="w-full border-b border-[#1d2814]/60 bg-transparent py-1 text-[13px] outline-none placeholder:text-[#1d2814]/50"
            />
            <div className="mt-1 flex justify-between text-[10px]" aria-live="off">
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
        <div className="mt-3 flex justify-between px-2">
          <button type="button" onClick={() => send(draft)} className="rounded-full bg-neutral-700 px-4 py-2 text-xs font-semibold text-white active:bg-neutral-600">
            {t.send}
          </button>
          <button type="button" onClick={() => setDraft((d) => d.slice(0, -1))} className="rounded-full bg-neutral-700 px-4 py-2 text-xs font-semibold text-white active:bg-neutral-600">
            {t.erase}
          </button>
        </div>
        {/* pavé numérique : chiffres, étoile et dièse (menu *123# puis 1, 2, 3) */}
        <div className="mt-3 grid grid-cols-3 gap-2 px-2">
          {KEYS.map(([k, sub]) => (
            <button
              key={k}
              type="button"
              onClick={() => press(k)}
              aria-label={k}
              className="rounded-lg bg-neutral-700 py-2 text-lg font-semibold leading-none text-white active:bg-neutral-600"
            >
              {k}
              <span className="block text-[9px] font-normal tracking-wider text-neutral-300">{sub || " "}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---------- explications ---------- */}
      <div className="space-y-5 text-neutral-900 dark:text-neutral-100">
        <div>
          <h1 className="text-2xl font-semibold">{t.phoneTitle}</h1>
        </div>
        <p className="text-base leading-7">{t.phoneIntro}</p>

        <div>
          <p className="mb-2 text-sm font-semibold">{t.examples}</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                dir="auto"
                onClick={() => send(ex)}
                className="rounded-full border border-[#2f6b3a] px-3 py-1 text-sm text-[#2f6b3a] hover:bg-[#2f6b3a] hover:text-white dark:border-[#7bb286] dark:text-[#9ccfa6]"
              >
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
            className="rounded-md bg-[#8a5a2b] px-3 py-2 text-sm font-semibold text-white hover:bg-[#744a22]"
          >
            {signalCut ? t.signalOff : t.signalOn}
          </button>
          <button
            type="button"
            onClick={() => {
              commit([]);
            }}
            className="rounded-md border border-neutral-400 px-3 py-2 text-sm"
          >
            {t.clearHistory}
          </button>
          <span className="text-xs text-neutral-600 dark:text-neutral-400">
            {t.fakeNumber} : <code>{sid || "…"}</code>
          </span>
        </div>

        <ul className="space-y-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">
          <li>{t.simulated}</li>
          <li>{t.limitNote}</li>
          <li>{t.install}</li>
          <li className="font-medium">{t.truth}</li>
        </ul>
      </div>
    </div>
  );
}
