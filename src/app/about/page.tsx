import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/motion";
import { MIN_REPORTERS } from "@/lib/rainLevels";
import LiveSizes from "./LiveSizes";

export const metadata: Metadata = {
  title: "About Sakia — AI, safeguards and data",
  description: "What the AI does in Sakia, why not a spreadsheet, the safeguards, and the data card.",
};

// Contenu repris de README.md et de docs/DATA-CARD.md (à jour au 3 octobre 2026), MOT POUR MOT quand c'est un chiffre ou une limite.
// En anglais d'abord (jury). Ne rien arrondir vers le haut : si une mesure n'est pas faite, la page le dit.

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
    "Published accuracy: Arabic average, Tunisian dialect not evaluated by the provider, French excellent; our own measurement on real recordings is not done yet",
  ],
  [
    "Test phrases for typed messages",
    "Checking that “zitoun kairouan” is understood",
    "Written by hand by us (Arabic, Arabizi, French), not by farmers",
    "Produced for this project",
    "n/a",
    "Not an accuracy claim. We do not train any model of our own: typed messages are parsed by rules and fuzzy matching on a lexicon",
  ],
  [
    "Chat and settings",
    "Telegram bot subscribers",
    "Telegram chat identifier, language, region, crop, soil, system, last irrigation date",
    "Our database (Supabase)",
    "A few rows",
    "Nothing else is stored; no name, no phone number, no precise location",
  ],
  [
    "Farmers' rain reports",
    `Correct the model's rain (${MIN_REPORTERS} or more different people agree)`,
    "Collected by Sakia through the web app, the bulletin, Telegram, SMS and the voice line",
    "Produced for this project; each report keeps only a salted hash of an identifier (pseudonymous, not anonymous)",
    "Demo reports only: fictitious and labelled so",
    "No real reports yet; a scale of five levels, not millimetres; at most 3 days back",
  ],
];

