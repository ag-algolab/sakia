"use client";

// Le « cerveau » du faux téléphone : fait tourner la machine à états (src/lib/ivr/flow.ts), joue les phrases enregistrées,
// va chercher la lecture du plan (voix en direct, sinon enregistrement de démonstration) et tient le chronomètre de l'appel.
// Rien n'est envoyé ni gardé à propos de l'appelant : la transcription reste dans l'état de la page.

import { useCallback, useEffect, useRef, useState } from "react";
import { findDemo } from "@/lib/ivr/demo";
import type { DemoClipFile, DemoItem } from "@/lib/ivr/demo";
import { startCall, step } from "@/lib/ivr/flow";
import type { CallState, Key, Say, StepResult } from "@/lib/ivr/flow";
import { SILENCE_MS } from "@/lib/ivr/menu";
import type { IvrLang } from "@/lib/ivr/menu";
import { promptEn, promptText } from "@/lib/ivr/prompts";
import { loadBlob, loadJson } from "./audioStore";
import { playKeyTone, playRingback } from "./tones";

export type Recordings = Record<string, { url: string; bytes: number; durationMs: number }>;
export type SourceMode = "auto" | "recorded";
export type Phase = "idle" | "ringing" | "active" | "ended";

export type PlanLineView = { id: string; text: string; en: string };
export type LogEntry =
  | { id: number; kind: "prompt"; text: string; en: string; lang: IvrLang }
  | { id: number; kind: "key"; key: string }
  | { id: number; kind: "plan"; lang: IvrLang; lines: PlanLineView[] }
  | { id: number; kind: "system"; text: string };
type NewLog = LogEntry extends infer E ? (E extends { id: number } ? Omit<E, "id"> : never) : never;

export type Banner =
  | { kind: "live" | "cache"; date: string }
  | { kind: "rec"; date: string }
  | { kind: "novoice"; budget: boolean }
  | { kind: "norec" }
  | { kind: "error" };
export type Guard = { level: "ok" | "low" | "none"; askAPerson: boolean; reasons: string[] };

type Now = { text: string; en: string; lang: IvrLang } | null;
type PlanView = { lang: IvrLang; lines: PlanLineView[]; active: number } | null;
type PlayResult = "ended" | "cancelled" | "error";
type TimedLine = PlanLineView & { startMs: number; endMs: number };
type Resolved = { lines: TimedLine[]; audioUrl: string | null; banner: Banner; guard: Guard | null; useUnsure: boolean };

