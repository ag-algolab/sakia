"use client";

// Plateau de télé : présentateur dessiné, bouche pilotée par le volume réel du son (Web Audio),
// sous-titres calés sur l'alignement ElevenLabs. Fonctionne sans réseau avec les bulletins enregistrés
// (public/audio/demo-*.json).
//
// ÉCRAN PAR DÉFAUT : le présentateur, les sous-titres et UN gros bouton « Écouter ». Rien d'autre à régler :
//  - région, culture, sol, système, dernier arrosage et date de semis sont LUS dans le localStorage (clé « sakia-form »,
//    que l'accueil remplit) ;
//  - la langue de l'interface est celle des boutons de l'en-tête du site (clé « sakia-lang », via useLang) ;
//  - la voix est en darija par défaut ; le reste (langue de la voix, région, culture, son, musique, sous-titres,
//    bulletins enregistrés) est dans le volet replié « Options ».
// Une fois le bulletin lu, ce qu'il faut savoir apparaît (pas sûr, pluie signalée, provenance) : ce sont des résultats,
// pas des réglages.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startBedMusic } from "@/components/ui/bedMusic";
import type { BedMusic } from "@/components/ui/bedMusic";
import { useLang } from "@/components/ui/LangProvider";
import { isArabic } from "@/components/ui/i18n";
import type { Band, BulletinPayload } from "@/lib/voice/band";
import { VOICE_LANGS, htmlLangOf, rtlOf } from "@/lib/voice/langs";
import type { VoiceLang } from "@/lib/voice/langs";
import Presenter from "./Presenter";
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

