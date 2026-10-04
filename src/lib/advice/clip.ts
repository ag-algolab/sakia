// Le « message court » : le conseil du jour dit à voix haute en 15 à 25 secondes (50 à 100 Ko), pour le gros bouton de l'accueil.
// Trois principes, issus des mesures du 3 octobre (voir docs/HANDOFF.md, section 12 ter) :
//  1. on ne fabrique la voix qu'en dernier recours : les messages courants sont préparés à l'avance (préparation du matin) ;
//  2. le fichier est gardé hors du serveur (store.ts) et servi tel quel, en binaire ;
//  3. toute fabrication à la demande passe par les plafonds persistants (usage.ts) : plafond atteint = refus net, jamais de dépassement.
// Le texte est celui du bulletin (mêmes phrases, mêmes chiffres, même plan que l'écran), réduit aux phrases utiles.
// SERVEUR SEULEMENT.

import { createHash } from "node:crypto";
import { buildPlan, loadForecast } from "../plan";
import type { Plan } from "../plan";
import { getCrop, CROPS, defaultCropForMonth } from "../crops";
import { chargeUsage, LIMITS } from "../usage";
import type { IrrigationSystem, SoilName } from "../waterBalance";
import type { VoiceLang } from "../voice/langs";
import { bulletinScriptFor } from "../voice/script";
import { DEFAULT_CHOICE } from "../voice/soil";
import type { SoilChoice } from "../voice/soil";
import { MODEL_ID, OUTPUT_FORMAT, SELECTED_VOICE, VOICE_SETTINGS } from "../voice/voices";
import { getClip, putClip, StoreError } from "./store";

