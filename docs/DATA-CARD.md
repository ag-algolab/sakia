# Sakia — data card

Required and scored by the challenge (section 7.2 of the concept note): for every dataset, **source, licence, size, and what it does not cover**. Where a measurement has not been made yet it says so. Nothing here is rounded up.

*Last updated: 3 October 2026.*

## A. Evidence that the problem is real

| Fact | Value | Source | Year | Caveat |
|---|---|---|---|---|
| Share of agriculture in Tunisia's water withdrawals | 75.5 % (2.71 of 3.59 km³) | FAO AQUASTAT, Tunisia country fact sheet | 2022 | some values imputed by FAO |
| Kairouan aquifer exploited at | 230 % of its renewable volume | African Manager (press) | 2024 | press report, not an official study |
| People who cannot read, Kairouan (age 10+) | **27.9 %** (national 17.3 %: women 22.4 %, men 12.0 %); the five highest governorates (Jendouba, Kairouan, Sidi Bouzid, Kasserine, Siliana) range 25.5–28.5 % | INS (Tunisian national statistics institute), Flash Éducation, Sept. 2025 (2024 census) for the national figures and the range; the Kairouan figure as reported by the press from the census (Le Courrier de l'Atlas) | 2024 | the official bulletin gives the range, not the Kairouan figure; **roughly 140,000 people in the governorate is our own estimate** (600,803 inhabitants × about 85 % aged 10+ × 27.9 %; the 85 % is an assumption) |
| Schooling of farm heads, Tunisia | 84 % did not go beyond primary school (14 % secondary, 3 % higher) | National survey of agricultural structures 2004/05, as cited by Elloumi (réseau FAR) | 2004/05 | old; **not the same as illiteracy**; Kairouan not isolated |
| Households with internet at home, Kairouan | 20.7 % (national 40.4 %) | INS, ICT bulletin | 2025 | household access, not individual mobile use; **not used as a headline argument** |
| SMS received "at the right time" in a pilot | about 15–16 % (421 respondents, 3 regions) | ICARDA ICT2Scale (WOCAT; evaluation report, MEL/CGIAR) | 2019–2021 | **survey perception, not a delivery measurement**; small pilot; generic SMS, not specific to irrigation |
| Messages judged useless in Kairouan (same pilot) | 34.6 % "no use", 24.6 % "little use"; poor network was the first obstacle (62.5 %) | ICT2Scale evaluation report | 2021 | limited sample in Kairouan |
| Households with a smartphone in the pilot villages | 44 % | ICT2Scale, PLOS ONE | 2019–2021 | pilot villages, not the whole country |
| Irrigated cereals in Kairouan, private vs public areas | 27,160 ha vs 840 ha | African Manager | 2024–25 | a year when the dams were empty; not a ratio over all crops |
| How public water is allocated | volumes decided per season from dam levels; delivered on demand (75 % of schemes) or by rotation | Ministry national water report 2017; IRD and CIRAD studies | 2017 and earlier | old; **no official monthly calendar found** |
| Pumping costs for farms under 3 ha | 1.25–1.5 times higher | Cahiers Agricultures | 2024 | read through a summary |
| Adoption of the state irrigation app on Android | "100+" installs (100–499), no rating shown | Google Play listing of Irey Aqua, seen on 3 Oct 2026 | 2026 | web users not counted; **not a measure of real use** |

## B. Data the tool works with

| Dataset | Role | Source | Licence | Size | What it does not cover |
|---|---|---|---|---|---|
| Weather forecast (reference evapotranspiration, rain, temperature) | The 7-day plan | Open-Meteo (ECMWF, ICON, GFS models) | CC BY 4.0; free tier is non-commercial | 23 days × 5 variables ≈ **1.9 KB** per region (measured) | Model grid of 9–25 km and **no local station in the calculation**; **on heavy-rain days the model sees about half of the measured rain** (section E); wind less reliable; skill drops beyond 7 days |
| Weather archive (ERA5) | The backtest over 11 seasons | Open-Meteo (ERA5) | CC BY 4.0 | 4,291 days for Kairouan | Same limits; the point is the governorate capital, not the plot |
| Crop coefficients (Kc, depletion fraction, root depth, Ky) | Crop water need | FAO Irrigation and Drainage Paper 56 (tables 11, 12, 22, 24); Pereira et al. 2024 for trees | FAO and Springer publications (values cited, not redistributed in bulk) | 18 crops (9 annual, 9 perennial) | **Generic values, no Tunisian trials**; **14 of the 18 crops are marked "to verify" in `src/lib/crops.ts`** (values adjusted, interpolated or taken by analogy, with the reason written per crop); no Ky published for barley, melon and any tree; **no yield estimate is ever shown for a tree** |
| Crop calendar | Sowing dates | FAO CropCalendar, Tunisia | FAO | entries for 15 annual crops in the FAO data; the app has 9 annual and 9 perennial crops | Missing for olive, almond, grape, citrus, date palm, alfalfa; no Kairouan-specific calendar except pepper, olive, cereals |
| Soil water capacity | Water reserve | FAO-56 table 19 (indicative values: 90, 150, 170 mm/m) | FAO | 3 classes | **No real soil map**; the default is loamy soil |
| Voice synthesis | Spoken bulletin, voice line | ElevenLabs (voice "Rima M", Tunisian accent) | ElevenLabs terms (Creator plan) | about **4 KB per second** of audio (measured) | The model reads Arabic; **Tunisian dialect is not guaranteed and was not validated by a native speaker** |
| Speech recognition and voice agent | A farmer speaks the crop and region | ElevenLabs (Scribe, and a conversational agent running a language model, claude-sonnet-4-5) | ElevenLabs terms | — | Published accuracy: French excellent, Arabic average, **Tunisian dialect not evaluated by the provider**; our own measurement on real recordings is **not done yet** |
| Satellite evapotranspiration (research model only) | Label of Sakia-ML | NASA MODIS MOD16A2GF, 500 m, 8-day, gap-filled, via the NASA ORNL DAAC subset service | NASA open data | about 320 eight-day periods × 92 Kairouan cropland pixels (plus 100 pixels in three transfer regions) | A model product with its own error; 500 m pixels mix fields; **no irrigated pixel in the Kairouan sample**; not a measurement of any field |
| Satellite vegetation index (research model only) | NDVI feature (variants only) | NASA MODIS MOD13Q1, 250 m, 16-day, same service | NASA open data | same pixels | shares its sensor with the label's inputs: partly circular, not deployable |
| Land cover (research model only) | Picks cropland pixels | ESA WorldCover 2021, class cropland | CC BY 4.0 | random 500 m cells with ≥ 70 % cropland | cropland is mostly rainfed; says nothing about irrigation |
| Chat and settings | Telegram bot subscribers | Telegram chat identifier, language, region, crop, soil, system, last irrigation date | Our database (Supabase) | a few rows | Nothing else is stored; no name, no phone number, no location |

**The irrigation advice uses no trained model.** One research model (Sakia-ML, CatBoost, 43 KB) is trained and evaluated in shadow mode on the data below; it changes no advice. Protocol, amendment log and all results: `ml/README.md`, `ml/results/metrics.json`.

## C. What the data does NOT cover (scored)

- No field trial in Tunisia: crop coefficients are generic and the advice is **indicative**.
- No local weather station and no soil-moisture sensor in the calculation; rain from the model is **underestimated on heavy-rain days** (section E).
- No farmer registry, no market prices, no water salinity, no real irrigation calendar of the administration (the "fixed schedule" in the backtest is a benchmark we built, not the State's).
- Relative yield is estimated only for the 9 crops with a published Ky, never for trees.
- **Speech recognition of the Tunisian dialect has not been measured on real farmers**; the dialect text is not validated by a native speaker.
- The weather source was checked against Tunisian stations at **Kairouan and one station 47 km away**, over limited periods (section E), not across the country.

## D. Privacy, consent, bias, human oversight

- **Personal data:** a Telegram chat identifier plus language, region, crop and a few settings. Our database stores no name, phone number, precise location or IP address; the Telegram chat identifier and the governorate **are** stored, so the data is pseudonymous, not anonymous. Raw IP addresses are held in server memory for rate limits and appear in the hosting provider's logs. Daily spending limits on the paid voice service are counted per visitor under a salted hash of the address (never the address itself).
- **Voice:** our code does not save farmers' audio in our database. Speech is processed by ElevenLabs under its own terms; **its retention setting still has to be confirmed**. The voice agent should be preceded by a short notice that the microphone is used by a third-party service (to be added).
- **Processors:** ElevenLabs (voice, and the language model behind the voice agent), Supabase (database), Vercel (hosting), Telegram (chat), Open-Meteo (weather: only the coordinates of a governorate capital are sent).
- **Bias:** crop coefficients and the weather model are not tuned to Tunisia; speech tools work better in French than in Tunisian Arabic, so people who speak only dialect may be understood less well; the model underestimates heavy rain; farmers without any phone signal are not reached by any of our channels.
- **Human oversight:** the plan and safeguard sentences are **fixed templates** (numbers filled in by the engine); the voice agent's own wording is generated by a language model and held to our server's answer by instruction (15 of 15 plan answers read word for word on 20 typed phrases; not enforced); when the data is not enough the tool says it is not sure and points to a technician; with weather older than 48 h it gives no advice; the decision is always the farmer's.

## E. Weather source checked against Tunisian measurements (3 October 2026)

Bias = Open-Meteo minus station. Sources: NOAA GHCN-D station of Kairouan (TSE00147773); DGACTA stations (Oueslatia, 47 km from Kairouan; Zaghouan) and CRDA Kairouan on https://catalog.agridata.tn; Tunisian open-data licence (reuse allowed, with attribution).

| Measure | Period, days | Result | Caveat |
|---|---|---|---|
| Reference evapotranspiration, recomputed from the Oueslatia station | Feb 2019–Sep 2020, 579 days | Open-Meteo within **−5 % / +4 %** depending on the assumed wind-sensor height; correlation 0.97 | one station, 47 km away, series stopped in 2020; **wind-sensor height unknown** |
| Reference evapotranspiration, Zaghouan | 2020, 241 days | −3 % / +4 % | same |
| Maximum temperature, Kairouan (NOAA) | 2019 to Aug 2025, 1,664 days | bias −0.6 °C, correlation 0.994 | about 20 % of days missing at the station |
| Minimum temperature, Kairouan (NOAA) | same | bias −1.0 °C | same |
| Monthly rain, Kairouan (NOAA) | 65 months | bias +8 %, correlation 0.89 | — |
| Daily rain, Kairouan (NOAA) | 1,664 days | correlation 0.61 (0.25 without a one-day shift, the station reads at 06 UTC) | — |
| **Heavy-rain days (≥ 10 mm measured)** | **43 days** | **the station measures 25.7 mm on average, the model 12.8 mm: the model sees about half** | one measuring point; one-day shift applied |

**Reproducibility.** The analysis scripts are **not included in this repository**; the figures can be recomputed from the cited public datasets and are to be treated as our own unpublished analysis until the scripts are added.

**What we conclude.** At Kairouan the weather source is **good** for evapotranspiration (within a few percent) and temperature (0.6 °C). A study in Morocco (ERA5-Land versus six stations, Tensift basin, https://pmc.ncbi.nlm.nih.gov/articles/PMC12586499/) found underestimation of 2–37 %: we do **not** find that here. The **measured weakness is heavy rain** (43 days at or above 10 mm: the model sees about half of it); the plan uses the model's rain as it is, with no correction. A local correction factor for evapotranspiration is **not defensible today**: the gap changes sign from one station to another and the only complete series near Kairouan dates from 2019–2020. At least a year of measurements is needed; **that is the roadmap, not a promise.** Other open Tunisian station data is uneven: frozen series, no rain, no evapotranspiration, private datasets, missing coordinates.

## F. Evaluations: done and not done

| Evaluation | Status |
|---|---|
| Backtest: 11–12 seasons, 18 crops, advised vs fixed weekly schedule | **Done** — water pumped 3 to 27 % lower depending on the crop, almost no stress days. **Run on observed weather, not on past forecasts** (forecast errors are not simulated, so stress days are near zero by construction): a simulation, not a field result. Kairouan only, drip irrigation, loam |
| Weather source against Tunisian stations | **Done** (section E) |
| Sizes (production, 3 Oct): forecast 1,943 bytes raw / 475 compressed per region; plan ≈ 2.4 KB raw / ≈ 1 KB compressed; audio ≈ 4 KB per second; spoken advice for the home button 50–98 KB (≈ 13–25 s), prepared each morning and loaded in the background; first visit to the app ≈ 390 KB compressed, then kept on the device | **Done** |
| Offline recomputation | **Done in Chrome with the server stopped**; phone airplane mode **not yet** |
| Understanding of typed phrases (French, Arabic, Arabizi) | Done on **phrases written by us, not by farmers** — not an accuracy claim |
| **Speech recognition on real recordings (Tunisian dialect, French)** | **Not done yet** — to be measured and published as it is |
| Voice agent against adversarial requests | **Not done yet** |
| **Sakia-ML (research, shadow mode):** CatBoost vs monthly calendar and a FAO-56-style water balance, held-out years 2024–2025, cell-and-year hold-out, transfer to three regions | **Done**, protocol first, failures published: error about 9 % below the calendar in Kairouan (interval excludes zero, 14 cells); no gain in spring; "not sure" rule **not met**; fails in the Sahel. See `ml/README.md` |
