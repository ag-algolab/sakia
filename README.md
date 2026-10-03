# Sakia — a daily irrigation decision by voice, SMS and chat, for smallholders in Tunisia

**Challenge:** World Bank × Hack-Nation 7 — *Small AI for Development*, **Agriculture** track.
**Live demo:** https://sakia-opal.vercel.app — **Telegram bot:** https://t.me/sakia_tn_bot
**Referral code:** `WBGSmallAIGADS`
**Team:** AG Algo Lab — Anthony Gocmen (solo, based in Tunisia).

> **Problem statement.** Because of Sakia, a smallholder in Kairouan who irrigates from their own well will know which day to irrigate and how much, from the weather forecast, through a short call or message that needs no smartphone and no reading, instead of deciding by habit or by waiting for rain. We know because a past SMS pilot found generic messages "too general" and only about one farmer in six received them on time, and because, over 11 replayed seasons of real weather, a weather-based schedule used 3 to 27 % less pumped water than a fixed seasonal schedule, with almost no water-stress days (a simulation, not a field measurement).

*Not a weather bulletin. A decision. Tell Sakia your crop, it tells you when to irrigate.*

## What is real, and what is simulated

| Piece | Status |
|---|---|
| Irrigation engine (FAO-56 water balance on real weather), 18 crops, 24 governorates | **Real**, tested |
| Backtest over 2015–2026 weather (fixed seasonal schedule vs advised) | Real computation on real weather; **the result is a simulation** |
| "Not sure — ask a person" safeguard, built into the engine | **Real** |
| Offline: the plan is recomputed in the browser from the last saved forecast | **Real**, checked in Chrome with the server stopped. Not yet checked in a phone's airplane mode |
| Web app (installable) | **Real** |
| Telegram bot (plan, spoken bulletin) | **Real** — https://t.me/sakia_tn_bot |
| Spoken bulletin (drawn avatar, ElevenLabs voice, English subtitles) | **Real** audio; demo bulletins are recorded |
| Voice line (keypad call) and SMS | **Simulated in the browser.** Real telephony is not possible in the time (see limits) |
| Voice agent you can talk to | **Real** ElevenLabs conversation; it only reads answers returned by our server |
| Farmers' rain reports ("solidarity") | Server side done; channels in progress. **Demo reports are fictitious and labelled as such** |

## What the AI does — and where it deliberately does not

The irrigation numbers come from a **deterministic FAO-56 water balance, on purpose**: it can be checked and it cannot hallucinate. A spreadsheet could do that arithmetic. We use AI where a spreadsheet cannot help:

| | |
|---|---|
| **AI (cloud, ElevenLabs)** | speech recognition (a farmer can speak instead of type), text-to-speech with a Tunisian-accented voice (about one adult in four in Kairouan cannot read), and a voice agent that works out the crop and the region and reads our server's answer word for word |
| **Not AI, by design** | the irrigation calculation, the replies (a **fixed list of sentences**), and the parsing of SMS and Telegram messages (rules and fuzzy matching on a lexicon of crops and places, in French, Arabic and Arabizi) |
| **Works offline** | the engine, the message parsing, the cached plan, the recorded audio |
| **Needs the network** | live speech recognition, live speech synthesis, fresh weather |

We do **not** train a model, and nothing is tuned on local data yet. Our local-data contribution is **farmers' own rain reports**; calibrating the weather source against Tunisian stations is the roadmap (see the data card).

**Guardrails.** When the data is not enough — weather older than 12 h, last irrigation unknown, coefficients estimated by analogy, forecast not covering the week — Sakia says **"I am not sure: ask an agricultural technician (CRDA)"**; with weather older than 48 h it gives **no advice**. Every answer carries *"Indicative advice, calculated from the forecast weather (it can change). The decision is yours."* A person always decides. No personal data beyond an anonymous identifier and a few settings.

## What already exists (and how Sakia differs)

