"use client";

// Plateau de télé : présentatrice dessinée, bouche pilotée par le volume réel du son (Web Audio),
// sous-titres calés sur l'alignement ElevenLabs. Fonctionne sans réseau avec les bulletins enregistrés
// (public/audio/demo-*.json).
//
// ÉCRAN PAR DÉFAUT : la présentatrice, les sous-titres et UN gros bouton « Écouter ».
//  - région et culture n'ont AUCUNE valeur par défaut. Si le profil de l'appareil (localStorage, clé « sakia-form », écrite
//    par l'accueil) les contient, on les reprend ; sinon la question « où êtes-vous, que cultivez-vous ? » s'affiche au-dessus
//    du bouton, qui reste inactif (et dit pourquoi) tant que les deux ne sont pas choisis. Sol, système, dernier arrosage et
//    date de semis sont LUS dans le même profil ;
//  - la langue de l'interface est celle des boutons de l'en-tête du site (clé « sakia-lang », via useLang) ;
//  - la musique de fond accompagne TOUJOURS le bulletin, comme à la télé (personne ne demande « avec ou sans musique ») et comme
//    sur l'accueil : seule un instant, baissée sous la voix, puis elle remonte et s'éteint, avec un plafond de durée. Le
//    bouton « son » coupe la voix ET la musique ;
//  - la voix est en darija par défaut ; le reste (langue de la voix, région et culture, son, sous-titres, bulletins
//    enregistrés) est dans le volet replié « Options ».
// Une fois le bulletin lu, ce qu'il faut savoir apparaît (pas sûr, pluie signalée, provenance) : ce sont des résultats,
// pas des réglages.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { startBedMusic } from "@/components/ui/bedMusic";
import type { BedMusic } from "@/components/ui/bedMusic";
import { useLang } from "@/components/ui/LangProvider";
import { isArabic } from "@/components/ui/i18n";
import type { Band, BulletinPayload } from "@/lib/voice/band";
import { VOICE_LANGS, htmlLangOf, rtlOf } from "@/lib/voice/langs";
import type { VoiceLang } from "@/lib/voice/langs";
import Backdrop from "./Backdrop";
import Presenter from "./Presenter";
import { createPose, findParts } from "./presenterPose";
import RainReportButton from "./RainReportButton";
import { LOCALES, STRINGS } from "./strings";
import type { UiLang } from "./strings";

type Opt = { id: string; fr: string; ar: string; ko?: string; en?: string };
export type DemoMeta = { id: string; title: string; lang: VoiceLang; region: string; crop: string; replayOf?: string; recordedAt: string; fictionalReports?: boolean };
type Loaded = BulletinPayload & { blobUrl: string; sizeKb: number; title?: string };
type Fallback = "offline" | "budget" | "error" | null;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const FORM_KEY = "sakia-form"; // rempli par l'accueil : { region, crop, soil, system, ago, planting }
const VOICE_KEY = "sakia-bulletin-voice"; // dernière langue de voix choisie dans « Options »
const SOILS = ["sableux", "limoneux", "argileux"];
const SYSTEMS = ["goutte", "aspersion", "gravitaire"];
// La musique, mêmes valeurs que l'accueil (components/ui/ListenHero.tsx) : elle ne tourne jamais sans fin.
const INTRO_MS = 1500; // la musique joue seule ce temps avant la voix, même si le bulletin est déjà prêt (bulletins enregistrés)
const OUTRO_MS = 1500; // à la fin du bulletin, la musique remonte puis s'éteint
const FETCH_TIMEOUT_MS = 25000; // la voix « en direct » ne répond pas : on renonce et on lit un bulletin enregistré
const MUSIC_MAX_MS = 120000; // plafond de sécurité : la musique s'arrête toujours
const VOICE_SUFFIX = / · [^·]*\bvoice(?: \([^)]*\))?$/; // fin des titres de bulletins enregistrés : « · French voice », « · Korean voice (한국어) »
// Une requête qui ne répond jamais (mauvais réseau) ne doit pas laisser l'écran sur « Préparation… » : au bout de FETCH_TIMEOUT_MS
// on renonce (message d'erreur, bouton « Écouter » de nouveau actif). Navigateur trop ancien pour AbortSignal.timeout : pas de délai.
const timeoutSignal = (): AbortSignal | undefined => (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(FETCH_TIMEOUT_MS) : undefined);

// Profil de l'agriculteur gardé sur l'appareil par l'accueil. Relu à chaque clic sur « Écouter » : toujours à jour.
function readForm(): { region?: string; crop?: string; soil?: string; system?: string; ago?: string; planting?: string } {
  try {
    const f = JSON.parse(localStorage.getItem(FORM_KEY) ?? "null") as Record<string, unknown> | null;
    if (!f || typeof f !== "object") return {};
    const s = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
    const ago = s(f.ago);
    const planting = s(f.planting);
    return {
      region: s(f.region) || undefined,
      crop: s(f.crop) || undefined,
      soil: SOILS.includes(s(f.soil)) ? s(f.soil) : undefined,
      system: SYSTEMS.includes(s(f.system)) ? s(f.system) : undefined,
      ago: /^[0-7]$/.test(ago) ? ago : undefined,
      planting: /^\d{4}-\d{2}-\d{2}$/.test(planting) ? planting : undefined,
    };
  } catch {
    return {};
  }
}

