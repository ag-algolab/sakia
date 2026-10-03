"use client";

// Plateau de télé : présentateur dessiné, bouche pilotée par le volume réel du son (Web Audio),
// sous-titres calés sur l'alignement ElevenLabs, bandeau de données en bas.
// Fonctionne sans réseau avec les bulletins enregistrés (public/audio/demo-*.json).

import Link from "next/link";
import { startBedMusic } from "@/components/ui/bedMusic";
import type { BedMusic } from "@/components/ui/bedMusic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function BulletinPlayer({ regions, crops, demos }: { regions: Opt[]; crops: Opt[]; demos: DemoMeta[] }) {
  const [ui, setUi] = useState<UiLang>("en");
  const [region, setRegion] = useState("kairouan");
  const [crop, setCrop] = useState("olivier");
  const [lang, setLang] = useState<VoiceLang>("aeb");
  const [subMode, setSubMode] = useState<"en" | "spoken">("en");
  const [muted, setMuted] = useState(false);
  const [music, setMusic] = useState(false); // musique de fond (components/ui/bedMusic.ts), sous la voix : COUPÉE par défaut, la personne l'active
  const [ago, setAgo] = useState(""); // dernier arrosage : "" = inconnu, "0" à "7" = il y a N jours
  const [busy, setBusy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [fallback, setFallback] = useState<Fallback>(null);
  const [idx, setIdx] = useState(-1);
  const [progress, setProgress] = useState(0);

  const t = STRINGS[ui];
  const locale = LOCALES[ui];

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

  // la ligne courante reste visible dans la liste (sans faire défiler la page)
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
            const r = await fetch(`/api/voice/bulletin?region=${region}&crop=${crop}&lang=${lang}${ago !== "" ? `&ago=${ago}` : ""}`);
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
    [ago, crop, ensureGraph, fetchDemo, lang, music, pickDemo, region, stopMusic, toLoaded],
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
  const fmtStamp = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: ui === "ko" ? "long" : "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date(iso));
  const nameOf = (o: Opt) => (ui === "ar" ? o.ar : ui === "ko" ? (o.ko ?? o.en ?? o.fr) : ui === "en" ? (o.en ?? o.fr) : o.fr);
  const doseText = (n: NonNullable<Band["next"]>) =>
    n.litersPerTree != null
      ? `${Math.round(n.litersPerTree)} L / ${ui === "fr" ? "arbre" : ui === "ar" ? "شجرة" : ui === "ko" ? "그루" : "tree"}`
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
  const showJust = lang === "ko" || spokenLang === "ko" || ui === "ko";
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

  return (
    <div dir={ui === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-[#0d2118] text-[#f2ead8]">
      <div className="mx-auto max-w-4xl px-4 py-5">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="text-sm text-[#e7c36a] underline-offset-4 hover:underline">
              {ui === "ar" ? "→" : "←"} {t.back}
            </Link>
            <h1 className="mt-1 text-2xl font-bold">{t.title}</h1>
            <p className="text-sm text-[#cdbf9f]">{t.tagline}</p>
          </div>
          <label className="text-sm">
            <span className="me-2 text-[#cdbf9f]">{t.uiLang}</span>
            <select value={ui} onChange={(e) => setUi(e.target.value as UiLang)} className="rounded-md border border-[#3b5a4a] bg-[#16301f] px-2 py-2">
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="ar">العربية</option>
              <option value="ko">한국어</option>
            </select>
          </label>
        </header>

        {/* plateau */}
        <div dir="ltr" className="overflow-hidden rounded-2xl border-4 border-[#2e4a3a] bg-black shadow-2xl">
          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-b from-[#1c4a37] via-[#16382a] to-[#0f271c]">
            {/* décor : grandes roues d'irrigation en filigrane */}
            <svg viewBox="0 0 400 225" className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
              <g fill="none" stroke="#e7c36a" strokeWidth="1.2">
                <circle cx="330" cy="80" r="70" />
                <circle cx="330" cy="80" r="52" />
                <path d="M330 10V150M260 80H400M281 31L379 129M281 129L379 31" />
                <circle cx="60" cy="190" r="45" />
                <path d="M60 145V235M15 190H105" />
              </g>
            </svg>
            <div className="absolute inset-x-0 bottom-[22%] top-3 flex justify-center sm:bottom-[24%]">
              <Presenter svgRef={svgRef} />
            </div>
            <div className="absolute start-3 top-3 rounded bg-black/50 px-2 py-1 text-xs font-bold tracking-wider text-[#e7c36a]">SAKIA · BULLETIN</div>
            <div
              className={`absolute end-3 top-3 flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold tracking-wider ${
                playing ? (isDemo ? "bg-[#7a5a14] text-white" : "bg-[#b3261e] text-white") : "bg-black/50 text-[#cdbf9f]"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${playing ? "animate-pulse bg-white" : "bg-[#6f7f75]"}`} />
              {tag}
            </div>
            {/* sous-titres */}
            <div className="absolute inset-x-2 bottom-2 flex min-h-[20%] items-center justify-center">
              <p
                dir={rtlOf(subLang) ? "rtl" : "ltr"} lang={htmlLangOf(subLang)}
                aria-live="polite"
                className={`max-w-[95%] rounded-md px-3 py-1.5 text-center text-[clamp(0.8rem,2.6vw,1.35rem)] font-medium leading-snug ${
                  current?.id === "unsure" ? "border-2 border-[#ffb454] bg-[#4a2a0c] font-bold text-[#ffe0b0]" : "bg-black/70 text-white"
                }`}
              >
                {current?.id === "unsure" && "⚠ "}
                {current ? subText(current) : loaded ? "…" : t.pressListen}
              </p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
              <div className="h-full bg-[#e7c36a]" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* bandeau de données : tout vient du plan */}
          <div className="grid grid-cols-2 gap-px bg-[#e7c36a]/30 text-sm sm:grid-cols-4" dir={ui === "ar" ? "rtl" : "ltr"}>
            {band ? (
              <>
                <Cell label={t.rain} value={band.outOfSeason || noAdvice ? "—" : `${band.rainMm.toFixed(0)} mm`} />
                <Cell label={t.tmax} value={band.tmaxMax != null ? `${Math.round(band.tmaxMax)} °C` : "—"} />
                <Cell label={t.stress} value={band.outOfSeason || noAdvice ? "—" : t.stressLevels[band.stressRisk]} />
                <Cell
                  label={t.nextIrrigation}
                  alert={noAdvice}
                  value={noAdvice ? t.askCell : band.outOfSeason ? t.outOfSeason : band.next ? `${fmtDay(band.next.date)} · ${doseText(band.next)}` : t.noIrrigation}
                />
              </>
            ) : (
              <div className="col-span-2 bg-[#12281d] px-3 py-3 text-[#cdbf9f] sm:col-span-4">{t.pressListen}</div>
            )}
          </div>
        </div>

        {/* garde-fou « pas sûr : demandez à une personne » : en évidence, avant tout le reste */}
        {loaded && askAPerson && (
          <aside role="alert" className="mt-3 rounded-lg border-2 border-[#ffb454] bg-[#4a2a0c] px-4 py-3 text-[#ffe0b0]">
            <p className="flex items-center gap-2 text-lg font-bold">
              <span aria-hidden>⚠</span>
              {t.unsureTitle}
            </p>
            {unsureLine && (
              <p className="mt-1" lang={htmlLangOf(spokenLang)} dir={rtlOf(spokenLang) ? "rtl" : "ltr"}>
                {unsureLine.text}
                {spokenLang !== "en" && unsureLine.en !== unsureLine.text && <span className="block text-sm opacity-80">{unsureLine.en}</span>}
              </p>
            )}
            {reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 ps-5 text-sm">
                {reasons.map((r) => (
                  <li key={r}>{t.reasons[r]}</li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {/* pluie signalée par des agriculteurs : information, pas alarme ; « signalé », jamais « mesuré » */}
        {loaded && band?.localReports && band.localReports.length > 0 && (
          <aside className="mt-3 rounded-lg border border-[#5fb3c4] bg-[#0f2f36] px-4 py-3 text-sm text-[#d6f1f6]">
            <p className="flex items-center gap-2 font-semibold">
              <span aria-hidden>🌧</span>
              {t.reportsTitle}
            </p>
            <ul className="mt-1 list-disc space-y-0.5 ps-5">
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
            <p className="mt-2">{t.reportsNote}</p>
            {loaded.reportsFictional && <p className="mt-1 font-semibold text-[#ffe9a6]">{t.reportsFictional}</p>}
          </aside>
        )}

        {/* messages de provenance : bulletin enregistré clairement annoncé */}
        <div className="mt-3 space-y-2">
          {notes.map((n, i) => (
            <p
              key={i}
              className={`rounded-md border px-3 py-2 text-sm ${
                n.kind === "demo" ? "border-[#e7c36a] bg-[#3a2f10] font-semibold text-[#ffe9a6]" : n.kind === "warn" ? "border-[#c2572b] bg-[#3a1c12] text-[#ffd0bd]" : "border-[#3b5a4a] bg-[#16301f]"
              }`}
            >
              {n.text}
            </p>
          ))}
          {error && <p className="rounded-md border border-[#c2572b] bg-[#3a1c12] px-3 py-2 text-sm text-[#ffd0bd]">{error}</p>}
          {showJust && (
            <aside className="flex items-start gap-3 rounded-md border border-[#e7c36a]/60 bg-[#2a3a22] px-3 py-3 text-sm">
              <span className="text-3xl leading-none" aria-hidden>
                😊
              </span>
              <div>
                <p className="font-semibold text-[#ffe9a6]">{t.justTitle}</p>
                <p lang="ko" className="mt-1">
                  {t.justBody}
                </p>
                {t.justGloss && <p className="mt-1 text-[#cdbf9f]">{t.justGloss}</p>}
              </div>
            </aside>
          )}
        </div>

        {/* commandes */}
        <section className="mt-4 grid gap-3 rounded-xl border border-[#3b5a4a] bg-[#12281d] p-4 sm:grid-cols-3">
          <Field label={t.region}>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full rounded-md border border-[#3b5a4a] bg-[#16301f] px-2 py-3">
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {nameOf(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.crop}>
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full rounded-md border border-[#3b5a4a] bg-[#16301f] px-2 py-3">
              {crops.map((c) => (
                <option key={c.id} value={c.id}>
                  {nameOf(c)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t.agoLabel}>
            <select value={ago} onChange={(e) => setAgo(e.target.value)} className="w-full rounded-md border border-[#3b5a4a] bg-[#16301f] px-2 py-3">
              <option value="">{t.agoUnknown}</option>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={String(n)}>
                  {n === 0 ? t.agoToday : n === 1 ? t.agoOne : t.agoDays.replace("{n}", String(n))}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-3">
          <Field label={t.voice}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {VOICE_LANGS.map((v) => (
                <button
                  key={v.code}
                  type="button"
                  onClick={() => setLang(v.code)}
                  aria-pressed={lang === v.code}
                  lang={v.htmlLang}
                  className={`rounded-md border px-2 py-2 ${lang === v.code ? "border-[#e7c36a] bg-[#e7c36a] font-bold text-[#0d2118]" : "border-[#3b5a4a] bg-[#16301f]"}`}
                >
                  <span className="block">{v.native}</span>
                  <span lang="en" className="block text-[0.7rem] font-normal opacity-80">
                    {v.english}
                  </span>
                </button>
              ))}
            </div>
          </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => (playing ? stop() : start("auto"))}
              className="min-w-40 rounded-lg bg-[#e7c36a] px-6 py-4 text-lg font-bold text-[#0d2118] disabled:opacity-60"
            >
              {busy ? t.loading : playing ? t.stop : `▶ ${t.listen}`}
            </button>
            <button type="button" onClick={() => setMuted((m) => !m)} aria-pressed={muted} className="rounded-lg border border-[#3b5a4a] bg-[#16301f] px-4 py-4">
              {muted ? `🔇 ${t.soundOff}` : `🔊 ${t.soundOn}`}
            </button>
            <button
              type="button"
              onClick={() => {
                if (music) stopMusic(300);
                setMusic(!music);
              }}
              aria-pressed={music}
              className="rounded-lg border border-[#3b5a4a] bg-[#16301f] px-4 py-4"
            >
              {music ? `🎵 ${t.musicOn}` : `🎵 ${t.musicOff}`}
            </button>
            <div className={`flex items-center gap-2 text-sm ${spokenLang === "en" ? "hidden" : ""}`}>
              <span className="text-[#cdbf9f]">{t.subtitles}</span>
              {(["en", "spoken"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSubMode(m)}
                  aria-pressed={subMode === m}
                  className={`rounded-md border px-3 py-3 ${subMode === m ? "border-[#e7c36a] bg-[#e7c36a] font-bold text-[#0d2118]" : "border-[#3b5a4a] bg-[#16301f]"}`}
                >
                  {m === "en" ? t.subEn : t.subSpoken}
                </button>
              ))}
            </div>
          </div>
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
        </section>

        {/* texte complet : lisible avec le son coupé */}
        {loaded && (
          <section className="mt-4 rounded-xl border border-[#3b5a4a] bg-[#12281d] p-4">
            <ol ref={listRef} className="max-h-48 space-y-1 overflow-y-auto" dir={rtlOf(subLang) ? "rtl" : "ltr"} lang={htmlLangOf(subLang)}>
              {loaded.lines.map((l, i) => (
                <li key={l.id} className={`rounded px-2 py-1 ${i === idx ? "bg-[#e7c36a] font-semibold text-[#0d2118]" : "text-[#cdbf9f]"}`}>
                  {subText(l)}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-[#9fb2a6]">{t.audioSize.replace("{kb}", String(loaded.sizeKb))}</p>
          </section>
        )}

        {/* « Il a plu » : un agriculteur signale la pluie chez lui ; avec 2 personnes d'accord elle remplace la prévision */}
        <RainReportButton regionId={region} t={t} regionName={nameOf(regions.find((r) => r.id === region) ?? regions[0])} />

        {/* bulletins enregistrés */}
        {demos.length > 0 && (
          <section className="mt-4 rounded-xl border border-[#3b5a4a] bg-[#12281d] p-4">
            <h2 className="font-semibold">{t.demosTitle}</h2>
            <p className="mb-2 text-sm text-[#cdbf9f]">{t.demosHint}</p>
            <div className="flex flex-wrap gap-2">
              {demos.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  disabled={busy}
                  onClick={() => start(d.id)}
                  className="rounded-md border border-[#3b5a4a] bg-[#16301f] px-3 py-3 text-start text-sm disabled:opacity-60"
                >
                  ▶ {d.title}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-4 rounded-xl border border-[#3b5a4a] bg-[#12281d] p-4 text-sm leading-relaxed">
          <h2 className="font-semibold">{t.inclusionTitle}</h2>
          <p className="mt-1 text-[#cdbf9f]">{t.inclusion}</p>
          <h2 className="mt-4 font-semibold">{t.whyTitle}</h2>
          <p className="mt-1 text-[#cdbf9f]">{t.why}</p>
          {unvalidated && <p className="mt-3 text-[#ffe9a6]">{unvalidated.code === "aeb" ? t.darijaNote : unvalidated.code === "ar" ? t.arabicNote : t.koreanNote}</p>}
          {loaded?.voiceName && (
            <p className="mt-2 text-[#9fb2a6]">
              {loaded.voiceValidated ? `${t.voiceOf}: ${loaded.voiceName}` : t.voiceNote.replace("{name}", loaded.voiceName)}
            </p>
          )}
          <p className="mt-2 text-[#9fb2a6]">{t.indicative}</p>
        </section>
      </div>
    </div>
  );
}

function Cell({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-[#12281d] px-3 py-2">
      <div className="text-[0.7rem] uppercase tracking-wide text-[#cdbf9f]">{label}</div>
      <div className={`font-semibold ${alert ? "text-[#ffb454]" : "text-[#ffe9a6]"}`}>{alert && "⚠ "}{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[#cdbf9f]">{label}</span>
      {children}
    </label>
  );
}
