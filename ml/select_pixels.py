"""Choisit, dans chaque zone, des cellules de ~500 m dont au moins 70 % sont des cultures (ESA WorldCover 2021, classe 40).
Lecture gratuite de la carte (fichiers COG publics, pas de compte). Écrit ml/data/pixels.csv. Graine fixée : reproductible."""
import os
import numpy as np
import pandas as pd
import rasterio
from rasterio.enums import Resampling
from rasterio.windows import from_bounds
from regions import REGIONS

OUT = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT, exist_ok=True)
BASE = "/vsicurl/https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
rng = np.random.default_rng(42)
rows = []
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
    for rid, r in REGIONS.items():
        with rasterio.open(BASE.format(tile=r["tile"])) as ds:
            w = from_bounds(*r["bbox"], ds.transform)
            step = 10  # 10 m x 10 = 100 m, puis blocs de 5 x 5 = 500 m
            h, wd = int(w.height // (step * 5)) * 5, int(w.width // (step * 5)) * 5
            a = ds.read(1, window=w, out_shape=(h, wd), resampling=Resampling.mode)
            crop = (a == 40).astype(float)
            frac = crop.reshape(h // 5, 5, wd // 5, 5).mean(axis=(1, 3))
            # voisinage 3x3 : tolère le décalage entre notre grille et celle de MODIS
            pad = np.pad(frac, 1, mode="edge")
            nb = sum(pad[i : i + frac.shape[0], j : j + frac.shape[1]] for i in range(3) for j in range(3)) / 9
            ok = (frac >= 0.7) & (nb >= 0.55)
            ii, jj = np.nonzero(ok)
            lon0, lat1 = r["bbox"][0], r["bbox"][3]
            dlon = (r["bbox"][2] - r["bbox"][0]) / frac.shape[1]
            dlat = (r["bbox"][3] - r["bbox"][1]) / frac.shape[0]
            cand = [(lat1 - (i + 0.5) * dlat, lon0 + (j + 0.5) * dlon, frac[i, j]) for i, j in zip(ii, jj)]
            pick = rng.choice(len(cand), size=min(r["n"], len(cand)), replace=False)
            for k, p in enumerate(pick):
                la, lo, f = cand[p]
                rows.append(dict(pid=f"{rid}-{k:03d}", region=rid, lat=round(la, 5), lon=round(lo, 5), crop_frac=round(float(f), 3)))
            print(f"{rid}: {len(cand)} cellules de cultures sur {frac.size} ; {len(pick)} tirées", flush=True)
df = pd.DataFrame(rows)
# Garde-fou d'indépendance : aucune maille météo de 0,25° ne doit être partagée entre deux zones (sinon le « transfert » reverrait la même météo)
df["cell"] = [f"{round(a * 4) / 4:.2f}_{round(b * 4) / 4:.2f}" for a, b in zip(df.lat, df.lon)]
owners = df.groupby("cell")["region"].nunique()
assert (owners == 1).all(), f"mailles partagées entre zones : {owners[owners > 1].index.tolist()}"
df = df.drop(columns="cell")
df.to_csv(os.path.join(OUT, "pixels.csv"), index=False)
print(df.groupby("region").size().to_dict())
