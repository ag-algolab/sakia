// Garde les enregistrements de la ligne vocale dans le navigateur (Cache API) pour les écouter SANS internet.
// Indépendant du service worker : la page regarde d'abord sa propre mémoire, puis le réseau.
// Si le navigateur n'a pas de Cache API (page en http hors localhost), on retombe sur le réseau seul.

const NAME = "sakia-ivr-v1";

async function open(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(NAME) : null;
  } catch {
    return null;
  }
}

async function getResponse(url: string): Promise<Response | null> {
  const cache = await open();
  try {
    const hit = cache ? await cache.match(url) : undefined;
    if (hit) return hit;
  } catch {
    // lecture impossible : on essaie le réseau
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    try {
      await cache?.put(url, res.clone());
    } catch {
      // espace plein : on joue quand même sans garder
    }
    return res;
  } catch {
    return null;
  }
}

export async function loadBlob(url: string): Promise<Blob | null> {
  const res = await getResponse(url);
  return res ? res.blob() : null;
}

export async function loadJson<T>(url: string): Promise<T | null> {
  const res = await getResponse(url);
  try {
    return res ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

// Combien de ces fichiers sont déjà gardés dans le navigateur.
export async function countCached(urls: string[]): Promise<number> {
  const cache = await open();
  if (!cache) return 0;
  let n = 0;
  for (const u of urls) {
    try {
      if (await cache.match(u)) n++;
    } catch {
      // ignoré
    }
  }
  return n;
}

// Télécharge et garde tous ces fichiers ; `onProgress` est appelé après chacun.
export async function precache(urls: string[], onProgress: (done: number, total: number) => void): Promise<{ failed: number }> {
  let done = 0;
  let failed = 0;
  for (const u of urls) {
    const res = await getResponse(u);
    if (!res) failed++;
    else await res.arrayBuffer().catch(() => undefined); // vider le corps (la copie est déjà gardée)
    onProgress(++done, urls.length);
  }
  return { failed };
}
