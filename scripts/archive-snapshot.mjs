// Copie de secours de l'archive météo de Kairouan (Open-Meteo, ERA5, CC BY 4.0), servie par src/lib/weather.ts SEULEMENT quand
// Open-Meteo ne répond pas (quota gratuit dépassé, panne) : la page Preuve, la bande de chiffres de l'accueil et le rejeu de la canicule
// restent debout. Mêmes données que l'appel direct ; seul le dernier jour enregistré la limite.
// Lancer : node scripts/archive-snapshot.mjs   (écrit src/lib/data/archive-kairouan.json)
import { mkdirSync, writeFileSync } from "node:fs";

const LAT = 35.6781; // Kairouan : mêmes coordonnées que src/lib/regions.ts (la copie n'est servie que pour elles)
const LON = 10.0963;
const START = "2015-01-01";
const DAY = 86400000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const end = iso(Date.now() - DAY); // hier en temps universel : dernier jour complet

const url =
  `https://archive-api.open-meteo.com/v1/archive?latitude=${LAT}&longitude=${LON}&start_date=${START}&end_date=${end}` +
  "&daily=et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=Africa%2FTunis";
const res = await fetch(url, { headers: { "User-Agent": "sakia-hackathon/0.1" } });
if (!res.ok) throw new Error(`Open-Meteo ${res.status} : ${await res.text()}`);
const { daily: d } = await res.json();

// la copie ne garde pas les dates : elles se recalculent à partir du premier jour, il ne doit donc manquer aucun jour
const t0 = Date.parse(`${START}T00:00:00Z`);
d.time.forEach((date, i) => {
  if (date !== iso(t0 + i * DAY)) throw new Error(`jour manquant dans l'archive : ${date} au lieu de ${iso(t0 + i * DAY)}`);
});

const out = {
  about: "Copie de secours de l'archive Open-Meteo (ERA5, CC BY 4.0), servie seulement si Open-Meteo ne répond pas. Régénérer : node scripts/archive-snapshot.mjs",
  lat: LAT,
  lon: LON,
  start: START,
  end: d.time[d.time.length - 1],
  savedAt: new Date().toISOString(),
  et0: d.et0_fao_evapotranspiration,
  rain: d.precipitation_sum,
  tmax: d.temperature_2m_max,
  tmin: d.temperature_2m_min,
};
mkdirSync("src/lib/data", { recursive: true });
const json = JSON.stringify(out);
writeFileSync("src/lib/data/archive-kairouan.json", json);
console.log(`${d.time.length} jours, ${START} → ${out.end}, ${Math.round(json.length / 1024)} Ko`);
