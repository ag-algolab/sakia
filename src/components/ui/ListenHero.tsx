"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { startBedMusic } from "./bedMusic";
import type { BedMusic } from "./bedMusic";
import { AlertIcon, DropIcon, HandIcon, LockIcon, RetryIcon, SpeakerIcon } from "./icons";
import { isArabic } from "./i18n";
import type { Lang } from "./i18n";
import { useLang } from "./LangProvider";
import { CLIP_BYTES_PER_SECOND, forgetAdvice, loadAdvice, prefetchAdvice, storedAdvice, subtitleAt } from "@/lib/adviceClient";
import type { AdviceQuery, Sub } from "@/lib/adviceClient";
import type { Plan } from "@/lib/plan";

// Pensé pour quelqu'un qui ne lit pas : un seul gros bouton, la voix en DARIJA TUNISIENNE, et une réponse en
// pictogrammes (goutte = arroser, main = attendre, point d'exclamation = demander à une personne).
// Le bouton est toujours en darija, quelle que soit la langue choisie pour l'écran.
// Le navigateur interdit de lancer un son sans geste : d'où le bouton, pas de lecture automatique.
// Une petite musique de fond (bedMusic.ts) accompagne TOUJOURS la voix, très basse, pour que la voix seule n'endorme pas.
// Elle est AUTOMATIQUE, comme à la télé : un bulletin météo ne demande pas « avec ou sans musique ». Aucun réglage.
// SOUS-TITRES : pendant la lecture, la phrase dite s'affiche sous le bouton, dans la langue de l'écran (en anglais pour un juré qui ne parle
// pas arabe). Ils viennent du serveur avec le son, construits à partir du même plan que la voix (adviceClient.ts). Ils ne sont qu'un
// appui de lecture : sans sous-titres reçus (vieille copie gardée), le son se joue seul.

const BIG_LABEL = "اسمع النصيحة"; // « écoute le conseil » en darija
const INTRO_MS = 1500; // la musique joue seule un instant (le jingle) avant la voix
const OUTRO_MS = 1500;
const FETCH_TIMEOUT_MS = 25000; // au-delà, on renonce : la musique ne doit jamais tourner sans fin en attendant la voix
const MUSIC_MAX_MS = 120000; // plafond de sécurité : la musique s'arrête toujours
const SUBS_LINGER_MS = 4000; // la dernière phrase reste à l'écran un instant après la fin du son : le temps de la lire
// Le message est le MESSAGE COURT (/api/advice, mp3 de 50 à 100 Ko, préparé à l'avance), chargé d'avance dès que le conseil
// s'affiche, et gardé sur l'appareil 12 h au plus (même seuil que le moteur) pour être rejoué sans connexion : src/lib/adviceClient.ts.

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Son vide de 44 octets, joué dès l'appui : sur iPhone, un lecteur n'est « débloqué » que s'il démarre pendant le geste de la
// personne, pas après une attente réseau ou l'introduction musicale. On remplace ensuite sa source par le vrai message.
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

