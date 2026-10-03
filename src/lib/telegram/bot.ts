// Cerveau du bot : reçoit une mise à jour Telegram (message, message vocal ou bouton) et répond.
// Même code pour le webhook (production) et pour le script d'interrogation (développement).
// Le texte du plan vient de planMessage (src/lib/messages.ts), les données de buildPlan (src/lib/plan.ts).
//
// Garde-fou « pas sûr : demandez à une personne » (critère éliminatoire) :
//  - planMessage affiche la phrase fixe quand plan.confidence.askAPerson : on ne la retire ni ne l'adoucit ;
//  - confidence.level === "none" : aucun conseil (ni plan, ni voix) ; le texte du bulletin ne sert jamais dans ce cas ;
//  - « Mettre à jour » recalcule toujours le plan ;
//  - dernier arrosage inconnu ou de plus de 7 jours : le plan est « pas sûr », et on le demande avec des boutons.

import { bulletinScript, planMessage } from "../messages";
import type { Lang } from "../messages";
import { buildPlan } from "../plan";
import type { Plan } from "../plan";
import { LEVEL_LABEL, LEVEL_MM } from "../rainLevels";
import type { RainLevel } from "../rainLevels";
import { loadReports, reporterHash, saveReport, summarize } from "../reports";
import type { ReportRow } from "../reports";
import { parseSms, scriptOf } from "../sms/parse";
import { EFFICIENCY, SOILS } from "../waterBalance";
import type { IrrigationSystem, SoilName } from "../waterBalance";
import { todayInTunisia } from "../weather";
import type { Forecast } from "../weather";
import { TelegramError, telegramApi } from "./api";
import type { BotApi } from "./api";
import { logError } from "./config";
import { WELCOME, formatWhen, t } from "./i18n";
import {
  agoDays,
  agoKeyboard,
  agoRows,
  cropKeyboard,
  cropName,
  langKeyboard,
  parseAction,
  planKeyboard,
  rainKeyboard,
  refreshKeyboard,
  regionKeyboard,
  regionName,
  stopKeyboard,
} from "./keyboards";
import type { Action } from "./keyboards";
import { RateLimiter } from "./ratelimit";
import { StoreError, supabaseStore } from "./store";
import type { Store, Subscriber } from "./store";
import { transcribe } from "./stt";
import type { Stt } from "./stt";
import type { InlineKeyboard, TgCallback, TgMessage, TgUpdate } from "./types";
import { synthesize } from "./voice";
import type { Synthesizer } from "./voice";

const MAX_VOICE_SECONDS = 30;

export type Deps = {
  api: BotApi;
  store: Store;
  synth: Synthesizer;
  stt: Stt;
  limiter: RateLimiter; // 20 messages par minute
  voiceLimiter: RateLimiter; // 10 messages vocaux par heure (la transcription coûte des crédits)
  plan: (sub: Subscriber, forecast?: Forecast) => Promise<Plan>;
  reportLimiter: RateLimiter; // 20 signalements de pluie par heure
  reports: { save: typeof saveReport; load: typeof loadReports }; // src/lib/reports.ts (import direct)
};

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

// « Il y a N jours » pour le moteur (0 à 7). Inconnu ou de plus de 7 jours : undefined, et le plan est alors « pas sûr ».
export function lastIrrigationAgo(last: string | null, today: string = todayInTunisia()): number | undefined {
  if (!last) return undefined;
  const d = daysBetween(last, today);
  return d > 7 ? undefined : Math.max(0, d);
}

export async function computePlan(sub: Subscriber, forecast?: Forecast): Promise<Plan> {
  return buildPlan(
    {
      regionId: sub.region_id,
      cropId: sub.crop_id,
      soil: sub.soil in SOILS ? (sub.soil as SoilName) : undefined,
      system: sub.system in EFFICIENCY ? (sub.system as IrrigationSystem) : undefined,
      lastIrrigationDaysAgo: lastIrrigationAgo(sub.last_irrigation),
    },
    forecast,
  );
}

export function defaultDeps(): Deps {
  return {
    api: telegramApi,
    store: supabaseStore,
    synth: synthesize,
    stt: transcribe,
    limiter: new RateLimiter(),
    voiceLimiter: new RateLimiter(10, 3_600_000),
    plan: computePlan,
    reportLimiter: new RateLimiter(20, 3_600_000),
    reports: { save: saveReport, load: loadReports },
  };
}

