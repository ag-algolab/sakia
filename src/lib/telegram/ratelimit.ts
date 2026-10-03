// Limite simple : au plus 20 messages par minute et par conversation, au-delà on ne répond plus.
// Le même compteur sert à limiter les messages vocaux (transcription payante) : voir Deps.voiceLimiter.
// Mémoire du processus : suffisant pour freiner un abus, pas un blocage strict en déploiement multi-instances.

export const MAX_PER_MINUTE = 20;
const WINDOW_MS = 60_000;

export class RateLimiter {
  constructor(
    private max: number = MAX_PER_MINUTE,
    private windowMs: number = WINDOW_MS,
  ) {}

  private hits = new Map<number, number[]>();

  // true = on traite ; false = on ignore.
  allow(chatId: number, now: number = Date.now()): boolean {
    const recent = (this.hits.get(chatId) ?? []).filter((t) => now - t < this.windowMs);
    const ok = recent.length < this.max;
    if (ok) recent.push(now);
    if (recent.length) this.hits.set(chatId, recent);
    else this.hits.delete(chatId);
    if (this.hits.size > 5000) this.prune(now);
    return ok;
  }

  private prune(now: number): void {
    for (const [id, ts] of this.hits) if (!ts.some((t) => now - t < this.windowMs)) this.hits.delete(id);
  }
}