// `locked` : la région et la culture ne sont pas encore choisies. On n'écoute pas un conseil pour une région qu'on n'a pas dite :
// le bouton est grisé, un appui renvoie vers le questionnaire (onLockedTap).
export default function ListenHero({
  query,
  plan,
  locked = false,
  onLockedTap,
}: {
  query: VoiceQuery;
  plan: Plan | null;
  locked?: boolean;
  onLockedTap?: () => void;
}) {
  const { t, fmtNum, lang } = useLang();
  const [state, setState] = useState<State>("idle");
  const [cachedAgeH, setCachedAgeH] = useState<number | null>(null);
  // sous-titres du message en cours : la langue dans laquelle ils ont été demandés, les phrases, et celle qui est dite maintenant
  const [cap, setCap] = useState<{ lang: Lang; subs: Sub[]; idx: number } | null>(null);
  const lingerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const musicRef = useRef<BedMusic | null>(null);
  const capRef = useRef<number | null>(null);
  const runRef = useRef(0); // numéro de lecture : une lecture abandonnée ne doit pas relancer le son
  const blobUrlRef = useRef<string | null>(null);
  const asked: AdviceQuery = { ...query, subs: lang }; // la demande de son, avec la langue des sous-titres (celle de l'écran)
  const key = JSON.stringify(asked);
  const hasPlan = plan != null;
  // ce que dit l'écran : une copie gardée n'est rejouée que si elle dit la même chose (niveau de fiabilité et jour du plan)
  const expect = plan ? { level: plan.confidence.level, today: plan.today } : null;

  const releaseBlob = useCallback(() => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    blobUrlRef.current = null;
  }, []);

  const clearLinger = useCallback(() => {
    if (lingerRef.current != null) window.clearTimeout(lingerRef.current);
    lingerRef.current = null;
  }, []);

  // Dès que le conseil est à l'écran, on charge le message en arrière-plan (s'il est déjà préparé côté serveur) : l'appui
  // sur le bouton joue alors tout de suite. Petit délai : on ne charge pas pendant que la personne change de choix.
  useEffect(() => {
    if (!hasPlan) return;
    const id = window.setTimeout(() => prefetchAdvice(JSON.parse(key) as AdviceQuery), 700);
    return () => window.clearTimeout(id);
  }, [key, hasPlan]);

  const stop = useCallback(() => {
    runRef.current++;
    if (capRef.current != null) window.clearTimeout(capRef.current);
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    releaseBlob();
    musicRef.current?.stop(400);
    musicRef.current = null;
    clearLinger();
    setCap(null);
    setState("idle");
  }, [releaseBlob, clearLinger]);

  // Si la personne change région, culture ou date, la page remonte ce composant (sa clé est la demande) : le son en cours ne
  // correspond plus, on l'arrête ici, au démontage. Ces références sont des compteurs et des lecteurs, pas des nœuds du DOM :
  // c'est bien leur valeur d'à ce moment-là qu'on veut.
  useEffect(
    () => () => {
      runRef.current++;
      if (capRef.current != null) window.clearTimeout(capRef.current);
      abortRef.current?.abort();
      audioRef.current?.pause();
      musicRef.current?.stop(100);
      releaseBlob();
      if (lingerRef.current != null) window.clearTimeout(lingerRef.current);
    },
    [releaseBlob],
  );

  const onClick = async () => {
    if (locked) {
      onLockedTap?.();
      return;
    }
    if (state === "playing") return stop();
    if (state === "loading") return;
    const run = ++runRef.current;
    const alive = () => runRef.current === run;
    setState("loading");
    setCachedAgeH(null);
    clearLinger();
    setCap(null);
    const began = Date.now();
    musicRef.current = startBedMusic(); // automatique ; dans le geste de la personne, sinon le navigateur refuse
    const player = new Audio(SILENT); // débloque la lecture (voir SILENT)
    audioRef.current = player;
    void player.play().catch(() => undefined);
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

    let payload: Blob | null = null;
    let subs: Sub[] = [];
    try {
      const clip = await loadAdvice(asked, expect, ctrl.signal); // déjà chargé d'avance dans la plupart des cas : instantané
      payload = clip.blob;
      subs = clip.subs;
    } catch (e) {
      if (!alive() || ((e as Error).name === "AbortError" && !timedOut)) return;
      // pas de réseau, ou plus de crédits de voix : on rejoue le dernier message de CETTE demande, s'il est récent
      const c = await storedAdvice(asked, expect);
      if (c) {
        payload = c.blob;
        subs = c.subs;
        setCachedAgeH(c.ageMs / 3600000);
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

    const clipBlob: Blob = payload;
    try {
      releaseBlob();
      blobUrlRef.current = URL.createObjectURL(payload);
      const audio = audioRef.current ?? new Audio();
      audio.setAttribute("src", blobUrlRef.current);
      audioRef.current = audio;
      audio.addEventListener(
        "ended",
        () => {
          if (!alive()) return;
          releaseBlob();
          musicRef.current?.swell();
          const m = musicRef.current;
          setState("idle");
          if (subs.length > 0) lingerRef.current = window.setTimeout(() => setCap(null), SUBS_LINGER_MS);
          window.setTimeout(() => {
            if (musicRef.current === m) musicRef.current = null;
            m?.stop(1000);
          }, OUTRO_MS);
        },
        { once: true },
      );
      audio.addEventListener(
        "error",
        () => {
          if (!alive()) return;
          void forgetAdvice(asked); // fichier illisible : on ne le rejouera pas pendant 12 h
          musicRef.current?.stop(300);
          musicRef.current = null;
          setCap(null);
          setState("error");
        },
        { once: true },
      );
      // la phrase affichée suit la lecture (simple proportion des lettres dites : voir subtitleAt)
      if (subs.length > 0) {
        audio.addEventListener("timeupdate", () => {
          if (!alive()) return;
          const d = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : clipBlob.size / CLIP_BYTES_PER_SECOND;
          const i = subtitleAt(subs, audio.currentTime, d);
          setCap((c) => (c && c.idx !== i ? { ...c, idx: i } : c));
        });
      }
      // la musique joue seule un instant, puis la voix démarre et la musique descend
      if (musicRef.current) {
        const wait = INTRO_MS - (Date.now() - began);
        if (wait > 0) await sleep(wait);
        if (!alive()) return;
        musicRef.current?.duck();
      }
      await audio.play();
      if (!alive()) return;
      setCap(subs.length > 0 ? { lang, subs, idx: 0 } : null);
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
      id="listen"
      aria-label={t("listenCaption")}
      className="rounded-3xl bg-white p-4 text-sakia-ink shadow-[0_18px_40px_-12px_rgba(10,40,25,0.45)] ring-1 ring-black/5"
    >
      <button
        type="button"
        onClick={onClick}
        aria-pressed={playing}
        aria-busy={busy}
        aria-disabled={locked}
        className="sk-press group flex w-full flex-col items-center gap-3 rounded-2xl px-2 py-2"
      >
        <span aria-hidden className="relative grid h-28 w-28 place-items-center sm:h-32 sm:w-32">
          {/* ondes : elles invitent à appuyer, et pulsent plus vite quand la voix parle */}
          {!locked && (
            <>
              <span className="sk-ripple absolute inset-0 rounded-full bg-sakia-green/30" />
              <span className="sk-ripple absolute inset-0 rounded-full bg-sakia-green/30" style={{ animationDelay: "1.3s" }} />
            </>
          )}
          <span
            className={`relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br sm:h-28 sm:w-28 text-white ring-4 ring-white ${
              locked
                ? "from-[#a5b0a9] via-[#8a968f] to-[#6c7872]"
                : "from-[#4aa263] via-sakia-green to-sakia-green-deep shadow-[0_10px_24px_-6px_rgba(18,53,36,0.7)]"
            } ${busy ? "motion-safe:animate-pulse" : ""}`}
          >
            {locked ? (
              <LockIcon className="h-12 w-12 sm:h-14 sm:w-14" />
            ) : playing ? (
              <span className="flex h-12 items-end gap-1.5">
                {[0, 0.18, 0.36, 0.1, 0.27].map((d, i) => (
                  <span key={i} className="sk-eq block w-2 origin-bottom rounded-full bg-white" style={{ height: "100%", animationDelay: `${d}s` }} />
                ))}
              </span>
            ) : state === "error" ? (
              <RetryIcon className="h-12 w-12" />
            ) : busy ? (
              <span className="sk-spinner block h-10 w-10 rounded-full border-4 border-white/40 border-t-white" />
            ) : (
              <SpeakerIcon className="h-12 w-12 sm:h-14 sm:w-14" />
            )}
          </span>
        </span>
        <span dir="rtl" lang="ar-TN" className="font-display text-3xl font-extrabold leading-tight text-sakia-green-deep sm:text-4xl">
          {BIG_LABEL}
        </span>
        <span aria-live="polite" className={`max-w-xs text-center text-sm font-semibold leading-snug ${locked ? "text-sakia-alert" : busy ? "text-sakia-green" : "text-sakia-brown"}`}>
          {locked ? t("lockedListen") : busy ? t("listenLoading") : t("listenCaption")}
        </span>
      </button>

      {!locked && cap && cap.lang === lang && <Subtitles subs={cap.subs} idx={cap.idx} lang={lang} />}

      {!locked && (
        <>
      <div className="mt-2 flex items-center justify-center border-t border-sakia-sand-dark/60 pt-2">
        <Link href="/bulletin" className="min-h-11 content-center text-base font-bold text-sakia-water-deep underline underline-offset-2">
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

        </>
      )}

      {plan && <Verdict plan={plan} />}
    </section>
  );
}

// Sous-titres : la phrase dite en ce moment, dans la langue de l'écran (« aeb » : le texte dit lui-même). La bande garde la hauteur de trois
// lignes pour que la page ne saute pas à chaque phrase. Sur un ordinateur de 900 px de haut, le gros bouton est tout en bas de la première
// page et des sous-titres juste dessous seraient hors de vue : à son apparition, la page défile juste ce qu'il faut pour les montrer (une
// seule fois, sans animation si la personne a demandé moins de mouvement). Elle n'est pas annoncée par les lecteurs d'écran (elle se
// superposerait à la voix) : le texte complet leur est donné une fois, dans un bloc masqué.
function Subtitles({ subs, idx, lang }: { subs: Sub[]; idx: number; lang: Lang }) {
  const { t } = useLang();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    box.current?.scrollIntoView({ block: "nearest", behavior: calm ? "auto" : "smooth" });
  }, []);
  const cur = subs[Math.min(Math.max(idx, 0), subs.length - 1)];
  const rtl = isArabic(lang);
  const htmlLang = lang === "aeb" ? "ar-TN" : lang;
  const unsure = cur.id === "unsure";
  return (
    <div ref={box} role="group" aria-label={t("listenSubs")} className="mt-1 scroll-mb-4 rounded-2xl bg-sakia-green-deep px-4 py-3 text-white">
      <p
        aria-hidden
        lang={htmlLang}
        dir={rtl ? "rtl" : "ltr"}
        className={`flex min-h-[4.5rem] items-center justify-center text-center text-base font-semibold leading-snug sm:min-h-[5rem] sm:text-lg ${unsure ? "text-[#ffd9a8]" : ""}`}
      >
        {unsure && <span className="me-1.5">⚠</span>}
        {cur.text}
      </p>
      <p lang={htmlLang} dir={rtl ? "rtl" : "ltr"} className="sr-only">
        {subs.map((x) => x.text).join(" ")}
      </p>
    </div>
  );
}