let shared: Deps | undefined;
function sharedDeps(): Deps {
  return (shared ??= defaultDeps());
}

// Texte complet : le plan du moteur (avec « pas sûr » et « conseil indicatif »), puis la date de mise à jour des données.
export function renderPlan(plan: Plan, lang: Lang, header?: string): string {
  const body = `${planMessage(plan, lang)}\n\n${t(lang).updatedAt(formatWhen(plan.dataFetchedAt, lang))}`;
  return header ? `${header}\n\n${body}` : body;
}

// Texte et boutons d'un plan. Dernier arrosage inconnu : on le demande. `subscribed` = le plan est celui de l'abonné
// (sinon, question isolée : seuls les boutons d'arrosage sont proposés, les autres agiraient sur un autre abonnement).
function present(plan: Plan, lang: Lang, regionId: string, cropId: string, subscribed: boolean, header?: string) {
  const ask = plan.confidence.reasons.includes("unknown_last_irrigation");
  const text = renderPlan(plan, lang, header) + (ask ? `\n\n${t(lang).askAgoHint}` : "");
  const markup: InlineKeyboard | undefined = subscribed
    ? planKeyboard(lang, ask ? { regionId, cropId } : undefined)
    : ask
      ? { inline_keyboard: agoRows(lang, regionId, cropId) }
      : undefined;
  return { text, markup };
}

export async function sendPlanTo(deps: Deps, sub: Subscriber, opts: { header?: string; forecast?: Forecast } = {}): Promise<void> {
  const plan = await deps.plan(sub, opts.forecast);
  const { text, markup } = present(plan, sub.lang, sub.region_id, sub.crop_id, true, opts.header);
  await deps.api.sendMessage(sub.chat_id, text, markup);
}

function isNotModified(e: unknown): boolean {
  return e instanceof TelegramError && /not modified/i.test(e.description);
}

// Modifie le message du bouton ; si Telegram refuse (message trop ancien, supprimé), en envoie un nouveau.
async function editOrSend(deps: Deps, chatId: number, messageId: number | undefined, text: string, markup?: InlineKeyboard): Promise<void> {
  if (messageId != null) {
    try {
      await deps.api.editMessage(chatId, messageId, text, markup);
      return;
    } catch (e) {
      if (isNotModified(e)) return;
    }
  }
  await deps.api.sendMessage(chatId, text, markup);
}

function guessLang(code: string | undefined): Lang {
  return code?.startsWith("ar") ? "ar" : code?.startsWith("en") ? "en" : "fr";
}

async function promptLanguage(deps: Deps, chatId: number): Promise<void> {
  await deps.api.sendMessage(chatId, WELCOME, langKeyboard("l"));
}

// Audio du bulletin. Jamais de conseil quand le moteur n'est pas assez sûr de lui (level "none") : le script du bulletin,
// lui, dirait « pas d'irrigation nécessaire ». `textFallback` : sans voix, répondre par le bulletin écrit (bouton demandé).
async function sendVoicePlan(deps: Deps, chatId: number, plan: Plan, lang: Lang, textFallback: boolean): Promise<void> {
  const s = t(lang);
  if (plan.confidence.level === "none") {
    if (textFallback) await deps.api.sendMessage(chatId, renderPlan(plan, lang));
    return;
  }
  let voice = null;
  try {
    await deps.api.sendChatAction(chatId, "upload_voice");
    voice = await deps.synth(plan, lang);
  } catch (e) {
    logError("voix", e); // la voix est facultative : on retombe sur le texte
  }
  if (voice) {
    const title = `${cropName(plan.cropId, lang)} · ${regionName(plan.regionId, lang)}`;
    await deps.api.sendAudio(chatId, voice.audio, voice.mime, `${title}\n${s.voiceCaption}`, title);
  } else if (textFallback) {
    const script = bulletinScript(plan, lang)
      .map((l) => l.text)
      .join("\n");
    await deps.api.sendMessage(chatId, `${s.voiceTextHeader}\n\n${script}`);
  }
}

async function sendVoice(deps: Deps, sub: Subscriber): Promise<void> {
  const plan = await deps.plan(sub);
  await sendVoicePlan(deps, sub.chat_id, plan, sub.lang, true);
}

