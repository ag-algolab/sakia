"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { startBedMusic } from "./bedMusic";
import type { BedMusic } from "./bedMusic";
import { useLang } from "./LangProvider";
import type { Plan } from "@/lib/plan";

// Pensé pour quelqu'un qui ne lit pas : un seul gros bouton, la voix en DARIJA TUNISIENNE, et une réponse en
// pictogrammes (goutte = arroser, main = attendre, point d'exclamation = demander à une personne).
// Le bouton est toujours en darija, quelle que soit la langue choisie pour l'écran.
// Le navigateur interdit de lancer un son sans geste : d'où le bouton, pas de lecture automatique.
// Une petite musique de fond (bedMusic.ts) accompagne la voix, très basse, pour que la voix seule n'endorme pas.

const BIG_LABEL = "اسمع النصيحة"; // « écoute le conseil » en darija
const INTRO_MS = 2200; // la musique joue seule un instant avant la voix
const OUTRO_MS = 1500;
const CACHE_PREFIX = "sakia-voice:";
const CACHE_MAX_AGE_MS = 12 * 3600 * 1000; // même seuil que le moteur : au-delà de 12 h, plus de rediffusion hors ligne
const CACHE_KEEP = 3;

export type VoiceQuery = {
  region: string;
  crop: string;
  ago: string; // "" = inconnu
  soil: string;
  system: string;
  planting: string;
  asOf?: string;
};

// Tant que la route de voix ne prend que région, culture, dernier arrosage et date de rejeu, la voix calcule avec un sol
// limoneux et le goutte-à-goutte. À passer à true quand /api/voice/bulletin accepte soil, system et planting.
const VOICE_SUPPORTS_SOIL_SYSTEM = false;

type State = "idle" | "loading" | "playing" | "error";
type Cached = { savedAt: number; mime: string; audioBase64: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function readCache(k: string): Cached | null {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_PREFIX + k) ?? "null") as Cached | null;
    return c && typeof c.audioBase64 === "string" && typeof c.savedAt === "number" ? c : null;
  } catch {
    return null;
  }
}

function writeCache(k: string, c: Cached) {
  try {
    // on ne garde que les derniers bulletins : l'espace du navigateur est petit
    const mine = Object.keys(localStorage)
      .filter((x) => x.startsWith(CACHE_PREFIX) && x !== CACHE_PREFIX + k)
      .map((x) => ({ x, at: (JSON.parse(localStorage.getItem(x) ?? "{}") as Partial<Cached>).savedAt ?? 0 }))
      .sort((a, b) => a.at - b.at);
    while (mine.length >= CACHE_KEEP) localStorage.removeItem(mine.shift()!.x);
    localStorage.setItem(CACHE_PREFIX + k, JSON.stringify(c));
  } catch {
    // stockage plein ou bloqué : tant pis, le bulletin se joue quand même
  }
}

