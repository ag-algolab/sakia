"""Télécharge la météo quotidienne (même source et mêmes variables que le moteur de production) pour les mailles de 0,25° qui contiennent
les pixels de ml/data/pixels.csv (toutes zones d'étude), 2018-10 → 2026-09. Un fichier JSON par maille dans ml/data/weather/. Reprenable."""
import json, os, time
import requests

OUT = os.path.join(os.path.dirname(__file__), "data", "weather")
os.makedirs(OUT, exist_ok=True)
DAILY = "et0_fao_evapotranspiration,precipitation_sum,temperature_2m_max,temperature_2m_min"
LATS = [35.0, 35.25, 35.5, 35.75, 36.0]
LONS = [9.25, 9.5, 9.75, 10.0, 10.25, 10.5]
START, END = "2018-10-01", "2026-09-25"


def fetch(lat, lon):
    path = os.path.join(OUT, f"{lat:.2f}_{lon:.2f}.json")
    if os.path.exists(path):
        return "déjà là"
    url = "https://archive-api.open-meteo.com/v1/archive"
    params = dict(latitude=lat, longitude=lon, start_date=START, end_date=END, daily=DAILY, timezone="Africa/Tunis")
    for attempt in range(5):
        r = requests.get(url, params=params, timeout=90)
        if r.status_code == 200:
            d = r.json()["daily"]
            json.dump(d, open(path, "w"))
            return f"{len(d['time'])} jours"
        time.sleep(5 * (attempt + 1))
    return f"échec HTTP {r.status_code}: {r.text[:120]}"


if __name__ == "__main__":
    import pandas as pd
    px = pd.read_csv(os.path.join(os.path.dirname(__file__), "data", "pixels.csv"))
    cells = sorted({(round(r.lat * 4) / 4, round(r.lon * 4) / 4) for r in px.itertuples()})  # maille de 0,25° la plus proche
    print(len(cells), "mailles pour", len(px), "pixels", flush=True)
    for la, lo in cells:
        print(f"{la:.2f},{lo:.2f}", fetch(la, lo), flush=True)
        time.sleep(0.3)
