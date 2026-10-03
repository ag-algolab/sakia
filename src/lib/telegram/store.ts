// État du bot : table Supabase `subscribers` (docs/supabase.sql), via l'API REST, clé secrète côté serveur.
// Une ligne par conversation. Seules les colonnes de la table sont stockées : rien d'autre sur la personne.

import type { Lang } from "../messages";

export type Subscriber = {
  chat_id: number;
  lang: Lang;
  region_id: string;
  crop_id: string;
  soil: string;
  system: string;
  last_irrigation: string | null; // AAAA-MM-JJ
  daily_bulletin: boolean;
};

export type SubscriberPatch = Partial<Omit<Subscriber, "chat_id">>;

export class StoreError extends Error {
  constructor(
    readonly kind: "table_missing" | "config" | "http",
    message: string,
  ) {
    super(message);
  }
}

export interface Store {
  get(chatId: number): Promise<Subscriber | null>;
  upsert(chatId: number, patch: SubscriberPatch): Promise<Subscriber>;
  remove(chatId: number): Promise<void>;
  listDaily(): Promise<Subscriber[]>;
}

const COLUMNS = "chat_id,lang,region_id,crop_id,soil,system,last_irrigation,daily_bulletin";

async function rest<T>(path: string, init: RequestInit & { headers?: Record<string, string> } = {}): Promise<T> {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new StoreError("config", "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent");
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/${path}`, {
      ...init,
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new StoreError("http", "Supabase injoignable");
  }
  if (res.status === 404) throw new StoreError("table_missing", "table subscribers introuvable (docs/supabase.sql à exécuter)");
  if (!res.ok) throw new StoreError("http", `Supabase a répondu ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const supabaseStore: Store = {
  async get(chatId) {
    const rows = await rest<Subscriber[]>(`subscribers?chat_id=eq.${chatId}&select=${COLUMNS}&limit=1`);
    return rows[0] ?? null;
  },
  async upsert(chatId, patch) {
    const rows = await rest<Subscriber[]>(`subscribers?on_conflict=chat_id&select=${COLUMNS}`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ chat_id: chatId, ...patch, updated_at: new Date().toISOString() }),
    });
    return rows[0];
  },
  async remove(chatId) {
    await rest(`subscribers?chat_id=eq.${chatId}`, { method: "DELETE" });
  },
  async listDaily() {
    const out: Subscriber[] = [];
    for (let offset = 0; ; offset += 1000) {
      const rows = await rest<Subscriber[]>(`subscribers?daily_bulletin=eq.true&select=${COLUMNS}&order=chat_id&limit=1000&offset=${offset}`);
      out.push(...rows);
      if (rows.length < 1000) return out;
    }
  },
};
