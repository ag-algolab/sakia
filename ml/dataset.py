"""Construit la table d'apprentissage : une ligne = un pixel × une période MODIS de 8 jours.
Cible : évapotranspiration satellite par jour (mm/jour) = ET MOD16A2GF / nombre de jours de la période.
Caractéristiques : météo (mêmes variables que le moteur de production), calendrier, NDVI (variante M2), et état de sol d'un bilan hydrique.
Causalité : le NDVI n'est connu qu'À LA FIN de la fenêtre de 16 jours de son composite (valeur reportée vers l'avant, jamais interpolée vers le futur) ;
les fenêtres de pluie et d'ET0 « passées » se terminent à la fin de la période. La météo de la période elle-même est observée (réanalyse), comme dans le moteur de production."""
import json
import os

import numpy as np
import pandas as pd

DATA = os.path.join(os.path.dirname(__file__), "data")
ET_FILL = 32760  # valeurs MOD16 au-dessus : non végétation, eau, urbain, nuage, hors données
NDVI_FILL = -3000


def weather_for(lat, lon, cache={}):
    la, lo = round(lat * 4) / 4, round(lon * 4) / 4
    key = (la, lo)
    if key not in cache:
        d = json.load(open(os.path.join(DATA, "weather", f"{la:.2f}_{lo:.2f}.json")))
        w = pd.DataFrame(d).rename(columns={"et0_fao_evapotranspiration": "et0", "precipitation_sum": "rain", "temperature_2m_max": "tmax", "temperature_2m_min": "tmin"})
        w["time"] = pd.to_datetime(w["time"])
        cache[key] = w.set_index("time").astype(float).interpolate(limit=3).fillna(0.0)
    return cache[key], key


def bucket(kc_daily, et0, rain, taw=100.0, p=0.5):
    """Bilan hydrique FAO-56 à un réservoir, sans irrigation : renvoie l'ET réelle journalière et la sécheresse du sol (Dr/TAW) en début de jour.
    Pluie utile : comptée si ≥ 0,2 × ET0 (même règle que le moteur de production)."""
    raw = p * taw
    dr = 0.0
    eta = np.zeros(len(et0))
    dry = np.zeros(len(et0))
    for i in range(len(et0)):
        dry[i] = dr / taw
        etc = kc_daily[i] * et0[i]
        ks = 1.0 if dr <= raw else max(0.0, (taw - dr) / (taw - raw))
        eta[i] = ks * etc
        peff = rain[i] if rain[i] >= 0.2 * et0[i] else 0.0
        dr = min(taw, max(0.0, dr - peff + eta[i]))
    return eta, dry


