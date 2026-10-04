import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import Talk from "@/components/call/Talk";
import type { EvalSummary } from "@/components/call/Talk";
import { agentId } from "@/lib/voiceagent/api";

export const metadata: Metadata = {
  title: "Sakia · Voice agent",
  description:
    "Talk to an AI voice agent in Arabic, Tunisian Darija (not validated) or French: it works out the crop, region and last irrigation, then is instructed to read the advice computed by the irrigation engine word for word.",
};

export const dynamic = "force-dynamic";

async function loadEval(): Promise<EvalSummary> {
  try {
    const raw = JSON.parse(await readFile(join(process.cwd(), "src", "lib", "voiceagent", "eval-results.json"), "utf8")) as { summary: NonNullable<EvalSummary> };
    return raw.summary;
  } catch {
    return null;
  }
}

export default async function TalkPage() {
  return <Talk agentReady={agentId() !== null} evalSummary={await loadEval()} />;
}
