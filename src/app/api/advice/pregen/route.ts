// GET /api/advice/pregen : prépare, avec la météo du jour, les messages courts des scènes courantes (Kairouan × cultures × dernier
// arrosage), pour que le bouton « écouter » joue tout de suite au lieu de fabriquer la voix devant l'utilisateur.
// Lancé chaque matin par la tâche planifiée de Vercel (vercel.json), avant l'envoi Telegram. Protégé par CRON_SECRET
// (en-tête « Authorization: Bearer … » envoyé par Vercel ; pas de paramètre d'adresse, les adresses sont écrites dans les journaux).
// Reprenable : ce qui est déjà gardé est ignoré ; le plafond du jour (compteur « tts_pregen ») et le temps imparti arrêtent le travail.

import { timingSafeEqual } from "node:crypto";
import { pregenerate } from "@/lib/advice/clip";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!same(bearer, expected)) return Response.json({ error: "interdit" }, { status: 403 });
  try {
    return Response.json(await pregenerate({ maxMs: 45000, concurrency: 6 }));
  } catch (e) {
    console.error("[advice/pregen]", (e as Error).message);
    return Response.json({ error: "préparation impossible" }, { status: 500 });
  }
}
