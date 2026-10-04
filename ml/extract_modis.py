"""Évapotranspiration satellite (MOD16A2GF, 500 m, 8 jours, gap-filled) et NDVI (MOD13Q1, 250 m, 16 jours) pour chaque pixel de
ml/data/pixels.csv, via le service public gratuit de NASA ORNL DAAC (aucun compte, aucun coût). Max 10 dates par requête : on découpe.
Un fichier JSON par pixel dans ml/data/modis/ ; reprenable ; 4 requêtes en parallèle et une courte pause (service public : politesse)."""
import concurrent.futures as cf
import json
import os
import sys
import time

import pandas as pd
import requests

from regions import START

DATA = os.path.join(os.path.dirname(__file__), "data")
OUT = os.path.join(DATA, "modis")
os.makedirs(OUT, exist_ok=True)
BASE = "https://modis.ornl.gov/rst/api/v1"
H = {"Accept": "application/json"}
PRODUCTS = {"et": ("MOD16A2GF", "ET_500m"), "ndvi": ("MOD13Q1", "250m_16_days_NDVI")}


def get(url, params, tries=6):
    for k in range(tries):
        try:
            r = requests.get(url, params=params, headers=H, timeout=120)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 400:  # pas de données pour ce pixel/ces dates
                return None
        except requests.RequestException:
            pass
        time.sleep(3 * (k + 1))
    raise RuntimeError(f"échec {url} {params.get('latitude')},{params.get('longitude')}")


def dates(prod, lat, lon):
    d = get(f"{BASE}/{prod}/dates", {"latitude": lat, "longitude": lon})["dates"]
    return [x["modis_date"] for x in d if START <= x["calendar_date"] <= "2025-12-27"]


def one(px, mdates):
    path = os.path.join(OUT, f"{px.pid}.json")
    if os.path.exists(path):
        return px.pid, "déjà là"
    res = {"pid": px.pid, "lat": px.lat, "lon": px.lon}
    for key, (prod, band) in PRODUCTS.items():
        vals = []
        ds = mdates[key]
        for i in range(0, len(ds), 10):
            chunk = ds[i : i + 10]
            j = get(f"{BASE}/{prod}/subset", dict(latitude=px.lat, longitude=px.lon, band=band, startDate=chunk[0], endDate=chunk[-1], kmAboveBelow=0, kmLeftRight=0))
            if j:
                scale = float(j["scale"])
                vals += [(r["calendar_date"], r["data"][0], scale) for r in j["subset"]]
            time.sleep(0.1)
        res[key] = vals
    json.dump(res, open(path, "w"))
    return px.pid, f"et {len(res['et'])} / ndvi {len(res['ndvi'])}"


if __name__ == "__main__":
    px = pd.read_csv(os.path.join(DATA, "pixels.csv"))
    first = px.iloc[0]
    mdates = {k: dates(p, first.lat, first.lon) for k, (p, _) in PRODUCTS.items()}
    print({k: len(v) for k, v in mdates.items()}, "dates ;", len(px), "pixels", flush=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None  # ex. « kairouan » pour commencer par l'étude de cas
    keep = {"kairouan": 100}  # volume maîtrisé (service public gratuit) : 100 pixels d'étude de cas, 40 par région de transfert
    px["rank"] = px.groupby("region").cumcount()
    todo = [r for r in px.itertuples() if (only is None or r.region == only) and r.rank < keep.get(r.region, 40)]
    todo.sort(key=lambda r: (r.region != "kairouan", r.rank))  # l'étude de cas d'abord
    done = 0
    with cf.ThreadPoolExecutor(int(os.environ.get("THREADS", "12"))) as ex:
        for pid, msg in ex.map(lambda r: one(r, mdates), todo):
            done += 1
            if done % 10 == 0 or done == len(todo):
                print(f"{done}/{len(todo)} {pid} {msg}", flush=True)
