// Faux Open-Meteo pour tester l'interface DANS LE CLOUD, où le proxy bloque api.open-meteo.com (403).
// Préchargé avec NODE_OPTIONS="--require ...". Météo SYNTHÉTIQUE (climat plausible de Kairouan) : n'est jamais commitée,
// et aucun chiffre qui en sort ne doit être cité comme un résultat.
const realFetch = globalThis.fetch;

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

function dayOfYear(iso) {
  const d = new Date(iso + "T00:00:00Z");
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 864e5);
}
function addDays(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function todayTunis() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date());
}

function synth(iso) {
  const y = Number(iso.slice(0, 4));
  const doy = dayOfYear(iso);
  const r = rng(y * 1000 + doy);
  const s = (1 - Math.cos((2 * Math.PI * (doy - 15)) / 365)) / 2; // 0 mi-janvier, 1 mi-juillet
  const base = 14 + 21 * s;
  let tmax = base + (r() - 0.5) * 6;
  if (iso >= "2026-07-14" && iso <= "2026-07-22") tmax += 6.5; // canicule du rejeu
  const tmin = tmax - 9 - r() * 3;
  const et0 = Math.max(0.3, 0.9 + 6.2 * Math.pow(s, 1.15) + (tmax - base) * 0.12 + (r() - 0.5) * 0.8);
  const pRain = 0.3 - 0.22 * s + (doy > 250 && doy < 320 ? 0.08 : 0);
  let rain = 0;
  if (r() < pRain) rain = r1(-Math.log(1 - r()) * 6);
  const prob = rain > 0 ? Math.round(55 + r() * 40) : Math.round(r() * 30);
  return { tmax: r1(tmax), tmin: r1(tmin), et0: r2(et0), rain, prob };
}

function payload(dates, withProb) {
  const rows = dates.map(synth);
  const daily = {
    time: dates,
    et0_fao_evapotranspiration: rows.map((x) => x.et0),
    precipitation_sum: rows.map((x) => x.rain),
    temperature_2m_max: rows.map((x) => x.tmax),
    temperature_2m_min: rows.map((x) => x.tmin),
  };
  if (withProb) daily.precipitation_probability_max = rows.map((x) => x.prob);
  return { latitude: 35.67, longitude: 10.1, timezone: "Africa/Tunis", daily };
}

function range(a, b) {
  const out = [];
  for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}

globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let u;
  try {
    u = new URL(url);
  } catch {
    return realFetch(input, init);
  }
  if (u.hostname === "api.open-meteo.com") {
    const past = Number(u.searchParams.get("past_days") ?? 0);
    const fut = Number(u.searchParams.get("forecast_days") ?? 7);
    const today = todayTunis();
    const body = payload(range(addDays(today, -past), addDays(today, fut - 1)), true);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }
  if (u.hostname === "archive-api.open-meteo.com") {
    const start = u.searchParams.get("start_date");
    const end = u.searchParams.get("end_date");
    const body = payload(range(start, end), false);
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }
  return realFetch(input, init);
};
console.log("[mock-openmeteo] actif : météo synthétique pour api.open-meteo.com et archive-api.open-meteo.com");
