// Les films du lecteur : chacun est un ensemble de scènes, d'instants de coupe, d'un fond, d'un texte pour les lecteurs
// d'écran. /story = film principal (97 s) ; /story/tech = film technique (57 s, sous la limite de 60 s du formulaire).

import type { ComponentType } from "react";
import type { SceneProps } from "./parts";
import { CUTS, SCENES, SETTLED, TOTAL, backdropAt } from "./timeline";
import type { SceneDef } from "./timeline";
import Open from "./scenes/Open";
import Problem from "./scenes/Problem";
import Answer from "./scenes/Answer";
import Channels from "./scenes/Channels";
import Guard from "./scenes/Guard";
import Proof from "./scenes/Proof";
import Close from "./scenes/Close";
import { TECH_CUTS, TECH_SCENES, TECH_SETTLED, TECH_TOTAL, techBackdrop } from "./tech/timeline";
import Intro from "./tech/Intro";
import Pipeline from "./tech/Pipeline";
import Small from "./tech/Small";
import Stack from "./tech/Stack";
import Safeguards from "./tech/Safeguards";

export type FilmKey = "main" | "tech";

export type FilmDef = {
  title: string;
  ariaLabel: string;
  posterLabel: string;
  posterT: number; // image fixe montrée avant la lecture
  scenes: SceneDef[];
  views: ComponentType<SceneProps>[];
  cuts: readonly number[];
  total: number;
  settled: readonly number[];
  backdrop: (t: number) => string;
  transcript: string[];
};

export const FILMS: Record<FilmKey, FilmDef> = {
  main: {
    title: "Sakia, the story",
    ariaLabel: "Sakia, the story: an animated film of about 97 seconds",
    posterLabel: "Watch the story · 97 seconds",
    posterT: 8.9,
    scenes: SCENES,
    views: [Open, Problem, Answer, Channels, Guard, Proof, Close],
    cuts: CUTS,
    total: TOTAL,
    settled: SETTLED,
    backdrop: backdropAt,
    // Lu par les lecteurs d'écran à la place de l'image animée (la scène est cachée aux technologies d'assistance).
    transcript: [
      "Meet Noor, the fictional farmer of the challenge brief: 38 years old, two hectares near Kairouan and a well, two phones with one basic, no Wi-Fi, in the field all day. Should Noor irrigate today or wait?",
      "In Kairouan, 27.9 percent of people aged 10 and over cannot read, more than one in four. The Kairouan aquifer is drawn at 230 percent of its renewable volume, according to a press report. In a past SMS pilot, about one farmer in six said the advice arrived at the right time. The state's irrigation app asks for more than ten details.",
      "Sakia asks Noor two questions, the crop and the last irrigation, and answers with one decision: irrigate or wait, and how much. The answer is calculated, not generated. Two questions instead of ten means less precision, so the advice is indicative.",
      "The same answer reaches him as a spoken bulletin in Tunisian Arabic (real), on a keypad voice line (simulated), by SMS (simulated) and on Telegram (real). Without a network, the installable web app recomputes the plan in the browser. The advice is ready every morning, before Noor goes to the field.",
      "When the data is too old, Sakia says it is not sure and asks the farmer to see a technician. A person always decides.",
      "Replaying every season from 2015 to 2026 on observed weather, advised schedules used 3 to 27 percent less pumped water depending on the crop, with almost no stress days. This is a simulation, a best case without forecast errors, not a field measurement.",
      "English first, for the jury. In reality: Arabic first, then French, for the spoken bulletin and the app. Sakia. One decision a day.",
    ],
  },
  tech: {
    title: "Sakia, technical walkthrough",
    ariaLabel: "Sakia, technical walkthrough: an animated schema of about 57 seconds",
    posterLabel: "How Sakia works · 57 seconds",
    posterT: 6.5,
    scenes: TECH_SCENES,
    views: [Intro, Pipeline, Small, Stack, Safeguards],
    cuts: TECH_CUTS,
    total: TECH_TOTAL,
    settled: TECH_SETTLED,
    backdrop: techBackdrop,
    transcript: [
      "A farmer speaks. A fixed calculation answers. AI only where a spreadsheet cannot help.",
      "Four steps from voice to advice. One, listen: speech recognition, which is AI in the cloud. Two, understand: the crop and the place are found with rules and fuzzy matching, not AI. Three, calculate: an FAO-56 water balance on the weather forecast, not AI, the same input gives the same answer, and it also runs in the browser, offline. Four, speak: fixed sentences with the numbers filled in, read in a Tunisian-accented voice, which is AI in the cloud. The AI is at both ends; the middle can be checked and cannot hallucinate. An optional voice agent is a language model told to read the server's answer: an instruction, not a guarantee.",
      "Small by design, measured on production on 3 October 2026: the forecast for one region is 1.9 kilobytes, a 7-day plan 2.4 kilobytes, a spoken advice 50 to 98 kilobytes, the app 390 kilobytes on first visit and then kept on the device. Nothing to train, no model to download.",
      "Built with Next.js, TypeScript, Open-Meteo, the FAO-56 method, ElevenLabs, Supabase, Telegram and Vercel. What the data does not cover: no field trial in Tunisia, no weather station in the calculation, speech recognition of the Tunisian dialect not measured on real farmers, and the saved water is a simulation.",
      "Safeguards: fixed sentences; not sure when the weather is older than 12 hours, no advice beyond 48 hours; a person decides; little data kept. Built during the hackathon with an AI coding assistant, directed by the author.",
    ],
  },
};
