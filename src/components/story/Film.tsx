"use client";

import "./film.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useFilmData } from "./data";
import { clamp, sceneOpacityOf } from "./timeline";
import { FILMS } from "./defs";
import type { FilmKey } from "./defs";

// Sakia, l'histoire : un film de 97 secondes qui se joue dans le navigateur, avec les vrais chiffres du moteur.
//   /story             lecteur normal (bouton de lecture, commandes, chapitres)
//   /story?rec=1       mode enregistrement : pas de commandes, démarre seul au bout d'une seconde (pour filmer l'écran)
//   /story?cam=1       montre un cercle pointillé : l'endroit laissé libre pour la tête d'Anthony
//   /story?t=45        se place à la seconde 45, en pause
// Clavier : espace = lecture / pause, ← → = ±5 s, Maj + ← → = chapitre, F = plein écran, H = masquer les commandes, C = cercle caméra, R = début.


const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// Lecture de l'adresse et des préférences du navigateur, sans état ni effet : le serveur rend la valeur par défaut.
const noop = () => () => {};
const subscribeHydrated = noop;
const subscribeSearch = noop;
const useHydrated = () => useSyncExternalStore(subscribeHydrated, () => true, () => false);
const useSearch = () => useSyncExternalStore(subscribeSearch, () => window.location.search, () => "");

