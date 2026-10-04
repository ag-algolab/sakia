"""Entraîne et évalue selon le protocole de ml/README.md (avec ses amendements datés). Écrit ml/results/ (métriques, modèle).
Modèles : C climatologie mensuelle · P0 bilan hydrique à un réservoir de style FAO-56 (Kc mensuel = médiane de ET/ET0 à l'entraînement) ·
P1 idem avec Kcb(NDVI) · M1 CatBoost météo+calendrier (numérique) · M1c idem + mois catégoriel · M2 M1 + NDVI · H1 = P0 + correction CatBoost · H2 = P1 + correction."""
import json
import os

import numpy as np
import pandas as pd
from catboost import CatBoostRegressor, Pool
from scipy.stats import spearmanr

from dataset import DATA, build
from regions import REGIONS

OUT = os.path.join(os.path.dirname(__file__), "results")
os.makedirs(OUT, exist_ok=True)
SEED = 42
TRAIN_YEARS = range(2019, 2024)
TEST_YEARS = (2024, 2025)

# Modèles déployables : variables NUMÉRIQUES seulement (le mois passe par doy_sin / doy_cos) ; un CatBoost à variable catégorielle embarque des tables de
# statistiques de cible, bien plus lourdes à rejouer dans le navigateur. M1c = M1 + « mois » catégoriel, pour mesurer ce que la catégorielle apporte.
F_WEATHER = ["et0_day", "rain_day", "tmax", "tmin", "et0_prev", "rain_prev", "rain_30", "rain_60", "et0_30", "deficit_30", "doy_sin", "doy_cos"]
F_NDVI = ["ndvi", "ndvi_trend"]
CAT = ["month"]
SPECS = {
    "M1": (F_WEATHER, None),
    "M1c": (F_WEATHER + ["month"], None),
    "M2": (F_WEATHER + F_NDVI, None),
    "H1": (F_WEATHER + ["dry_p0", "p0_day"], "p0_day"),
    "H2": (F_WEATHER + F_NDVI + ["dry_p1", "p1_day"], "p1_day"),
}


def metrics(y, p):
    e = np.asarray(p) - np.asarray(y)
    y = np.asarray(y)
    return dict(n=int(len(y)), rmse=float(np.sqrt(np.mean(e**2))), mae=float(np.mean(np.abs(e))), bias=float(np.mean(e)),
                r2=float(1 - np.sum(e**2) / np.sum((y - y.mean()) ** 2)), rel_rmse=float(np.sqrt(np.mean(e**2)) / y.mean()))


def cb_params(iters):
    return dict(iterations=iters, depth=6, learning_rate=0.05, l2_leaf_reg=3, loss_function="RMSE", random_seed=SEED, verbose=False, thread_count=2)


def fit_models(train, which=tuple(SPECS)):
    """Entraîne les modèles sur `train`. Arrêt précoce sur la DERNIÈRE ANNÉE d'entraînement (jamais sur le test), puis réajustement sur tout l'entraînement."""
    last = train["year"] == train["year"].max()
    models = {"clim": train.groupby("month")["et_day"].mean(), "mean": float(train["et_day"].mean())}
    for name in which:
        feats, base = SPECS[name]
        cat = [c for c in CAT if c in feats]
        y = train["et_day"] - (train[base] if base else 0.0)
        m = CatBoostRegressor(**cb_params(800))
        m.fit(Pool(train.loc[~last, feats], y[~last], cat_features=cat), eval_set=Pool(train.loc[last, feats], y[last], cat_features=cat), early_stopping_rounds=60)
        best = max(60, m.get_best_iteration() + 1)
        m = CatBoostRegressor(**cb_params(best))
        m.fit(Pool(train[feats], y, cat_features=cat))
        models[name] = m
    return models


