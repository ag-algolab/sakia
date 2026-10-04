import type { Metadata } from "next";
import Link from "next/link";
import { AlertIcon, CheckIcon, DownloadIcon, DropIcon, PhoneIcon, SpeakerIcon } from "@/components/ui/icons";
import { Reveal } from "@/components/ui/motion";
import LiveSizes from "./LiveSizes";
import OpenOnHash from "./OpenOnHash";

export const metadata: Metadata = {
  title: "About Sakia — AI, safeguards and data",
  description: "What the AI does in Sakia, why not a spreadsheet, the safeguards, and the data card.",
};

// Contenu repris de README.md et de docs/DATA-CARD.md, MOT POUR MOT quand c'est un chiffre ou une limite ; chiffres des cartes du haut :
// docs/NOTES-chiffres.md (A2, A8, E1, F1, F4, F5). En anglais d'abord (jury).
// Le jury ne lit pas les longs textes : en haut, six cartes et les limites, lisibles en trente secondes ; tout le détail (phrase du
// problème, IA, langues, garde-fous, tailles, fiche des données) est replié juste dessous, une touche pour l'ouvrir. Rien n'est retiré.
// Ne rien arrondir vers le haut : si une mesure n'est pas faite, la page le dit.

// Le problème, en UNE phrase courte (Anthony, 4 oct. : « the problem in one sentence » suivi d'un pavé illisible, « on marche sur la
// tête ») ; la phrase complète du modèle de la Banque mondiale reste repliée plus bas.
const PROBLEM = "Farmers in Kairouan water by habit, and many cannot read: Sakia tells them, out loud, which day to water and how much.";

// Six cartes : un grand chiffre ou un mot, un titre, une ligne. Chiffres : docs/NOTES-chiffres.md (A2, A8, E1, F1, F4, F5).
const FACTS: { icon: React.ReactNode; title: string; stat: string; body: string; href?: string; link?: string }[] = [
  {
    icon: <DropIcon className="h-5 w-5" />,
    title: "The problem",
    stat: "230 %",
    body: "of what refills Kairouan's aquifer is pumped out (press report). More than 1 person in 4 there cannot read.",
  },
  {
    icon: <PhoneIcon className="h-5 w-5" />,
    title: "What Sakia does",
    stat: "1 a day",
    body: "One decision: water or wait, and how much. Spoken aloud, on five channels.",
  },
  {
    icon: <SpeakerIcon className="h-5 w-5" />,
    title: "Where the AI is",
    stat: "Voice",
    body: "It listens, it talks, it answers aloud. The numbers stay FAO-56 physics: checkable, no hallucination.",
    href: "/lab",
    link: "Lab: a 43 KB model tested in public",
  },
  {
    icon: <AlertIcon className="h-5 w-5" />,
    title: "When it is not sure",
    stat: "Ask a person",
    body: "It says so instead of guessing. Weather over 48 hours old: no advice at all.",
  },
  {
    icon: <DownloadIcon className="h-5 w-5" />,
    title: "Small, works offline",
    stat: "383 KB",
    body: "on a first visit, then zero data. A day's advice: about 1 KB, plus 76 KB of voice.",
    href: "/speed",
    link: "Measured against 5 sites",
  },
  {
    icon: <CheckIcon className="h-5 w-5" />,
    title: "Real or simulated",
    stat: "3 + 2",
    body: "Real: Telegram, the web, the app. Simulated: call and SMS. Water savings: a simulation of past seasons.",
  },
];

const LIMITS = [
  "Crop coefficients are generic (FAO), not validated in Tunisian fields: the advice is indicative.",
  "The weather point is the governorate capital, not the plot; the model sees about half of heavy rain.",
  "Water savings are a simulation on past weather, against a weekly schedule we chose as a benchmark.",
  "The Tunisian Arabic text is not yet validated by a native speaker; speech recognition is not measured on real farmers.",
  "Offline was checked in Chrome with the server stopped, not in a phone's airplane mode. With no phone signal at all, no channel reaches the farmer.",
];

