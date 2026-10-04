// GET /api/telegram/daily?secret=... : envoie le bulletin du jour aux abonnés.
// Protégé par CRON_SECRET (paramètre `secret` ou en-tête « Authorization: Bearer ... », que Vercel Cron envoie).
// Avant l'envoi, vérifie que le webhook existe encore chez Telegram et le réenregistre sinon (robot joignable 24 h/24 : health.ts).

import { logError, safeEqual } from "@/lib/telegram/config";
import { runDaily } from "@/lib/telegram/daily";
import { ensureWebhook } from "@/lib/telegram/health";

export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const given = new URL(request.url).searchParams.get("secret") ?? bearer;
  if (!safeEqual(given, expected)) return Response.json({ error: "interdit" }, { status: 403 });
  try {
    const webhook = await ensureWebhook(); // ne lève jamais d'erreur
    return Response.json({ ...(await runDaily()), webhook });
  } catch (e) {
    logError("bulletin quotidien", e);
    return Response.json({ error: "envoi impossible" }, { status: 500 });
  }
}