// Question en clair (texte ou message vocal transcrit) : on repère la culture et la région avec l'analyseur de mots-clés,
// puis le moteur répond. Aucune IA générative : le conseil vient du calcul.
async function answerQuestion(
  deps: Deps,
  msg: TgMessage,
  text: string,
  parsed: ReturnType<typeof parseSms>,
  opts: { spoken?: Lang; echo: boolean },
): Promise<void> {
  const chatId = msg.chat.id;
  const sub = await deps.store.get(chatId);
  const lang: Lang = opts.spoken ?? (scriptOf(text) === "arabic" ? "ar" : (sub?.lang ?? guessLang(msg.from?.language_code)));
  const s = t(lang);
  if (opts.echo) await deps.api.sendMessage(chatId, s.heard(text.slice(0, 200))); // la personne vérifie ce qui a été compris

  if (parsed.kind !== "plan") return void (await deps.api.sendMessage(chatId, s.notUnderstood));
  const regionId = parsed.regionId ?? sub?.region_id;
  const cropId = parsed.cropId ?? sub?.crop_id;
  if (parsed.ambiguousCrops && regionId) {
    await deps.api.sendMessage(chatId, s.askCrop, cropKeyboard(lang, regionId, parsed.ambiguousCrops));
    return;
  }
  if (!regionId && !cropId) return void (await deps.api.sendMessage(chatId, s.notUnderstood));
  if (!regionId) return void (await deps.api.sendMessage(chatId, s.askRegion, regionKeyboard(lang)));
  if (!cropId) return void (await deps.api.sendMessage(chatId, s.askCrop, cropKeyboard(lang, regionId)));

  const same = !!sub && sub.region_id === regionId && sub.crop_id === cropId;
  const view: Subscriber = {
    chat_id: chatId,
    lang,
    region_id: regionId,
    crop_id: cropId,
    soil: sub?.soil ?? "limoneux",
    system: sub?.system ?? "goutte",
    last_irrigation: same ? sub.last_irrigation : null, // autre culture ou autre région : le dernier arrosage n'est pas connu
    daily_bulletin: false,
  };
  await deps.api.sendChatAction(chatId, "typing");
  const plan = await deps.plan(view);
  const out = present(plan, lang, regionId, cropId, same);
  await deps.api.sendMessage(chatId, out.text, out.markup);
  if (opts.echo) await sendVoicePlan(deps, chatId, plan, lang, false); // la réponse à une voix se fait en texte et en voix
}

async function onVoice(deps: Deps, msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id;
  const voice = msg.voice!;
  const sub = await deps.store.get(chatId).catch(() => null);
  const s = t(sub?.lang ?? guessLang(msg.from?.language_code));
  if (voice.duration > MAX_VOICE_SECONDS) return void (await deps.api.sendMessage(chatId, s.voiceTooLong));
  if (!deps.voiceLimiter.allow(chatId)) return void (await deps.api.sendMessage(chatId, s.voiceLimit));

  await deps.api.sendChatAction(chatId, "typing");
  let heard;
  try {
    const file = await deps.api.downloadFile(voice.file_id);
    heard = await deps.stt(file.data, file.mime);
  } catch (e) {
    logError("transcription", e);
    return void (await deps.api.sendMessage(chatId, s.voiceFailed));
  }
  if (!heard.text) return void (await deps.api.sendMessage(chatId, s.notUnderstood));
  await answerQuestion(deps, msg, heard.text, parseSms(heard.text), { spoken: heard.language, echo: true });
}

async function onCommand(deps: Deps, msg: TgMessage, cmd: string): Promise<void> {
  const chatId = msg.chat.id;
  if (cmd === "start") return promptLanguage(deps, chatId);

  const sub = await deps.store.get(chatId);
  if (cmd === "aide" || cmd === "help") {
    await deps.api.sendMessage(chatId, t(sub?.lang ?? guessLang(msg.from?.language_code)).help);
    return;
  }
  if (!sub) return promptLanguage(deps, chatId); // pas encore configuré : on commence par la configuration

  switch (cmd) {
    case "plan":
      await deps.api.sendChatAction(chatId, "typing");
      return sendPlanTo(deps, sub);
    case "bulletin":
      return sendVoice(deps, sub);
    case "pluie":
    case "rain":
      await deps.api.sendMessage(chatId, t(sub.lang).askRain, rainKeyboard(sub.lang));
      return;
    case "langue":
    case "language":
      await deps.api.sendMessage(chatId, "🌐", langKeyboard("L"));
      return;
    case "stop":
      await deps.store.upsert(chatId, { daily_bulletin: false });
      await deps.api.sendMessage(chatId, t(sub.lang).stopped, stopKeyboard(sub.lang));
      return;
    default:
      await deps.api.sendMessage(chatId, t(sub.lang).hint);
  }
}