export default function BulletinPlayer({ regions, crops, demos }: { regions: Opt[]; crops: Opt[]; demos: DemoMeta[] }) {
  const { lang: siteLang } = useLang(); // boutons FR / EN / TN / AR de l'en-tête
  const ui: UiLang = siteLang;
  const [region, setRegion] = useState("kairouan");
  const [crop, setCrop] = useState("olivier");
  const [lang, setLang] = useState<VoiceLang>("aeb"); // voix en darija par défaut
  const [subMode, setSubMode] = useState<"en" | "spoken">("en");
  const [muted, setMuted] = useState(false);
  const [music, setMusic] = useState(false); // musique de fond (components/ui/bedMusic.ts) : COUPÉE par défaut, la personne l'active
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fallback, setFallback] = useState<Fallback>(null);
  const [idx, setIdx] = useState(-1);
  const [progress, setProgress] = useState(0);

  const t = STRINGS[ui];
  const locale = LOCALES[ui];
  const rtl = isArabic(siteLang);

  // région et culture de l'accueil, langue de voix mémorisée : lues après l'affichage (pas d'écart serveur/navigateur)
  useEffect(() => {
    const id = window.setTimeout(() => {
      const f = readForm();
      if (f.region && regions.some((r) => r.id === f.region)) setRegion(f.region);
      if (f.crop && crops.some((c) => c.id === f.crop)) setCrop(f.crop);
      try {
        const v = localStorage.getItem(VOICE_KEY);
        if (v && VOICE_LANGS.some((l) => l.code === v)) setLang(v as VoiceLang);
      } catch {}
    }, 0);
    return () => window.clearTimeout(id);
  }, [regions, crops]);

  const chooseVoice = (code: VoiceLang) => {
    setLang(code);
    try {
      localStorage.setItem(VOICE_KEY, code);
    } catch {}
  };

  // --- refs : audio, graphe Web Audio, présentateur
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const mutedRef = useRef(false);
  const linesRef = useRef<Loaded["lines"]>([]);
  const idxRef = useRef(-1);
  const listRef = useRef<HTMLOListElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const loadedUrl = useRef<string | null>(null);
  const musicRef = useRef<BedMusic | null>(null);
  const stopMusic = useCallback((fadeMs = 300) => {
    musicRef.current?.stop(fadeMs);
    musicRef.current = null;
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 1;
    if (muted) stopMusic(300); // son coupé : la musique aussi
  }, [muted, stopMusic]);

  // --- boucle d'animation : bouche, clignement, sous-titres, progression
  useEffect(() => {
    let raf = 0;
    let open = 0;
    const part = (n: string) => svgRef.current?.querySelector(`[data-part="${n}"]`) ?? null;
    const p = {
      head: part("head"),
      mouth: part("mouth"),
      tongue: part("tongue"),
      eyeL: part("eyeL"),
      eyeR: part("eyeR"),
      browL: part("browL"),
      browR: part("browR"),
    };
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

      p.mouth?.setAttribute("ry", (1.3 + open * 13).toFixed(2));
      p.mouth?.setAttribute("rx", (15 - open * 3).toFixed(2));
      p.tongue?.setAttribute("opacity", open > 0.45 ? "0.9" : "0");
      p.head?.setAttribute("transform", `translate(0 ${(-open * 1.2).toFixed(2)})`);
      const lift = open * 2;
      p.browL?.setAttribute("d", `M72 ${96 - lift} Q82 ${91 - lift} 92 ${96 - lift}`);
      p.browR?.setAttribute("d", `M108 ${96 - lift} Q118 ${91 - lift} 128 ${96 - lift}`);
      const blink = now % 4200 < 130 ? 0.6 : 5;
      p.eyeL?.setAttribute("ry", String(blink));
      p.eyeR?.setAttribute("ry", String(blink));

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
        setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
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
    if (ol && li) ol.scrollTo({ top: li.offsetTop - ol.clientHeight / 2 + li.clientHeight / 2, behavior: "smooth" });
  }, [idx]);

  useEffect(() => {
    return () => {
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
      analyser.fftSize = 512;
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
      const r = await fetch(p.audioUrl!);
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
      const r = await fetch(`/audio/demo-${id}.json`);
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
      setError(null);
      setBusy(true);
      const audio = audioRef.current!;
      audio.pause();
      // la musique démarre dans le geste de la personne (le navigateur l'exige) ; la voix la baisse dès qu'elle parle
      stopMusic(0);
      if (music && !mutedRef.current) musicRef.current = startBedMusic();
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
          try {
            // le profil de l'agriculteur (sol, système, dernier arrosage, semis) vient de l'accueil : on ne le redemande pas
            const f = readForm();
            const q = new URLSearchParams({ region, crop, lang });
            if (f.soil) q.set("soil", f.soil);
            if (f.system) q.set("system", f.system);
            if (f.ago) q.set("ago", f.ago);
            if (f.planting) q.set("planting", f.planting);
            const r = await fetch(`/api/voice/bulletin?${q.toString()}`);
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
            item = await fetchDemo(d.id, "offline");
          }
        }
        linesRef.current = item.lines;
        idxRef.current = -1;
        setIdx(-1);
        setLoaded(item);
        audio.src = item.blobUrl;
        await audio.play();
      } catch {
        stopMusic(300);
        setError("Impossible de lire un bulletin (ni réseau, ni bulletin enregistré). / Could not play a bulletin (no network and no recorded bulletin).");
      } finally {
        setBusy(false);
      }
    },
    [crop, ensureGraph, fetchDemo, lang, music, pickDemo, region, stopMusic, toLoaded],
  );

  const stop = () => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    stopMusic(300);
    idxRef.current = -1;
    setIdx(-1);
    setProgress(0);
  };

  // --- affichage
  const band: Band | null = loaded?.band ?? null;
  const fmtDay = (d: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const fmtFull = (d: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const fmtStamp = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date(iso));
  const nameOf = (o: Opt) => (isArabic(ui) ? o.ar : ui === "en" ? (o.en ?? o.fr) : o.fr);
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
  const unvalidated = VOICE_LANGS.find((l) => l.code === spokenLang && !l.validated);
  const showJust = lang === "ko" || spokenLang === "ko";
  const subText = (l: { text: string; en: string }) => (subMode === "en" ? l.en : l.text);

  const notes = useMemo(() => {
    if (!loaded) return [] as { kind: "demo" | "info" | "warn"; text: string }[];
    const out: { kind: "demo" | "info" | "warn"; text: string }[] = [];
    if (fallback === "offline") out.push({ kind: "warn", text: t.fallbackOffline });
    if (fallback === "budget") out.push({ kind: "warn", text: t.fallbackBudget });
    if (fallback === "error") out.push({ kind: "warn", text: t.fallbackError });
    const date = fmtStamp(loaded.generatedAt);
    if (loaded.source === "demo") out.push({ kind: "demo", text: t.noteDemo.replace("{date}", date) });
    else if (loaded.source === "cache") out.push({ kind: "info", text: t.noteCache.replace("{date}", date) });
    else out.push({ kind: "info", text: t.noteLive.replace("{date}", date) });
    if (loaded.band.replay) out.push({ kind: "warn", text: t.noteReplay.replace("{date}", fmtFull(loaded.band.date)) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, fallback, ui]);

  const isDemo = loaded?.source === "demo";
  const tag = playing ? (isDemo ? t.rec : t.onAir) : t.idle;
  const toggleBtn = (on: boolean) =>
    `min-h-12 rounded-xl border-2 px-5 py-3 text-base font-bold ${on ? "border-[#f0c75e] bg-[#f0c75e] text-[#0b1d15]" : "border-[#4b7a62] bg-[#1b3b2b] text-[#ffffff]"}`;

  return (
    <div dir={rtl ? "rtl" : "ltr"} className="min-h-screen bg-[#0b1d15] text-base leading-relaxed text-[#f7f1e1]">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <h1 className="sr-only">{t.title}</h1>

        {/* plateau : le présentateur et les sous-titres */}
        <div dir="ltr" className="overflow-hidden rounded-2xl border-2 border-[#3b6350] bg-black shadow-2xl">
          <div className="relative aspect-[5/6] w-full overflow-hidden bg-gradient-to-b from-[#1f5340] via-[#173d2d] to-[#10291e] sm:aspect-video">
            <div className="absolute inset-x-0 bottom-[26%] top-16 flex justify-center sm:bottom-[26%] sm:top-3">
              <Presenter svgRef={svgRef} />
            </div>
            <div className="absolute start-3 top-3 rounded bg-black/70 px-2.5 py-1 text-sm font-bold tracking-wider text-[#f0c75e]">SAKIA · BULLETIN</div>
            <div
              className={`absolute end-3 top-3 flex items-center gap-1.5 rounded px-2.5 py-1 text-sm font-bold tracking-wider ${
                playing ? (isDemo ? "bg-[#f0c75e] text-[#0b1d15]" : "bg-[#c4281f] text-white") : "bg-black/70 text-[#f7f1e1]"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${playing ? "animate-pulse bg-current" : "bg-[#9fb8a8]"}`} />
              {tag}
            </div>
            {/* sous-titres */}
            <div className="absolute inset-x-2 bottom-3 flex min-h-[22%] items-center justify-center">
              <p
                dir={rtlOf(subLang) ? "rtl" : "ltr"}
                lang={htmlLangOf(subLang)}
                aria-live="polite"
                className={`max-w-[96%] rounded-lg px-4 py-2 text-center text-[clamp(1rem,3.2vw,1.5rem)] font-semibold leading-snug ${
                  current?.id === "unsure" ? "border-2 border-[#ffb454] bg-[#5a2d08] text-[#fff1d6]" : "bg-black/80 text-white"
                }`}
              >
                {current?.id === "unsure" && "⚠ "}
                {current ? subText(current) : loaded ? "…" : t.pressListen}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/60">
              <div className="h-full bg-[#f0c75e]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* bandeau de données : tout vient du plan ; il n'apparaît qu'une fois le bulletin lu */}
          {band && (
            <div className="grid grid-cols-2 gap-px bg-[#f0c75e]/50 text-base sm:grid-cols-4" dir={rtl ? "rtl" : "ltr"}>
              <Cell label={t.rain} value={band.outOfSeason || noAdvice ? "—" : `${band.rainMm.toFixed(0)} mm`} />
              <Cell label={t.tmax} value={band.tmaxMax != null ? `${Math.round(band.tmaxMax)} °C` : "—"} />
              <Cell label={t.stress} value={band.outOfSeason || noAdvice ? "—" : t.stressLevels[band.stressRisk]} />
              <Cell
                label={t.nextIrrigation}
                alert={noAdvice}
                value={noAdvice ? t.askCell : band.outOfSeason ? t.outOfSeason : band.next ? `${fmtDay(band.next.date)} · ${doseText(band.next)}` : t.noIrrigation}
              />
            </div>
          )}
        </div>

        {/* UN gros bouton */}
        <button
          type="button"
          disabled={busy}
          onClick={() => (playing ? stop() : start("auto"))}
          className="mt-5 min-h-14 w-full rounded-2xl bg-[#f0c75e] px-6 py-4 text-2xl font-bold text-[#0b1d15] shadow-lg disabled:opacity-60"
        >
          {busy ? t.loading : playing ? `■ ${t.stop}` : `▶ ${t.listen}`}
        </button>

        {error && <p role="alert" className="mt-4 rounded-xl border-2 border-[#ff9a7a] bg-[#5a1f10] px-4 py-3 text-base font-semibold text-[#ffe8dd]">{error}</p>}

        {/* ce qu'il faut savoir une fois le bulletin lu : pas sûr, pluie signalée, provenance, texte non validé */}
        {loaded && askAPerson && (
          <aside role="alert" className="mt-5 rounded-2xl border-2 border-[#ffb454] bg-[#5a2d08] px-5 py-4 text-[#fff1d6]">
            <p className="flex items-center gap-2 text-xl font-bold">
              <span aria-hidden>⚠</span>
              {t.unsureTitle}
            </p>
            {unsureLine && (
              <p className="mt-2 text-lg" lang={htmlLangOf(spokenLang)} dir={rtlOf(spokenLang) ? "rtl" : "ltr"}>
                {unsureLine.text}
                {spokenLang !== "en" && unsureLine.en !== unsureLine.text && <span className="mt-1 block text-base text-[#ffe3b8]">{unsureLine.en}</span>}
              </p>
            )}
            {reasons.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 ps-6 text-base">
                {reasons.map((r) => (
                  <li key={r}>{t.reasons[r]}</li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {loaded && band?.localReports && band.localReports.length > 0 && (
          <aside className="mt-5 rounded-2xl border-2 border-[#7fd0e0] bg-[#0b3a44] px-5 py-4 text-base text-[#f2fcff]">
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
          </aside>
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
            {unvalidated && (
              <p className="rounded-xl border-2 border-[#f0c75e] bg-[#4a3a08] px-4 py-3 text-base font-semibold text-[#fff3c4]">
                {unvalidated.code === "aeb" ? t.darijaNote : unvalidated.code === "ar" ? t.arabicNote : t.koreanNote}
              </p>
            )}
          </div>
        )}

        {/* « Il a plu » : proposé une fois que la personne a entendu la pluie du bulletin */}
        {loaded && <RainReportButton regionId={region} regionName={nameOf(regions.find((r) => r.id === region) ?? regions[0])} voiceLang={lang} muted={muted} t={t} />}

        {/* OPTIONS : tout le reste, replié */}
        <details className="group mt-6 rounded-2xl border-2 border-[#4b7a62] bg-[#12281d]">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-5 py-3 text-xl font-bold text-[#ffffff]">
            <span>⚙ {t.options}</span>
            <span aria-hidden className="text-2xl transition-transform group-open:rotate-180">
              ▾
            </span>
          </summary>
          <div className="space-y-6 border-t-4 border-[#4b7a62] px-5 py-5">
            <fieldset>
              <legend className="mb-2 text-lg font-bold">{t.voice}</legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {VOICE_LANGS.map((v) => (
                  <button key={v.code} type="button" onClick={() => chooseVoice(v.code)} aria-pressed={lang === v.code} lang={v.htmlLang} className={`${toggleBtn(lang === v.code)} flex flex-col items-center px-2`}>
                    <span>{v.native}</span>
                    <span lang="en" className="text-sm font-semibold">
                      {v.english}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-lg font-bold">
                <span className="mb-2 block">{t.region}</span>
                <select value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-[#4b7a62] bg-[#1b3b2b] px-3 text-base font-semibold text-[#ffffff]">
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {nameOf(r)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-lg font-bold">
                <span className="mb-2 block">{t.crop}</span>
                <select value={crop} onChange={(e) => setCrop(e.target.value)} className="min-h-12 w-full rounded-xl border-2 border-[#4b7a62] bg-[#1b3b2b] px-3 text-base font-semibold text-[#ffffff]">
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {nameOf(c)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} className={toggleBtn(false)}>
                {muted ? `🔇 ${t.soundOff}` : `🔊 ${t.soundOn}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (music) stopMusic(300);
                  setMusic(!music);
                }}
                aria-pressed={music}
                className={toggleBtn(false)}
              >
                {music ? `🎵 ${t.musicOn}` : `🎵 ${t.musicOff}`}
              </button>
              <span className="text-base font-bold">{t.subtitles}</span>
              {(["en", "spoken"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setSubMode(m)} aria-pressed={subMode === m} className={toggleBtn(subMode === m)}>
                  {m === "en" ? t.subEn : t.subSpoken}
                </button>
              ))}
            </div>

            {loaded && (
              <div>
                <h2 className="mb-2 text-lg font-bold">{t.fullText}</h2>
                <ol ref={listRef} className="max-h-72 space-y-1 overflow-y-auto rounded-xl bg-[#173d2d] p-2" dir={rtlOf(subLang) ? "rtl" : "ltr"}>
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
                <div className="flex flex-wrap gap-3">
                  {demos.map((d) => (
                    <button key={d.id} type="button" disabled={busy} onClick={() => start(d.id)} className="min-h-12 rounded-xl border-2 border-[#4b7a62] bg-[#1b3b2b] px-4 py-3 text-start text-base font-semibold text-[#ffffff] disabled:opacity-60">
                      ▶ {d.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showJust && (
              <aside className="flex items-start gap-3 rounded-xl border-2 border-[#f0c75e] bg-[#2a3a22] px-4 py-3 text-base text-[#f7f1e1]">
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
              </aside>
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
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            // la musique remonte un instant, puis s'éteint
            const m = musicRef.current;
            m?.swell();
            window.setTimeout(() => {
              m?.stop(1200);
              if (musicRef.current === m) musicRef.current = null;
            }, 2500);
          }}
        />
      </div>
    </div>
  );
}

function Cell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
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