const NOT_COVERED = [
  "No field trial in Tunisia: crop coefficients are generic, so the advice is indicative.",
  "No local weather station and no soil-moisture sensor in the calculation; rain from the model is underestimated on heavy-rain days.",
  "No farmer registry, no market prices, no water salinity, no real irrigation calendar of the administration (the “fixed weekly schedule” in the backtest is a benchmark we built, not the State's).",
  "Relative yield is estimated only for the 9 crops with a published Ky, never for trees.",
  "Speech recognition of the Tunisian dialect has not been measured on real farmers; the dialect text is not validated by a native speaker.",
  "Personal data is limited to a Telegram chat identifier (pseudonymous, not anonymous), the governorate and a few settings; rain reports carry only a salted hash. Speech is processed by ElevenLabs under its own terms (retention still to be confirmed).",
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
  ["Offline recomputation", "Done in Chrome with the server stopped; phone airplane mode not yet"],
  ["Understanding of typed phrases (Arabic, Arabizi, French)", "Done on phrases written by us, not by farmers: not an accuracy claim"],
  ["Speech recognition on real recordings (Tunisian dialect, French)", "Not done yet: to be measured and published as it is"],
  ["Voice agent against adversarial requests", "Not done yet"],
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

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <Reveal as="section" className="space-y-3">
      <h2 id={id} className="font-display text-3xl font-bold leading-tight text-sakia-green-deep">
        {title}
      </h2>
      {children}
    </Reveal>
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

export default function AboutPage() {
  return (
    <main className="sk-type flex flex-1 flex-col">
      <section className="sk-hero-sky px-4 pb-14 pt-8 text-white">
        <div className="mx-auto max-w-4xl" dir="ltr" lang="en">
          <h1 className="font-display max-w-xl text-4xl font-bold leading-[1.05] sm:text-6xl">What the AI does, and what it does not.</h1>
          <p className="mt-3 max-w-lg text-base leading-snug text-white/90 sm:text-lg">
            This page is in English. Sakia speaks to farmers in a Tunisian-accented voice, and writes in Tunisian Arabic (Darija, not yet validated by a native speaker), standard Arabic, French and English.
          </p>
        </div>
      </section>
      <div dir="ltr" lang="en" className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 text-start">
      <Section id="problem" title="The problem, in one sentence">
        <p className="font-display rounded-3xl bg-gradient-to-br from-sakia-green to-sakia-green-deep p-6 text-lg font-semibold leading-relaxed text-white shadow-md sm:text-xl">
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
          , with its assumptions.
        </p>
        <p className="text-sm text-sakia-brown">
          Beyond the advice, we trained and tested a small learned model in public, in shadow mode: it changes no advice. Its protocol,
          its results and its failures are on the{" "}
          <Link href="/lab" className="font-semibold underline">
            Lab page
          </Link>
          , where you can run it in your browser.
        </p>
      </Section>

      <Section id="ai" title="What does the AI do, and why not a spreadsheet?">
        <p className="leading-relaxed text-sakia-ink">
          The numbers come from a deterministic FAO-56 water balance, <strong>on purpose</strong>: it can be checked, and
          it cannot hallucinate. A spreadsheet could do that calculation.
        </p>
        <p className="leading-relaxed text-sakia-ink">
          What a spreadsheet cannot do is meet the farmer where the language is the barrier. 27.9 % of people aged 10 and
          over in Kairouan cannot read (17.3 % across Tunisia; INS, 2024 census), and many speak only Tunisian Arabic
          (Darija), which is spoken far more than it is written. So AI is used for three things: speech recognition (a
          farmer can speak instead of type), a voice agent that works out the crop and the region and reads our
          server&apos;s answer, and a voice that answers aloud in Tunisian-accented Arabic.
        </p>
        <p className="leading-relaxed text-sakia-ink">
          Understanding a <em>typed</em> message in English, Arabic, Latin-script Tunisian (“Arabizi”) or French is not AI: it is
          rules and fuzzy matching on a lexicon of crops and places.
        </p>
        <p className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-3 text-sm text-sakia-brown">
          <strong>Status, stated plainly:</strong> typed phrases were tested on sentences written by us, not by farmers,
          which is not an accuracy claim; speech recognition on real recordings has not been measured yet. We will publish
          the result as it comes, even if it is poor.
        </p>
      </Section>

      <Section id="languages" title="Languages">
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          <li>
            <strong>Tunisian Arabic (Darija) comes first.</strong> The on-screen text and the recorded bulletins can be in
            Darija, written in Arabic letters, because it is the language of farmers who do not read standard Arabic
            comfortably. The Darija text is not yet validated by a native speaker. Everywhere else the voice answers in
            Tunisian-accented Arabic.
          </li>
          <li>English is available in the web app, the Telegram bot and the SMS simulator; standard Arabic and French on every channel (the voice line speaks Arabic and French).</li>
          <li>A message typed in English, Arabic, Latin-script Tunisian (“zitoun kairouan”) or French is understood in the SMS simulator and the Telegram bot.</li>
          <li>
            <strong>Our answer to “what about a less-supported language?”</strong> Darija is exactly that case. It has no
            standard spelling, and the speech-recognition provider has not evaluated it. Our Darija text is built from
            fixed templates in common Tunisian words, with an automated check that rejects Moroccan and Egyptian forms.
            It has <strong>not yet been checked by a native speaker</strong>, and we will publish recognition results as
            measured, even if they are poor.
          </li>
        </ul>
      </Section>

      <Section id="safeguards" title="Safeguards">
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
            crop and a few settings; rain reports carry only a salted hash. Our database stores no name, phone number,
            precise location or IP address.
          </li>
        </ul>
        <Table label="When the tool says “not sure” or adds a note" head={["When the tool says…", "What the user sees"]} rows={REASONS} />
        <p className="text-sm text-sakia-brown">
          On the home screen, a softer “old data” notice also appears after 5 hours (the forecast is refreshed about every 3 hours).
        </p>
      </Section>

      <Section id="rain" title="Farmers as weather stations">
        <p className="leading-relaxed text-sakia-ink">
          Weather models see a grid of 9 to 25 km, not your field, and our check against Tunisian stations shows that they
          see only about half of the heavy rain. Few farmers have a rain gauge, so a farmer can report how much rain fell
          at their place, on a five-step scale (none, a few drops, light, a lot, a huge amount). When at least{" "}
          <strong>{MIN_REPORTERS} different people</strong> of the same region report the same day, their cautious median replaces
          the model&apos;s rain for that day, and the irrigation plan is recomputed. A human stays in the loop, and the
          data is local.
        </p>
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          <li>One report per person, per region and per day; values bounded; today and the last 3 days only.</li>
          <li>Median, not average: it limits the effect of one false report. Each step counts for the low end of its range, because wrongly skipping an irrigation hurts the crop more than wasting a little water. The rule is a brake, not a guarantee: it is not abuse-proof (the simulated SMS channel does not identify senders).</li>
          <li>Our database stores no name and no IP address, only a salted hash of an identifier (pseudonymous, not anonymous). On the web, each device gets an identity issued and signed by the server. IP addresses are held in server memory for rate limits (20 reports per hour per address; at most 10 reports and 2 identities per address per day) and appear in the hosting provider&apos;s logs.</li>
          <li>Always shown as “reported by farmers, not measured”. <strong>In this demonstration the reports are fictional.</strong></li>
        </ul>
      </Section>

      <Section id="size" title="Small AI: measured sizes">
        <p className="text-sm text-sakia-brown">
          No large model runs on the device. These sizes are measured live from this site (bytes received, before compression).
        </p>
        <div className="rounded-xl bg-white p-4">
          <LiveSizes />
        </div>
      </Section>

      <Section id="data" title="Data card">
        <p className="text-sm text-sakia-brown">
          For every dataset: source, licence, size, and what it does not cover. Where a measurement has not been made yet,
          it says so. Nothing is rounded up.
        </p>
        <h3 className="text-base font-bold text-sakia-brown">A. Evidence that the problem is real</h3>
        <Table label="Evidence that the problem is real" head={["Fact", "Value", "Source", "Year", "Caveat"]} rows={EVIDENCE} />
        <h3 className="pt-2 text-base font-bold text-sakia-brown">B. Data the tool works with</h3>
        <Table label="Data the tool works with" head={["Dataset", "Role", "Source", "Licence", "Size", "What it does not cover"]} rows={DATASETS} />
        <p className="text-sm text-sakia-brown">
          We do <strong>not</strong> use any trained model of our own: no training data, no synthetic data set.
        </p>
        <h3 className="pt-2 text-base font-bold text-sakia-brown">C. What our data does not cover</h3>
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          {NOT_COVERED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <h3 id="weather-check" className="pt-2 text-base font-bold text-sakia-brown">
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
          here. The <strong>measured weakness is heavy rain</strong>, which is exactly what farmers&apos; rain reports
          correct, with deliberately cautious values. A local correction factor for evapotranspiration is not defensible
          today: the gap changes sign from one station to another, and the only complete series near Kairouan dates from
          2019–2020. At least a year of measurements is needed; that is the roadmap, not a promise. The analysis scripts
          are not included in this repository: treat these figures as our own unpublished analysis until they are added.
        </p>
        <h3 className="pt-2 text-base font-bold text-sakia-brown">E. Evaluations: done and not done</h3>
        <Table label="Evaluations: done and not done" head={["Evaluation", "Status"]} rows={EVALUATIONS} />
      </Section>

      <Section id="limits" title="Limits">
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          <li>The voice line (keypad call) and SMS are simulated in the browser; the Telegram bot, the web app, the installable app and the voice agent are real. The same engine would serve real telephony.</li>
          <li>“Offline” means without internet: the plan is recomputed in the browser from the last saved forecast (checked in Chrome with the server stopped; not yet in a phone&apos;s airplane mode). Telegram needs a connection.</li>
          <li>Crop coefficients are generic and not validated by farmers: the advice is indicative.</li>
          <li>The water-saving figures are a simulation on observed weather, not on past forecasts, and the fixed weekly schedule is our own benchmark: they are not field measurements.</li>
          <li>The weather point is the governorate capital, an approximation of the plot.</li>
          <li>Farmers without any phone signal are not reached by any of our channels.</li>
        </ul>
      </Section>
      </div>
    </main>
  );
}
