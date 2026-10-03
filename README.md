# Sakia — a daily irrigation decision by voice, SMS and chat, for smallholders in Tunisia

**Challenge:** World Bank × Hack-Nation 7 — *Small AI for Development*, **Agriculture** track.
**Live demo:** https://sakia-opal.vercel.app — **Telegram bot:** https://t.me/sakia_tn_bot
**Referral code:** `WBGSmallAIGADS`
**Team:** AG Algo Lab — Anthony Gocmen (solo, based in Tunisia).

> **Problem statement.** Because of Sakia, a smallholder in Kairouan who irrigates from their own well will know which day to irrigate and how much, from the weather forecast, through a short call or message that needs no smartphone and no reading, instead of deciding by habit or by waiting for rain. We know because a past SMS pilot found generic messages "too general" and only about one farmer in six received them on time, and because, over 11 replayed seasons of real weather, a weather-based schedule used 3 to 27 % less pumped water than a fixed seasonal schedule, with almost no water-stress days (a simulation, not a field measurement).

*Not a weather bulletin. A decision. Tell Sakia your crop, it tells you when to irrigate.*

## Status (work in progress during the hackathon)

This README is updated before submission. What is **real** and what is **simulated** will be listed here, without rounding up.

| Piece | Status |
|---|---|
| Irrigation engine (FAO-56 water balance on real weather), 18 crops, 24 governorates | **Real**, tested |
| Backtest over 2015–2026 weather (fixed seasonal schedule vs advised) | **Real computation on real weather; the result is a simulation** |
| "Not sure — ask a person" safeguard, built into the engine | **Real** |
| Recompute offline in the browser (pure engine, cached forecast) | In progress |
| Telegram bot | In progress |
| Voice line (keypad call + voice agent) and SMS | **Simulated in the browser** — real telephony is not available in the time (see limits) |
| Spoken bulletin (avatar, ElevenLabs voice, English subtitles) | In progress |

## What the AI does — and why not a spreadsheet

The irrigation numbers come from a **deterministic FAO-56 water balance, on purpose**: it can be checked and it cannot hallucinate. A spreadsheet could do that arithmetic. What a spreadsheet cannot do is the part we use AI for:

- **Understand a farmer who speaks or writes** in Arabic (Tunisian accent), French or Arabizi, and fill in the crop and region for them;
- **Answer aloud** (text-to-speech), because in Kairouan about one adult in four cannot read;
- run the intent model **small and offline**.

**Guardrails.** Replies come from a **fixed list of sentences** (checkable). When the data is not enough — weather data older than 12 h, last irrigation unknown, coefficients estimated by analogy, rain possible within 3 days — Sakia says **"I am not sure: ask an agricultural technician (CRDA)"**; with weather data older than 48 h it gives **no advice**. A person always decides. No personal data beyond a chat identifier and a few settings.

## What already exists (and how Sakia differs)

- **Irey Aqua** (INGC, with IWMI and FAO WaPOR): a capable irrigation app using the same FAO-56 method plus remote sensing, for farmers who can use a smartphone app and fill in about a dozen details (plot, soil, system, flow, spacing, efficiency, salinity…). Google Play shows between 100 and 499 installs (seen on 3 Oct 2026). Sakia does **not** claim a new calculation. It is for the farmers that tools like it do not reach: two questions, no reading, no smartphone.
- **Mabia-Mobile** (INAT/GIZ, 2023) and a **weekly SMS pilot** (ICARDA/GIZ, ICT2Scale, ~1,000 farmers): generic SMS were judged too general in Kairouan and rarely arrived at the right time.

The trade-off we accept: fewer questions means less precision. Sakia uses defaults (loamy soil, drip irrigation) and says its advice is **indicative**.

## How it works

- **Weather:** Open-Meteo (forecast + ERA5 archive), reference evapotranspiration (FAO Penman–Monteith), at the governorate capital.
- **Crop water use:** `ETc = Kc × ET0` with FAO-56 coefficients (and Pereira et al. 2024 for trees); root-zone depletion balance; irrigate the day the daily consumption would cross the stress threshold.
- **Backtest:** replays each season of 2015–2026 with a fixed seasonal schedule (a benchmark hypothesis, not the State's actual calendar) versus the advised schedule. The relative-yield estimate (FAO-33) exists only for crops with a published Ky, **never for trees**.
- Code: `src/lib/` (engine: `planCore.ts` is pure and runs in the browser), `src/app/api/` (plan, forecast, backtest, catalog).

## Data and limits

See **[docs/DATA-CARD.md](docs/DATA-CARD.md)**: every dataset with its source, licence, size, and **what it does not cover** — no Tunisian field trials, no local weather station, generic crop coefficients, Tunisian-dialect speech recognition not yet evaluated.

## Run it

```
npm install
# create .env.local with: KEY_ELEVENLABS, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, CRON_SECRET
npm run dev                      # http://localhost:3000
npx tsx scripts/engine-check.ts  # backtest and replay on real weather
```

Next.js 16, TypeScript, Tailwind v4, Supabase, ElevenLabs.

## Built during the hackathon

All code in this repository was written between Saturday 3 October 2026 (kick-off) and Sunday 4 October 2026 (deadline), with AI coding assistance (Claude Code) directed by the author. Pre-existing components: the Next.js starter scaffold and open-source libraries only. Weather data © Open-Meteo (CC BY 4.0); FAO publications cited in `src/lib/crops.ts`.
