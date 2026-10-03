// POST /api/telegram : webhook de Telegram (production).
// Telegram joint un secret dans chaque appel (en-tête), enregistré par scripts/telegram-webhook.ts.
// On répond toujours 200 une fois l'appel authentifié : sinon Telegram renverrait le même message sans fin.

import { handleUpdate } from "@/lib/telegram/bot";
import { logError, safeEqual, webhookSecret } from "@/lib/telegram/config";
import type { TgUpdate } from "@/lib/telegram/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  let expected: string;
  try {
    expected = webhookSecret();
  } catch {
    return new Response("bot non configuré", { status: 503 });
  }
  if (!safeEqual(request.headers.get("x-telegram-bot-api-secret-token") ?? "", expected)) {
    return new Response("interdit", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as TgUpdate | null;
  if (!update || typeof update.update_id !== "number") return new Response("requête invalide", { status: 400 });
  try {
    await handleUpdate(update);
  } catch (e) {
    logError("webhook", e);
  }
  return Response.json({ ok: true });
}
