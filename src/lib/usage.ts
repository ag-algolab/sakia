// Plafonds de consommation PERSISTANTS (Supabase) pour protéger les crédits payants (voix et agent ElevenLabs).
// Un plafond en mémoire repart à zéro à chaque démarrage à froid de Vercel : celui-ci ne triche pas.
// Principe : AVANT toute dépense payante déclenchée par un appel public, appeler chargeUsage(...) ; si elle renvoie
// false, ne rien dépenser et servir l'enregistrement de secours. En cas de panne de la base, on REFUSE (on protège les crédits).
// SERVEUR SEULEMENT. Table `usage_counters` : voir docs/supabase.sql.

type Row = { amount: number };

function base(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

function today(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date());
}

// Réglages par défaut, modifiables dans les variables d'environnement de Vercel (aucun redéploiement de code).
export const LIMITS = {
  ttsChars: Number(process.env.LIVE_TTS_DAILY_CHARS || 15000), // synthèses vocales à la demande, par jour
  agentSessions: Number(process.env.AGENT_SESSIONS_DAILY || 12), // conversations avec l'agent vocal, par jour
};

// Ajoute `amount` au compteur du jour s'il reste de la place. Renvoie true si la dépense est autorisée.
export async function chargeUsage(counter: string, amount: number, dailyLimit: number): Promise<boolean> {
  const b = base();
  if (!b) return false;
  const day = today();
  const headers = { apikey: b.key, Authorization: `Bearer ${b.key}`, "content-type": "application/json" };
  try {
    const r = await fetch(`${b.url}/rest/v1/usage_counters?select=amount&counter=eq.${encodeURIComponent(counter)}&day=eq.${day}`, {
      headers,
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return false;
    const rows = (await r.json()) as Row[];
    const used = rows.length ? Number(rows[0].amount) : 0;
    if (used + amount > dailyLimit) return false;
    const w = await fetch(`${b.url}/rest/v1/usage_counters?on_conflict=counter,day`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ counter, day, amount: used + amount }),
      signal: AbortSignal.timeout(2000),
    });
    return w.ok;
  } catch {
    return false;
  }
}

// Consommation du jour (pour l'afficher à Anthony ou dans les notes).
export async function usageToday(counter: string): Promise<number | null> {
  const b = base();
  if (!b) return null;
  try {
    const r = await fetch(`${b.url}/rest/v1/usage_counters?select=amount&counter=eq.${encodeURIComponent(counter)}&day=eq.${today()}`, {
      headers: { apikey: b.key, Authorization: `Bearer ${b.key}` },
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) return null;
    const rows = (await r.json()) as Row[];
    return rows.length ? Number(rows[0].amount) : 0;
  } catch {
    return null;
  }
}
