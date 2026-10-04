import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import CallPhone from "@/components/call/CallPhone";
import type { Recordings } from "@/components/call/useIvrCall";
import type { DemoItem, Manifest } from "@/lib/ivr/demo";
import { allRecordings, textHash } from "@/lib/ivr/prompts";
import { agentId } from "@/lib/voiceagent/api";

export const metadata: Metadata = {
  title: "Sakia · Voice line",
  description:
    "Call Sakia on a simulated basic phone (no real line exists): choose language, crop and last watering with the keypad, hear the irrigation advice in a Tunisian-accented voice, with English subtitles. Plays demo recordings when there is no internet.",
};

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(join(process.cwd(), "public", "audio", "ivr", file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

export default async function CallPage() {
  const manifest = await readJson<Manifest | null>("manifest.json", null);
  const demos = await readJson<DemoItem[]>(join("demo", "index.json"), []);

  // Un enregistrement n'est proposé que s'il correspond encore EXACTEMENT au texte actuel de la phrase (même empreinte).
  const recordings: Recordings = {};
  for (const r of allRecordings()) {
    const item = manifest?.items.find((i) => i.id === r.id && i.lang === r.lang);
    if (item && item.hash === textHash(r.text)) recordings[`${r.id}.${r.lang}`] = { url: item.file, bytes: item.bytes, durationMs: item.durationMs };
  }
  const promptBytes = Object.values(recordings).reduce((n, r) => n + r.bytes, 0);
  const planKb = demos.length ? Math.round(demos.reduce((n, d) => n + d.bytes, 0) / demos.length / 1024) : 0;

  return (
    <CallPhone
      recordings={recordings}
      demos={demos}
      agentReady={agentId() !== null}
      stats={{ promptCount: Object.keys(recordings).length, promptKb: Math.round(promptBytes / 1024), planKb, voiceName: manifest?.voiceName ?? "Rima M" }}
    />
  );
}
