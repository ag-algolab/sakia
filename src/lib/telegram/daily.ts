// Bulletin quotidien : envoie le plan du jour à tous les abonnés qui ne l'ont pas désactivé.
// Appelé par GET /api/telegram/daily (protégé par CRON_SECRET).

import { getRegion } from "../regions";
import { fetchForecast } from "../weather";
import type { Forecast } from "../weather";
import { TelegramError } from "./api";
import { defaultDeps, sendPlanTo } from "./bot";
import type { Deps } from "./bot";
import { logError } from "./config";
import { t } from "./i18n";
import type { Subscriber } from "./store";

export type DailyReport = { subscribers: number; sent: number; failed: number; disabled: number };

const WORKERS = 5; // Telegram accepte environ 30 messages par seconde : on reste très en dessous

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runDaily(deps: Deps = defaultDeps()): Promise<DailyReport> {
  const subs = await deps.store.listDaily();
  const report: DailyReport = { subscribers: subs.length, sent: 0, failed: 0, disabled: 0 };

  // Une seule requête météo par région, même avec des milliers d'abonnés.
  const forecasts = new Map<string, Promise<Forecast>>();
  const forecastFor = (regionId: string): Promise<Forecast> | undefined => {
    const region = getRegion(regionId);
    if (!region) return undefined;
    let p = forecasts.get(regionId);
    if (!p) forecasts.set(regionId, (p = fetchForecast(region.lat, region.lon)));
    return p;
  };

  async function one(sub: Subscriber): Promise<void> {
    const header = t(sub.lang).dailyHeader;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await sendPlanTo(deps, sub, { header, forecast: await forecastFor(sub.region_id) });
        report.sent++;
        return;
      } catch (e) {
        if (e instanceof TelegramError && e.status === 429 && attempt === 0) {
          await sleep(Math.min(10, e.retryAfter ?? 2) * 1000);
          continue;
        }
        // la personne a bloqué le bot ou supprimé la conversation : on ne lui écrit plus
        if (e instanceof TelegramError && (e.status === 403 || (e.status === 400 && /chat not found/i.test(e.description)))) {
          await deps.store.upsert(sub.chat_id, { daily_bulletin: false }).catch((e2) => logError("désactivation", e2));
          report.disabled++;
          return;
        }
        logError("bulletin", e);
        report.failed++;
        return;
      }
    }
  }

  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(WORKERS, subs.length) }, async () => {
      while (next < subs.length) await one(subs[next++]);
    }),
  );
  return report;
}