const EVIDENCE = [
  ["Share of agriculture in Tunisia's water withdrawals", "75.5 % (2.71 of 3.59 km³)", "FAO AQUASTAT, Tunisia country fact sheet", "2022", "Some values imputed by FAO"],
  ["Kairouan aquifer exploited at", "230 % of its renewable volume", "African Manager (press)", "2024", "Press report, not an official study"],
  [
    "People who cannot read, Kairouan (age 10+)",
    "27.9 % (Tunisia overall 17.3 %: women 22.4 %, men 12.0 %). The five highest governorates (Jendouba, Kairouan, Sidi Bouzid, Kasserine, Siliana) range from 25.5 to 28.5 %",
    "INS, Flash Éducation, Sept. 2025 (2024 census) for the national figures and the range; the Kairouan figure as reported by the press from the census (Le Courrier de l'Atlas)",
    "2024",
    "The official bulletin gives the range, not the Kairouan figure",
  ],
  ["Schooling of farm heads, Tunisia", "84 % did not go beyond primary school (14 % secondary, 3 % higher)", "National survey of agricultural structures 2004/05, as cited by Elloumi (réseau FAR)", "2004/05", "Old; not the same as illiteracy; Kairouan not isolated"],
  ["Households with internet at home, Kairouan", "20.7 % (national 40.4 %)", "INS, ICT bulletin", "2025", "Household access, not individual mobile use; not used as a headline argument"],
  [
    "SMS received “at the right time” in a pilot",
    "About 15 to 16 % of 421 surveyed farmers (3 regions) said so",
    "ICARDA ICT2Scale (WOCAT; evaluation report, MEL/CGIAR)",
    "2019–2021",
    "Survey perception, not a delivery measurement; small pilot; generic SMS, not specific to irrigation",
  ],
  ["Messages judged useless in Kairouan (same pilot)", "34.6 % “no use”, 24.6 % “little use”; poor network was the first obstacle (62.5 %)", "ICT2Scale evaluation report", "2021", "Limited sample in Kairouan"],
  ["Households with a smartphone in the pilot villages", "44 %", "ICT2Scale, PLOS ONE", "2019–2021", "Pilot villages, not the whole country"],
  ["Irrigated cereals in Kairouan, private vs public areas", "27,160 ha vs 840 ha", "African Manager", "2024–25", "A year when the dams were empty; not a ratio over all crops"],
  ["How public water is allocated", "Volumes decided per season from dam levels; delivered on demand (75 % of schemes) or by rotation", "Ministry national water report 2017; IRD and CIRAD studies", "2017 and earlier", "Old; no official monthly calendar found"],
  ["Pumping costs for farms under 3 ha", "1.25 to 1.5 times higher", "Cahiers Agricultures", "2024", "Read through a summary"],
  ["Adoption of the state irrigation app on Android", "“100+” installs (100–499), no rating shown", "Google Play listing of Irey Aqua, seen on 3 Oct 2026", "2026", "Web users not counted; not a measure of real use"],
];