// Un fichier audio vide : jouer ceci pendant le clic « Appeler » débloque la lecture automatique des navigateurs mobiles.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function b64ToBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function useIvrCall(opts: { recordings: Recordings; demos: DemoItem[]; mode: SourceMode }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [call, setCall] = useState<CallState | null>(null);
  const [now, setNow] = useState<Now>(null);
  const [planView, setPlanView] = useState<PlanView>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [guard, setGuard] = useState<Guard | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [online, setOnline] = useState(true);

  const optsRef = useRef(opts);
  const phaseRef = useRef<Phase>("idle");
  const stateRef = useRef<CallState | null>(null);
  const tokenRef = useRef(0); // chaque prise de parole a un numéro ; une touche l'invalide (on peut couper la parole)
  const cancelRef = useRef<(() => void) | null>(null);
  const silenceRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const logId = useRef(0);
  const blobUrls = useRef(new Map<string, string>());
  const planCache = useRef(new Map<string, Resolved>());
  const ringToken = useRef(0);

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = "auto";
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    const urls = blobUrls.current;
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
      tokenRef.current++;
      cancelRef.current?.();
      window.clearTimeout(silenceRef.current);
      window.clearInterval(timerRef.current);
      audioRef.current?.pause();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
      void ctxRef.current?.close();
    };
  }, []);

  const pushLog = useCallback((e: NewLog) => {
    setLog((l) => [...l.slice(-60), { ...e, id: ++logId.current } as LogEntry]);
  }, []);

  // ---------- lecture d'un son (ou d'un silence de durée donnée) ----------
  const playMedia = useCallback((o: { src?: string; silentMs?: number; onFrame?: (ms: number) => void }): Promise<PlayResult> => {
    return new Promise((resolve) => {
      const audio = audioRef.current;
      let raf = 0;
      let timer: number | undefined;
      let done = false;
      const finish = (r: PlayResult) => {
        if (done) return;
        done = true;
        cancelAnimationFrame(raf);
        window.clearTimeout(timer);
        if (audio) {
          audio.onended = null;
          audio.onerror = null;
          audio.ontimeupdate = null;
          audio.pause();
        }
        cancelRef.current = null;
        resolve(r);
      };
      cancelRef.current = () => finish("cancelled");
      if (o.src && audio) {
        audio.onended = () => finish("ended");
        audio.onerror = () => finish("error");
        // les images d'animation sont suspendues quand l'onglet est caché : l'événement de temps de la balise audio prend le relais
        audio.ontimeupdate = () => o.onFrame?.(audio.currentTime * 1000);
        audio.src = o.src;
        audio.play().catch(() => finish("error"));
        o.onFrame?.(0);
        const loop = () => {
          if (done) return;
          o.onFrame?.(audio.currentTime * 1000);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } else {
        const t0 = performance.now();
        timer = window.setTimeout(() => finish("ended"), o.silentMs ?? 1000);
        const loop = () => {
          if (done) return;
          o.onFrame?.(performance.now() - t0);
          raf = requestAnimationFrame(loop);
        };
        if (o.onFrame) raf = requestAnimationFrame(loop);
      }
    });
  }, []);

  const blobUrlFor = useCallback(async (url: string): Promise<string | null> => {
    const known = blobUrls.current.get(url);
    if (known) return known;
    const blob = await loadBlob(url);
    if (!blob) return null;
    const u = URL.createObjectURL(blob);
    blobUrls.current.set(url, u);
    return u;
  }, []);

  // ---------- une phrase fixe ----------
  const sayPrompt = useCallback(
    async (s: Extract<Say, { kind: "prompt" }>, token: number): Promise<PlayResult> => {
      const text = promptText(s.id, s.lang);
      const en = promptEn(s.id, s.lang);
      setNow({ text, en, lang: s.lang });
      pushLog({ kind: "prompt", text, en, lang: s.lang });
      const rec = optsRef.current.recordings[`${s.id}.${s.lang}`];
      const src = rec ? await blobUrlFor(rec.url) : null;
      if (token !== tokenRef.current) return "cancelled";
      // sans enregistrement (ou fichier introuvable hors connexion) : les sous-titres restent à l'écran le temps de la lecture
      return playMedia(src ? { src } : { silentMs: Math.min(9000, 1200 + text.length * 55) });
    },
    [blobUrlFor, playMedia, pushLog],
  );

  // ---------- la lecture du plan ----------
  const resolvePlan = useCallback(
    async (s: Extract<Say, { kind: "plan" }>): Promise<Resolved> => {
      const { demos, mode } = optsRef.current;
      const demo = findDemo(demos, s.regionId, s.cropId, s.lang, s.ago, s.detail);
      const fromDemo = async (): Promise<Resolved | null> => {
        if (!demo) return null;
        const [file, audioUrl] = await Promise.all([loadJson<DemoClipFile>(demo.json), blobUrlFor(demo.file)]);
        if (!file || !audioUrl) return null;
        return {
          lines: file.lines,
          audioUrl,
          banner: { kind: "rec", date: demo.asOf },
          guard: { level: demo.level, askAPerson: demo.askAPerson, reasons: demo.reasons },
          useUnsure: false,
        };
      };

      if (mode !== "recorded" && navigator.onLine !== false) {
        const qs = new URLSearchParams({ region: s.regionId, crop: s.cropId, lang: s.lang, ago: s.ago === null ? "u" : String(s.ago) });
        if (s.detail) qs.set("detail", "1");
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 25_000);
        try {
          const res = await fetch(`/api/ivr/plan?${qs}`, { signal: ctrl.signal });
          if (res.ok) {
            const d = (await res.json()) as {
              source: "live" | "cache" | "none";
              lines: TimedLine[];
              audioBase64?: string;
              mime?: string;
              audioError?: "budget" | "voice";
              planDate: string;
              confidence: Guard;
            };
            const guardOut: Guard = { level: d.confidence.level, askAPerson: d.confidence.askAPerson, reasons: d.confidence.reasons };
            if (d.audioBase64) {
              const url = URL.createObjectURL(b64ToBlob(d.audioBase64, d.mime ?? "audio/mpeg"));
              blobUrls.current.set(`plan:${qs}:${Date.now()}`, url);
              return { lines: d.lines, audioUrl: url, banner: { kind: d.source === "cache" ? "cache" : "live", date: d.planDate }, guard: guardOut, useUnsure: false };
            }
            return { lines: d.lines, audioUrl: null, banner: { kind: "novoice", budget: d.audioError === "budget" }, guard: guardOut, useUnsure: false };
          }
        } catch {
          // pas de réseau, délai dépassé ou erreur serveur : on tente l'enregistrement
        } finally {
          window.clearTimeout(timer);
        }
      }
      const rec = await fromDemo();
      if (rec) return rec;
      // ni voix en direct ni enregistrement : l'appel dit « pas sûr, demandez à une personne » plutôt que de deviner
      return { lines: [], audioUrl: null, banner: mode === "recorded" || navigator.onLine === false ? { kind: "norec" } : { kind: "error" }, guard: null, useUnsure: true };
    },
    [blobUrlFor],
  );

  const sayPlan = useCallback(
    async (s: Extract<Say, { kind: "plan" }>, token: number): Promise<PlayResult> => {
      const cacheKey = `${optsRef.current.mode}|${s.regionId}|${s.cropId}|${s.lang}|${s.ago}|${s.detail}`;
      let resolved = planCache.current.get(cacheKey);
      if (!resolved) {
        setLoadingPlan(true);
        setNow(null);
        const pending = resolvePlan(s);
        // si le calcul traîne, une phrase d'attente est dite (comme sur une vraie ligne)
        let waiting: Promise<PlayResult> | null = null;
        const timer = window.setTimeout(() => {
          if (token === tokenRef.current && optsRef.current.mode !== "recorded") waiting = sayPrompt({ kind: "prompt", id: "wait", lang: s.lang }, token);
        }, 900);
        resolved = await pending;
        window.clearTimeout(timer);
        if (waiting) await waiting;
        setLoadingPlan(false);
        if (token !== tokenRef.current) return "cancelled";
        if (resolved.audioUrl && resolved.banner.kind !== "rec") planCache.current.set(cacheKey, resolved);
      }
      setBanner(resolved.banner);
      // aucun conseil possible : l'appel dit « pas sûr », et l'écran le montre aussi
      setGuard(resolved.useUnsure ? { level: "low", askAPerson: true, reasons: [] } : resolved.guard);

      if (resolved.useUnsure) {
        setPlanView(null);
        return sayPrompt({ kind: "prompt", id: "unsure", lang: s.lang }, token);
      }
      const lines = resolved.lines;
      pushLog({ kind: "plan", lang: s.lang, lines: lines.map(({ id, text, en }) => ({ id, text, en })) });
      setPlanView({ lang: s.lang, lines: lines.map(({ id, text, en }) => ({ id, text, en })), active: -1 });
      let last = -1;
      const onFrame = (ms: number) => {
        let i = -1;
        lines.forEach((l, k) => {
          if (ms >= l.startMs) i = k;
        });
        if (i !== last) {
          last = i;
          setPlanView((v) => (v ? { ...v, active: i } : v));
          if (i >= 0) setNow({ text: lines[i].text, en: lines[i].en, lang: s.lang });
        }
      };
      if (resolved.audioUrl) return playMedia({ src: resolved.audioUrl, onFrame });
      // texte seulement (voix indisponible) : chaque ligne reste à l'écran un moment
      for (let i = 0; i < lines.length; i++) {
        if (token !== tokenRef.current) return "cancelled";
        setPlanView((v) => (v ? { ...v, active: i } : v));
        setNow({ text: lines[i].text, en: lines[i].en, lang: s.lang });
        const r = await playMedia({ silentMs: Math.min(7000, 1500 + lines[i].text.length * 55) });
        if (r === "cancelled") return r;
      }
      return "ended";
    },
    [playMedia, pushLog, resolvePlan, sayPrompt],
  );

  // ---------- enchaînement ----------
  const clearSilence = useCallback(() => window.clearTimeout(silenceRef.current), []);

  const cancelSpeech = useCallback(() => {
    tokenRef.current++;
    cancelRef.current?.();
    setSpeaking(false);
    setLoadingPlan(false);
  }, []);

  const endCall = useCallback(() => {
    phaseRef.current = "ended";
    setPhase("ended");
    setSpeaking(false);
    window.clearInterval(timerRef.current);
    clearSilence();
  }, [clearSilence]);

  // `apply` et `speak` se rappellent l'une l'autre (le silence relance une phrase) : références mutables.
  const applyRef = useRef<(r: StepResult) => void>(() => {});

  const speak = useCallback(
    async (r: StepResult, token: number) => {
      setSpeaking(true);
      for (const s of r.say) {
        if (token !== tokenRef.current) return;
        if (s.kind === "prompt") await sayPrompt(s, token);
        else await sayPlan(s, token);
      }
      if (token !== tokenRef.current) return;
      setSpeaking(false);
      if (r.end) return endCall();
      const state = stateRef.current;
      if (!state) return;
      if (state.node === "plan" || state.node === "detail") {
        applyRef.current(step(state, { type: "played" }));
        return;
      }
      // attente d'une touche : sans réponse, la question est répétée, puis la ligne raccroche
      silenceRef.current = window.setTimeout(() => {
        const st = stateRef.current;
        if (!st || phaseRef.current !== "active") return;
        applyRef.current(step(st, { type: "silence" }));
      }, SILENCE_MS);
    },
    [endCall, sayPlan, sayPrompt],
  );

  const apply = useCallback(
    (r: StepResult) => {
      stateRef.current = r.state;
      setCall(r.state);
      if (r.say.length === 0 && !r.end) return;
      const token = ++tokenRef.current;
      void speak(r, token);
    },
    [speak],
  );
  useEffect(() => {
    applyRef.current = apply;
  }, [apply]);

  // ---------- actions de l'appelant ----------
  const press = useCallback(
    (key: Key) => {
      playKeyTone(ctxRef.current, key);
      const s = stateRef.current;
      if (!s || phaseRef.current !== "active" || s.node === "ended") return;
      cancelSpeech();
      clearSilence();
      pushLog({ kind: "key", key });
      apply(step(s, { type: "key", key }));
    },
    [apply, cancelSpeech, clearSilence, pushLog],
  );

  const start = useCallback(async () => {
    if (phaseRef.current === "ringing" || phaseRef.current === "active") return;
    // débloquer le son (clic de l'appelant)
    try {
      const a = audioRef.current;
      if (a) {
        a.src = SILENT;
        void a.play().catch(() => undefined);
      }
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx && !ctxRef.current) ctxRef.current = new Ctx();
      void ctxRef.current?.resume();
    } catch {
      // pas de Web Audio : les touches seront muettes, l'appel marche quand même
    }
    setLog([]);
    setBanner(null);
    setGuard(null);
    setPlanView(null);
    setNow(null);
    planCache.current.clear();
    phaseRef.current = "ringing";
    setPhase("ringing");
    const myRing = ++ringToken.current;
    await sleep(playRingback(ctxRef.current) || 500);
    if (myRing !== ringToken.current || phaseRef.current !== "ringing") return;
    phaseRef.current = "active";
    setPhase("active");
    window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const st = stateRef.current;
      if (!st || phaseRef.current !== "active") return;
      const r = step(st, { type: "tick", ms: 1000 });
      if (r.say.length > 0 || r.end) {
        cancelSpeech();
        clearSilence();
        apply(r);
      } else {
        stateRef.current = r.state;
        setCall(r.state);
      }
    }, 1000);
    apply(startCall());
  }, [apply, cancelSpeech, clearSilence]);

  const hangup = useCallback(() => {
    ringToken.current++;
    if (phaseRef.current === "idle" || phaseRef.current === "ended") return;
    cancelSpeech();
    clearSilence();
    const s = stateRef.current;
    if (s) {
      const r = step(s, { type: "hangup" });
      stateRef.current = r.state;
      setCall(r.state);
    }
    pushLog({ kind: "system", text: "hangup" });
    endCall();
  }, [cancelSpeech, clearSilence, endCall, pushLog]);

  return { phase, call, now, planView, log, banner, guard, speaking, loadingPlan, online, start, hangup, press };
}