const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (cb: () => void) => {
  const mq = window.matchMedia(motionQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useReducedMotion = () => useSyncExternalStore(subscribeMotion, () => window.matchMedia(motionQuery).matches, () => false);

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
const useWindowSize = () => useSyncExternalStore(subscribeResize, () => `${window.innerWidth}x${window.innerHeight}`, () => "1920x1080");

export default function Film({ film = "main" }: { film?: FilmKey }) {
  const def = FILMS[film];
  const { posterT, total, cuts, scenes } = def;
  const data = useFilmData(film === "main");
  const rootRef = useRef<HTMLElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const hydrated = useHydrated();
  const search = useSearch();
  const reduced = useReducedMotion();
  const size = useWindowSize();

  const q = useMemo(() => new URLSearchParams(search), [search]);
  const rawT = q.get("t");
  const tParam = rawT !== null && rawT.trim() !== "" && Number.isFinite(Number(rawT)) ? clamp(Number(rawT), 0, total) : null;
  const recParam = q.get("rec") === "1";
  const camParam = q.get("cam") === "1";
  const autoRec = recParam && tParam === null && !reduced; // enregistrement : pas d'affiche, on part de la première image

  const tRef = useRef<number | null>(null);
  const [tState, setTState] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startedState, setStarted] = useState(false);
  const [recToggle, setRecToggle] = useState<boolean | null>(null);
  const [camToggle, setCamToggle] = useState<boolean | null>(null);
  const [idle, setIdle] = useState(false);

  const t = tState ?? tParam ?? (autoRec ? 0 : posterT);
  const started = startedState || tParam !== null || autoRec;
  const rec = recToggle ?? recParam;
  const cam = camToggle ?? camParam;
  const getT = useCallback(() => tRef.current ?? tParam ?? (autoRec ? 0 : posterT), [tParam, autoRec, posterT]);
  const normalStops = useMemo(() => cuts.slice(0, -1), [cuts]);
  const stops = reduced ? def.settled : normalStops;

  const seek = useCallback((s: number) => {
    tRef.current = clamp(s, 0, total);
    setTState(tRef.current);
  }, [total]);

  const begin = useCallback(() => {
    seek(0);
    setStarted(true);
    setPlaying(true);
  }, [seek]);

  const toggle = useCallback(() => {
    if (!started || getT() >= total) return begin();
    setPlaying((p) => !p);
  }, [started, begin, getT, total]);

  // Chapitre (scène) d'un instant, et arrêt de navigation le plus proche en arrière.
  const chapterOf = useCallback((s: number) => {
    let i = 0;
    while (i < scenes.length - 1 && s >= cuts[i + 1]) i++;
    return i;
  }, [scenes, cuts]);
  const stopOf = useCallback(
    (s: number) => {
      let i = 0;
      while (i < stops.length - 1 && s >= stops[i + 1] - 0.05) i++;
      return i;
    },
    [stops],
  );
  const goStop = useCallback(
    (i: number) => {
      if (i > stops.length - 1) return; // déjà au dernier arrêt
      setStarted(true);
      seek(stops[Math.max(0, i)]);
    },
    [stops, seek],
  );
  const prevStop = useCallback(() => {
    const now = getT();
    const i = stopOf(now);
    goStop(now - stops[i] > (reduced ? 0.1 : 1.5) ? i : i - 1);
  }, [getT, stopOf, goStop, stops, reduced]);
  const nextStop = useCallback(() => goStop(stopOf(getT()) + 1), [getT, stopOf, goStop]);

  // Mode enregistrement : le film démarre seul une seconde après l'ouverture de la page.
  useEffect(() => {
    if (!autoRec) return;
    const id = window.setTimeout(begin, 1200);
    return () => window.clearTimeout(id);
  }, [autoRec, begin]);

  // Horloge.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      seek(getT() + dt);
      if (getT() >= total) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, seek, getT, total]);

  // La page n'a rien d'autre à faire défiler, et l'en-tête du site (caché sous le film) ne doit pas recevoir le clavier.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const root = rootRef.current;
    const hidden: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (!(el instanceof HTMLElement) || el === root || (root && el.contains(root))) continue;
      if (["SCRIPT", "STYLE", "LINK", "NEXTJS-PORTAL"].includes(el.tagName) || el.inert) continue;
      el.inert = true;
      hidden.push(el);
    }
    return () => {
      document.body.style.overflow = prev;
      for (const el of hidden) el.inert = false;
    };
  }, []);

  // Les commandes se cachent quand la souris ne bouge plus pendant la lecture.
  const idleTimer = useRef<number | null>(null);
  const wake = useCallback(() => {
    setIdle(false);
    if (idleTimer.current) window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2800);
  }, []);
  useEffect(
    () => () => {
      if (idleTimer.current) window.clearTimeout(idleTimer.current);
    },
    [],
  );

  const fullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void el.requestFullscreen?.()?.catch(() => {});
  }, []);

  // Clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // les raccourcis du navigateur restent au navigateur
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.repeat && (key === " " || key === "k" || key === "f" || key === "r" || key === "h" || key === "c")) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      switch (key) {
        case " ":
        case "k":
          if (tag === "BUTTON") return; // un bouton réagit déjà à la barre d'espace
          e.preventDefault();
          toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) nextStop();
          else seek(getT() + 5);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) prevStop();
          else seek(getT() - 5);
          break;
        case "Home":
        case "r":
          seek(reduced ? stops[0] : 0);
          break;
        case "f":
          fullscreen();
          break;
        case "h":
          setRecToggle((v) => !(v ?? recParam));
          break;
        case "c":
          setCamToggle((v) => !(v ?? camParam));
          break;
      }
      wake();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, nextStop, prevStop, seek, fullscreen, wake, getT, recParam, camParam, reduced, stops]);

  // Mise à l'échelle de la scène 1920 × 1080 dans la fenêtre.
  const [w, h] = size.split("x").map(Number);
  const k = Math.min(w / 1920, h / 1080);
  const view = { k, x: (w - 1920 * k) / 2, y: (h - 1080 * k) / 2 };

  const chapter = chapterOf(t);
  const ended = t >= total;
  const hideUi = !hydrated || rec || (playing && idle);

  return (
    <main
      ref={rootRef}
      className={`film-root${hideUi ? " film-hide-cursor" : ""}`}
      style={{ visibility: hydrated ? "visible" : "hidden" }}
      aria-label={def.ariaLabel}
      onPointerMove={wake}
      onPointerDown={wake}
    >
      <div className="film-stage" aria-hidden="true" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, background: def.backdrop(t) }}>
        {scenes.map((s, i) => {
          const op = sceneOpacityOf(scenes, i, t);
          if (op <= 0.001) return null;
          const View = def.views[i];
          return (
            <div key={s.id} className="film-layer" style={{ opacity: op, transform: `scale(${1 + (1 - op) * 0.012})` }}>
              <View t={t - s.start} data={data} />
            </div>
          );
        })}
        <div className="film-vignette" />
        {cam && <div className="film-cam">Your face here</div>}
      </div>

      {!started && (
        <div className="film-poster">
          <button
            type="button"
            className="film-play"
            onClick={() => {
              begin();
              playRef.current?.focus();
            }}
            aria-label={`Play: ${def.posterLabel}`}
          >
            <svg viewBox="0 0 24 24" width="72" height="72" aria-hidden>
              <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
            </svg>
          </button>
          <p>{def.posterLabel}</p>
          {reduced && <p style={{ fontSize: 24 }}>Reduced motion is on: use the chapter buttons below.</p>}
        </div>
      )}

      <div className="film-rotate">This film is made for a wide screen. Turn your phone sideways.</div>

      {/* commandes */}
      <div className="film-ui" data-hidden={hideUi ? "true" : "false"} style={{ zIndex: 7 }}>
        <button type="button" className="film-btn" onClick={prevStop} aria-label="Previous chapter">
          ⏮
        </button>
        <button ref={playRef} type="button" className="film-btn" onClick={toggle} aria-label={playing ? "Pause" : ended ? "Replay" : "Play"} style={{ minWidth: 120 }}>
          {playing ? "⏸ Pause" : ended ? "↻ Replay" : "▶ Play"}
        </button>
        <button type="button" className="film-btn" onClick={nextStop} aria-label="Next chapter">
          ⏭
        </button>
        <span className="film-time">
          {clock(t)} / {clock(total)}
        </span>
        <div className="film-scrub">
          <div className="film-ticks" aria-hidden>
            {cuts.slice(1, -1).map((c) => (
              <i key={c} style={{ left: `${(c / total) * 100}%` }} />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={total}
            step={0.01}
            value={t}
            aria-label={`Position in the film. Chapter: ${scenes[chapter].label}`}
            aria-valuetext={`${clock(t)} of ${clock(total)}`}
            onChange={(e) => {
              setStarted(true);
              seek(Number(e.target.value));
            }}
            onPointerUp={(e) => e.currentTarget.blur()}
          />
        </div>
        <span className="film-chapter">{scenes[chapter].label}</span>
        <button type="button" className="film-btn film-opt" aria-pressed={cam} onClick={() => setCamToggle(!cam)} title="Show where your face goes (C)">
          Face guide
        </button>
        <button type="button" className="film-btn film-opt" aria-pressed={rec} onClick={() => setRecToggle(!rec)} title="Hide these controls to film the screen. Press H to bring them back.">
          Hide controls (H)
        </button>
        <button type="button" className="film-btn film-opt" onClick={fullscreen} title="Full screen (F)">
          Full screen
        </button>
        <Link href="/" className="film-btn" style={{ textDecoration: "none" }}>
          ← Sakia
        </Link>
      </div>

      <div className="film-sr">
        <h1>{def.title}</h1>
        {def.transcript.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </main>
  );
}
