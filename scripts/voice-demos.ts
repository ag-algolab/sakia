// Génère à l'avance des bulletins de démonstration : public/audio/demo-<id>.mp3 + demo-<id>.json
// (sous-titres calés) + demo-index.json. La page /bulletin les joue sans réseau et sans crédits,
// en disant clairement que c'est un bulletin enregistré, avec sa date.
// Lancer : node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/voice-demos.ts
// Passe par le cache et le budget de crédits : relancer ne dépense rien si rien n'a changé.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlan } from "../src/lib/plan";
import { synthesizeBulletinMeta } from "../src/lib/voice";
import type { VoiceLang } from "../src/lib/voice/langs";
import { bandFromPlan } from "../src/lib/voice/band";
import type { BulletinPayload } from "../src/lib/voice/band";
import { SELECTED_VOICE } from "../src/lib/voice/voices";

type Demo = { id: string; title: string; region: string; crop: string; lang: VoiceLang; asOf?: string; ago?: number };

const DEMOS: Demo[] = [
  { id: "kairouan-olivier-aeb", title: "Kairouan · olive tree · last irrigation 3 days ago · Tunisian Arabic (Darija) voice", region: "kairouan", crop: "olivier", lang: "aeb", ago: 3 },
  { id: "kairouan-olivier-fr", title: "Kairouan · olive tree · last irrigation 3 days ago · French voice", region: "kairouan", crop: "olivier", lang: "fr", ago: 3 },
  { id: "kairouan-olivier-ar", title: "Kairouan · olive tree · last irrigation 3 days ago · Standard Arabic voice", region: "kairouan", crop: "olivier", lang: "ar", ago: 3 },
  { id: "kairouan-olivier-en", title: "Kairouan · olive tree · last irrigation 3 days ago · English voice", region: "kairouan", crop: "olivier", lang: "en", ago: 3 },
  { id: "kairouan-olivier-ko", title: "Kairouan · olive tree · last irrigation 3 days ago · Korean voice (한국어)", region: "kairouan", crop: "olivier", lang: "ko", ago: 3 },
  { id: "kairouan-tomate-canicule-aeb", title: "Kairouan · tomato · replay of the 17 July 2026 heatwave · last irrigation unknown, so the bulletin says “not sure” · Tunisian Arabic (Darija) voice", region: "kairouan", crop: "tomate", lang: "aeb", asOf: "2026-07-17" },
  { id: "kairouan-tomate-canicule-fr", title: "Kairouan · tomato · replay of the 17 July 2026 heatwave · last irrigation unknown, so the bulletin says “not sure” · French voice", region: "kairouan", crop: "tomate", lang: "fr", asOf: "2026-07-17" },
  { id: "kairouan-tomate-canicule-ar", title: "Kairouan · tomato · replay of the 17 July 2026 heatwave · last irrigation unknown, so the bulletin says “not sure” · Standard Arabic voice", region: "kairouan", crop: "tomate", lang: "ar", asOf: "2026-07-17" },
  { id: "kairouan-tomate-canicule-en", title: "Kairouan · tomato · replay of the 17 July 2026 heatwave · last irrigation unknown, so the bulletin says “not sure” · English voice", region: "kairouan", crop: "tomate", lang: "en", asOf: "2026-07-17" },
  { id: "kairouan-tomate-canicule-ko", title: "Kairouan · tomato · replay of the 17 July 2026 heatwave · last irrigation unknown, so the bulletin says “not sure” · Korean voice (한국어)", region: "kairouan", crop: "tomate", lang: "ko", asOf: "2026-07-17" },
];

const OUT = join(process.cwd(), "public", "audio");

(async () => {
  mkdirSync(OUT, { recursive: true });
  const index: { id: string; title: string; lang: VoiceLang; region: string; crop: string; replayOf?: string; recordedAt: string }[] = [];
  for (const d of DEMOS) {
    const plan = await buildPlan({ regionId: d.region, cropId: d.crop, asOf: d.asOf, lastIrrigationDaysAgo: d.ago });
    const r = await synthesizeBulletinMeta(plan, d.lang);
    writeFileSync(join(OUT, `demo-${d.id}.mp3`), r.audio);
    const payload: BulletinPayload = {
      lines: r.lines,
      audioUrl: `/audio/demo-${d.id}.mp3`,
      mime: r.mime,
      generatedAt: r.generatedAt,
      lang: d.lang,
      band: bandFromPlan(plan),
      source: "demo",
      voiceName: SELECTED_VOICE.name,
      voiceValidated: SELECTED_VOICE.validated,
    };
    writeFileSync(join(OUT, `demo-${d.id}.json`), JSON.stringify({ ...payload, title: d.title }, null, 1));
    index.push({ id: d.id, title: d.title, lang: d.lang, region: d.region, crop: d.crop, replayOf: d.asOf, recordedAt: r.generatedAt });
    console.log(`demo-${d.id} : ${Math.round(r.audio.length / 1024)} Ko, ${r.lines.length} lignes (${r.source})`);
  }
  writeFileSync(join(OUT, "demo-index.json"), JSON.stringify(index, null, 1));
})();
