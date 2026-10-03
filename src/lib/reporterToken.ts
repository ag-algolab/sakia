// Identité anonyme de cet appareil pour les signalements de pluie, ÉMISE ET SIGNÉE PAR LE SERVEUR (GET /api/reports/token).
// Un navigateur ne choisit pas la sienne : le serveur refuse (400) toute identité qu'il n'a pas émise (src/lib/reports.ts,
// verifyReporterToken). Une seule clé de stockage pour tout le site (accueil, bulletin, téléphone dessiné, ligne vocale) :
// sur un même appareil, tout cela compte pour UNE personne. Jamais un nom, un numéro ni une adresse.
// À n'appeler que dans le navigateur (gestionnaires d'événements, effets). La ligne vocale (components/call/useIvrCall.ts)
// a sa propre copie de la même logique, avec la même clé et la même forme.

export const REPORTER_KEY = "sakia-reporter";
const SIGNED = /^[0-9a-f]{24}\.[0-9a-f]{16}$/; // forme émise par issueReporterToken()
let memoryReporter = ""; // repli si le stockage de l'appareil est bloqué : valable pour cette page seulement

export type TokenError = "network" | "rate" | "down";
export type TokenResult = { id: string } | { error: TokenError };

// L'appareil garde déjà une identité signée : un refus 400 vient alors peut-être d'une clé du serveur changée, pas d'une saisie fausse.
export function hasSignedReporter(): boolean {
  try {
    return SIGNED.test(localStorage.getItem(REPORTER_KEY) ?? "");
  } catch {
    return SIGNED.test(memoryReporter);
  }
}

// L'identité signée de cet appareil, demandée au serveur si l'appareil n'en a pas (ou qu'une neuve est exigée).
// Les anciennes formes fabriquées par le navigateur (« web:… », « br:… ») sont remplacées.
export async function reporterToken(forceNew = false): Promise<TokenResult> {
  if (!forceNew) {
    try {
      const known = localStorage.getItem(REPORTER_KEY);
      if (known && SIGNED.test(known)) return { id: known };
    } catch {
      if (SIGNED.test(memoryReporter)) return { id: memoryReporter };
    }
  }
  try {
    const res = await fetch("/api/reports/token", { cache: "no-store" });
    if (res.status === 429) return { error: "rate" }; // 6 identités par adresse et par jour : on réessaiera plus tard
    if (!res.ok) return { error: "down" };
    const { reporter } = (await res.json()) as { reporter?: string };
    if (!reporter || !SIGNED.test(reporter)) return { error: "down" };
    memoryReporter = reporter;
    try {
      localStorage.setItem(REPORTER_KEY, reporter);
    } catch {
      // stockage refusé : l'identité reste en mémoire pour cette page
    }
    return { id: reporter };
  } catch {
    return { error: "network" };
  }
}

// Envoie avec l'identité signée de l'appareil. Si le serveur la refuse (400) alors qu'elle venait de l'appareil (clé du
// serveur changée), on en demande une neuve et on réessaie UNE fois. Un refus pour une autre raison (jour ou région
// invalides) n'use pas d'identité : si elle vient d'être émise, on ne réessaie pas.
export async function withReporter(send: (reporter: string) => Promise<Response>): Promise<Response | { error: TokenError }> {
  const had = hasSignedReporter();
  let t = await reporterToken();
  if ("error" in t) return t;
  let res = await send(t.id);
  if (res.status === 400 && had) {
    t = await reporterToken(true);
    if (!("error" in t)) res = await send(t.id);
  }
  return res;
}
