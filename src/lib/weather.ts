// Météo réelle via Open-Meteo : prévision à 16 jours, archive ERA5 depuis 2015, sans clé.
// Licence CC BY 4.0, usage gratuit réservé à un usage non commercial (OK pour ce hackathon).

export type Day = {
  date: string; // AAAA-MM-JJ
  et0: number; // évapotranspiration de référence FAO-56 (mm/j)
  rain: number; // pluie (mm/j)
  tmax: number;
  tmin: number;
  rainProb?: number; // probabilité de pluie (%), prévision seulement
};

export type Forecast = {
  days: Day[]; // 7 jours passés + 16 jours à venir
  today: string; // date du jour (fuseau Tunisie)
  fetchedAt: string; // ISO
  source: "open-meteo";
};

const TZ = "Africa%2FTunis";
const DAILY = "et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min";

const cache = new Map<string, { at: number; value: unknown }>();
const TTL_MS = 3 * 60 * 60 * 1000; // 3 h : les prévisions se rafraîchissent à cette cadence

// Renvoie la réponse ET l'heure à laquelle elle a été téléchargée chez Open-Meteo (pas l'heure de l'appel :
// une réponse gardée en mémoire garde son heure d'origine, c'est ce qui donne l'âge réel de la météo).
// `revalidateS` (archive seulement) garde aussi la réponse dans le cache de données de Next.js, partagé entre les instances
// sur Vercel ; jamais pour la prévision, dont l'âge réel commande le garde-fou « pas sûr ».
async function getJsonAt<T>(url: string, ttlMs: number, revalidateS?: number): Promise<{ value: T; at: number }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value as T, at: hit.at };
  const res = await fetch(url, {
    headers: { "User-Agent": "sakia-hackathon/0.1" },
    ...(revalidateS ? { next: { revalidate: revalidateS } } : {}),
  });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} sur ${url.split("?")[0]}`);
  const value = (await res.json()) as T;
  const at = Date.now();
  cache.set(url, { at, value });
  return { value, at };
}

async function getJson<T>(url: string, ttlMs: number, revalidateS?: number): Promise<T> {
  return (await getJsonAt<T>(url, ttlMs, revalidateS)).value;
}

type DailyPayload = {
  daily: {
    time: string[];
    et0_fao_evapotranspiration: (number | null)[];
    precipitation_sum: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max?: (number | null)[];
  };
};

function toDays(p: DailyPayload): Day[] {
  const d = p.daily;
  const out: Day[] = [];
  for (let i = 0; i < d.time.length; i++) {
    const et0 = d.et0_fao_evapotranspiration[i];
    if (et0 == null) continue; // jour sans donnée : on l'ignore plutôt que d'inventer
    out.push({
      date: d.time[i],
      et0,
      rain: d.precipitation_sum[i] ?? 0,
      tmax: d.temperature_2m_max[i] ?? NaN,
      tmin: d.temperature_2m_min[i] ?? NaN,
      rainProb: d.precipitation_probability_max?.[i] ?? undefined,
    });
  }
  return out;
}

export async function fetchForecast(lat: number, lon: number): Promise<Forecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&daily=${DAILY},precipitation_probability_max&past_days=7&forecast_days=16&timezone=${TZ}`;
  const { value: p, at } = await getJsonAt<DailyPayload>(url, TTL_MS);
  const days = toDays(p);
  const today = todayInTunisia();
  return { days, today, fetchedAt: new Date(at).toISOString(), source: "open-meteo" };
}

// Le quota gratuit d'Open-Meteo compte un appel de 11 ans pour environ 150 : l'archive (des jours passés, qui ne bougent plus)
// est gardée un jour, et une copie de secours sert Kairouan si Open-Meteo refuse ou ne répond pas.
const ARCHIVE_TTL_S = 24 * 60 * 60;

export async function fetchArchive(lat: number, lon: number, start: string, end: string): Promise<Day[]> {
  // Open-Meteo refuse une date de fin après la date du jour en temps universel : entre minuit et 1 h à Tunis,
  // « aujourd'hui » à Tunis est encore hier en UTC.
  const utcToday = new Date().toISOString().slice(0, 10);
  const last = end > utcToday && start <= utcToday ? utcToday : end;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${start}&end_date=${last}&daily=${DAILY}&timezone=${TZ}`;
  try {
    return toDays(await getJson<DailyPayload>(url, ARCHIVE_TTL_S * 1000, ARCHIVE_TTL_S));
  } catch (e) {
    const saved = await fromSnapshot(lat, lon, start, last);
    if (!saved) throw e;
    console.warn(`archive : copie de secours servie (${(e as Error).message})`);
    return saved;
  }
}

type Snapshot = {
  lat: number;
  lon: number;
  start: string;
  end: string;
  et0: (number | null)[];
  rain: (number | null)[];
  tmax: (number | null)[];
  tmin: (number | null)[];
};

// Copie de l'archive de Kairouan enregistrée par scripts/archive-snapshot.mjs (mêmes données, jusqu'au jour indiqué dans le fichier).
// Chargée seulement en cas de panne. Renvoie null hors de Kairouan ou hors de la période enregistrée.
async function fromSnapshot(lat: number, lon: number, start: string, end: string): Promise<Day[] | null> {
  const s = (await import("./data/archive-kairouan.json")).default as Snapshot;
  if (Math.abs(lat - s.lat) > 1e-6 || Math.abs(lon - s.lon) > 1e-6 || start > s.end || end < s.start) return null;
  const t0 = Date.parse(`${s.start}T00:00:00Z`);
  const daily: DailyPayload["daily"] = { time: [], et0_fao_evapotranspiration: [], precipitation_sum: [], temperature_2m_max: [], temperature_2m_min: [] };
  s.et0.forEach((et0, i) => {
    const date = new Date(t0 + i * 86400000).toISOString().slice(0, 10);
    if (date < start || date > end) return;
    daily.time.push(date);
    daily.et0_fao_evapotranspiration.push(et0);
    daily.precipitation_sum.push(s.rain[i]);
    daily.temperature_2m_max.push(s.tmax[i]);
    daily.temperature_2m_min.push(s.tmin[i]);
  });
  return toDays({ daily });
}

export function todayInTunisia(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date());
}

// Moyenne de l'ET0 et de la pluie par jour de l'année sur l'archive : sert à prolonger la prévision
// au-delà de 16 jours (estimation climatologique, à présenter comme telle).
export function climatology(archive: Day[]): Map<string, { et0: number; rain: number }> {
  const acc = new Map<string, { et0: number; rain: number; n: number }>();
  for (const d of archive) {
    const key = d.date.slice(5); // MM-JJ
    const a = acc.get(key) ?? { et0: 0, rain: 0, n: 0 };
    a.et0 += d.et0;
    a.rain += d.rain;
    a.n += 1;
    acc.set(key, a);
  }
  const out = new Map<string, { et0: number; rain: number }>();
  for (const [k, a] of acc) out.set(k, { et0: a.et0 / a.n, rain: a.rain / a.n });
  return out;
}