// Réponse en images : lisible sans savoir lire. Un grand pictogramme, puis une ligne de 7 jours avec une goutte
// les jours où il faut arroser (goutte = arroser, main = attendre, triangle = demander à une personne).
function Verdict({ plan }: { plan: Plan }) {
  const { t, fmtDate } = useLang();
  const none = plan.confidence.level === "none";
  // Le titre répond à « et aujourd'hui ? » : arroser aujourd'hui, ou attendre jusqu'à tel jour, ou rien cette semaine.
  const today = plan.days[0]?.action === "irriguer";
  const next = plan.days.find((d) => d.action === "irriguer");
  const tone = none
    ? "bg-sakia-alert-light text-sakia-alert"
    : today
      ? "bg-sakia-water-light text-sakia-water-deep"
      : "bg-sakia-sand text-sakia-brown";
  const text = none
    ? t("askPersonShort")
    : today
      ? t("verdictToday")
      : next
        ? t("verdictLater", { day: fmtDate(next.date) })
        : t("noWateringTitle");
  return (
    <div className="mt-4">
      <div className={`flex items-center gap-4 rounded-2xl p-3 ${tone}`}>
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/70">
          {none ? (
            <AlertIcon className="h-9 w-9" />
          ) : today ? (
            <DropIcon className="sk-sway h-10 w-10" />
          ) : (
            <HandIcon className="h-9 w-9" />
          )}
        </span>
        <p className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{text}</p>
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
                  irr ? "bg-sakia-water-deep text-white" : i === 0 ? "bg-sakia-green text-white" : "bg-sakia-sand text-sakia-brown"
                }`}
              >
                <span className="block text-xs font-semibold leading-tight">{fmtDate(d.date, { weekday: "short" })}</span>
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