const DATASETS = [
  [
    "Weather forecast (reference evapotranspiration, rain, temperature)",
    "The 7-day plan",
    "Open-Meteo (ECMWF, ICON, GFS models)",
    "CC BY 4.0; free tier is non-commercial",
    "23 days × 5 variables, about 1.9 KB per region (measured)",
    "Model grid of 9 to 25 km and no local station in the calculation; on heavy-rain days the model sees about half of the measured rain (weather check below); wind less reliable; skill drops beyond 7 days",
  ],
  [
    "Weather archive (ERA5)",
    "The backtest over 11 seasons",
    "Open-Meteo (ERA5)",
    "CC BY 4.0",
    "4,291 days for Kairouan",
    "Same limits; the point is the governorate capital, not the plot",
  ],
  [
    "Crop coefficients (Kc, depletion fraction, root depth, Ky)",
    "Crop water need",
    "FAO Irrigation and Drainage Paper 56 (tables 11, 12, 22, 24); Pereira et al. 2024 for trees",
    "FAO and Springer publications (values cited, not redistributed in bulk)",
    "18 crops (9 annual, 9 perennial)",
    "Generic values, no Tunisian trials; 14 of the 18 crops are marked “to verify” (values adjusted, interpolated or taken by analogy, with the reason written per crop); no Ky published for barley, melon and any tree; no yield estimate is ever shown for a tree",
  ],
  [
    "Crop calendar",
    "Sowing dates",
    "FAO CropCalendar, Tunisia",
    "FAO",
    "Entries for 15 annual crops in the FAO data; the app has 9 annual and 9 perennial crops",
    "Missing for olive, almond, grape, citrus, date palm, alfalfa; no Kairouan-specific calendar except pepper, olive, cereals",
  ],
  [
    "Soil water capacity",
    "Water reserve",
    "FAO-56 table 19 (indicative values: 90, 150, 170 mm/m)",
    "FAO",
    "3 classes",
    "No real soil map; loam is assumed unless the person says otherwise",
  ],
  [
    "Voice synthesis",
    "Spoken bulletin, voice line",
    "ElevenLabs (voice “Rima M”, Tunisian accent)",
    "ElevenLabs terms (Creator plan)",
    "About 4 KB per second of audio (measured)",
    "The model reads Arabic; Tunisian dialect is not guaranteed and was not validated by a native speaker",
  ],
  [
    "Speech recognition and voice agent",
    "A farmer speaks the crop and region",
    "ElevenLabs (Scribe, and a conversational agent running a language model, claude-sonnet-4-5)",
    "ElevenLabs terms",
    "—",
    "Published accuracy: Arabic average, Tunisian dialect not evaluated by the provider, French excellent; not measured by us on real recordings",
  ],
  [
    "Test phrases for typed messages",
    "Checking that “zitoun kairouan” is understood",
    "Written by hand by us (Arabic, Arabizi, French), not by farmers",
    "Produced for this project",
    "n/a",
    "Not an accuracy claim. Typed messages are parsed by rules and fuzzy matching on a lexicon, not by a trained model",
  ],
  [
    "Satellite evapotranspiration (research model only)",
    "Label of Sakia-ML",
    "NASA MODIS MOD16A2GF, 500 m, 8-day, gap-filled, via the NASA ORNL DAAC subset service",
    "NASA open data",
    "About 320 eight-day periods × 92 Kairouan cropland pixels (plus 100 pixels in three transfer regions)",
    "A model product with its own error; 500 m pixels mix fields; no irrigated pixel in the Kairouan sample; not a measurement of any field",
  ],
  [
    "Satellite vegetation index (research model only)",
    "NDVI feature (variants only)",
    "NASA MODIS MOD13Q1, 250 m, 16-day, same service",
    "NASA open data",
    "Same pixels",
    "Shares its sensor with the label's inputs: partly circular, not deployable",
  ],
  [
    "Land cover (research model only)",
    "Picks cropland pixels",
    "ESA WorldCover 2021, class cropland",
    "CC BY 4.0",
    "Random 500 m cells with 70 % cropland or more",
    "Cropland is mostly rainfed; says nothing about irrigation",
  ],
  [
    "Chat and settings",
    "Telegram bot subscribers",
    "Telegram chat identifier, language, region, crop, soil, system, last irrigation date",
    "Our database (Supabase)",
    "A few rows",
    "Nothing else is stored; no name, no phone number, no precise location",
  ],
];

const NOT_COVERED = [
  "No field trial in Tunisia: crop coefficients are generic, so the advice is indicative.",
  "No local weather station and no soil-moisture sensor in the calculation; rain from the model is underestimated on heavy-rain days.",
  "No farmer registry, no market prices, no water salinity, no real irrigation calendar of the administration (the “fixed weekly schedule” in the backtest is a benchmark we built, not the State's).",
  "Relative yield is estimated only for the 9 crops with a published Ky, never for trees.",
  "Speech recognition of the Tunisian dialect is not measured on real farmers; the dialect text is not validated by a native speaker.",
  "Personal data is limited to a Telegram chat identifier (pseudonymous, not anonymous), the governorate and a few settings. Speech is processed by ElevenLabs under its own terms (retention not confirmed).",
  "The weather source was checked against Tunisian stations at Kairouan and one station 47 km away, over limited periods, not across the country.",
];

