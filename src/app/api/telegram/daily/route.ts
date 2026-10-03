// GET /api/telegram/daily?secret=... : envoie le bulletin du jour aux abonnés.
// Protégé par CRON_SECRET (paramètre `secret` ou en-tête « Authorization: Bearer ... », que Vercel Cron envoie).

import { logError, safeEqual } from "@/lib/telegram/config";
import { runDaily } from "@/lib/telegram/daily";

export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const given = new URL(request.url).searchParams.get("secret") ?? bearer;
  if (!safeEqual(given, expected)) return Response.json({ error: "interdit" }, { status: 403 });
  try {
    return Response.json(await runDaily());
  } catch (e) {
    logError("bulletin quotidien", e);
    return Response.json({ error: "envoi impossible" }, { status: 500 });
  }
}