export default function ListenHero({ query, plan }: { query: VoiceQuery; plan: Plan | null }) {
  const { t, fmtNum } = useLang();
  const [state, setState] = useState<State>("idle");
  const [cachedAgeH, setCachedAgeH] = useState<number | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const musicRef = useRef<BedMusic | null>(null);
  const runRef = useRef(0); // numéro de lecture : une lecture abandonnée ne doit pas relancer le son
  const key = JSON.stringify(query);

  useEffect(() => {
    try {
      setMusicOn(localStorage.getItem("sakia-music") !== "off");
    } catch {}
  }, []);

  const stop = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    musicRef.current?.stop(400);
    musicRef.current = null;
    setState("idle");
  }, []);

  // Si la personne change région, culture ou date : le son en cours ne correspond plus, on l'arrête.
  useEffect(() => {
    stop();
    setCachedAgeH(null);
    return () => {
      runRef.current++;
      abortRef.current?.abort();
      audioRef.current?.pause();
      musicRef.current?.stop(100);
    };
  }, [key, stop]);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    try {
      localStorage.setItem("sakia-music", next ? "on" : "off");
    } catch {}
    if (!next) {
      musicRef.current?.stop(300);
      musicRef.current = null;
    }
  };

  const onClick = async () => {
    if (state === "playing") return stop();
    if (state === "loading") return;
    const run = ++runRef.current;
    const alive = () => runRef.current === run;
    setState("loading");
    setCachedAgeH(null);
    const began = Date.now();
    if (musicOn) musicRef.current = startBedMusic(); // dans le geste de la personne, sinon le navigateur refuse
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    let payload: { audioBase64: string; mime: string } | null = null;
    try {
      const q = new URLSearchParams({ region: query.region, crop: query.crop, lang: "aeb" });
      if (query.ago !== "") q.set("ago", query.ago);
      if (query.asOf) q.set("asOf", query.asOf);
      if (VOICE_SUPPORTS_SOIL_SYSTEM) {
        q.set("soil", query.soil);
        q.set("system", query.system);
        if (query.planting) q.set("planting", query.planting);
      }
      const res = await fetch(`/api/voice/bulletin?${q}`, { signal: ctrl.signal });
      if (!res.ok) throw new Error(String(res.status));
      const body = (await res.json()) as { audioBase64: string; mime: string };
      payload = body;
      writeCache(key, { savedAt: Date.now(), mime: body.mime, audioBase64: body.audioBase64 });
    } catch (e) {
      if ((e as Error).name === "AbortError" || !alive()) return;
      // pas de réseau, ou plus de crédits de voix : on rejoue le dernier bulletin de CETTE demande, s'il est récent
      const c = readCache(key);
      if (c && Date.now() - c.savedAt <= CACHE_MAX_AGE_MS) {
        payload = c;
        setCachedAgeH((Date.now() - c.savedAt) / 3600000);
      }
    }
    if (!alive()) return;
    if (!payload) {
      musicRef.current?.stop(300);
      musicRef.current = null;
      setState("error");
      return;
    }

    try {
      const audio = new Audio(`data:${payload.mime};base64,${payload.audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => {
        if (!alive()) return;
        musicRef.current?.swell();
        const m = musicRef.current;
        setState("idle");
        window.setTimeout(() => {
          if (musicRef.current === m) musicRef.current = null;
          m?.stop(1000);
        }, OUTRO_MS);
      };
      audio.onerror = () => {
        if (!alive()) return;
        musicRef.current?.stop(300);
        musicRef.current = null;
        setState("error");
      };
      // la musique joue seule un instant, puis la voix démarre et la musique descend
      if (musicRef.current) {
        const wait = INTRO_MS - (Date.now() - began);
        if (wait > 0) await sleep(wait);
        if (!alive()) return;
        musicRef.current?.duck();
      }
      await audio.play();
      if (!alive()) return;
      setState("playing");
    } catch {
      if (!alive()) return;
      musicRef.current?.stop(300);
      musicRef.current = null;
      setState("error");
    }
  };

  // La voix est donnée pour la « norme » (sol limoneux, goutte-à-goutte) : on le dit toujours, et plus fort si les choix de la personne diffèrent.
  const showVoiceNote = !VOICE_SUPPORTS_SOIL_SYSTEM;
  const voiceDiffers = query.soil !== "limoneux" || query.system !== "goutte" || query.planting !== "";

  return (
    <section aria-label={t("listenCaption")} className="rounded-2xl bg-sakia-green p-4 text-white shadow-md">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={state === "playing"}
        aria-busy={state === "loading"}
        className="flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-white px-4 py-5 text-sakia-green active:scale-[0.99]"
      >
        <span
          aria-hidden
          className={`flex h-20 w-20 items-center justify-center rounded-full bg-sakia-green text-5xl text-white ${
            state === "playing" ? "motion-safe:animate-pulse" : ""
          }`}
        >
          {state === "loading" ? "⏳" : state === "playing" ? "⏸" : state === "error" ? "↻" : "🔊"}
        </span>
        <span dir="rtl" lang="ar-TN" className="text-3xl font-extrabold leading-tight">
          {BIG_LABEL}
        </span>
        <span className="text-sm font-semibold text-sakia-brown">{t("listenCaption")}</span>
      </button>

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={toggleMusic}
          aria-pressed={musicOn}
          aria-label={t("musicLabel")}
          title={t("musicLabel")}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
            musicOn ? "bg-white/20 text-white" : "bg-white/10 text-white/70 line-through"
          }`}
        >
          <span aria-hidden className="text-xl">
            🎵
          </span>
          {t("musicLabel")}
        </button>
        <Link href="/bulletin" className="text-sm font-semibold text-white underline">
          {t("listenFull")}
        </Link>
      </div>

      {state === "error" && (
        <p role="alert" className="mt-3 rounded-lg bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert">
          {t("listenError")}
        </p>
      )}
      {cachedAgeH != null && (
        <p role="status" className="mt-3 rounded-lg bg-white/15 p-3 text-sm font-semibold">
          {t("listenCached", {
            h:
              cachedAgeH < 1
                ? t("minutesShort", { n: Math.max(1, Math.round(cachedAgeH * 60)) })
                : t("hoursShort", { n: fmtNum(cachedAgeH, 1) }),
          })}
        </p>
      )}
      {showVoiceNote && (
        <p
          className={
            voiceDiffers
              ? "mt-3 rounded-lg bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert"
              : "mt-3 text-xs text-white/90"
          }
        >
          {t("listenVoiceDefaults")}
        </p>
      )}

      {plan && <Verdict plan={plan} />}
    </section>
  );
}

// Réponse en images : lisible sans savoir lire. Une ligne de 7 jours, une goutte les jours où il faut arroser.
function Verdict({ plan }: { plan: Plan }) {
  const { t, fmtDate } = useLang();
  const none = plan.confidence.level === "none";
  const irrigateSoon = plan.days.some((d) => d.action === "irriguer");
  const icon = none ? "⚠" : irrigateSoon ? "💧" : "✋";
  const text = none ? t("askPersonShort") : irrigateSoon ? t("irrigate") : t("wait");
  return (
    <div className="mt-4 rounded-xl bg-white/10 p-3">
      <div className="flex items-center gap-3">
        <span aria-hidden className="text-5xl leading-none">
          {icon}
        </span>
        <p className="text-xl font-extrabold">{text}</p>
        {plan.confidence.askAPerson && !none && (
          <span aria-label={t("askPersonShort")} title={t("askPersonShort")} className="ms-auto text-4xl leading-none">
            ⚠
          </span>
        )}
      </div>
      {!none && plan.days.length > 0 && (
        <ol className="mt-3 grid grid-cols-7 gap-1 text-center" aria-label={t("summary", { n: plan.days.length })}>
          {plan.days.slice(0, 7).map((d, i) => (
            <li key={d.date} className={`rounded-lg py-1 ${i === 0 ? "bg-white text-sakia-green" : "bg-white/15"}`}>
              <span className="block text-[11px] leading-tight">{fmtDate(d.date, { weekday: "short" })}</span>
              <span aria-hidden className="block text-2xl leading-tight">
                {d.action === "irriguer" ? "💧" : "·"}
              </span>
              <span className="sr-only">{d.action === "irriguer" ? t("irrigate") : t("wait")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
