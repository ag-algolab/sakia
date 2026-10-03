import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/motion";
import { MIN_REPORTERS } from "@/lib/rainLevels";
import LiveSizes from "./LiveSizes";

export const metadata: Metadata = {
  title: "About Sakia — AI, safeguards and data",
  description: "What the AI does in Sakia, why not a spreadsheet, the safeguards, and the data card.",
};

// Contenu repris de docs/WB-VIDEO.md, docs/WB-EXIGENCES.md et docs/DATA-CARD.md. En anglais d'abord (jury).

const EVIDENCE = [
  ["Agriculture's share of water withdrawals", "75.5 % (2.71 of 3.59 km³)", "FAO AQUASTAT, Tunisia", "2022", "Some values imputed"],
  ["Kairouan aquifer exploited at", "230 % of its renewable volume", "African Manager (press)", "2024", "Press report, not an official study"],
  ["Households with internet, Kairouan", "20.7 % (national 40.4 %)", "INS, ICT bulletin", "2025", "Households, not individuals"],
  ["People who cannot read, Kairouan (age 10+)", "27.9 % (Tunisia overall 17.3 %); the five highest governorates range from 25.5 to 28.5 %", "INS, Flash Éducation, Sept. 2025 (2024 census) for the national figures and the range; the Kairouan figure as reported by the press from the census", "2024", "The official bulletin gives the range, not the Kairouan figure. The five governorates: Jendouba, Kairouan, Sidi Bouzid, Kasserine, Siliana"],
  ["SMS said to arrive at the right time in a pilot", "about 15–16 % of 421 respondents (3 regions)", "ICARDA, ICT2Scale (WOCAT)", "2019-2021", "Survey perception, not a delivery measurement; small pilot; generic SMS, not specific to irrigation"],
  ["Pumping cost for farms under 3 ha", "1.25 to 1.5 times higher", "Cahiers Agricultures", "2024", "Read via a summary: to verify"],
];

const DATASETS = [
  [
    "Weather forecast (FAO ET0, rain, temperature)",
    "7-day plan",
    "Open-Meteo (ECMWF, ICON, GFS models)",
    "CC BY 4.0; free for non-commercial use",
    "Measured live below",
    "9 to 25 km grid, no local station in the calculation. Checked against Tunisian stations at Kairouan and one station 47 km away: reference evapotranspiration within -5 % / +4 %, but on heavy-rain days the model sees about half of the measured rain; weak reliability beyond 7 days",
  ],
  [
    "ERA5 weather archive",
    "Backtest, 11–12 seasons",
    "Open-Meteo (ERA5)",
    "CC BY 4.0",
    "4,291 days for Kairouan",
    "Same limits; point of the governorate capital, not the plot",
  ],
  [
    "Crop coefficients (Kc, p, Zr, Ky)",
    "Water need",
    "FAO Irrigation and Drainage Paper 56 (tables 11, 12, 22, 24); Pereira et al. 2024 (trees)",
    "FAO / Springer publications (values cited, not redistributed in bulk)",
    "18 crops",
    "Generic values, no Tunisian field trials; 14 of the 18 crops are marked “to verify” (values adjusted, interpolated or taken by analogy); no Ky published for barley, melon and any tree; no yield estimate is ever shown for a tree",
  ],
  [
    "Tunisia crop calendar",
    "Planting dates",
    "FAO CropCalendar",
    "FAO",
    "Entries for 15 annual crops in the FAO data (the app has 9 annual and 9 perennial crops)",
    "Missing for olive, almond, vine, citrus, date palm, alfalfa; no Kairouan-specific calendar except chili, olive, cereals",
  ],
  [
    "Soil available water",
    "Water reserve",
    "FAO-56 table 19 (indicative: 90, 150, 170 mm/m)",
    "FAO",
    "3 soil classes",
    "No real soil map (SoilGrids possible, not integrated)",
  ],
  [
    "Synthetic voice",
    "Spoken bulletin",
    "ElevenLabs (voice “Rima M”, Tunisian accent)",
    "ElevenLabs terms (Creator plan)",
    "About 4 KB per second of audio",
    "Reads Darija text with a Tunisian-accent voice; not validated by a native speaker",
  ],
  [
    "Speech recognition and voice agent",
    "Farmer's spoken question",
    "ElevenLabs (Scribe, and a conversational agent running a language model, claude-sonnet-4-5)",
    "ElevenLabs terms",
    "n/a",
    "Provider reports French excellent, Arabic average, Tunisian dialect not evaluated by the provider; our own measurement on real recordings is not done yet",
  ],
  [
    "Test phrases for typed messages",
    "Checking that “zitoun kairouan” is understood",
    "Written by hand by us (French, Arabic, Arabizi), not by farmers",
    "Produced for this project",
    "n/a",
    "Not an accuracy claim. We do not train any model of our own: typed messages are parsed by rules and fuzzy matching on a lexicon",
  ],
];

