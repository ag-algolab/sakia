# Sakia-ML — a second opinion on crop water use (research, shadow mode)

**Status: protocol first written on 3 October 2026, before the full run. Every later change is listed in the amendment log below, with the reason. Results are added at the end as they come, good or bad.**

The irrigation advice in Sakia comes from a deterministic FAO-56 water balance. This folder asks a different question: **does a small gradient-boosting model (CatBoost), trained on local satellite and weather data, add anything over a monthly climatology and over a simple FAO-56-style water balance — and when the models disagree, is the disagreement a useful warning?**

**Kairouan is the case study, not the limit.** Every ingredient is global (MODIS, Open-Meteo and ESA WorldCover cover all of Africa); moving to another region means changing one bounding box in `ml/regions.py`. To test that claim rather than assert it, the Kairouan model is also applied, without retraining, to three regions whose weather cells are all different from Kairouan's: Sidi Bouzid (Tunisia, near), the Haouz around Marrakech (Morocco, far, semi-arid) and the Gezira scheme (Sudan, far, irrigated Sahel).

It never changes the advice shown to a farmer. It is a second opinion, and a candidate input for the "I am not sure — ask a technician" safeguard, **enabled only if the decision rule below is met**.

## What we can and cannot claim
- There is **no ground truth** for irrigation in Kairouan (no irrigation logs, no multi-year soil-moisture series): the open Tunisian station series we found hold weeks, not years.
- The label is **satellite evapotranspiration**, itself a model product with its own error. The only honest claims are "closer to / further from satellite ET". **We never claim a model is "more accurate" than FAO-56.**
- The sampled pixels are random cropland, and most cropland in these regions is rainfed. The secondary analysis below reports how many pixels have an irrigation signature; where there are none, this study says little about irrigated fields. The Gezira, an irrigated scheme, is where that question can be looked at.
- M2 and H2 use MODIS NDVI, which shares the sensor with the label's inputs (MOD16 is computed from MODIS vegetation products): they are **partly circular** and are research variants, not deployable.
- The physics baselines are **crude**: one soil reservoir (100 mm, depletion fraction 0.5, no irrigation, no soil evaporation term). "FAO-56 style" is a family name, not a claim that P0 reproduces the production engine.

## Data (all public, free, no account)
| Role | Source | Notes |
|---|---|---|
| Label | MODIS MOD16A2GF evapotranspiration, 500 m, 8-day, gap-filled (NASA ORNL DAAC subset service) | 2019–2025; invalid fill values removed |
| Cropland sample | ESA WorldCover 2021, class "cropland" (public cloud-optimised files) | random 500 m cells with ≥ 70 % cropland, fixed seed: 100 in Kairouan, 40 in each other region |
| Vegetation | MODIS MOD13Q1 NDVI, 250 m, 16-day (same service) | variants M2/H2 only; **causal**: a composite is usable only after its 16-day window ends |
| Weather | Open-Meteo archive (same source and ET0 definition as the production engine), one call per 0.25° cell | ET0, rain, Tmax, Tmin; period features look back only |
| Static context | cropland fraction only | no soil, elevation or district features |

## Models compared (same pixels, same dates)
| Id | What it is | Deployable offline? |
|---|---|---|
| **C** | monthly climatology of the label (training mean by month) | yes |
| **P0** | one-bucket water balance, FAO-56 style: Kc by month = training median of ET/ET0, effective-rain rule of the production engine | yes |
| **P1** | the same bucket with Kcb from NDVI (a published linear NDVI→Kcb form) | no (NDVI) |
| **M1** | CatBoost on weather + calendar, **numeric features only** | **yes** (symmetric trees replayed in the browser) |
| **M1c** | M1 + month as a CatBoost categorical feature (measures what the categorical adds) | no (categorical tables are heavy) |
| **M2** | M1 + NDVI | no (research, partly circular) |
| **H1** | hybrid: P0 + CatBoost correction learned on weather, calendar and the bucket's soil state | partly |
| **H2** | hybrid: P1 + CatBoost correction | no |

Why CatBoost: small tabular data, native categorical handling (tested with M1c), regularisation against overfitting on few years, and symmetric ("oblivious") trees whose export is a plain list of thresholds and leaf values that a 20-line function evaluates in JavaScript with no server (`src/lib/ml/catboost.ts`, checked against CatBoost to 1e-4 mm/day). The exported size is measured and reported in the results.

