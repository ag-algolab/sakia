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
async function getJsonAt<T>(url: string, ttlMs: number): Promise<{ value: T; at: number }> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return { value: hit.value as T, at: hit.at };
  const res = await fetch(url, { headers: { "User-Agent": "sakia-hackathon/0.1" } });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} sur ${url.split("?")[0]}`);
  const value = (await res.json()) as T;
  const at = Date.now();
  cache.set(url, { at, value });
  return { value, at };
}

async function getJson<T>(url: string, ttlMs: number): Promise<T> {
  return (await getJsonAt<T>(url, ttlMs)).value;
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

export async function fetchArchive(lat: number, lon: number, start: string, end: string): Promise<Day[]> {
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}` +
    `&start_date=${start}&end_date=${end}&daily=${DAILY}&timezone=${TZ}`;
  return toDays(await getJson<DailyPayload>(url, 24 * 60 * 60 * 1000));
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
