// Vérifie les prérequis du bot, sans jamais afficher une valeur secrète.
// Usage : npx tsx scripts/telegram-check.ts

import { existsSync } from "node:fs";
import { loadLocalEnv } from "../src/lib/telegram/env";
import { tg } from "../src/lib/telegram/api";
import { StoreError, supabaseStore } from "../src/lib/telegram/store";

async function main() {
  loadLocalEnv();
  const yesNo = (b: boolean) => (b ? "oui" : "NON");

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.log("Jeton Telegram (TELEGRAM_BOT_TOKEN) : NON présent dans .env.local");
  } else {
    try {
      const me = await tg<{ username: string; first_name: string }>("getMe");
      console.log(`Jeton Telegram : valide, bot « ${me.first_name} » (@${me.username})`);
    } catch {
      console.log("Jeton Telegram : présent mais refusé par Telegram");
    }
  }

  try {
    await supabaseStore.get(0);
    console.log("Table subscribers : oui");
  } catch (e) {
    console.log(
      e instanceof StoreError && e.kind === "table_missing"
        ? "Table subscribers : NON (docs/supabase.sql à exécuter dans Supabase)"
        : "Table subscribers : base injoignable ou clés absentes",
    );
  }

  console.log(`CRON_SECRET présent : ${yesNo(!!process.env.CRON_SECRET)}`);
  console.log(`Module du bulletin vocal : ${yesNo(existsSync("src/lib/voice/index.ts"))}`);
}

main();