## Validation
- **Hold-out test: Kairouan 2024 and 2025**, never used for tuning, calibration or early stopping (early stopping uses the last training year, 2023).
- **Cell-and-year hold-out CV** inside Kairouan 2019–2023: each fold holds out some weather cells **and** one year together, so neither place nor time is seen in training. (Physics-based models are not re-calibrated inside folds, so only C, M1, M1c and M2 are scored there.)
- **Transfer test:** the frozen Kairouan model applied, without retraining, to Sidi Bouzid, the Haouz and the Gezira. The code asserts that no weather cell is shared with Kairouan, and reports all years and 2024–2025 separately.
- Metrics: RMSE, MAE, bias, R² (mm/day); by season and by year. **Confidence intervals resample weather cells** (pixels in a cell share identical weather), 2000 draws; with few cells the intervals are wide, and that is stated.
- The reference for every claim is **C (climatology)** as well as P0. A model that does not beat C has learned nothing beyond the seasonal cycle.
- Feature importance is CatBoost's own importance, reported without pruning features on test results.

## Decision rule for the "not sure" safeguard (amended 4 Oct, see log)
The disagreement `|M1 − P0|` is used as an extra "not sure" signal **only if, on the Kairouan hold-out**, (a) its within-month Spearman correlation with `|P0 − satellite|` exceeds that of the **null disagreement `|C − P0|`** by at least 0.10 with the 95 % cell-bootstrap interval of the difference above 0, **and** (b) the within-month mean error ratio between the top and the bottom disagreement quintile is ≥ 1.3. Otherwise the second opinion is shown as information only, and the negative result is published here.

## Secondary analysis
Pixels with an **irrigation signature** — green during their region's dry season (mean NDVI ≥ 0.35 in July–August, or February–March for the Gezira, over 2019–2023) — are reported separately, with their number. The threshold is defined by NDVI only, never by a model result.

## Limits we state in advance
Training on one area (Kairouan) — transfer is tested, not assumed; one satellite label with its own error and a 500 m footprint that mixes fields; weather at about 25 km resolution; crop type is unknown at pixel level; seven years of data. A model that scores well here is **not** validated for yield, for irrigation timing, or for a specific field.

## Amendment log
| When | Change | Why |
|---|---|---|
| 3 Oct, evening | Protocol written | before the full run |
| 4 Oct, early | Deployable features restricted to numeric ones; M1c added | a 12-pixel smoke test of the code (used to debug, not to decide) showed categorical tables would be heavy to ship; we kept the comparison |
| 4 Oct, early | Irrigation-signature secondary analysis added | most random cropland is rainfed |
| 4 Oct, before the full run | After an independent code review: Sidi Bouzid box moved (it shared weather cells with Kairouan); disjoint cells asserted; NDVI made causal; period windows fixed; Kc by median instead of the 80th percentile; cell-and-year hold-out replaces plain cell folds; bootstrap resamples cells; disagreement rule compared with a null disagreement; P0 renamed "FAO-56 style" | the review found that the original near-transfer test reused weather, that the first disagreement rule passes by construction, and that the NDVI interpolation looked ahead |

## Reproduce
```
python -m venv ml/.venv && ml/.venv/Scripts/pip install -r ml/requirements.txt
cd ml
.venv/Scripts/python select_pixels.py     # picks cropland pixels in each region (ml/regions.py)
.venv/Scripts/python weather.py            # Open-Meteo daily weather per 0.25° cell
.venv/Scripts/python extract_modis.py      # satellite ET and NDVI (free NASA service, about 1.5 hours)
.venv/Scripts/python run.py                # trains, evaluates, writes ml/results/
```

## Results (full run, 4 October 2026)

**Hold-out test, Kairouan 2024–2025** — 92 cropland pixels in 14 weather cells, 8464 pixel-periods, mean observed ET about 0.48 mm/day. RMSE in mm/day; difference against the climatology C with a 95 % interval that resamples weather cells (negative = closer to the satellite):

