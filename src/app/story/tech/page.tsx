import type { Metadata } from "next";
import Film from "@/components/story/Film";

export const metadata: Metadata = {
  title: "Sakia — how it works",
  description: "A 57-second animated schema for the technical walkthrough: four steps, sizes, stack, limits, safeguards.",
};

// Le film technique (moins de 60 s, la limite du formulaire HackOS). Mêmes adresses que /story (?rec=1, ?cam=1, ?t=30).
export default function StoryTechPage() {
  return <Film film="tech" />;
}