export class ClipError extends Error {
  constructor(
    public reason: "miss" | "budget" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}

export type AdviceQuery = {
  region: string;
  crop: string;
  lang: VoiceLang;
  ago?: number; // dernier arrosage il y a N jours ; absent = inconnu
  soil?: SoilName;
  system?: IrrigationSystem;
  planting?: string;
  asOf?: string;
};

export const REPLAY_DATE = "2026-07-17"; // même date que le « rejeu » de l'accueil (canicule de juillet) : la seule date passée acceptée
const MAX_CHARS = 700; // garde-fou : un message court fait 200 à 400 caractères

// Phrases gardées, dans l'ordre du bulletin : où, conseil, « pas sûr » (garde-fou), avertissement.
// « hot » seulement en cas de forte chaleur ; « soil » seulement si le sol ou le système diffèrent de la norme (le bulletin
// complet, lui, nomme toujours le sol et le système).
export function clipLines(plan: Plan, lang: VoiceLang, choice?: Partial<SoilChoice>): { id: string; text: string }[] {
  const keep = new Set(["where", "off", "advice", "unsure", "caveat"]);
  if (plan.confidence.notes?.includes("extreme_heat")) keep.add("hot");
  const custom = (choice?.soil && choice.soil !== DEFAULT_CHOICE.soil) || (choice?.system && choice.system !== DEFAULT_CHOICE.system);
  if (custom) keep.add("soil");
  const lines = bulletinScriptFor(plan, lang, choice).filter((l) => keep.has(l.id));
  if (lines.length === 0) throw new Error("message court vide : script incohérent");
  return lines;
}

export const clipText = (plan: Plan, lang: VoiceLang, choice?: Partial<SoilChoice>) => clipLines(plan, lang, choice).map((l) => l.text).join(" ");

// Sous-titres du message court : les MÊMES phrases que la voix (mêmes `id`, même plan, donc mêmes chiffres), écrites dans la langue de
// l'écran : un juré qui ne parle pas darija lit ce que la voix dit. Si la langue demandée est celle de la voix, c'est le texte dit lui-même.
// `w` = nombre de lettres DITES par la voix (espaces et ponctuation exclus) : le message court est un simple mp3 préparé à l'avance,
// sans alignement mot à mot ; le navigateur s'en sert pour caler la phrase affichée sur le son par simple proportion.
export type ClipSub = { id: string; text: string; w: number };

export function clipSubtitles(plan: Plan, spoken: VoiceLang, shown: VoiceLang, choice?: Partial<SoilChoice>): ClipSub[] {
  const said = clipLines(plan, spoken, choice);
  const text = new Map(clipLines(plan, shown, choice).map((l) => [l.id, l.text]));
  return said
    .map((l) => ({ id: l.id, text: text.get(l.id) ?? "", w: Math.max(1, l.text.replace(/[^\p{L}\p{N}]/gu, "").length) }))
    .filter((s) => s.text !== "");
}

// L'empreinte suit le TEXTE (pas les paramètres) : deux demandes qui disent la même chose partagent le même fichier, et la voix
// ne peut jamais contredire le plan.
export function clipKey(text: string): string {
  return createHash("sha256").update(JSON.stringify(["clip-v1", text, SELECTED_VOICE.id, MODEL_ID, OUTPUT_FORMAT])).digest("hex").slice(0, 32);
}

export async function planForQuery(q: AdviceQuery, forecast?: Awaited<ReturnType<typeof loadForecast>>): Promise<Plan> {
  return buildPlan(
    {
      regionId: q.region,
      cropId: q.crop,
      soil: q.soil,
      system: q.system,
      planting: q.planting,
      asOf: q.asOf,
      lastIrrigationDaysAgo: q.ago,
    },
    forecast,
  );
}

// Fabrication chez ElevenLabs (même voix, même modèle et mêmes réglages que le bulletin). La clé n'est jamais affichée.
async function synthesize(text: string): Promise<Buffer> {
  const k = process.env.KEY_ELEVENLABS;
  if (!k) throw new ClipError("unavailable", "clé de voix absente");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SELECTED_VOICE.id}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: { "xi-api-key": k, "content-type": "application/json", accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS }),
    signal: AbortSignal.timeout(25000),
  }).catch((e) => {
    throw new ClipError("unavailable", `voix : ${(e as Error).name}`);
  });
  if (!res.ok) throw new ClipError("unavailable", `voix : HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1000) throw new ClipError("unavailable", "voix : fichier vide");
  return bytes;
}

const inflight = new Map<string, Promise<Buffer>>(); // deux demandes du même texte en même temps ne paient qu'une fabrication

export type ClipResult = { bytes: Buffer; source: "stored" | "live"; key: string; chars: number; saved: boolean };

// Son fabriqué dont l'enregistrement a échoué : gardé 10 min en mémoire pour ne pas repayer la même voix à chaque requête.
const recent = new Map<string, { bytes: Buffer; at: number }>();
const RECENT_MS = 10 * 60 * 1000;

// Le message pour ce plan : le fichier gardé s'il existe ; sinon, si `allowLive`, on le fabrique (après contrôle du plafond) et
// on le garde. `allowLive: false` (chargement d'avance du navigateur) ne dépense jamais rien.
export async function clipFor(
  plan: Plan,
  lang: VoiceLang,
  choice: Partial<SoilChoice> | undefined,
  opts: { allowLive: boolean; counter?: string; limit?: number; beforeLive?: (chars: number) => Promise<boolean> },
): Promise<ClipResult> {
  const text = clipText(plan, lang, choice);
  if (text.length > MAX_CHARS) throw new Error(`message trop long (${text.length} caractères)`);
  const key = clipKey(text);
  const kept = recent.get(key);
  if (kept && Date.now() - kept.at < RECENT_MS) return { bytes: kept.bytes, source: "stored", key, chars: text.length, saved: false };
  let stored: Buffer | null;
  try {
    stored = await getClip(key);
  } catch (e) {
    if (e instanceof StoreError) throw new ClipError("unavailable", e.message); // panne du stockage : on ne dépense rien
    throw e;
  }
  if (stored) return { bytes: stored, source: "stored", key, chars: text.length, saved: true };
  if (!opts.allowLive) throw new ClipError("miss", "pas encore préparé");

  let job = inflight.get(key);
  if (!job) {
    job = (async () => {
      if (opts.beforeLive && !(await opts.beforeLive(text.length))) throw new ClipError("budget", "plafond par adresse atteint");
      const ok = await chargeUsage(opts.counter ?? "tts_live", text.length, opts.limit ?? LIMITS.ttsChars);
      if (!ok) throw new ClipError("budget", "plafond de voix du jour atteint");
      return synthesize(text);
    })().finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  const bytes = await job;
  let saved = true;
  try {
    await putClip(key, bytes);
  } catch (e) {
    saved = false;
    console.error("[advice] fichier non gardé :", (e as Error).message); // on sert quand même le son fabriqué
    recent.set(key, { bytes, at: Date.now() });
    if (recent.size > 20) recent.delete(recent.keys().next().value as string);
  }
  return { bytes, source: "live", key, chars: text.length, saved };
}

// ---------- préparation du matin ----------

// Cultures par ordre d'importance pour la démonstration : celle de l'accueil d'abord, puis les plus parlantes.
const FIRST_CROPS = ["olivier", "piment", "tomate", "ble", "pomme-de-terre", "oignon"];

// Gouvernorats agricoles les plus probables après Kairouan (voir regions.ts)
const EXTRA_REGIONS = ["sidi-bouzid", "sfax", "kasserine", "sousse", "nabeul", "gafsa"];

export function pregenQueries(regions: string[] = ["kairouan"], langs: VoiceLang[] = ["aeb"]): AdviceQuery[] {
  const ids = CROPS.map((c) => c.id);
  const crops = [...FIRST_CROPS.filter((c) => ids.includes(c)), ...ids.filter((c) => !FIRST_CROPS.includes(c))].filter((c) => getCrop(c));
  const agos: (number | undefined)[] = [undefined, 3, 2, 1, 4, 5, 6, 7, 0]; // « inconnu » d'abord : c'est l'état de l'accueil
  const out: AdviceQuery[] = [];
  for (const region of regions)
    for (const lang of langs) {
      // rejeu de la canicule : les scènes montrées au jury, en premier
      for (const [crop, ago] of [["tomate", 7], ["tomate", undefined], ["olivier", 7], ["olivier", undefined], ["piment", 7]] as [string, number | undefined][])
        out.push({ region, crop, lang, ago, soil: "limoneux", system: "goutte", asOf: REPLAY_DATE });
      for (const crop of crops) for (const ago of agos) out.push({ region, crop, lang, ago, soil: "limoneux", system: "goutte" });
    }
  // les autres grandes régions agricoles, pour les deux cultures qu'un visiteur essaie d'abord (celle de saison et l'olivier) :
  // un juré qui change de région entend la voix tout de suite au lieu d'attendre une fabrication
  if (regions.length === 1 && regions[0] === "kairouan") {
    const month = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Tunis", month: "numeric" }).format(new Date()));
    const first = [defaultCropForMonth(month), "olivier"].filter((c, i, a) => a.indexOf(c) === i);
    for (const region of EXTRA_REGIONS)
      for (const lang of langs) for (const crop of first) for (const ago of [undefined, 3] as (number | undefined)[]) out.push({ region, crop, lang, ago, soil: "limoneux", system: "goutte" });
  }
  return out;
}

export type PregenReport = {
  scenes: number;
  distinctTexts: number;
  alreadyStored: number;
  generated: number;
  failed: number;
  unsaved: number;
  budgetStop: boolean;
  timeStop: boolean;
  chars: number;
  seconds: number;
};

// Prépare les messages courts des scènes courantes avec la météo du jour. Reprenable : ce qui est déjà gardé est ignoré,
// le plafond du jour (usage.ts, compteur « tts_pregen ») et le temps imparti arrêtent proprement le travail.
export async function pregenerate(opts: { maxMs?: number; concurrency?: number; regions?: string[]; langs?: VoiceLang[]; dryRun?: boolean } = {}): Promise<PregenReport> {
  const t0 = Date.now();
  const maxMs = opts.maxMs ?? 50000;
  const queries = pregenQueries(opts.regions, opts.langs);
  const rep: PregenReport = { scenes: queries.length, distinctTexts: 0, alreadyStored: 0, generated: 0, failed: 0, unsaved: 0, budgetStop: false, timeStop: false, chars: 0, seconds: 0 };

  // 1) les textes : une météo par (région, date de rejeu), un plan par scène, doublons retirés
  const forecasts = new Map<string, Awaited<ReturnType<typeof loadForecast>>>();
  const texts = new Map<string, { plan: Plan; lang: VoiceLang; choice: Partial<SoilChoice> }>();
  for (const q of queries) {
    try {
      const fk = `${q.region}|${q.asOf ?? ""}`;
      let fc = forecasts.get(fk);
      if (!fc) forecasts.set(fk, (fc = await loadForecast(q.region, q.asOf)));
      const plan = await planForQuery(q, fc);
      const choice = { soil: q.soil, system: q.system } as Partial<SoilChoice>;
      const key = clipKey(clipText(plan, q.lang, choice));
      if (!texts.has(key)) texts.set(key, { plan, lang: q.lang, choice });
    } catch (e) {
      rep.failed++;
      console.error("[pregen] scène ignorée :", (e as Error).message);
    }
  }
  rep.distinctTexts = texts.size;

  // 2) la voix, quelques fabrications en parallèle (limite de simultanéité du compte ElevenLabs)
  const todo = [...texts.values()];
  let next = 0;
  let unsavedInARow = 0;
  const worker = async () => {
    for (;;) {
      const item = todo[next++];
      if (!item) return;
      if (rep.budgetStop || unsavedInARow >= 2) return; // stockage en panne : inutile de payer des voix qu'on ne peut pas garder
      if (Date.now() - t0 > maxMs) {
        rep.timeStop = true;
        return;
      }
      try {
        const text = clipText(item.plan, item.lang, item.choice);
        if (opts.dryRun) {
          const stored = await getClip(clipKey(text));
          if (stored) rep.alreadyStored++;
          else rep.chars += text.length;
          continue;
        }
        const r = await clipFor(item.plan, item.lang, item.choice, { allowLive: true, counter: "tts_pregen", limit: LIMITS.pregenChars });
        if (r.source === "stored") rep.alreadyStored++;
        else {
          rep.generated++;
          rep.chars += r.chars;
          if (r.saved) unsavedInARow = 0;
          else {
            rep.unsaved++;
            unsavedInARow++;
          }
        }
      } catch (e) {
        if (e instanceof ClipError && e.reason === "budget") rep.budgetStop = true;
        else {
          rep.failed++;
          console.error("[pregen] échec :", (e as Error).message);
        }
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? 5) }, worker));
  rep.seconds = Math.round((Date.now() - t0) / 100) / 10;
  return rep;
}
