// Production : enregistre (ou retire) le webhook chez Telegram.
// Usage : npx tsx scripts/telegram-webhook.ts https://mon-site.vercel.app
//         npx tsx scripts/telegram-webhook.ts --info      (état actuel)
//         npx tsx scripts/telegram-webhook.ts --delete    (retire le webhook, pour reprendre l'interrogation)

import { loadLocalEnv } from "../src/lib/telegram/env";
import { tg } from "../src/lib/telegram/api";
import { logError, webhookSecret } from "../src/lib/telegram/config";
import { registerCommands } from "../src/lib/telegram/commands";

async function main() {
  loadLocalEnv();
  const arg = process.argv[2];
  if (!arg) throw new Error("Donnez l'adresse publique (https://...), ou --info, ou --delete.");

  if (arg === "--delete") {
    await tg("deleteWebhook");
    console.log("Webhook retiré.");
    return;
  }
  if (arg === "--info") {
    const info = await tg<{ url: string; pending_update_count: number; last_error_message?: string }>("getWebhookInfo");
    console.log(`Adresse : ${info.url || "(aucune)"}\nMessages en attente : ${info.pending_update_count}\nDernière erreur : ${info.last_error_message ?? "aucune"}`);
    return;
  }

  const base = arg.replace(/\/+$/, "");
  if (!base.startsWith("https://")) throw new Error("Telegram exige une adresse en https://");
  const url = base.endsWith("/api/telegram") ? base : `${base}/api/telegram`;
  await tg("setWebhook", { url, secret_token: webhookSecret(), allowed_updates: ["message", "callback_query"] });
  await registerCommands();
  console.log(`Webhook enregistré : ${url}`);
}

main().catch((e) => {
  logError("webhook", e);
  process.exit(1);
});