def build(kc_by_month=None, max_pixels=None):
    """Renvoie la table. `kc_by_month` : coefficient de culture mensuel (calibré sur l'entraînement) pour le bilan hydrique « P0 » ; s'il manque
    on met 1.0 (la table brute sert à les calibrer, puis on la reconstruit)."""
    px = pd.read_csv(os.path.join(DATA, "pixels.csv"))
    rows = []
    for r in px.itertuples():
        path = os.path.join(DATA, "modis", f"{r.pid}.json")
        if not os.path.exists(path):
            continue
        j = json.load(open(path))
        et = pd.DataFrame(j["et"], columns=["date", "raw", "scale"])
        nd = pd.DataFrame(j["ndvi"], columns=["date", "raw", "scale"])
        if et.empty or nd.empty:
            continue
        et["date"] = pd.to_datetime(et["date"])
        nd["date"] = pd.to_datetime(nd["date"])
        et = et.sort_values("date").reset_index(drop=True)
        et["et_mm"] = np.where(et["raw"] <= ET_FILL, et["raw"] * et["scale"], np.nan)
        nd["ndvi"] = np.where(nd["raw"] > NDVI_FILL, nd["raw"] * nd["scale"], np.nan)
        w, cell = weather_for(r.lat, r.lon)
        idx = pd.date_range(w.index.min(), w.index.max(), freq="D")
        w = w.reindex(idx).ffill()
        # NDVI causal : chaque composite de 16 jours n'est utilisable qu'après la fin de sa fenêtre ; on reporte la dernière valeur connue
        avail = nd.set_index("date")["ndvi"].dropna()
        avail.index = avail.index + pd.Timedelta(days=16)
        ndvi_d = avail[~avail.index.duplicated()].reindex(idx.union(avail.index)).ffill().reindex(idx).values
        kc_lit = np.clip(1.64 * (np.nan_to_num(ndvi_d, nan=0.14) - 0.14), 0.0, 1.2)  # forme linéaire publiée NDVI → Kcb (Bausch & Neale)
        months = idx.month.values
        kc_m = np.array([(kc_by_month or {}).get(int(m), 1.0) for m in months])
        eta_p0, dry_p0 = bucket(kc_m, w["et0"].values, w["rain"].values)
        eta_p1, dry_p1 = bucket(kc_lit, w["et0"].values, w["rain"].values)
        d = pd.DataFrame({"et0": w["et0"].values, "rain": w["rain"].values, "tmax": w["tmax"].values, "tmin": w["tmin"].values, "ndvi": ndvi_d, "eta_p0": eta_p0, "eta_p1": eta_p1, "dry_p0": dry_p0, "dry_p1": dry_p1}, index=idx)
        c = d.cumsum()
        for k in range(len(et)):
            start = et.loc[k, "date"]
            end = min(start + pd.Timedelta(days=7), pd.Timestamp(year=start.year, month=12, day=31))  # 8 jours, 5 ou 6 pour la dernière période de l'année
            if start not in d.index or end not in d.index or start < pd.Timestamp("2019-01-01") or start - pd.Timedelta(days=60) < d.index[0]:
                continue
            n = (end - start).days + 1
            assert n in (5, 6, 8), (r.pid, start, end)
            seg = d.loc[start:end]
            prev = d.loc[start - pd.Timedelta(days=8) : start - pd.Timedelta(days=1)]
            p30 = d.loc[end - pd.Timedelta(days=29) : end]
            p60 = d.loc[end - pd.Timedelta(days=59) : end]
            doy = (start + (end - start) / 2).dayofyear
            nd_prev = d["ndvi"].get(start - pd.Timedelta(days=16), np.nan)
            rows.append(
                dict(
                    pid=r.pid, region=r.region, lat=r.lat, lon=r.lon, cell=f"{cell[0]:.2f}_{cell[1]:.2f}", crop_frac=r.crop_frac, date=start, year=start.year, days=n,
                    et_day=(et.loc[k, "et_mm"] / n) if pd.notna(et.loc[k, "et_mm"]) else np.nan,
                    et0_day=seg["et0"].mean(), rain_day=seg["rain"].mean(), tmax=seg["tmax"].mean(), tmin=seg["tmin"].mean(),
                    et0_prev=prev["et0"].mean(), rain_prev=prev["rain"].mean(), rain_30=p30["rain"].sum(), rain_60=p60["rain"].sum(), et0_30=p30["et0"].sum(),  # 30 et 60 jours qui se terminent à la fin de la période
                    deficit_30=p30["et0"].sum() - p30["rain"].sum(),
                    month=str(start.month), doy_sin=np.sin(2 * np.pi * doy / 365.25), doy_cos=np.cos(2 * np.pi * doy / 365.25),
                    ndvi=seg["ndvi"].iloc[0], ndvi_trend=(seg["ndvi"].iloc[0] - nd_prev) if pd.notna(nd_prev) else np.nan,
                    p0_day=seg["eta_p0"].mean(), p1_day=seg["eta_p1"].mean(), dry_p0=seg["dry_p0"].iloc[0], dry_p1=seg["dry_p1"].iloc[0],
                )
            )
        if max_pixels and px.index[px.pid == r.pid][0] >= max_pixels:
            break
    return pd.DataFrame(rows)


if __name__ == "__main__":
    t = build()
    t.to_parquet(os.path.join(DATA, "table_raw.parquet"))
    print(t.shape, t["region"].value_counts().to_dict(), "lignes avec cible :", int(t["et_day"].notna().sum()))
