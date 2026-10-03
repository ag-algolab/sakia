// Identité anonyme de l'appareil pour les signalements de pluie, ÉMISE ET SIGNÉE PAR LE SERVEUR (GET /api/reports/token).
// POST /api/reports refuse toute identité que le serveur n'a pas émise : un navigateur ne peut pas choisir la sienne.
// Une seule clé de stockage pour tout le site (accueil, bulletin, téléphone, ligne vocale) : la même personne n'est comptée
// qu'une fois, quelle que soit la page d'où elle signale. Jamais un nom, un numéro ni une adresse.
// NAVIGATEUR SEULEMENT (localStorage, fetch) ; la vérification côté serveur est dans src/lib/reports.ts.

export const REPORTER_KEY = "sakia-reporter";

// Forme émise par issueReporterToken() (src/lib/reports.ts) : 24 caractères hexadécimaux, un point, 16 de signature.
// Une ancienne valeur gardée par une version précédente du site (« web:… », « br:… ») n'a pas cette forme : elle est remplacée.
const SIGNED = /^[0-9a-f]{24}\.[0-9a-f]{16}$/;

export type Identity = { ok: true; id: string } | { ok: false; reason: "network" | "rate" | "down" };

let memory = ""; // stockage refusé (navigation privée) : l'identité reste en mémoire pour la page

export async function reporterIdentity(forceNew = false): Promise<Identity> {
  if (!forceNew) {
    let known = "";
    try {
      known = localStorage.getItem(REPORTER_KEY) ?? "";
    } catch {
      // stockage inaccessible : on regarde la mémoire de la page
    }
    if (SIGNED.test(known)) return { ok: true, id: known };
    if (SIGNED.test(memory)) return { ok: true, id: memory };
  }
  try {
    const res = await fetch("/api/reports/token");
    if (res.status === 429) return { ok: false, reason: "rate" };
    if (!res.ok) return { ok: false, reason: "down" };
    const { reporter } = (await res.json()) as { reporter?: string };
    if (!reporter || !SIGNED.test(reporter)) return { ok: false, reason: "down" };
    memory = reporter;
    try {
      localStorage.setItem(REPORTER_KEY, reporter);
    } catch {
      // stockage refusé : l'identité reste en mémoire pour cette page
    }
    return { ok: true, id: reporter };
  } catch {
    return { ok: false, reason: "network" };
  }
}

export type SendResult = { ok: true; res: Response } | { ok: false; reason: "network" | "rate" | "down" };

// Envoie un signalement à POST /api/reports avec l'identité signée de l'appareil. `reason` : pas de réseau, trop de demandes
// d'identité (6 par adresse et par jour), ou serveur indisponible. Si le serveur dit que l'identité est refusée (sa clé a
// changé), on en demande une neuve, une seule fois. Toute autre réponse (200, 400, 429, 503...) est rendue telle quelle.
export async function sendRainReport(item: { regionId: string; level: string; day: string }, signal?: AbortSignal): Promise<SendResult> {
  const send = (reporter: string) =>
    fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regionId: item.regionId, level: item.level, day: item.day, reporter }),
      signal,
    });
  try {
    let who = await reporterIdentity();
    if (!who.ok) return who;
    let res = await send(who.id);
    if (res.status === 400) {
      const body = (await res.clone().json().catch(() => null)) as { code?: string } | null;
      if (body?.code === "bad_identity") {
        who = await reporterIdentity(true);
        if (!who.ok) return who;
        res = await send(who.id);
      }
    }
    return { ok: true, res };
  } catch {
    return { ok: false, reason: "network" };
  }
}