| Model | RMSE | R² | RMSE − RMSE(C) |
|---|---|---|---|
| C — monthly climatology | 0.220 | 0.43 | — |
| P0 — FAO-56-style bucket | 0.261 | 0.20 | +0.041 (+0.027 to +0.062) |
| **M1 — CatBoost, weather + calendar (deployable)** | 0.201 | 0.52 | -0.019 (-0.039 to -0.010) |
| M1c — M1 + month as categorical | 0.200 | 0.53 | -0.020 (-0.040 to -0.011) |
| H1 — hybrid P0 + CatBoost | 0.205 | 0.50 | -0.015 (-0.038 to -0.003) |
| M2 — M1 + NDVI (partly circular) | 0.139 | 0.77 | -0.080 (-0.115 to -0.048) |
| H2 — hybrid P1 + CatBoost, NDVI | 0.142 | 0.76 | -0.078 (-0.113 to -0.046) |

What this says, and does not say:
1. **A 43 KB model that sees only weather and the calendar (M1) is closer to satellite ET than the monthly climatology** (RMSE about 9 % lower, interval excludes zero over 14 cells) **and than the crude water balance** (about 23 % lower). The gain is **modest**: the relative error is still about 40 %, and R² goes from 0.43 (climatology) to 0.52.
2. **The gain is not uniform.** By season (RMSE M1 vs C): autumn 0.114 vs 0.176, winter 0.174 vs 0.192, summer 0.086 vs 0.109, **spring 0.338 vs 0.343 (nothing)**: when cereals green up, weather alone does not know the crop calendar. Adding NDVI (M2) cuts spring error by about a third, but M2 is partly circular and not deployable offline.
3. **Two things that did not help, published on purpose.** Month as a CatBoost *categorical* feature adds nothing (M1c 0.200 vs M1 0.201): a cyclical encoding of the day of year is enough. The hybrid (P0 + learned correction, H1 0.205) is no better than the pure model M1.
4. **Cell-and-year hold-out inside Kairouan 2019–2023** agrees: C 0.218, M1 0.185 (−0.033, 95 % interval −0.055 to −0.017), M2 0.145.
5. **The "not sure" safeguard rule was NOT met.** Within-month Spearman correlation between the disagreement |M1 − P0| and the error of P0 is 0.50, against 0.43 for the null disagreement |C − P0|: a difference of 0.063 (95 % interval 0.028 to 0.097), below the pre-registered 0.10. **The second opinion is therefore shown as information only and does not trigger "not sure".**
6. **Transfer without retraining** (frozen Kairouan model, weather cells all different from Kairouan's). Reference = each region's own monthly climatology computed *on that region's data* (in-sample, so optimistic for the climatology):

| Region | Pixels / weather cells | RMSE local climatology | RMSE M1 | R² M1 | Bias M1 |
|---|---|---|---|---|---|
| Sidi Bouzid, Tunisia (near) | 21 / 4 | 0.160 | **0.123** | 0.71 | +0.030 |
| Haouz (Marrakech), Morocco | 39 / 9 | 0.202 | **0.172** | 0.49 | +0.039 |
| Gezira, Sudan (Sahel, irrigated scheme) | 40 / 14 | 0.337 | **0.585** | -0.01 | -0.253 |

   **The model transfers to the two Mediterranean regions** (it beats their own climatology, with few cells in Sidi Bouzid, so a wide real uncertainty) **and fails in the Sahel** (R² ≈ 0, bias −0.25 mm/day, worse than the local climatology; the 29 pixels with an irrigation signature behave the same). **So: the pipeline extends to any region of Africa, a model trained on one climate regime does not.** A new regime needs its own training, which this pipeline does with about 1.5 hours of free public data.
7. **Size.** M1 is 106 symmetric trees of depth 6: **43 KB as JSON, 12 KB gzipped**, replayed in JavaScript with no server (`src/lib/ml/catboost.ts`; on 400 rows the largest difference to CatBoost is 7e-5 mm/day: `node node_modules/tsx/dist/cli.mjs ml/check_export.ts`). The hybrid H1 needs 229 trees (95 KB).
8. **Most important inputs of M1** (CatBoost importance): maximum temperature, day of year, 60-day and 30-day rain, ET0.

Not covered: the Kairouan sample contains **no pixel with an irrigation signature** (the irrigation question could only be looked at in the Gezira, where the model fails); seven years; one satellite label with its own error; two of the three transfer regions have few weather cells (4 and 9). **Nothing here shows that the model improves irrigation advice.** It shows that a small, open, reproducible model can track a satellite signal slightly better than a calendar, in the climate it was trained on.

Files: `ml/results/metrics.json` (all numbers above), `ml/results/m1_compact.json` (the model the browser replays).
