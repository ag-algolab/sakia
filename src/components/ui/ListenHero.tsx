"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { startBedMusic } from "./bedMusic";
import type { BedMusic } from "./bedMusic";
import { AlertIcon, DropIcon, HandIcon, NoteIcon, RetryIcon, SpeakerIcon } from "./icons";
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
const FETCH_TIMEOUT_MS = 25000; // au-delà, on renonce : la musique ne doit jamais tourner sans fin en attendant la voix
const MUSIC_MAX_MS = 120000; // plafond de sécurité : la musique s'arrête toujours
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

// Si un jour la route de voix ne prenait plus soil, system et planting, la voix calculerait avec un sol limoneux et le
// goutte-à-goutte : passer à false pour que l'écran le dise.
const VOICE_SUPPORTS_SOIL_SYSTEM = true; // la route lit et valide soil, system et planting comme /api/plan (poste Bulletin)

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
  const [musicOn, setMusicOn] = useState(false); // éteinte par défaut
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const musicRef = useRef<BedMusic | null>(null);
  const capRef = useRef<number | null>(null);
  const runRef = useRef(0); // numéro de lecture : une lecture abandonnée ne doit pas relancer le son
  const key = JSON.stringify(query);

  useEffect(() => {
    try {
      setMusicOn(localStorage.getItem("sakia-music") === "on");
    } catch {}
  }, []);

  const stop = useCallback(() => {
    runRef.current++;
    if (capRef.current != null) window.clearTimeout(capRef.current);
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
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, FETCH_TIMEOUT_MS);
    // plafond de sécurité sur la musique, quoi qu'il arrive
    const cap = window.setTimeout(() => {
      if (runRef.current === run) musicRef.current?.stop(800);
    }, MUSIC_MAX_MS);
    capRef.current = cap;

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
      if (!alive() || ((e as Error).name === "AbortError" && !timedOut)) return;
      // pas de réseau, ou plus de crédits de voix : on rejoue le dernier bulletin de CETTE demande, s'il est récent
      const c = readCache(key);
      if (c && Date.now() - c.savedAt <= CACHE_MAX_AGE_MS) {
        payload = c;
        setCachedAgeH((Date.now() - c.savedAt) / 3600000);
      }
    }
    window.clearTimeout(timeout);
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
  const busy = state === "loading";
  const playing = state === "playing";

  return (
    <section
      aria-label={t("listenCaption")}
      className="rounded-3xl bg-white p-4 text-sakia-ink shadow-[0_18px_40px_-12px_rgba(10,40,25,0.45)] ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={playing}
        aria-busy={busy}
        className="sk-press group flex w-full flex-col items-center gap-3 rounded-2xl px-2 py-2"
      >
        <span aria-hidden className="relative grid h-32 w-32 place-items-center">
          {/* ondes : elles invitent à appuyer, et pulsent plus vite quand la voix parle */}
          <span className="sk-ripple absolute inset-0 rounded-full bg-sakia-green/30" />
          <span className="sk-ripple absolute inset-0 rounded-full bg-sakia-green/30" style={{ animationDelay: "1.3s" }} />
          <span
            className={`relative grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-[#4aa263] via-sakia-green to-sakia-green-deep text-white shadow-[0_10px_24px_-6px_rgba(18,53,36,0.7)] ring-4 ring-white ${
              busy ? "motion-safe:animate-pulse" : ""
            }`}
          >
            {playing ? (
              <span className="flex h-12 items-end gap-1.5">
                {[0, 0.18, 0.36, 0.1, 0.27].map((d, i) => (
                  <span key={i} className="sk-eq block w-2 origin-bottom rounded-full bg-white" style={{ height: "100%", animationDelay: `${d}s` }} />
                ))}
              </span>
            ) : state === "error" ? (
              <RetryIcon className="h-12 w-12" />
            ) : busy ? (
              <span className="sk-spin-fast block h-10 w-10 rounded-full border-4 border-white/40 border-t-white" />
            ) : (
              <SpeakerIcon className="h-14 w-14" />
            )}
          </span>
        </span>
        <span dir="rtl" lang="ar-TN" className="font-display text-4xl font-extrabold leading-tight text-sakia-green-deep">
          {BIG_LABEL}
        </span>
        <span className="max-w-xs text-center text-sm font-semibold leading-snug text-sakia-brown">{t("listenCaption")}</span>
      </button>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-sakia-sand-dark/60 pt-3">
        <button
          type="button"
          onClick={toggleMusic}
          aria-pressed={musicOn}
          aria-label={t("musicLabel")}
          title={t("musicLabel")}
          className={`flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold ${
            musicOn ? "bg-sakia-green-light text-sakia-green-deep" : "bg-sakia-sand text-sakia-brown/70 line-through"
          }`}
        >
          <NoteIcon className="h-5 w-5" />
          {t("musicLabel")}
        </button>
        <Link href="/bulletin" className="min-h-11 content-center text-sm font-semibold text-sakia-water underline underline-offset-2">
          {t("listenFull")}
        </Link>
      </div>

      {state === "error" && (
        <p role="alert" className="mt-3 rounded-xl bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert">
          {t("listenError")}
        </p>
      )}
      {cachedAgeH != null && (
        <p role="status" className="mt-3 rounded-xl bg-sakia-sand p-3 text-sm font-semibold text-sakia-brown">
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
              ? "mt-3 rounded-xl bg-sakia-alert-light p-3 text-sm font-semibold text-sakia-alert"
              : "mt-3 text-xs text-sakia-brown/80"
          }
        >
          {t("listenVoiceDefaults")}
        </p>
      )}

      {plan && <Verdict plan={plan} />}
    </section>
  );
}

