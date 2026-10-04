// GET /api/telegram/health : le robot Telegram est-il vivant ? (voir src/lib/telegram/health.ts)
// 200 = jeton accepté, webhook enregistré sur le site en ligne, pas de message bloqué, base des abonnés joignable ;
// 503 = au moins un de ces points ne va pas (la liste est dans « problems »). À brancher sur une sonde de surveillance externe
// (UptimeRobot, Better Stack…, toutes les 5 minutes, alerte si le code n'est pas 200).
// Route publique : elle ne montre aucun secret (ni jeton, ni secret du webhook, ni adresse complète).
// Le résultat est gardé 30 s : une sonde qui insiste, ou un curieux, ne multiplie pas les appels à Telegram.

import { botHealth } from "@/lib/telegram/health";
import type { BotHealth } from "@/lib/telegram/health";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const KEEP_MS = 30_000;
let last: { at: number; health: BotHealth } | null = null;

export async function GET() {
  if (!last || Date.now() - last.at > KEEP_MS) last = { at: Date.now(), health: await botHealth() };
  const h = last.health;
  return Response.json(h, { status: h.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