// Profil sur l'appareil (la clé que l'accueil lit aussi) : on ne change que la région et la culture, le reste est conservé.
function saveProfile(region: string, crop: string) {
  if (!region || !crop) return;
  try {
    const old = JSON.parse(localStorage.getItem(FORM_KEY) ?? "null");
    localStorage.setItem(FORM_KEY, JSON.stringify({ ...(old && typeof old === "object" ? old : {}), region, crop }));
  } catch {}
}

export default function BulletinPlayer({ regions, crops, demos }: { regions: Opt[]; crops: Opt[]; demos: DemoMeta[] }) {
  const { lang: siteLang } = useLang(); // boutons FR / EN / TN / AR de l'en-tête
  const ui: UiLang = siteLang;
  const [region, setRegion] = useState(""); // jamais Kairouan « par défaut » : lu du profil de l'appareil, sinon demandé
  const [crop, setCrop] = useState("");
  const [needsPlace, setNeedsPlace] = useState(false); // vrai tant que la personne n'a pas dit où elle est et ce qu'elle cultive
  const [lang, setLang] = useState<VoiceLang>("aeb"); // voix en darija par défaut
  const [subMode, setSubMode] = useState<"en" | "spoken">("en");
  const [muted, setMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fallback, setFallback] = useState<Fallback>(null);
  const [idx, setIdx] = useState(-1);

  const t = STRINGS[ui];
  const locale = LOCALES[ui];
  const rtl = isArabic(siteLang);

  // région et culture de l'accueil, langue de voix mémorisée : lues après l'affichage (pas d'écart serveur/navigateur)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const f = readForm();
      const okRegion = !!f.region && regions.some((r) => r.id === f.region);
      const okCrop = !!f.crop && crops.some((c) => c.id === f.crop);
      if (okRegion) setRegion(f.region!);
      if (okCrop) setCrop(f.crop!);
      setNeedsPlace(!(okRegion && okCrop)); // profil absent ou incomplet : on pose la question avant le premier bulletin
      try {
        const v = localStorage.getItem(VOICE_KEY);
        if (v && VOICE_LANGS.some((l) => l.code === v)) setLang(v as VoiceLang);
      } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, [regions, crops]);

  const chooseRegion = (id: string) => {
    setRegion(id);
    if (!needsPlace) saveProfile(id, crop);
  };
  const chooseCrop = (id: string) => {
    setCrop(id);
    if (!needsPlace) saveProfile(region, id);
  };

  const chooseVoice = (code: VoiceLang) => {
    setLang(code);
    try {
      localStorage.setItem(VOICE_KEY, code);
    } catch {}
  };

  // --- refs : audio, graphe Web Audio, présentatrice
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(false);
  const linesRef = useRef<Loaded["lines"]>([]);
  const idxRef = useRef(-1);
  const listRef = useRef<HTMLOListElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const regionRef = useRef<HTMLSelectElement | null>(null);
  const cropRef = useRef<HTMLSelectElement | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const musicRef = useRef<BedMusic | null>(null);
  const capRef = useRef<number | null>(null); // minuteur du plafond de durée de la musique
  const runRef = useRef(0); // numéro de la lecture en cours : une préparation abandonnée (autre clic, page quittée) ne lance jamais la voix
  const startingRef = useRef(false); // vrai pendant la préparation : la pause qu'on s'impose alors n'éteint pas la musique neuve
  const stopMusic = useCallback((fadeMs = 300) => {
    musicRef.current?.stop(fadeMs);
    musicRef.current = null;
  }, []);
  const clearCap = useCallback(() => {
    if (capRef.current != null) window.clearTimeout(capRef.current);
    capRef.current = null;
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 1;
    if (muted) stopMusic(300); // son coupé : la musique aussi
  }, [muted, stopMusic]);

  // --- boucle d'animation : bouche, clignement, sous-titres, barre de progression
  useEffect(() => {
    let raf = 0;
    let open = 0;
    const pose = createPose(findParts(svgRef.current));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let buf: Uint8Array<ArrayBuffer> | null = null;
    const loop = (now: number) => {
      const audio = audioRef.current;
      const isPlaying = !!audio && !audio.paused && !audio.ended;

      let target = 0;
      if (isPlaying) {
        const an = analyserRef.current;
        if (an) {
          if (!buf || buf.length !== an.fftSize) buf = new Uint8Array(new ArrayBuffer(an.fftSize));
          an.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) {
            const d = (buf[i] - 128) / 128;
            sum += d * d;
          }
          target = clamp((Math.sqrt(sum / buf.length) - 0.015) * 7, 0, 1);
        } else {
          target = 0.35 + 0.3 * Math.sin(now / 70); // pas de Web Audio : mouvement de repli
        }
      }
      open += (target - open) * (target > open ? 0.55 : 0.25);
      pose(open, now, reduce.matches);

      if (audio && linesRef.current.length) {
        const ms = audio.currentTime * 1000;
        let i = -1;
        linesRef.current.forEach((l, k) => {
          if (ms >= l.startMs) i = k;
        });
        if (!isPlaying && audio.currentTime === 0) i = -1;
        if (i !== idxRef.current) {
          idxRef.current = i;
          setIdx(i);
        }
        // la barre est posée directement (pas de rendu React 60 fois par seconde)
        if (barRef.current) barRef.current.style.width = `${audio.duration ? (audio.currentTime / audio.duration) * 100 : 0}%`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // la ligne courante reste visible dans le texte complet (sans faire défiler la page)
  useEffect(() => {
    const ol = listRef.current;
    const li = ol?.children[idx] as HTMLElement | undefined;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (ol && li) ol.scrollTo({ top: li.offsetTop - ol.clientHeight / 2 + li.clientHeight / 2, behavior: calm ? "auto" : "smooth" });
  }, [idx]);

  useEffect(() => {
    return () => {
      runRef.current += 1; // page quittée : une préparation en cours ne lancera pas la voix ailleurs
      if (capRef.current != null) window.clearTimeout(capRef.current);
      const url = loadedUrl.current;
      if (url) URL.revokeObjectURL(url);
      musicRef.current?.stop(100);
    };
  }, []);

  const ensureGraph = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!ctxRef.current) {
      const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024; // ~23 ms : une enveloppe plus stable, donc une bouche plus fluide
      const gain = ctx.createGain();
      gain.gain.value = mutedRef.current ? 0 : 1;
      src.connect(analyser);
      analyser.connect(gain); // le son coupé = gain à 0 APRÈS l'analyseur : la bouche bouge encore
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      analyserRef.current = analyser;
      gainRef.current = gain;
    }
    if (ctxRef.current.state === "suspended") await ctxRef.current.resume();
  }, []);

  const toLoaded = useCallback(async (p: BulletinPayload, title?: string): Promise<Loaded> => {
    let blob: Blob;
    if (p.audioBase64) {
      const bin = atob(p.audioBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      blob = new Blob([bytes], { type: p.mime });
    } else {
      const r = await fetch(p.audioUrl!, { signal: timeoutSignal() });
      if (!r.ok) throw new Error("audio");
      blob = await r.blob();
    }
    if (loadedUrl.current) URL.revokeObjectURL(loadedUrl.current);
    const blobUrl = URL.createObjectURL(blob);
    loadedUrl.current = blobUrl;
    return { ...p, audioBase64: undefined, blobUrl, sizeKb: Math.round(blob.size / 1024), title };
  }, []);

  const fetchDemo = useCallback(
    async (id: string, reason: Fallback) => {
      const r = await fetch(`/audio/demo-${id}.json`, { signal: timeoutSignal() });
      if (!r.ok) throw new Error("demo");
      const j = (await r.json()) as BulletinPayload & { title?: string };
      setFallback(reason);
      return toLoaded(j, j.title);
    },
    [toLoaded],
  );

  const pickDemo = useCallback(() => {
    return (
      demos.find((d) => d.region === region && d.crop === crop && d.lang === lang && !d.replayOf && !d.fictionalReports) ??
      demos.find((d) => d.lang === lang && !d.fictionalReports) ??
      demos[0]
    );
  }, [demos, region, crop, lang]);

  const start = useCallback(
    async (source: "auto" | string) => {
      if (source === "auto" && (!region || !crop)) return; // on ne devine pas le lieu : il faut d'abord le choisir
      const run = ++runRef.current;
      const live = () => run === runRef.current;
      startingRef.current = true;
      setFailed(false);
      setBusy(true);
      if (source === "auto" && needsPlace) {
        saveProfile(region, crop);
        setNeedsPlace(false);
      }
      const audio = audioRef.current!;
      audio.pause();
      // la musique démarre dans le geste de la personne (le navigateur l'exige), TOUJOURS, sauf son coupé ;
      // elle joue seule un instant, puis la voix la baisse dès qu'elle parle
      stopMusic(0);
      clearCap();
      const musicAt = performance.now();
      if (!mutedRef.current) {
        musicRef.current = startBedMusic();
        // plafond de sécurité, quoi qu'il arrive
        capRef.current = window.setTimeout(() => {
          if (live()) stopMusic(800);
        }, MUSIC_MAX_MS);
      }
      try {
        // premier geste utilisateur : le contexte audio doit être créé ici
        await ensureGraph();
        let item: Loaded;
        if (source !== "auto") {
          item = await fetchDemo(source, null);
        } else if (typeof navigator !== "undefined" && !navigator.onLine) {
          const d = pickDemo();
          if (!d) throw new Error("no-demo");
          item = await fetchDemo(d.id, "offline");
        } else {
          let timedOut = false;
          const ctrl = new AbortController();
          const timer = window.setTimeout(() => {
            timedOut = true;
            ctrl.abort();
          }, FETCH_TIMEOUT_MS);
          try {
            // le profil de l'agriculteur (sol, système, dernier arrosage, semis) vient de l'accueil : on ne le redemande pas
            const f = readForm();
            const q = new URLSearchParams({ region, crop, lang });
            if (f.soil) q.set("soil", f.soil);
            if (f.system) q.set("system", f.system);
            if (f.ago) q.set("ago", f.ago);
            if (f.planting) q.set("planting", f.planting);
            const r = await fetch(`/api/voice/bulletin?${q.toString()}`, { signal: ctrl.signal });
            if (!r.ok) {
              const reason: Fallback = r.status === 503 ? "budget" : "error";
              const d = pickDemo();
              if (!d) throw new Error("no-demo");
              item = await fetchDemo(d.id, reason);
            } else {
              setFallback(null);
              item = await toLoaded((await r.json()) as BulletinPayload);
            }
          } catch (e) {
            if ((e as Error).message === "no-demo") throw e;
            const d = pickDemo();
            if (!d) throw e;
            item = await fetchDemo(d.id, timedOut ? "error" : "offline"); // la voix n'a pas répondu à temps, ou pas de réseau
          } finally {
            window.clearTimeout(timer);
          }
        }
        if (!live()) return;
        // « la musique seule un instant » : si le bulletin était déjà prêt, on laisse l'intro se faire entendre
        const wait = musicRef.current ? INTRO_MS - (performance.now() - musicAt) : 0;
        if (wait > 0) await new Promise<void>((done) => window.setTimeout(done, wait));
        if (!live()) return;
        linesRef.current = item.lines;
        idxRef.current = -1;
        setIdx(-1);
        setLoaded(item);
        audio.src = item.blobUrl;
        await audio.play();
      } catch {
        if (live()) {
          stopMusic(300);
          clearCap();
          setFailed(true);
        }
      } finally {
        if (live()) {
          startingRef.current = false;
          setBusy(false);
        }
      }
    },
    [clearCap, crop, ensureGraph, fetchDemo, lang, needsPlace, pickDemo, region, stopMusic, toLoaded],
  );

  const stop = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    stopMusic(300);
    clearCap();
    idxRef.current = -1;
    setIdx(-1);
  };

  // --- ce qui manque pour écouter
  const placeMissing = needsPlace && (!region || !crop);
  const focusMissing = () => (region ? cropRef : regionRef).current?.focus();
  // la présentatrice doit se voir quand elle parle : si le plateau est (en partie) hors écran, on y remonte.
  // Différé d'un instant : lancé dans le tour même du clic, le défilement doux est annulé par le navigateur (constaté sous Chrome).
  const revealStage = () => {
    window.setTimeout(() => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.top + r.height * 0.6 > window.innerHeight) {
        el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
    }, 60);
  };
  const onListen = () => {
    if (playing) stop();
    else if (placeMissing) focusMissing();
    else {
      revealStage();
      void start("auto");
    }
  };
  const onDemo = (id: string) => {
    revealStage();
    void start(id);
  };

  // --- affichage
  // les bulletins enregistrés, regroupés par scénario : on retire du titre la voix (« · French voice »), que le bouton dit lui-même
  const scenarios = useMemo(() => {
    const groups = new Map<string, DemoMeta[]>();
    for (const d of demos) {
      const key = d.title.replace(VOICE_SUFFIX, "");
      groups.set(key, [...(groups.get(key) ?? []), d]);
    }
    // les voix d'un scénario dans l'ordre de la liste des voix (darija, puis anglais, français, arabe standard, coréen)
    const rank = (code: string) => {
      const i = VOICE_LANGS.findIndex((l) => l.code === code);
      return i < 0 ? VOICE_LANGS.length : i;
    };
    return [...groups.entries()].map(([title, items]) => [title, [...items].sort((a, b) => rank(a.lang) - rank(b.lang))] as const);
  }, [demos]);
  const band: Band | null = loaded?.band ?? null;
  const fmtDay = (d: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const fmtFull = (d: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const fmtStamp = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date(iso));
  const nameOf = (o: Opt) => (isArabic(ui) ? o.ar : ui === "en" ? (o.en ?? o.fr) : o.fr);
  const nameById = (list: Opt[], id: string) => {
    const o = list.find((x) => x.id === id);
    return o ? nameOf(o) : id;
  };
  const doseText = (n: NonNullable<Band["next"]>) =>
    n.litersPerTree != null
      ? `${Math.round(n.litersPerTree)} L / ${ui === "fr" ? "arbre" : isArabic(ui) ? "شجرة" : "tree"}`
      : `${Math.round(n.m3PerHa)} m³/ha`;

  const current = loaded && idx >= 0 ? loaded.lines[idx] : null;
  // garde-fou « pas sûr » (anciens bulletins enregistrés sans bandeau de confiance : on se fie à la ligne `unsure`)
  const unsureLine = loaded?.lines.find((l) => l.id === "unsure") ?? null;
  const askAPerson = !!(band?.confidence?.askAPerson || unsureLine);
  const noAdvice = band?.confidence?.level === "none";
  const reasons = band?.confidence?.reasons ?? [];
  const spokenLang: VoiceLang = loaded?.lang ?? lang;
  const subLang: VoiceLang = subMode === "en" ? "en" : spokenLang;
  const showJust = lang === "ko" || spokenLang === "ko";
  const subText = (l: { text: string; en: string }) => (subMode === "en" ? l.en : l.text);

  const notes: { kind: "demo" | "info" | "warn"; text: string }[] = [];
  if (loaded && band) {
    if (fallback === "offline") notes.push({ kind: "warn", text: t.fallbackOffline });
    if (fallback === "budget") notes.push({ kind: "warn", text: t.fallbackBudget });
    if (fallback === "error") notes.push({ kind: "warn", text: t.fallbackError });
    const date = fmtStamp(loaded.generatedAt);
    if (loaded.source === "demo") notes.push({ kind: "demo", text: t.noteDemo.replace("{date}", date) });
    else if (loaded.source === "cache") notes.push({ kind: "info", text: t.noteCache.replace("{date}", date) });
    else notes.push({ kind: "info", text: t.noteLive.replace("{date}", date) });
    if (band.replay) notes.push({ kind: "warn", text: t.noteReplay.replace("{date}", fmtFull(band.date)) });
    // honnêteté : un bulletin enregistré (ou un ancien) peut concerner une autre région ou une autre culture que le choix actuel
    if (region && crop && (band.regionId !== region || band.cropId !== crop)) {
      notes.push({ kind: "warn", text: t.noteMismatch.replace("{region}", nameById(regions, band.regionId)).replace("{crop}", nameById(crops, band.cropId)) });
    }
  }

  const isDemo = loaded?.source === "demo";
  const tag = playing ? (isDemo ? t.rec : t.onAir) : t.idle;
  const toggleBtn = (on: boolean) =>
    `min-h-12 rounded-xl border-2 px-5 py-3 text-base font-bold ${on ? "border-[#f0c75e] bg-[#f0c75e] text-[#0b1d15]" : "border-[#4b7a62] bg-[#1b3b2b] text-[#ffffff]"}`;

  // région et culture : sur l'écran principal à la première visite, et toujours dans « Options » pour les changer
  const selectCls = "min-h-12 w-full rounded-xl border-2 border-[#4b7a62] bg-[#1b3b2b] px-3 text-base font-semibold text-[#ffffff] [color-scheme:dark]";
  const renderPlaceFields = (withRefs: boolean) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-lg font-bold">
        <span className="mb-2 block">{t.region}</span>
        <select ref={withRefs ? regionRef : undefined} required value={region} onChange={(e) => chooseRegion(e.target.value)} className={selectCls}>
          {region === "" && <option value="">{t.choose}</option>}
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {nameOf(r)}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-lg font-bold">
        <span className="mb-2 block">{t.crop}</span>
        <select ref={withRefs ? cropRef : undefined} required value={crop} onChange={(e) => chooseCrop(e.target.value)} className={selectCls}>
          {crop === "" && <option value="">{t.choose}</option>}
          {crops.map((c) => (
            <option key={c.id} value={c.id}>
              {nameOf(c)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  // <main> : anneau de focus doré sur ce thème sombre (le bleu global y est peu visible). Le « ! » final est nécessaire : la règle
  // globale de globals.css est hors des couches de Tailwind, donc plus prioritaire qu'un simple utilitaire.
  // L'ombre pleine du même vert prolonge le fond sombre sous la marge du pied de page (sinon une bande crème, couleur du corps de la
  // page, sépare ce fond sombre du pied de page sombre) ; elle ne change rien à la mise en page et passe sous le pied de page.
  return (
    <main dir={rtl ? "rtl" : "ltr"} className="flex-1 bg-[#0b1d15] text-base leading-relaxed text-[#f7f1e1] shadow-[0_4rem_0_0_#0b1d15] [&_*:focus-visible]:outline-[#ffd866]!">
      <div className="mx-auto w-full max-w-4xl px-4 py-5">
        <h1 className="sr-only">{t.title}</h1>

        {/* plateau : la présentatrice, puis les sous-titres juste dessous (jamais par-dessus son visage) */}
        <div ref={stageRef} dir="ltr" className="scroll-mt-3 overflow-hidden rounded-2xl border-2 border-[#3b6350] bg-[#0d1f17] shadow-2xl">
          <div className="relative aspect-[6/5] w-full overflow-hidden md:aspect-[9/4]">
            <Backdrop />
            <div className="absolute inset-x-0 bottom-0 top-12 flex justify-center">
              <Presenter svgRef={svgRef} />
            </div>
            <div aria-hidden className="absolute start-3 top-3 rounded bg-black/75 px-2.5 py-1 text-sm font-bold tracking-wider text-[#f0c75e]">
              SAKIA · BULLETIN
            </div>
            <div
              className={`absolute end-3 top-3 flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-bold tracking-wider ${
                playing ? (isDemo ? "bg-[#f0c75e] text-[#0b1d15]" : "bg-[#c4281f] text-white") : "bg-black/75 text-[#f7f1e1]"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${playing ? "animate-pulse bg-current motion-reduce:animate-none" : "bg-[#9fb8a8]"}`} />
              {tag}
            </div>
          </div>
          {/* sous-titres : la bande garde la hauteur de 4 lignes (la plupart des phrases en font 2 ou 3) pour que le bouton ne saute pas */}
          <div className="flex min-h-[7.25rem] items-center justify-center border-t border-[#2d5a45] bg-[#10261c] px-3 py-2">
            <p
              dir={rtlOf(subLang) ? "rtl" : "ltr"}
              lang={htmlLangOf(subLang)}
              aria-live="polite"
              className={`max-w-full rounded-lg px-3 py-1.5 text-center text-[clamp(1rem,3.2vw,1.2rem)] font-semibold leading-snug ${
                current?.id === "unsure" ? "border-2 border-[#ffb454] bg-[#5a2d08] text-[#fff1d6]" : "text-white"
              }`}
            >
              {current?.id === "unsure" && "⚠ "}
              {current ? subText(current) : loaded ? "…" : t.pressListen}
            </p>
          </div>
          <div className="h-1.5 bg-black/60">
            <div ref={barRef} className="h-full bg-[#f0c75e]" style={{ width: 0 }} />
          </div>
        </div>

        {/* première visite : on demande où l'on est et ce que l'on cultive (jamais Kairouan / olivier par défaut) */}
        {needsPlace && (
          <section className="mt-4 rounded-2xl border-2 border-[#f0c75e] bg-[#12281d] p-4">
            <p className="mb-3 text-lg font-bold">{t.placeTitle}</p>
            {renderPlaceFields(true)}
          </section>
        )}

        {/* UN gros bouton : inactif (aria-disabled, donc atteignable au clavier) tant qu'il manque la région ou la culture */}
        <button
          type="button"
          disabled={busy}
          aria-disabled={placeMissing && !playing ? true : undefined}
          aria-describedby={placeMissing ? "bl-need" : undefined}
          onClick={onListen}
          className={`mt-5 min-h-14 w-full rounded-2xl px-6 py-4 text-2xl font-bold disabled:opacity-60 ${
            placeMissing && !playing ? "cursor-not-allowed border-2 border-dashed border-[#7fa28d] bg-[#1b3b2b] text-[#d3e2d8]" : "bg-[#f0c75e] text-[#0b1d15] shadow-lg"
          }`}
        >
          {busy ? t.loading : playing ? `■ ${t.stop}` : `▶ ${t.listen}`}
        </button>

        {placeMissing && (
          <p id="bl-need" className="mt-3 text-center text-base font-semibold text-[#fff3c4]">
            {t.placeNeed}
          </p>
        )}

        {failed && (
          <p role="alert" className="mt-4 rounded-xl border-2 border-[#ff9a7a] bg-[#5a1f10] px-4 py-3 text-base font-semibold text-[#ffe8dd]">
            {t.errPlay}
          </p>
        )}

        {/* bandeau de données : tout vient du plan ; il n'apparaît qu'une fois le bulletin lu, avec la région et la culture du bulletin */}
        {band && (
          <div className="mt-5 overflow-hidden rounded-2xl border-2 border-[#3b6350] bg-[#f0c75e]/50">
            <p className="bg-[#0d1f17] px-4 py-2 text-base font-bold text-[#fff3c4]">
              {nameById(regions, band.regionId)} · {nameById(crops, band.cropId)}
            </p>
            <div className="grid grid-cols-2 gap-px text-base md:grid-cols-4">
              <Cell label={t.rain} value={band.outOfSeason || noAdvice ? "—" : unitText(`${band.rainMm.toFixed(0)} mm`)} />
              <Cell label={t.tmax} value={band.tmaxMax != null ? unitText(`${Math.round(band.tmaxMax)} °C`) : "—"} />
              <Cell label={t.stress} value={band.outOfSeason || noAdvice ? "—" : t.stressLevels[band.stressRisk]} />
              <Cell
                label={t.nextIrrigation}
                alert={noAdvice}
                value={
                  noAdvice ? (
                    t.askCell
                  ) : band.outOfSeason ? (
                    t.outOfSeason
                  ) : band.next ? (
                    <>
                      {fmtDay(band.next.date)}
                      <span className="block">{unitText(doseText(band.next))}</span>
                    </>
                  ) : (
                    t.noIrrigation
                  )
                }
              />
            </div>
          </div>
        )}

        {/* ce qu'il faut savoir une fois le bulletin lu : pas sûr, pluie signalée, provenance */}
        {loaded && askAPerson && (
          <div role="alert" className="mt-5 rounded-2xl border-2 border-[#ffb454] bg-[#5a2d08] px-5 py-4 text-[#fff1d6]">
            <p className="flex items-center gap-2 text-xl font-bold">
              <span aria-hidden>⚠</span>
              {t.unsureTitle}
            </p>
            {unsureLine && (
              <p className="mt-2 text-lg" lang={htmlLangOf(spokenLang)} dir={rtlOf(spokenLang) ? "rtl" : "ltr"}>
                {unsureLine.text}
                {spokenLang !== "en" && unsureLine.en !== unsureLine.text && (
                  <span className="mt-1 block text-base text-[#ffe3b8]" lang="en" dir="ltr">
                    {unsureLine.en}
                  </span>
                )}
              </p>
            )}
            {reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 ps-6 text-base">
                {reasons.map((r) => (
                  <li key={r}>{t.reasons[r]}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {loaded && band?.localReports && band.localReports.length > 0 && (
          <div className="mt-5 rounded-2xl border-2 border-[#7fd0e0] bg-[#0b3a44] px-5 py-4 text-base text-[#f2fcff]">
            <p className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden>🌧</span>
              {t.reportsTitle}
            </p>
            <ul className="mt-2 list-disc space-y-1 ps-6">
              {[...band.localReports]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((r) => {
                  const back = Math.min(3, Math.max(0, Math.round((Date.parse(`${band.date}T00:00:00Z`) - Date.parse(`${r.date}T00:00:00Z`)) / 86400000)));
                  const lv = r.level ?? (r.medianMm >= 25 ? "very_heavy" : r.medianMm >= 8 ? "heavy" : r.medianMm >= 2 ? "light" : r.medianMm >= 1 ? "very_light" : "none");
                  return (
                    <li key={r.date}>
                      {t.reportsRow
                        .replace("{rel}", t.relDays[back])
                        .replace("{n}", String(r.n))
                        .replace("{level}", t.rainLevels[lv])
                        .replace("{model}", r.modelMm.toFixed(1))}
                    </li>
                  );
                })}
            </ul>
            <p className="mt-3 font-semibold">{t.reportsNote}</p>
            {loaded.reportsFictional && <p className="mt-2 font-bold text-[#fff3c4]">{t.reportsFictional}</p>}
          </div>
        )}

        {loaded && (
          <div className="mt-5 space-y-3">
            {notes.map((n, i) => (
              <p
                key={i}
                className={`rounded-xl border-2 px-4 py-3 text-base ${
                  n.kind === "demo"
                    ? "border-[#f0c75e] bg-[#4a3a08] font-bold text-[#fff3c4]"
                    : n.kind === "warn"
                      ? "border-[#ff9a7a] bg-[#5a1f10] font-semibold text-[#ffe8dd]"
                      : "border-[#4b7a62] bg-[#173d2d] text-[#f7f1e1]"
                }`}
              >
                {n.text}
              </p>
            ))}
          </div>
        )}

        {/* « Il a plu » : proposé une fois que la personne a entendu la pluie du bulletin (et dit où elle est : le signalement part pour sa région) */}
        {loaded && region && <RainReportButton regionId={region} regionName={nameById(regions, region)} voiceLang={lang} muted={muted} t={t} />}

        {/* OPTIONS : tout le reste, replié */}
        <details className="group mt-6 rounded-2xl border-2 border-[#4b7a62] bg-[#12281d]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 py-3 text-xl font-bold text-[#ffffff]">
            <span>
              <span aria-hidden>⚙ </span>
              {t.options}
            </span>
            <span aria-hidden className="text-2xl transition-transform group-open:rotate-180 motion-reduce:transition-none">
              ▾
            </span>
          </summary>
          <div className="space-y-6 border-t-4 border-[#4b7a62] px-5 py-5">
            <fieldset>
              <legend className="mb-2 text-lg font-bold">{t.voice}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {VOICE_LANGS.map((v) => (
                  <button key={v.code} type="button" onClick={() => chooseVoice(v.code)} aria-pressed={lang === v.code} lang={v.htmlLang} className={`${toggleBtn(lang === v.code)} flex flex-col items-center justify-center px-2`}>
                    <span>{v.native}</span>
                    {v.native !== v.english && (
                      <span lang="en" className="text-sm font-semibold">
                        {v.english}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </fieldset>

            {renderPlaceFields(false)}

            <div role="group" aria-labelledby="bl-subs">
              <p id="bl-subs" className="mb-2 text-lg font-bold">
                {t.subtitles}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {(["en", "spoken"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => setSubMode(m)} aria-pressed={subMode === m} className={toggleBtn(subMode === m)}>
                    {m === "en" ? t.subEn : t.subSpoken}
                  </button>
                ))}
              </div>
            </div>

            {/* un seul interrupteur « son » : il coupe la voix ET la musique */}
            <button type="button" role="switch" aria-checked={!muted} onClick={() => setMuted((m) => !m)} className={toggleBtn(false)}>
              {muted ? `🔇 ${t.soundOff}` : `🔊 ${t.soundOn}`}
            </button>

            {loaded && (
              <div>
                <h2 id="bl-fulltext" className="mb-2 text-lg font-bold">
                  {t.fullText}
                </h2>
                <ol ref={listRef} tabIndex={0} aria-labelledby="bl-fulltext" className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-[#173d2d] p-2" dir={rtlOf(subLang) ? "rtl" : "ltr"}>
                  {loaded.lines.map((l, i) => (
                    <li key={l.id} lang={htmlLangOf(subLang)} className={`rounded-lg px-3 py-2 text-base ${i === idx ? "bg-[#f0c75e] font-bold text-[#0b1d15]" : "text-[#f7f1e1]"}`}>
                      {subText(l)}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-base text-[#e3dcc6]">{t.audioSize.replace("{kb}", String(loaded.sizeKb))}</p>
              </div>
            )}

            {demos.length > 0 && (
              <div>
                <h2 className="text-lg font-bold">{t.demosTitle}</h2>
                <p className="mb-3 text-base text-[#e3dcc6]">{t.demosHint}</p>
                {/* une carte par scénario (son titre, tel qu'enregistré, en anglais), puis un bouton court par voix */}
                <div className="space-y-3">
                  {scenarios.map(([title, items], gi) => (
                    <div key={title} role="group" aria-labelledby={`bl-demo-${gi}`} className="rounded-xl border-2 border-[#3b6350] bg-[#173d2d] p-3">
                      <p id={`bl-demo-${gi}`} lang="en" dir="ltr" className={`mb-3 text-base font-semibold ${rtl ? "text-end" : "text-start"}`}>
                        {title}
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {items.map((d) => {
                          const v = VOICE_LANGS.find((l) => l.code === d.lang);
                          return (
                            <button
                              key={d.id}
                              type="button"
                              disabled={busy}
                              onClick={() => onDemo(d.id)}
                              lang={v?.htmlLang}
                              className="min-h-12 rounded-xl border-2 border-[#6fa68a] bg-[#12281d] px-2 py-2 text-center text-base font-semibold text-[#ffffff] disabled:opacity-60"
                            >
                              ▶ {v?.native ?? d.lang}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showJust && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-[#f0c75e] bg-[#2a3a22] px-4 py-3 text-base text-[#f7f1e1]">
                <span className="text-3xl leading-none" aria-hidden>
                  😊
                </span>
                <div>
                  <p className="text-lg font-bold text-[#fff3c4]">{t.justTitle}</p>
                  <p lang="ko" className="mt-1">
                    {t.justBody}
                  </p>
                  {t.justGloss && <p className="mt-1 text-[#e3dcc6]">{t.justGloss}</p>}
                </div>
              </div>
            )}

            <div className="space-y-3 text-base">
              <h2 className="text-lg font-bold">{t.inclusionTitle}</h2>
              <p className="text-[#e9e2cd]">{t.inclusion}</p>
              <h2 className="pt-2 text-lg font-bold">{t.whyTitle}</h2>
              <p className="text-[#e9e2cd]">{t.why}</p>
              {loaded?.voiceName && (
                <p className="text-[#e9e2cd]">{loaded.voiceValidated ? `${t.voiceOf}: ${loaded.voiceName}` : t.voiceNote.replace("{name}", loaded.voiceName)}</p>
              )}
              <p className="text-[#e9e2cd]">{t.indicative}</p>
            </div>
          </div>
        </details>

        <audio
          ref={audioRef}
          className="hidden"
          onPlay={() => {
            setPlaying(true);
            musicRef.current?.duck();
          }}
          onPause={() => {
            setPlaying(false);
            // la voix s'arrête sans que la personne ait touché à « Arrêter » (touche média, casque débranché…) :
            // la musique ne reste jamais seule à jouer. (Pas pendant la préparation : la pause qu'on s'impose alors est normale ;
            // pas à la fin non plus : c'est l'outro qui s'en occupe.)
            const a = audioRef.current;
            if (a && !a.ended && !startingRef.current) stopMusic(300);
          }}
          onEnded={() => {
            setPlaying(false);
            // la musique remonte un instant, puis s'éteint
            const m = musicRef.current;
            m?.swell();
            window.setTimeout(() => {
              m?.stop(1000);
              if (musicRef.current === m) musicRef.current = null;
            }, OUTRO_MS);
          }}
        />
      </div>
    </main>
  );
}

function Cell({ label, value, alert }: { label: string; value: ReactNode; alert?: boolean }) {
  return (
    <div className="bg-[#12281d] px-4 py-3">
      <div className="text-sm font-bold uppercase tracking-wide text-[#e3dcc6]">{label}</div>
      <div className={`text-base font-bold ${alert ? "text-[#ffb454]" : "text-[#fff3c4]"}`}>
        {alert && "⚠ "}
        {value}
      </div>
    </div>
  );
}

// Un nombre suivi d'une unité (« 35 °C », « 391 m³/ha ») : isolé de gauche à droite et insécable, sinon l'écran en arabe l'inverse
// (« C° 35 ») ou coupe l'unité en deux lignes.
const unitText = (s: string) => (
  <bdi dir="ltr" className="whitespace-nowrap">
    {s}
  </bdi>
);
