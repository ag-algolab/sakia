// Le robot Telegram est-il vivant, là, maintenant ? C'est la question du « 24 h/24 ». Le robot n'est pas un programme qui tourne sur une
// machine : c'est une route du site (webhook), que Telegram appelle à chaque message. Il est donc joignable tant que
//   1. le jeton est accepté par Telegram,
//   2. le webhook est enregistré chez Telegram, sur l'adresse du site en ligne,
//   3. aucun message ne reste bloqué en attente,
//   4. la base des abonnés répond.
// botHealth() vérifie ces quatre points ; GET /api/telegram/health le montre (pour une sonde de surveillance : 200 = tout va bien,
// 503 = quelque chose à faire) ; ensureWebhook(), appelé chaque matin par le bulletin quotidien, réenregistre le webhook s'il a disparu.
// Rien de secret n'en sort : ni le jeton, ni le secret du webhook, ni l'adresse complète (le nom de domaine seulement).

import { TelegramError, tg } from "./api";
import { ConfigError, botToken, logError, webhookSecret } from "./config";
import { registerCommands } from "./commands";
import { StoreError, supabaseStore } from "./store";

export type BotHealth = {
  ok: boolean;
  checkedAt: string;
  token: "valid" | "missing" | "refused" | "unreachable";
  bot?: string; // @nom du robot
  webhook: "ok" | "missing" | "other_site" | "unknown";
  webhookHost?: string;
  pending?: number; // messages en attente chez Telegram
  lastError?: { ageSeconds: number; message: string }; // dernière erreur d'envoi vers le site, si elle date de moins d'une heure
  store: "ok" | "table_missing" | "unreachable" | "unknown";
  problems: string[];
};

type WebhookInfo = { url: string; pending_update_count: number; last_error_date?: number; last_error_message?: string };

const BACKLOG_ALERT = 20; // au-delà, des messages attendent depuis longtemps : le webhook ne répond pas
const RECENT_ERROR_S = 3600;

// Adresse publique du site en ligne : Vercel la fournit à l'exécution (nom de domaine seul). Absente en local : on ne compare alors rien.
export function expectedHost(): string | undefined {
  const h = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return h ? h.replace(/^https?:\/\//, "").replace(/\/+$/, "") : undefined;
}

export async function botHealth(host: string | undefined = expectedHost()): Promise<BotHealth> {
  const out: BotHealth = { ok: false, checkedAt: new Date().toISOString(), token: "unreachable", webhook: "unknown", store: "unknown", problems: [] };

  try {
    botToken();
    const me = await tg<{ username?: string }>("getMe");
    out.token = "valid";
    if (me.username) out.bot = `@${me.username}`;
  } catch (e) {
    if (e instanceof ConfigError) {
      out.token = "missing";
      out.problems.push("jeton absent (variable TELEGRAM_BOT_TOKEN)");
    } else if (e instanceof TelegramError && (e.status === 401 || e.status === 404)) {
      out.token = "refused";
      out.problems.push("jeton refusé par Telegram (révoqué ou erroné)");
    } else {
      out.problems.push("Telegram injoignable depuis le site");
    }
  }

  if (out.token === "valid") {
    try {
      const info = await tg<WebhookInfo>("getWebhookInfo");
      out.pending = info.pending_update_count;
      if (!info.url) {
        out.webhook = "missing";
        out.problems.push("aucun webhook enregistré : le robot ne reçoit rien");
      } else {
        out.webhookHost = new URL(info.url).host;
        if (host && out.webhookHost !== host) {
          out.webhook = "other_site";
          out.problems.push(`le webhook pointe vers un autre site (${out.webhookHost}) que le site en ligne (${host})`);
        } else out.webhook = "ok";
      }
      if (info.pending_update_count > BACKLOG_ALERT) out.problems.push(`${info.pending_update_count} messages en attente chez Telegram`);
      if (info.last_error_date) {
        const age = Math.round(Date.now() / 1000 - info.last_error_date);
        if (age >= 0 && age < RECENT_ERROR_S) {
          out.lastError = { ageSeconds: age, message: (info.last_error_message ?? "").slice(0, 200) };
          out.problems.push("Telegram n'a pas pu joindre le site dans la dernière heure");
        }
      }
    } catch {
      out.problems.push("état du webhook illisible");
    }
  }

  try {
    await supabaseStore.get(0);
    out.store = "ok";
  } catch (e) {
    if (e instanceof StoreError && e.kind === "table_missing") {
      out.store = "table_missing";
      out.problems.push("table des abonnés absente (docs/supabase.sql)");
    } else {
      out.store = "unreachable";
      out.problems.push("base des abonnés injoignable ou clés absentes");
    }
  }

  out.ok = out.problems.length === 0;
  return out;
}

// Réenregistre le webhook s'il N'EXISTE PLUS (jamais s'il pointe ailleurs : quelqu'un qui teste avec un tunnel garde la main).
// Seulement sur le site en ligne (VERCEL_ENV=production). Ne lève jamais d'erreur : le bulletin quotidien ne doit pas en pâtir.
export async function ensureWebhook(host: string | undefined = expectedHost()): Promise<"ok" | "repaired" | "skipped" | "failed"> {
  if (process.env.VERCEL_ENV !== "production" || !host) return "skipped";
  try {
    const info = await tg<WebhookInfo>("getWebhookInfo");
    if (info.url) return "ok";
    await tg("setWebhook", { url: `https://${host}/api/telegram`, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"] });
    await registerCommands().catch((e) => logError("menu des commandes", e));
    console.error(`[telegram] webhook absent : réenregistré sur ${host}`);
    return "repaired";
  } catch (e) {
    logError("réenregistrement du webhook", e);
    return "failed";
  }
}