def predict_with(models, df):
    out = pd.DataFrame(index=df.index)
    out["C"] = df["month"].map(models["clim"]).fillna(models["mean"]).values
    out["P0"] = df["p0_day"].values
    out["P1"] = df["p1_day"].values
    for name, (feats, base) in SPECS.items():
        if name in models:
            cat = [c for c in CAT if c in feats]
            out[name] = models[name].predict(Pool(df[feats], cat_features=cat)) + (df[base].values if base else 0.0)
    return out


def cluster_rmse_diff(y, a, b, cells, n=2000):
    """RMSE(a) − RMSE(b) avec intervalle à 95 % par rééchantillonnage des MAILLES MÉTÉO (les pixels d'une maille partagent la même météo : ils ne sont pas
    indépendants). Négatif = a plus proche du satellite que b."""
    g = pd.DataFrame({"c": cells, "n": 1.0, "sa": (a - y) ** 2, "sb": (b - y) ** 2}).groupby("c").sum()
    n_c, sa, sb = g["n"].values, g["sa"].values, g["sb"].values
    rng = np.random.default_rng(SEED)
    idx = rng.integers(0, len(g), (n, len(g)))
    d = np.sqrt(sa[idx].sum(1) / n_c[idx].sum(1)) - np.sqrt(sb[idx].sum(1) / n_c[idx].sum(1))
    return dict(diff=float(np.sqrt(sa.sum() / n_c.sum()) - np.sqrt(sb.sum() / n_c.sum())), ci95=[float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))], n_cells=int(len(g)))


def wm_rho(d, err, month, min_n=60):
    """Corrélation de Spearman moyenne À L'INTÉRIEUR de chaque mois (retire l'effet de saison)."""
    r = []
    for m in np.unique(month):
        k = month == m
        if k.sum() >= min_n and np.std(d[k]) > 0:
            r.append(spearmanr(d[k], err[k]).statistic)
    return float(np.nanmean(r)) if r else float("nan")


def q_ratio(d, err, month, min_n=60):
    r = []
    for m in np.unique(month):
        k = month == m
        if k.sum() >= min_n:
            q = pd.qcut(pd.Series(d[k]).rank(method="first"), 5, labels=False).values
            lo, hi = err[k][q == 0].mean(), err[k][q == 4].mean()
            if lo > 0:
                r.append(hi / lo)
    return float(np.mean(r)) if r else float("nan")


def disagreement_suite(df, pr, n_boot=300):
    """Le désaccord |M1 − P0| prédit-il l'erreur de P0 contre le satellite MIEUX qu'un désaccord « nul » |C − P0| (climatologie contre P0) ?
    Un M1 meilleur que P0 corrèle avec l'erreur de P0 par construction ; seule la comparaison au désaccord nul est probante."""
    y, month, cells = df["et_day"].values, df["month"].values, df["cell"].values
    err = np.abs(pr["P0"].values - y)
    cand = {"M1_vs_P0": np.abs(pr["M1"].values - pr["P0"].values), "H1_vs_P0": np.abs(pr["H1"].values - pr["P0"].values),
            "null_C_vs_P0": np.abs(pr["C"].values - pr["P0"].values), "null_P0_level": pr["P0"].values}
    res = {k: dict(spearman_within_month=wm_rho(v, err, month), quintile_ratio_within_month=q_ratio(v, err, month)) for k, v in cand.items()}
    rng = np.random.default_rng(SEED)
    ucells = np.unique(cells)
    where = {c: np.where(cells == c)[0] for c in ucells}
    diffs = []
    for _ in range(n_boot):
        pick = np.concatenate([where[c] for c in rng.choice(ucells, len(ucells))])
        diffs.append(wm_rho(cand["M1_vs_P0"][pick], err[pick], month[pick]) - wm_rho(cand["null_C_vs_P0"][pick], err[pick], month[pick]))
    diffs = np.array(diffs)
    res["M1_minus_null_spearman"] = dict(diff=res["M1_vs_P0"]["spearman_within_month"] - res["null_C_vs_P0"]["spearman_within_month"],
                                         ci95=[float(np.nanpercentile(diffs, 2.5)), float(np.nanpercentile(diffs, 97.5))])
    return res