async function onMessage(deps: Deps, msg: TgMessage): Promise<void> {
  const text = (msg.text ?? "").trim();
  const m = /^\/([A-Za-z_]+)(?:@\w+)?(?:\s|$)/.exec(text);
  if (m) return onCommand(deps, msg, m[1].toLowerCase());

  // texte libre : « olivier Kairouan », « zitoun kairouan », « زيتون القيروان »…
  const parsed = parseSms(text);
  if (parsed.kind === "stop") return onCommand(deps, msg, "stop");
  if (parsed.kind === "help") return onCommand(deps, msg, "aide");
  if (parsed.kind === "language") return onCommand(deps, msg, "langue");
  return answerQuestion(deps, msg, text, parsed, { echo: false });
}

async function finishSetup(deps: Deps, chatId: number, messageId: number | undefined, a: Extract<Action, { kind: "ago" }>): Promise<void> {
  const days = agoDays(a.code);
  const sub = await deps.store.upsert(chatId, {
    lang: a.lang,
    region_id: a.regionId,
    crop_id: a.cropId,
    last_irrigation: days == null ? null : addDays(todayInTunisia(), -days),
  });
  await editOrSend(deps, chatId, messageId, t(a.lang).saved(regionName(a.regionId, a.lang), cropName(a.cropId, a.lang)));
  await deps.api.sendChatAction(chatId, "typing");
  await sendPlanTo(deps, sub);
}

// « Il a plu ici » : le signalement va dans la région de l’abonné, pour la journée en cours, sous un identifiant anonyme
// (tg:<chat_id>, jamais affiché ; la base n’en garde qu’une empreinte salée). Le plan en tient compte quand
// au moins MIN_REPORTERS (3) personnes différentes ont signalé la même journée (médiane) : voir src/lib/reports.ts.
async function reportRain(deps: Deps, cb: TgCallback, sub: Subscriber, level: RainLevel): Promise<void> {
  const chatId = sub.chat_id;
  const messageId = cb.message!.message_id;
  const s = t(sub.lang);
  await deps.api.answerCallback(cb.id);
  if (!deps.reportLimiter.allow(chatId)) return editOrSend(deps, chatId, messageId, s.rainLimit);

  const today = todayInTunisia();
  const reporter = `tg:${chatId}`;
  // quantité retenue = le BAS de la fourchette du degré (prudence : surestimer la pluie ferait sauter une irrigation)
  const mm = LEVEL_MM[level];
  const saved = await deps.reports.save(sub.region_id, today, mm, reporter, level);
  if (!saved) return editOrSend(deps, chatId, messageId, s.rainFailed);

  // la lecture peut venir d’un cache de 60 s : on s’assure que notre propre signalement est compté
  const rows: ReportRow[] = [...(await deps.reports.load(sub.region_id, today))];
  const mine = reporterHash(reporter);
  if (!rows.some((r) => r.day === today && r.reporter_hash === mine)) rows.push({ day: today, mm, reporter_hash: mine, level });
  const day = summarize(rows).find((d) => d.date === today);
  const n = day?.n ?? 1;
  const region = regionName(sub.region_id, sub.lang);
  const text = [
    s.rainThanks(LEVEL_LABEL[sub.lang][level], region),
    s.rainCount(n, region, LEVEL_LABEL[sub.lang][day?.level ?? level]),
    n >= 2 ? s.rainApplied : s.rainRule,
  ].join("\n\n");
  await editOrSend(deps, chatId, messageId, text, refreshKeyboard(sub.lang));
}