// Réponse en images : lisible sans savoir lire. Un grand pictogramme, puis une ligne de 7 jours avec une goutte
// les jours où il faut arroser (goutte = arroser, main = attendre, triangle = demander à une personne).
function Verdict({ plan }: { plan: Plan }) {
  const { t, fmtDate } = useLang();
  const none = plan.confidence.level === "none";
  const irrigateSoon = plan.days.some((d) => d.action === "irriguer");
  const tone = none
    ? "bg-sakia-alert-light text-sakia-alert"
    : irrigateSoon
      ? "bg-sakia-water-light text-sakia-water-deep"
      : "bg-sakia-sand text-sakia-brown";
  const text = none ? t("askPersonShort") : irrigateSoon ? t("irrigate") : t("wait");
  return (
    <div className="mt-4">
      <div className={`flex items-center gap-4 rounded-2xl p-3 ${tone}`}>
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/70">
          {none ? (
            <AlertIcon className="h-9 w-9" />
          ) : irrigateSoon ? (
            <DropIcon className="sk-sway h-10 w-10" />
          ) : (
            <HandIcon className="h-9 w-9" />
          )}
        </span>
        <p className="font-display text-2xl font-extrabold leading-tight">{text}</p>
        {plan.confidence.askAPerson && !none && (
          <span title={t("askPersonShort")} className="ms-auto grid h-12 w-12 place-items-center rounded-full bg-sakia-alert-light text-sakia-alert">
            <AlertIcon className="h-7 w-7" title={t("askPersonShort")} />
          </span>
        )}
      </div>
      {!none && plan.days.length > 0 && (
        <ol className="mt-3 grid grid-cols-7 gap-1.5 text-center" aria-label={t("summary", { n: plan.days.length })}>
          {plan.days.slice(0, 7).map((d, i) => {
            const irr = d.action === "irriguer";
            return (
              <li
                key={d.date}
                className={`rounded-xl py-1.5 ${
                  irr ? "bg-sakia-water text-white" : i === 0 ? "bg-sakia-green text-white" : "bg-sakia-sand text-sakia-brown"
                }`}
              >
                <span className="block text-[11px] font-semibold leading-tight">{fmtDate(d.date, { weekday: "short" })}</span>
                <span className="mt-0.5 grid h-7 place-items-center">
                  {irr ? <DropIcon className="h-6 w-6" /> : <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />}
                </span>
                <span className="sr-only">{irr ? t("irrigate") : t("wait")}</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
