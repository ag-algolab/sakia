import type { Metadata } from "next";
import Film from "@/components/story/Film";

export const metadata: Metadata = {
  title: "Sakia — the story",
  description: "A 97-second animated film: Noor, the problem, the answer, the proof. Real numbers from the engine, sources on screen.",
};

// Le film « Sakia, l'histoire ». Voir src/components/story/Film.tsx pour les adresses (?rec=1, ?cam=1, ?t=45).
export default function StoryPage() {
  return <Film film="main" />;
}