const WEATHER_CHECK = [
  ["Reference evapotranspiration, recomputed from the Oueslatia station", "Feb 2019 to Sep 2020, 579 days", "Open-Meteo within −5 % / +4 % depending on the assumed wind-sensor height; correlation 0.97", "One station, 47 km away, series stopped in 2020; wind-sensor height unknown"],
  ["Reference evapotranspiration, Zaghouan", "2020, 241 days", "−3 % / +4 %", "Same"],
  ["Maximum temperature, Kairouan (NOAA)", "2019 to Aug 2025, 1,664 days", "Bias −0.6 °C, correlation 0.994", "About 20 % of days missing at the station"],
  ["Minimum temperature, Kairouan (NOAA)", "Same", "Bias −1.0 °C", "Same"],
  ["Monthly rain, Kairouan (NOAA)", "65 months", "Bias +8 %, correlation 0.89", "—"],
  ["Daily rain, Kairouan (NOAA)", "1,664 days", "Correlation 0.61 (0.25 without a one-day shift: the station reads at 06 UTC)", "—"],
  ["Heavy-rain days (10 mm or more measured)", "43 days", "The station measures 25.7 mm on average, the model 12.8 mm: the model sees about half", "One measuring point; one-day shift applied"],
];

const EVALUATIONS = [
  ["Backtest: 11–12 seasons, 18 crops, advised vs fixed weekly schedule", "Done: water pumped 3 to 27 % lower depending on the crop, almost no stress days. Run on observed weather, not on past forecasts (forecast errors are not simulated, so stress days are near zero by construction): a simulation, not a field result. Kairouan only, drip irrigation, loam"],
  ["Weather source against Tunisian stations", "Done (table above)"],
  ["Offline recomputation", "Done in Chrome with the server stopped; not tested in a phone's airplane mode"],
  ["Understanding of typed phrases (Arabic, Arabizi, French)", "Done on phrases written by us, not by farmers: not an accuracy claim"],
  ["Speech recognition on real recordings (Tunisian dialect, French)", "Not done"],
  ["Voice agent against adversarial requests", "Not done"],
  [
    "Sakia-ML (research, shadow mode): CatBoost vs monthly calendar and a FAO-56-style water balance, held-out years 2024–2025, transfer to three regions",
    "Done, protocol first, failures published: error about 9 % below the calendar in Kairouan; no gain in spring; “not sure” rule not met; fails in the Sahel",
  ],
];

const REASONS = [
  ["The weather data is more than 48 hours old", "No advice is given at all"],
  ["The weather data is more than 12 hours old", "Advice shown, flagged “not sure”"],
  ["The last irrigation is not known", "Advice shown, flagged “not sure”"],
  ["This crop's coefficients are estimated by analogy", "Advice shown, flagged “not sure”"],
  ["The forecast does not cover the whole week", "Advice shown, flagged “not sure”"],
  ["Rain is possible within 3 days (30 to 70 % probability)", "Only a note (“check again tomorrow”); advice unchanged, not flagged “not sure”"],
  ["Extreme heat (42 °C or more) within 3 days: the calculation does not model heat stress", "Shown as a note; advice unchanged"],
];

// Une section détaillée, repliée : un titre et une ligne qui dit ce qu'il y a dedans. `id` sert aux liens (/about#data).
function Fold({ id, title, hint, children }: { id: string; title: string; hint: string; children: React.ReactNode }) {
  return (
    <details id={id} className="group scroll-mt-4 rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
      <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="font-display block text-xl font-bold leading-tight text-sakia-green-deep">{title}</span>
          <span className="mt-0.5 block text-sm text-sakia-brown">{hint}</span>
        </span>
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sakia-green-light text-2xl leading-none text-sakia-green-deep transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="space-y-3 px-5 pb-5 pt-1">{children}</div>
    </details>
  );
}

