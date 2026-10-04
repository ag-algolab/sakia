# Sakia

**One irrigation decision a day, said out loud, for farmers in Tunisia who don't read and don't have a smartphone.**

- **Live:** https://sakia-opal.vercel.app
- **Telegram bot:** https://t.me/sakia_tn_bot
- **Challenge:** World Bank × Hack-Nation 7, *Small AI for Development*, Agriculture track. Referral code `WBGSmallAIGADS`
- **Built solo** by Anthony Gocmen (AG Algo Lab). I live in Tunisia.

## The problem

Tunisia is short of water, and farming uses most of it: 75.5 % of the country's water withdrawals (FAO AQUASTAT, 2022). In Kairouan, in central Tunisia, the aquifer is pumped at about 230 % of what refills it (press report, African Manager, 2024).

Most smallholders there pump from their own well, and they decide when to water by habit, or by waiting for rain. Water too early and you pay for pumping you didn't need. Water too late and the crop suffers.

The science to do better exists. It just doesn't reach them in a form they can use. In Kairouan, 27.9 % of people aged 10 and over can't read (17.3 % nationally, 2024 census, INS). When a pilot sent weekly SMS to farmers in the region, the messages were judged "too general", and only 15–16 % of 421 surveyed farmers said they arrived at the right time (ICARDA/GIZ, ICT2Scale, 2019–2021).

**In one sentence:** with Sakia, a smallholder in Kairouan knows which day to water and how much, from the weather forecast, through a voice message or a call that needs no smartphone and no reading, instead of guessing.

## What Sakia does

You tell it three things: where your field is, what you grow, and when you last watered. It answers with one decision, for example **"Water today: 319 m³ per hectare"**, or **"Wait"**. Every day.

- **It talks.** The advice is read in Tunisian Arabic, with subtitles in the language of the screen (English by default). Nobody has to read.
- **It works on the phone people already have:** a phone call with a keypad menu, an SMS, a Telegram bot, or a web app you can install.
- **It works offline.** The plan is computed on the phone itself, from the last weather it saved.
- **It says when it doesn't know.** If the data isn't good enough, it says *"I'm not sure, ask an agricultural technician (CRDA)"* instead of guessing. The farmer always decides.

## Isn't there already an app for that?

The closest one is **Irey Aqua** (INGC, with IWMI and FAO WaPOR). It's a serious tool, and it uses the same method as Sakia (FAO-56), plus satellite data. But it's made for people who are at ease with a smartphone app and can fill in a dozen technical fields. It's closer to a tool for agronomists and researchers than to something a farmer who can't read will use. On Google Play it shows 100–499 installs (3 October 2026).

There is also **Mabia-Mobile** (INAT/GIZ, 2023), another Android water-balance app, and the weekly SMS pilot above, which sent the same generic message to everyone.

I didn't find any tool that gives a farmer who can't read a personal, daily irrigation decision, by voice, on a basic phone. That's the gap. Sakia isn't against Irey: it could be its last mile, the voice that brings the same science to the farmers an app will never reach.

## Where the AI is, and where it isn't

The numbers come from an **FAO-56 water balance** on real weather (Open-Meteo). That part is deterministic on purpose: anyone can check it, and it can't hallucinate. A spreadsheet could do this maths.

What a spreadsheet can't do is talk to someone who doesn't read. That's where I use AI (ElevenLabs, in the cloud):

- **a Tunisian-accented voice** that reads the advice;
- **speech recognition**, so a farmer can speak instead of typing;
- **a voice agent** you can simply talk to: say your crop and your region, it finds them and reads the answer my server computed.

The advice sentences are fixed templates with the engine's numbers filled in. The voice agent is instructed to read them as they are.

**Small on purpose.** The daily plan weighs a couple of kilobytes and is computed in the browser. I measured the first page a farmer would open, on a slowed-down phone, against five weather sites (4 October 2026, one run each, from Tunis):

| Site | Downloaded (3G) | Loaded on 2G | Second visit | Works with no connection |
|---|---|---|---|---|
| **Sakia** | **383 KB** | **12.9 s** | **0 KB** | **Yes** |
| yr.no | 790 KB | 25.7 s | 1–31 KB | No |
| timeanddate.com | 661 KB | 24.3 s | 11 KB | No |
| FAO WaPOR portal | 770 KB | 24.7 s | 0–4 KB | No |
| meteoblue | 1,307 KB | 45.9 s | 216 KB | No |
| meteo.tn (national weather institute) | 7,948 KB | did not finish in 150 s | 3,140–4,766 KB | No |

The other sites do more (maps, radar), so this compares first pages, not features. Script and raw results: [`scripts/perf-compare.mjs`](scripts/perf-compare.mjs), [`scripts/perf-results-2026-10-04.json`](scripts/perf-results-2026-10-04.json), and the /speed page.

## Does it save water?