const NOT_COVERED = [
  "No field trial in Tunisia: coefficients are generic, so the advice is indicative.",
  "No local weather station and no soil-moisture sensor.",
  "No farmer registry, no market prices, no water salinity.",
  "The “fixed calendar” of the backtest is an assumption: the administration's real calendar was not obtained.",
  "Relative yield is estimated only for the 9 crops with a published Ky, never for trees.",
  "Darija text and speech are not yet validated by a native speaker; recognition of Darija is not guaranteed and has not been measured on real farmers yet.",
  "Personal data is limited to a Telegram chat identifier (pseudonymous, not anonymous), the governorate and a few settings; rain reports carry only a salted hash. Speech is processed by ElevenLabs under its own terms (retention still to be confirmed).",
  "The weather source was checked against Tunisian stations at Kairouan and one station 47 km away, over limited periods, not across the country.",
];

const REASONS = [
  ["The weather data is more than 48 hours old", "No advice is given at all"],
  ["The weather data is more than 12 hours old", "Advice shown, flagged “not sure”"],
  ["The last irrigation is not known", "Flagged “not sure”"],
  ["This crop's coefficients are estimated by analogy", "Flagged “not sure”"],
  ["Rain is possible within 3 days (30 to 70 % probability)", "Only a note (“check again tomorrow”) in the Telegram and phone messages; not flagged “not sure”"],
  ["The forecast does not cover the whole week", "Flagged “not sure”"],
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
    <main className="flex flex-1 flex-col">
      <section className="sk-hero-sky px-4 pb-14 pt-8 text-white">
        <div className="mx-auto max-w-4xl" dir="ltr" lang="en">
          <h1 className="font-display max-w-xl text-4xl font-bold leading-[1.05] sm:text-6xl">What the AI does, and what it does not.</h1>
          <p className="mt-3 max-w-lg text-base leading-snug text-white/90 sm:text-lg">
            This page is in English. Sakia can speak Tunisian Arabic (Darija, not yet validated by a native speaker), standard Arabic, French and English.
          </p>
        </div>
      </section>
      <div dir="ltr" lang="en" className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-4 py-8 text-start">
      <Section id="problem" title="The problem, in one sentence">
        <p className="font-display rounded-3xl bg-gradient-to-br from-sakia-green to-sakia-green-deep p-6 text-xl font-semibold leading-relaxed text-white shadow-md">
          Because of Sakia, a smallholder in Kairouan who irrigates from their own well will know which day to irrigate and
          how much, from the weather forecast, through a short call or message that needs no smartphone and no reading,
          instead of deciding by habit or by waiting for rain. We know because, in a past SMS pilot, generic messages were
          judged “too general” and only about 15–16 % of 421 surveyed farmers said they arrived at the right time, and
          because replaying our rule on 11–12 seasons of observed weather (not on past forecasts, so forecast errors are
          left out) used 3 to 27 % less pumped water than a fixed weekly schedule we defined as a benchmark, with almost
          no water-stress days (a simulation for Kairouan, not a field measurement).
        </p>
        <p className="text-sm text-sakia-brown">
          The simulation is on the{" "}
          <Link href="/backtest" className="font-semibold underline">
            proof page
          </Link>
          , with its assumptions.
        </p>
      </Section>

      <Section id="ai" title="What does the AI do, and why not a spreadsheet?">
        <p className="leading-relaxed text-sakia-ink">
          The numbers come from a deterministic FAO-56 water balance, <strong>on purpose</strong>: it can be checked, and
          it cannot hallucinate. A spreadsheet could do that calculation.
        </p>
        <p className="leading-relaxed text-sakia-ink">
          What a spreadsheet cannot do is meet the farmer where the language is the barrier. In Kairouan, 27.9 % of people
          aged 10 and over cannot read (17.3 % in Tunisia overall; the Kairouan figure is as reported by the press from the
          2024 census). So AI is used where a spreadsheet cannot help: speech recognition (a farmer can speak instead of
          type), a Tunisian-accented synthetic voice that answers aloud, and a voice agent whose language model works out the
          crop and the region. Typed SMS and Telegram messages (French, Arabic, Arabizi) are parsed by rules and fuzzy
          matching on a lexicon, <strong>not by AI</strong>.
        </p>
        <p className="rounded-xl border border-sakia-sand-dark bg-sakia-sand p-3 text-sm text-sakia-brown">
          <strong>Status, stated plainly:</strong> speech recognition has not been measured on real recordings, and
          typed-message parsing has only been tested on phrases we wrote ourselves, not on farmers&apos; messages. We will
          publish the results as they come, even if they are poor.
        </p>
      </Section>

      <Section id="languages" title="Languages">
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          <li>
            <strong>Tunisian Arabic (Darija) comes first.</strong> The spoken bulletin and the on-screen text can be in
            Darija, written in Arabic letters. The Darija text is not yet validated by a native speaker.
          </li>
          <li>Standard Arabic and French are available on every channel; English in the web app, the Telegram bot and the SMS simulator (the voice line speaks French and Arabic).</li>
          <li>Typed input also accepts Latin-script Tunisian (“zitoun kairouan”) in the SMS simulator.</li>
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
            <strong>“Not sure: ask a person.”</strong> When the tool cannot give a reliable answer it says so, in fixed
            sentences that are never generated freely, and it does not guess.
          </li>
          <li>The calculation is deterministic and the assumptions are always visible.</li>
          <li>Estimates are never presented as measurements; estimated days are labelled.</li>
          <li>
            <strong>The voice agent is the one place where wording is not fixed.</strong> It is a real ElevenLabs conversation
            with a language model (claude-sonnet-4-5) that is instructed to read our server&apos;s answer word for word: 15 of 15
            plan answers were read word for word on 20 typed test phrases, but this is an instruction, not something we enforce.
          </li>
          <li>
            Personal data is limited to a Telegram chat identifier (pseudonymous, not anonymous), the governorate and a few
            settings; rain reports carry only a salted hash.
          </li>
        </ul>
        <Table label="When the tool says “not sure”" head={["When the tool says “not sure”", "What the user sees"]} rows={REASONS} />
        <p className="text-sm text-sakia-brown">
          On the home screen, a softer “old data” notice also appears after 5 hours (the forecast is refreshed about every 3 hours).
        </p>
      </Section>

      <Section id="rain" title="Farmers as weather stations">
        <p className="leading-relaxed text-sakia-ink">
          Weather models see a grid of 9 to 25 km, not your field. So a farmer can report how much rain fell at their place,
          on a five-step scale (none, a few drops, light, a lot, a huge amount): nobody measures in millimetres. When at
          least <strong>{MIN_REPORTERS} different farmers</strong> of the same region report the same day, their cautious median replaces
          the model&apos;s rain for that day, and the irrigation plan is recomputed. A human stays in the loop, and the data is local.
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
        <h3 className="text-base font-bold text-sakia-brown">A. Evidence that shows the problem</h3>
        <Table label="Evidence that shows the problem" head={["Fact", "Value", "Source", "Year", "Caveat"]} rows={EVIDENCE} />
        <h3 className="pt-2 text-base font-bold text-sakia-brown">B. Data the tool works with</h3>
        <Table
          label="Data the tool works with"
          head={["Dataset", "Role", "Source", "Licence", "Size", "What it does not cover"]}
          rows={DATASETS}
        />
        <h3 className="pt-2 text-base font-bold text-sakia-brown">C. What our data does not cover</h3>
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          {NOT_COVERED.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </Section>

      <Section id="limits" title="Limits">
        <ul className="list-disc space-y-1 ps-5 text-sakia-ink">
          <li>The voice line (keypad call) and SMS are simulated in the browser; the Telegram bot, the web app and the voice agent are real. The same engine would serve real telephony.</li>
          <li>“Offline” means without internet: the plan is recomputed in the browser from the last saved forecast (checked in Chrome with the server stopped; not yet in a phone&apos;s airplane mode). Telegram needs a connection.</li>
          <li>Crop coefficients are generic and not validated by farmers: the advice is indicative.</li>
          <li>The impact figures are model estimates on real historical weather, not measured in the field.</li>
          <li>The weather point is the governorate capital, an approximation of the plot.</li>
        </ul>
      </Section>
      </div>
    </main>
  );
}