// Le tableau défile à l'horizontale sur un petit écran : la région doit être atteignable et défilable au clavier
// (tabIndex 0) et porter un nom, sinon un lecteur d'écran ne sait pas ce qu'il survole.
function Table({ head, rows, label }: { head: string[]; rows: string[][]; label: string }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className="overflow-x-auto rounded-xl border border-sakia-sand-dark bg-white">
      <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
        <thead className="bg-sakia-sand text-sakia-brown">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-3 py-2 text-start font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-sakia-sand-dark align-top">
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === 0 ? "font-semibold text-sakia-ink" : "text-sakia-ink"}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const linkClass = "inline-flex min-h-11 items-center font-bold text-sakia-water-deep underline underline-offset-2";

export default function AboutPage() {
  return (
    <main className="sk-type flex flex-1 flex-col">
      <OpenOnHash />
      {/* En-tête sur fond vert foncé UNI (le dégradé doré du bas rendait le texte blanc peu lisible), même marge que les cartes
          et le menu : le titre, puis le problème en une phrase, en grand. */}
      <section className="bg-sakia-green-deep pb-14 pt-8 text-white">
        <div className="mx-auto max-w-5xl px-4" dir="ltr" lang="en">
          <h1 className="font-display text-balance text-4xl font-bold leading-[1.05] sm:text-5xl">What the AI does, and what it does not.</h1>
          <p className="mt-4 max-w-4xl text-xl font-semibold leading-snug text-white sm:text-2xl">{PROBLEM}</p>
        </div>
      </section>

      <div dir="ltr" lang="en" className="relative z-10 mx-auto -mt-8 w-full max-w-5xl flex-1 space-y-10 px-4 pb-8 text-start">
        {/* ---------- en trente secondes : un grand chiffre ou un mot par carte ---------- */}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FACTS.map((f, i) => (
            <Reveal as="li" key={f.title} delay={Math.min(i, 5) * 60} className="flex flex-col rounded-3xl bg-white p-5 shadow-md ring-1 ring-black/10">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sakia-brown">
                <span className="text-sakia-green-deep">{f.icon}</span>
                {f.title}
              </p>
              <p className="font-display mt-2 text-4xl font-extrabold leading-none text-sakia-green-deep">{f.stat}</p>
              <p className="mt-2 leading-snug text-sakia-ink">{f.body}</p>
              {f.href && (
                <Link href={f.href} className={`${linkClass} mt-auto pt-1 text-sm`}>
                  {f.link} →
                </Link>
              )}
            </Reveal>
          ))}
        </ul>

        {/* ---------- les limites, visibles ---------- */}
        <Reveal as="section" className="space-y-3">
          <h2 id="limits" className="font-display text-3xl font-bold leading-tight text-sakia-green-deep">
            Limits
          </h2>
          <ul className="list-disc space-y-1.5 ps-5 text-sakia-ink">
            {LIMITS.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Reveal>

        {/* ---------- le détail, replié ---------- */}
        <section aria-labelledby="detail-title" className="space-y-3">
          <h2 id="detail-title" className="font-display text-3xl font-bold leading-tight text-sakia-green-deep">
            In detail
          </h2>

          <Fold id="problem" title="Full problem statement" hint="The World Bank template, with our evidence">
            <p className="font-display rounded-3xl bg-gradient-to-br from-sakia-green to-sakia-green-deep p-6 text-lg font-semibold leading-relaxed text-white shadow-md">
              Because of Sakia, a smallholder in Kairouan who irrigates from their own well will know which day to irrigate
              and how much, from the weather forecast, through a short call or message that needs no smartphone and no
              reading, instead of deciding by habit or by waiting for rain. We know because, in a past SMS pilot, generic
              messages were judged “too general” and only about 15–16 % of 421 surveyed farmers said they arrived at the
              right time, and because replaying our rule on 11–12 seasons of observed weather (not on past forecasts, so
              forecast errors are left out) used 3 to 27 % less pumped water than a fixed weekly schedule we defined as a
              benchmark, with almost no water-stress days (a simulation for Kairouan, not a field measurement).
            </p>
            <p className="text-sm text-sakia-brown">
              The simulation is on the{" "}
              <Link href="/backtest" className="font-semibold underline">
                proof page
              </Link>
              , with its assumptions. A small learned model, tested in public in shadow mode (it changes no advice), is on the{" "}
              <Link href="/lab" className="font-semibold underline">
                Lab page
              </Link>
              .
            </p>
          </Fold>

          <Fold id="ai" title="Why AI, and why not a spreadsheet?" hint="Three uses of AI; the numbers stay physics">
            <p className="leading-relaxed text-sakia-ink">
              The numbers come from a deterministic FAO-56 water balance, <strong>on purpose</strong>: it can be checked, and
              it cannot hallucinate. A spreadsheet could do that calculation.
            </p>
            <p className="leading-relaxed text-sakia-ink">
              What a spreadsheet cannot do is meet the farmer where the language is the barrier. 27.9 % of people aged 10 and
              over in Kairouan cannot read (17.3 % across Tunisia; INS, 2024 census), and many speak only Tunisian Arabic,
              which is spoken far more than it is written. So AI is used for three things: speech recognition (a
              farmer can speak instead of type), a voice agent that works out the crop and the region and reads our
              server&apos;s answer, and a voice that answers aloud in Tunisian-accented Arabic.
            </p>
            <p className="leading-relaxed text-sakia-ink">
              Understanding a <em>typed</em> message in English, Arabic, Latin-script Tunisian (“Arabizi”) or French is not AI: it is
              rules and fuzzy matching on a lexicon of crops and places.
            </p>
            <p className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-3 text-sm text-sakia-brown">
              <strong>Status, stated plainly:</strong> typed phrases were tested on sentences written by us, not by farmers,
              which is not an accuracy claim; speech recognition is not measured on real recordings.
            </p>
          </Fold>

          <Fold id="languages" title="Languages" hint="Tunisian Arabic first; standard Arabic, French, English">
            <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
              <li>
                <strong>Tunisian Arabic comes first.</strong> The on-screen text and the recorded bulletins can be in
                Tunisian Arabic, written in Arabic letters, because it is the language of farmers who do not read standard
                Arabic comfortably. That text is not yet validated by a native speaker. Everywhere else the voice answers in
                Tunisian-accented Arabic.
              </li>
              <li>English is available in the web app, the Telegram bot and the SMS simulator; standard Arabic and French on every channel (the voice line speaks Arabic and French).</li>
              <li>A message typed in English, Arabic, Latin-script Tunisian (“zitoun kairouan”) or French is understood in the SMS simulator and the Telegram bot.</li>
              <li>
                <strong>Our answer to “what about a less-supported language?”</strong> Tunisian Arabic is exactly that case. It has no
                standard spelling, and the speech-recognition provider has not evaluated it. Our Tunisian Arabic text is built from
                fixed templates in common Tunisian words, with an automated check that rejects Moroccan and Egyptian forms.
                It is <strong>not yet validated by a native speaker</strong>.
              </li>
            </ul>
          </Fold>

          <Fold id="safeguards" title="Safeguards" hint="When it says “not sure”, and what a person decides">
            <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
              <li>
                <strong>A human decides.</strong> The advice is indicative and must be validated by the regional agricultural
                administration (CRDA).
              </li>
              <li>
                <strong>“Not sure: ask a person.”</strong> When the tool cannot give a reliable answer it says so and does not
                guess. The plan and safeguard sentences are fixed templates, with the numbers filled in by the engine.
              </li>
              <li>The calculation is deterministic and the assumptions are always visible.</li>
              <li>Estimates are never presented as measurements; estimated days are labelled.</li>
              <li>
                <strong>The voice agent is the one place where wording is not fixed.</strong> It is a real ElevenLabs
                conversation with a language model (claude-sonnet-4-5) that is instructed to read our server&apos;s answer word
                for word: 15 of 15 plan answers were read word for word on 20 typed test phrases, but this is an instruction,
                not something we enforce.
              </li>
              <li>
                Personal data is limited to a Telegram chat identifier (pseudonymous, not anonymous) plus language, region,
                crop and a few settings. Our database stores no name, phone number, precise location or IP address. Raw IP
                addresses are held in server memory for rate limits and appear in the hosting provider&apos;s logs.
              </li>
            </ul>
            <Table label="When the tool says “not sure” or adds a note" head={["When the tool says…", "What the user sees"]} rows={REASONS} />
            <p className="text-sm text-sakia-brown">
              On the home screen, a softer “old data” notice also appears after 5 hours (the forecast is refreshed about every 3 hours).
            </p>
          </Fold>

          <Fold id="size" title="Measured sizes, live" hint="Bytes your browser receives from this site, before compression">
            <p className="text-sm text-sakia-brown">No large model runs on the device.</p>
            <div className="rounded-xl bg-sakia-sand/50 p-4">
              <LiveSizes />
            </div>
            <Link href="/speed" className={linkClass}>
              Weak connection, measured against 5 sites →
            </Link>
          </Fold>

          <Fold id="data" title="Data card" hint="Sources, licences, sizes, and what the data does not cover">
            <p className="text-sm text-sakia-brown">
              For every dataset: source, licence, size, and what it does not cover. Where a measurement has not been made,
              it says so. Nothing is rounded up.
            </p>
            <h3 className="text-base font-bold text-sakia-brown">A. Evidence that the problem is real</h3>
            <Table label="Evidence that the problem is real" head={["Fact", "Value", "Source", "Year", "Caveat"]} rows={EVIDENCE} />
            <h3 className="pt-2 text-base font-bold text-sakia-brown">B. Data the tool works with</h3>
            <Table label="Data the tool works with" head={["Dataset", "Role", "Source", "Licence", "Size", "What it does not cover"]} rows={DATASETS} />
            <p className="text-sm text-sakia-brown">
              <strong>The irrigation advice uses no trained model.</strong> One research model (Sakia-ML, CatBoost, 43 KB) is trained and
              evaluated in shadow mode on the three satellite rows above; it changes no advice. Protocol and results: the{" "}
              <Link href="/lab" className="font-semibold underline">
                Lab page
              </Link>
              .
            </p>
            <h3 className="pt-2 text-base font-bold text-sakia-brown">C. What our data does not cover</h3>
            <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
              {NOT_COVERED.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
            <h3 id="weather-check" className="scroll-mt-4 pt-2 text-base font-bold text-sakia-brown">
              D. Weather source checked against Tunisian measurements (3 October 2026)
            </h3>
            <p className="text-sm text-sakia-brown">
              Bias = Open-Meteo minus station. Stations: NOAA GHCN-D Kairouan; DGACTA stations (Oueslatia, 47 km from
              Kairouan; Zaghouan) and CRDA Kairouan on catalog.agridata.tn (Tunisian open-data licence, reuse allowed with attribution).
            </p>
            <Table label="Weather source checked against Tunisian measurements" head={["Measure", "Period", "Result", "Caveat"]} rows={WEATHER_CHECK} />
            <p className="leading-relaxed text-sakia-ink">
              <strong>What we conclude.</strong> At Kairouan the weather source is good for evapotranspiration (within a few
              percent) and temperature (0.6 °C). A study in Morocco found an underestimation of 2 to 37 %: we do not find that
              here. The <strong>measured weakness is heavy rain</strong>: on the 43 days when the station measured 10 mm or
              more, the model saw about half of it, and the plan uses the model&apos;s rain as it is, with no correction. A
              local correction factor for evapotranspiration is not defensible today: the gap changes sign from one station
              to another, and the only complete series near Kairouan dates from 2019–2020. It would need at least a year of
              measurements. The analysis scripts are not included in this repository: treat these figures as our own
              unpublished analysis.
            </p>
            <h3 className="pt-2 text-base font-bold text-sakia-brown">E. Evaluations: done and not done</h3>
            <Table label="Evaluations: done and not done" head={["Evaluation", "Status"]} rows={EVALUATIONS} />
          </Fold>
        </section>
      </div>
    </main>
  );
}