I replayed Sakia's rule on 11–12 past seasons of **observed** weather in Kairouan (2015–2026), against a fixed weekly schedule I defined as a benchmark (it is not the State's calendar):

- **3 to 27 % less water pumped**, depending on the crop (olive −25 %, wheat −27 %);
- **far fewer thirsty days**: for pepper, 63 days of water stress per season with the weekly schedule, 3.7 with Sakia.

This is a **simulation, not a field trial**: it assumes the weather was known in advance. I think that's reasonable, because each day's decision only needs that day's weather, the most reliable part of a forecast. You can replay it crop by crop on the /backtest page.

## What's real and what's simulated

| Part | Status |
|---|---|
| Irrigation engine: FAO-56, 18 crops, 24 governorates, real weather | **Real.** 14 of the 18 crops use coefficients that are adjusted, interpolated or taken by analogy (see the data card) |
| Spoken advice (ElevenLabs, Tunisian Arabic, subtitles) | **Real** |
| Telegram bot | **Real**, always on (a webhook of the site): https://t.me/sakia_tn_bot |
| Installable web app, offline | **Real.** Tested with the server stopped; not yet in a phone's airplane mode |
| Voice agent | **Real** ElevenLabs agent (language model: claude-sonnet-4-5). It is *instructed* to read my server's answer word for word, it is not forced to: 15 of 15 in my tests |
| "Not sure, ask a person" safeguard | **Real**, built into the engine |
| Phone call (keypad) and SMS | **Simulated in the browser.** A real line needs a telephone operator |
| Telegram demo on /telegram | Real bot code with a fake Telegram, so you can try it without an account |
| Water savings | **Simulation** on observed weather (above) |
| Sakia-ML research model | **Real**, in **shadow mode**: it changes no advice (below) |

## Research: a small model, tested in public

I also wanted to know if a small learned model could add something to the physics. I trained a **43 KB CatBoost model** on free satellite data (NASA MODIS evapotranspiration) over Kairouan farmland. I wrote the protocol before the run and published the results as they came, failures included:

- **small gain:** on held-out years (2024–2025) it is closer to the satellite than a monthly calendar (about 9 % less error);
- **it doesn't travel everywhere:** it carries over to Sidi Bouzid and to Morocco, but **fails in the Sahel** (Gezira, Sudan). A model has a climate: each region needs its own small one;
- **it changes no advice.** It runs in shadow mode on the /lab page, and the rule I had set to use it as a "not sure" signal was not met.

Everything is in [`ml/`](ml/README.md): protocol, change log, code, every number and the model itself.

## Safety and privacy

- A person always decides. The advice is labelled indicative.
- When the weather is older than 12 hours, the last watering is unknown, or the crop coefficients are borrowed, Sakia says it isn't sure and points to a technician. With weather older than 48 hours it gives no advice at all.
- Personal data is kept to a minimum: a Telegram chat ID, the governorate and a few settings. No name, no phone number, no location. Privacy, consent and bias are detailed in the data card, section D.

## Limits

- No field trial yet. Crop coefficients are generic (FAO), not Tunisian.
- I checked the weather model against Tunisian stations: evapotranspiration within about 5 %, temperature within 0.6 °C, but **it sees only about half of heavy rain**.
- The Tunisian dialect hasn't been validated by a native speaker, and speech recognition hasn't been tested on real farmers.
- Calls and SMS are simulated.

All the data, with sources, licences, sizes and what they don't cover: **[docs/DATA-CARD.md](docs/DATA-CARD.md)**.

## Cost, scale, next steps

- **Cost:** the spoken advice is made once per region, crop and day, then shared. Each morning a job prepares the common cases (about 900–1,600 voice credits a day for Kairouan and six other regions, however many farmers listen), with daily spending caps. The engine and the offline app cost nothing per user.
- **Another country:** the engine and the weather source are global. You change the regions, crops, calendars, language and voice, and local agronomists check the coefficients.
- **Next:** a pilot with a regional extension officer and about ten farmers; connecting Sakia to the national tools (Irey) instead of competing with them; a year of station data for a local weather correction; a real phone line with an operator.

## Run it

```
npm install
# .env.local: KEY_ELEVENLABS, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_BOT_TOKEN, CRON_SECRET
npm run dev                      # http://localhost:3000
npx tsx scripts/engine-check.ts  # replays the engine on real weather
```

Next.js 16, TypeScript, Tailwind v4, Supabase, ElevenLabs. The engine is `src/lib/planCore.ts` (pure, it runs in the browser); the API routes are in `src/app/api/`; the database tables in `docs/supabase.sql`.

## Built during the hackathon

All the code here was written between Saturday 3 and Sunday 4 October 2026, with an AI coding assistant (Claude Code) that I directed. Pre-existing: the Next.js starter and open-source libraries. Weather © Open-Meteo (CC BY 4.0); the FAO publications are cited in `src/lib/crops.ts`.

**Licence:** [MIT](LICENSE). Third-party data and voices keep their own terms.
