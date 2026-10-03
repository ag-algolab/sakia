// Garde les messages parlés courts dans Supabase Storage (bucket public « voice »), un fichier par empreinte du texte.
// Pourquoi : sur Vercel le disque ne survit pas d'un serveur à l'autre, donc chaque démarrage à froid refabriquait la voix
// (jusqu'à 10 s). Ici le fichier est fabriqué une fois, puis lu en quelques dizaines de millisecondes par tout le monde.
// SERVEUR SEULEMENT (clé de service). Le bucket est public en LECTURE : ce sont des phrases de conseil, rien de personnel.

const BUCKET = "voice";

function conf(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: url.replace(/\/$/, ""), key } : null;
}

const fileName = (key: string) => `${key}.mp3`;

export class StoreError extends Error {}

// Le fichier, ou null s'il n'existe pas. Supabase répond 400 (« not_found ») ou 404 pour un fichier ou un bucket absent : c'est
// un vrai « pas encore préparé ». Toute AUTRE réponse (panne, délai dépassé, 5xx) lève StoreError : l'appelant ne doit jamais
// prendre une panne du stockage pour un fichier absent, sinon chaque requête refabriquerait (et paierait) la même voix.
export async function getClip(key: string): Promise<Buffer | null> {
  const c = conf();
  if (!c) throw new StoreError("stockage non configuré");
  let r: Response;
  try {
    r = await fetch(`${c.url}/storage/v1/object/public/${BUCKET}/${fileName(key)}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
  } catch {
    throw new StoreError("stockage injoignable");
  }
  if (r.status === 400 || r.status === 404) return null;
  if (!r.ok) throw new StoreError(`stockage : HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

async function createBucket(c: { url: string; key: string }): Promise<void> {
  const r = await fetch(`${c.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { apikey: c.key, Authorization: `Bearer ${c.key}`, "content-type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 1048576, allowed_mime_types: ["audio/mpeg"] }),
    signal: AbortSignal.timeout(8000),
  });
  // 400/409 « already exists » : tant mieux
  if (!r.ok && r.status !== 409 && r.status !== 400) throw new Error(`création du bucket « ${BUCKET} » : HTTP ${r.status}`);
}

// Enregistre le fichier (crée le bucket au premier usage). Lève une erreur si l'écriture échoue : l'appelant sert quand même
// le son qu'il vient de fabriquer, il perd seulement la copie gardée.
export async function putClip(key: string, bytes: Buffer): Promise<void> {
  const c = conf();
  if (!c) throw new Error("stockage non configuré (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  const send = () =>
    fetch(`${c.url}/storage/v1/object/${BUCKET}/${fileName(key)}`, {
      method: "POST",
      headers: {
        apikey: c.key,
        Authorization: `Bearer ${c.key}`,
        "content-type": "audio/mpeg",
        "x-upsert": "true",
        "cache-control": "max-age=31536000", // le nom est l'empreinte du texte : le contenu ne change jamais
      },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(10000),
    });
  let r = await send();
  if (!r.ok && (r.status === 404 || r.status === 400)) {
    await createBucket(c);
    r = await send();
  }
  if (!r.ok) throw new Error(`écriture du fichier : HTTP ${r.status}`);
}
