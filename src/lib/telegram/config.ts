// Configuration du bot. Le jeton n'est lu qu'ici et n'est jamais écrit dans une réponse ni un journal.

import { createHmac, timingSafeEqual } from "node:crypto";

export class ConfigError extends Error {}

export function botToken(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new ConfigError("TELEGRAM_BOT_TOKEN absent");
  return t;
}

// Secret que Telegram renvoie dans l'en-tête de chaque appel du webhook. Dérivé du jeton : rien de plus à configurer.
export function webhookSecret(): string {
  return createHmac("sha256", botToken()).update("sakia-telegram-webhook").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Retire le jeton de tout texte destiné aux journaux.
export function redact(text: string): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  return t ? text.split(t).join("***") : text;
}

export function logError(scope: string, e: unknown): void {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`[telegram] ${scope} : ${redact(msg).slice(0, 300)}`);
}
