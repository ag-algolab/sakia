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
  pregenChars: Number(process.env.PREGEN_DAILY_CHARS || 40000), // messages courts préparés chaque matin (tâche planifiée), par jour
  ttsCharsPerIp: Number(process.env.LIVE_TTS_IP_DAILY_CHARS || 1500), // fabrications à la demande, par adresse (une personne ne peut pas vider le plafond commun)
};

// Ajoute `amount` au compteur du jour s'il reste de la place. Renvoie true si la dépense est autorisée.
// ATOMIQUE sans fonction SQL : l'écriture est conditionnelle (« si le compteur vaut encore ce que j'ai lu »), donc deux appels
// simultanés ne peuvent pas passer ensemble sur la même marge ; le perdant relit et recommence. Premier appel du jour : insertion
// ignorée si quelqu'un d'autre l'a faite entre-temps.
export async function chargeUsage(counter: string, amount: number, dailyLimit: number): Promise<boolean> {
  const b = base();
  if (!b) return false;
  if (!Number.isFinite(amount) || amount < 0 || amount > dailyLimit) return false;
  const day = today();
  const headers = { apikey: b.key, Authorization: `Bearer ${b.key}`, "content-type": "application/json" };
  const where = `counter=eq.${encodeURIComponent(counter)}&day=eq.${day}`;
  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const r = await fetch(`${b.url}/rest/v1/usage_counters?select=amount&${where}`, { headers, signal: AbortSignal.timeout(2000) });
      if (!r.ok) return false;
      const rows = (await r.json()) as Row[];
      if (rows.length === 0) {
        const w = await fetch(`${b.url}/rest/v1/usage_counters?on_conflict=counter,day`, {
          method: "POST",
          headers: { ...headers, Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify({ counter, day, amount }),
          signal: AbortSignal.timeout(2000),
        });
        if (!w.ok) return false;
        if (((await w.json()) as Row[]).length === 1) return true;
        continue; // quelqu'un a créé la ligne entre-temps : on relit
      }
      const used = Number(rows[0].amount);
      if (used + amount > dailyLimit) return false;
      const w = await fetch(`${b.url}/rest/v1/usage_counters?${where}&amount=eq.${used}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ amount: used + amount }),
        signal: AbortSignal.timeout(2000),
      });
      if (!w.ok) return false;
      if (((await w.json()) as Row[]).length === 1) return true;
      // le compteur a bougé entre la lecture et l'écriture : on recommence
    }
    return false;
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
