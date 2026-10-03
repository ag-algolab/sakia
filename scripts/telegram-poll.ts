// Développement sans adresse publique : interroge Telegram (getUpdates) et répond avec le même code que le webhook.
// Usage : npx tsx scripts/telegram-poll.ts      (Ctrl+C pour arrêter)

import { loadLocalEnv } from "../src/lib/telegram/env";
import { tg } from "../src/lib/telegram/api";
import { handleUpdate } from "../src/lib/telegram/bot";
import { logError } from "../src/lib/telegram/config";
import { registerCommands } from "../src/lib/telegram/commands";
import type { TgUpdate } from "../src/lib/telegram/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  loadLocalEnv();
  const me = await tg<{ username: string }>("getMe");
  await tg("deleteWebhook"); // getUpdates et webhook s'excluent
  await registerCommands();
  console.log(`Bot @${me.username} à l'écoute (interrogation longue). Ctrl+C pour arrêter.`);

  let offset = 0;
  for (;;) {
    try {
      const updates = await tg<TgUpdate[]>("getUpdates", { offset, timeout: 50, allowed_updates: ["message", "callback_query"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        await handleUpdate(u);
      }
    } catch (e) {
      logError("interrogation", e);
      await sleep(3000);
    }
  }
}

main().catch((e) => {
  logError("démarrage", e);
  process.exit(1);
});