def season_of(month):
    m = month.astype(int)
    return np.where(np.isin(m, (12, 1, 2)), "winter", np.where(np.isin(m, (3, 4, 5)), "spring", np.where(np.isin(m, (6, 7, 8)), "summer", "autumn")))


def table(df, pr):
    return {k: metrics(df["et_day"].values, pr[k].values) for k in pr.columns}


def cis_vs(df, pr, refs=("C", "P0"), names=("M1", "M1c", "M2", "H1", "H2", "P0", "C")):
    y, cells = df["et_day"].values, df["cell"].values
    return {ref: {k: cluster_rmse_diff(y, pr[k].values, pr[ref].values, cells) for k in names if k != ref and k in pr.columns} for ref in refs}


if __name__ == "__main__":
    raw = build()
    raw = raw[raw["et_day"].notna() & raw["ndvi"].notna()].copy()
    kt = raw[(raw.region == "kairouan") & raw.year.isin(TRAIN_YEARS)]
    ratio = (kt["et_day"] / kt["et0_day"].clip(lower=0.2)).groupby(kt["month"]).median()
    kc = {int(m): float(v) for m, v in ratio.items()}
    print("Kc mensuel (médiane de ET/ET0, Kairouan 2019-2023) :", {k: round(v, 2) for k, v in sorted(kc.items())}, flush=True)
    t = build(kc_by_month=kc)
    t = t[t["et_day"].notna() & t["ndvi"].notna()].reset_index(drop=True)

    def irrig_flag(g):  # pixels « à signature d'irrigation » : verts pendant la saison SÈCHE de leur région (défini par le NDVI seul)
        dm = REGIONS[g["region"].iloc[0]]["dry"]
        return float(g[g["month"].astype(int).isin(dm) & g["year"].isin(TRAIN_YEARS)]["ndvi"].mean() >= 0.35)

    flags = t.groupby("pid")[["region", "month", "year", "ndvi"]].apply(irrig_flag)
    t["irrig_sig"] = t["pid"].map(flags).fillna(0.0).astype(bool)
    t.to_parquet(os.path.join(DATA, "table.parquet"))
    nsig = {r: int(t[(t.region == r) & t.irrig_sig]["pid"].nunique()) for r in t.region.unique()}
    print("table :", t.shape, t.region.value_counts().to_dict(), "| pixels à signature d'irrigation :", nsig, flush=True)

    res = {"kc_by_month": kc, "n_rows": {k: int(v) for k, v in t.region.value_counts().items()},
           "n_pixels": {k: int(v) for k, v in t.groupby("region")["pid"].nunique().items()},
           "n_cells": {k: int(v) for k, v in t.groupby("region")["cell"].nunique().items()}, "irrigation_signature_pixels": nsig}
    train = t[(t.region == "kairouan") & t.year.isin(TRAIN_YEARS)].reset_index(drop=True)
    test = t[(t.region == "kairouan") & t.year.isin(TEST_YEARS)].reset_index(drop=True)

    models = fit_models(train)
    pr = predict_with(models, test)
    res["kairouan_test_2024_2025"] = table(test, pr)
    res["kairouan_test_by_year"] = {int(y): table(test[test.year == y], pr[test.year == y]) for y in TEST_YEARS}
    ss = season_of(test["month"].values)
    res["kairouan_test_by_season"] = {s: table(test[ss == s], pr[ss == s]) for s in ["winter", "spring", "summer", "autumn"]}
    res["kairouan_test_rmse_diff"] = cis_vs(test, pr)
    res["kairouan_test_disagreement"] = disagreement_suite(test, pr)
    sig = test["irrig_sig"].values
    res["kairouan_test_irrigation_signature"] = {"n_pixels": int(test.loc[sig, "pid"].nunique()), "models": table(test[sig], pr[sig]) if sig.sum() > 100 else None}
    for nm in ("M1", "M2"):
        imp = pd.Series(models[nm].get_feature_importance(), index=models[nm].feature_names_).sort_values(ascending=False)
        res[f"{nm.lower()}_feature_importance"] = {k: float(v) for k, v in imp.items()}
    models["M1"].save_model(os.path.join(OUT, "m1.json"), format="json")
    models["H1"].save_model(os.path.join(OUT, "h1.json"), format="json")
    res["m1_trees"], res["h1_trees"] = int(models["M1"].tree_count_), int(models["H1"].tree_count_)
    print("Kairouan, test 2024-2025 (mm/jour) :", flush=True)
    print(pd.DataFrame(res["kairouan_test_2024_2025"]).T[["n", "rmse", "mae", "bias", "r2"]].round(3).to_string(), flush=True)

    # validation spatiale ET temporelle : on retient à la fois des mailles ET une année (jamais l'une sans l'autre) ; 5 plis ; modèles sans physique (pas de recalage de Kc)
    cells = sorted(train["cell"].unique())
    oof = []
    for k in range(5):
        hold = set(cells[k::5])
        yk = 2019 + k
        tr = train[~train["cell"].isin(hold) & (train["year"] != yk)].reset_index(drop=True)
        te = train[train["cell"].isin(hold) & (train["year"] == yk)].reset_index(drop=True)
        if len(te) == 0 or len(tr) == 0:
            continue
        p = predict_with(fit_models(tr, which=("M1", "M1c", "M2")), te)
        p["et_day"], p["cell"] = te["et_day"].values, te["cell"].values
        oof.append(p)
    oof = pd.concat(oof, ignore_index=True)
    sp = oof[["C", "M1", "M1c", "M2"]]
    res["kairouan_cell_and_year_holdout_cv"] = {"models": table(oof, sp),
                                                "rmse_diff_vs_C": {k: cluster_rmse_diff(oof["et_day"].values, oof[k].values, oof["C"].values, oof["cell"].values) for k in ["M1", "M1c", "M2"]}}

    # transfert : modèle FIGÉ (entraîné sur Kairouan 2019-2023) appliqué ailleurs ; mailles météo toutes distinctes de celles de Kairouan (vérifié)
    res["transfer"] = {}
    for reg in [r for r in t.region.unique() if r != "kairouan"]:
        tt = t[t.region == reg].reset_index(drop=True)
        assert not (set(tt["cell"]) & set(train["cell"])), f"mailles partagées avec Kairouan : {reg}"
        if len(tt) < 200:
            continue
        pt = predict_with(models, tt)
        # C est la climatologie de KAIROUAN : elle transfère mal (saisons différentes). C_local = climatologie de la région elle-même, calculée sur ses propres données
        # (EN ÉCHANTILLON, donc optimiste : c'est une borne haute pour « la climatologie locale », qu'on n'aurait pas sans données satellite locales).
        pt["C_local"] = tt["month"].map(tt.groupby("month")["et_day"].mean()).values
        sg = tt["irrig_sig"].values
        late = tt["year"].isin(TEST_YEARS).values
        res["transfer"][reg] = {"all_years": table(tt, pt), "years_2024_2025": table(tt[late], pt[late]), "rmse_diff": cis_vs(tt, pt, refs=("C", "P0", "C_local"), names=("M1", "M2", "H1", "P0", "C", "C_local")),
                                "irrigation_signature": {"n_pixels": int(tt.loc[sg, "pid"].nunique()), "models": table(tt[sg], pt[sg]) if sg.sum() > 100 else None},
                                "disagreement": disagreement_suite(tt, pt, n_boot=150)}
        print(f"transfert → {reg} (RMSE mm/jour) :", {k: round(v["rmse"], 3) for k, v in res["transfer"][reg]["all_years"].items()}, flush=True)

    json.dump(res, open(os.path.join(OUT, "metrics.json"), "w"), indent=1)
    print("écrit ml/results/metrics.json")