async function onAction(deps: Deps, cb: TgCallback, a: Action): Promise<void> {
  const chatId = cb.message!.chat.id;
  const messageId = cb.message!.message_id;
  const answer = (text?: string) => deps.api.answerCallback(cb.id, text);

  switch (a.kind) {
    case "lang":
      await answer();
      return editOrSend(deps, chatId, messageId, t(a.lang).askRegion, regionKeyboard(a.lang));
    case "region":
      await answer();
      return editOrSend(deps, chatId, messageId, t(a.lang).askCrop, cropKeyboard(a.lang, a.regionId));
    case "crop":
      await answer();
      return editOrSend(deps, chatId, messageId, t(a.lang).askAgo, agoKeyboard(a.lang, a.regionId, a.cropId));
    case "ago":
      await answer();
      return finishSetup(deps, chatId, messageId, a);
    case "setLang": {
      const sub = await deps.store.get(chatId);
      if (!sub) {
        await answer();
        return editOrSend(deps, chatId, messageId, t(a.lang).askRegion, regionKeyboard(a.lang));
      }
      const updated = await deps.store.upsert(chatId, { lang: a.lang });
      await answer();
      await editOrSend(deps, chatId, messageId, t(a.lang).langSaved);
      return sendPlanTo(deps, updated);
    }
  }

  const sub = await deps.store.get(chatId);
  if (!sub) {
    await answer();
    return promptLanguage(deps, chatId);
  }
  const s = t(sub.lang);
  if (a.kind === "rain") return reportRain(deps, cb, sub, a.level);
  switch (a.name) {
    case "upd": {
      // toujours recalculer : jamais de plan gardé de l'appel précédent
      const out = present(await deps.plan(sub), sub.lang, sub.region_id, sub.crop_id, true);
      try {
        await deps.api.editMessage(chatId, messageId, out.text, out.markup);
        return answer();
      } catch (e) {
        if (!isNotModified(e)) throw e;
        return answer(s.alreadyUpToDate);
      }
    }
    case "voice":
      await answer();
      return sendVoice(deps, sub);
    case "irr": {
      const updated = await deps.store.upsert(chatId, { last_irrigation: todayInTunisia() });
      const out = present(await deps.plan(updated), updated.lang, updated.region_id, updated.crop_id, true);
      await answer(s.irrigatedNoted);
      return editOrSend(deps, chatId, messageId, out.text, out.markup);
    }
    case "rain":
      await answer();
      return void (await deps.api.sendMessage(chatId, s.askRain, rainKeyboard(sub.lang)));
    case "chg":
      await answer();
      return void (await deps.api.sendMessage(chatId, s.askRegion, regionKeyboard(sub.lang)));
    case "daily":
      await deps.store.upsert(chatId, { daily_bulletin: true });
      await answer();
      return editOrSend(deps, chatId, messageId, s.dailyOn);
    case "del":
      await deps.store.remove(chatId);
      await answer();
      return editOrSend(deps, chatId, messageId, s.deleted);
  }
}

async function onCallback(deps: Deps, cb: TgCallback): Promise<void> {
  const a = parseAction(cb.data);
  if (!a || !cb.message) return void (await deps.api.answerCallback(cb.id));
  return onAction(deps, cb, a);
}

// Point d'entrée. Ne lève jamais d'erreur : en cas de problème, la personne reçoit un message poli, sans trace.
export async function handleUpdate(update: TgUpdate, deps: Deps = sharedDeps()): Promise<void> {
  const cb = update.callback_query;
  const msg = update.message ?? cb?.message;
  if (!msg || msg.chat.type !== "private") return;
  if (!deps.limiter.allow(msg.chat.id)) return; // plus de 20 messages par minute : on ne répond pas

  try {
    if (cb) await onCallback(deps, cb);
    else if (update.message?.voice) await onVoice(deps, update.message);
    else if (update.message?.text) await onMessage(deps, update.message);
  } catch (e) {
    logError(e instanceof StoreError ? `base (${e.kind})` : "traitement", e);
    try {
      const sub = await deps.store.get(msg.chat.id).catch(() => null);
      const lang = sub?.lang ?? guessLang((cb?.from ?? update.message?.from)?.language_code);
      if (cb) await deps.api.answerCallback(cb.id).catch(() => undefined);
      await deps.api.sendMessage(msg.chat.id, t(lang).error);
    } catch (e2) {
      logError("message d'erreur", e2);
    }
  }
}