- **Irey Aqua** (INGC, with IWMI and FAO WaPOR): a capable app using the same FAO-56 method plus remote sensing, for farmers who can use a smartphone app and fill in about a dozen details. Google Play shows between 100 and 499 installs (seen on 3 Oct 2026). Sakia does **not** claim a new calculation: it reaches the farmers that tools like it do not — two questions, no reading, no smartphone.
- **Mabia-Mobile** (INAT/GIZ, 2023) and a **weekly SMS pilot** (ICARDA/GIZ, ICT2Scale, ~1,000 farmers): generic SMS were judged too general in Kairouan and rarely arrived at the right time.

The trade-off we accept: fewer questions means less precision. Sakia uses defaults (loamy soil, drip irrigation) and says its advice is **indicative**.

## Localizing AI, in practice

- **Language and voice:** French and Arabic with a Tunisian-accented voice; farmers can type in Arabizi. **The Tunisian dialect is not validated by a native speaker** and speech-recognition accuracy on Tunisian speech is not guaranteed (see the data card).
- **The device people own:** a basic phone through a call or an SMS, handled by the server; a smartphone through Telegram or the installable app.
- **Local evidence:** the problem statement relies on Tunisian figures (literacy, aquifer, the SMS pilot) and the weather source was checked against Tunisian stations.
- **Humans in the loop:** farmers correct the weather through rain reports, and a technician is always the fallback.

## Replicability and next steps

- **Another country:** the engine and the weather source are global; to move to another country one replaces the list of regions and crops, the crop calendars, the language and the voice, and has local agronomists validate the coefficients.
- **Next steps:** a pilot with a regional extension officer and about ten farmers; plugging Sakia into the national tools (Irey) rather than competing with them; a year of Tunisian station data to make a local weather correction defensible; a real telephone line with an operator.

## How it works

- **Weather:** Open-Meteo (forecast + ERA5 archive), reference evapotranspiration (FAO Penman–Monteith), at the governorate capital.
- **Crop water use:** `ETc = Kc × ET0` with FAO-56 coefficients (and Pereira et al. 2024 for trees); root-zone depletion balance; irrigate the day the daily consumption would cross the stress threshold.
- **Backtest:** replays each season of 2015–2026 with a fixed seasonal schedule (a benchmark hypothesis, not the State's actual calendar) versus the advised schedule. The relative-yield estimate (FAO-33) exists only for crops with a published Ky, **never for trees**.
- **Rain reports:** farmers choose a level (none, very light, light, a lot, a huge amount); each level counts for the **bottom** of its range, because overestimating rain skips an irrigation while underestimating it only wastes a little water. At least 3 different people must agree for a day before the model's rain is replaced; one anonymous, server-issued identity per device.
- Code: `src/lib/` (engine: `planCore.ts` is pure and runs in the browser), `src/app/api/` (plan, forecast, backtest, catalog, reports, voice, telegram, sms, ivr, agent).

## Data and limits

See **[docs/DATA-CARD.md](docs/DATA-CARD.md)**: every dataset with its source, licence, size, and **what it does not cover** — no Tunisian field trials, no local weather station in the calculation, generic crop coefficients, Tunisian-dialect speech recognition not evaluated on real farmers.

## Run it

```
npm install
# create .env.local with: KEY_ELEVENLABS, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, CRON_SECRET
npm run dev                      # http://localhost:3000
npx tsx scripts/engine-check.ts  # backtest and replay on real weather
```

Database tables are described in `docs/supabase.sql`. Next.js 16, TypeScript, Tailwind v4, Supabase, ElevenLabs.

## Built during the hackathon

All code in this repository was written between Saturday 3 October 2026 (kick-off) and Sunday 4 October 2026 (deadline), with AI coding assistance (Claude Code) directed by the author. Pre-existing components: the Next.js starter scaffold and open-source libraries only. Weather data © Open-Meteo (CC BY 4.0); FAO publications cited in `src/lib/crops.ts`.

**Licence:** [MIT](LICENSE). Third-party data and voices keep their own terms (Open-Meteo CC BY 4.0, FAO publications, ElevenLabs terms).
