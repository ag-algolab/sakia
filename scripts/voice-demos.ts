// Génère à l'avance des bulletins de démonstration : public/audio/demo-<id>.mp3 + demo-<id>.json
// (sous-titres calés) + demo-index.json. La page /bulletin les joue sans réseau et sans crédits,
// en disant clairement que c'est un bulletin enregistré, avec sa date.
// Lancer : node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/voice-demos.ts
// Passe par le cache et le budget de crédits : relancer ne dépense rien si rien n'a changé.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPlan } from "../src/lib/plan";
import { applyReports, summarize } from "../src/lib/reports";
import { levelFromMm } from "../src/lib/rainLevels";
import { fetchForecast } from "../src/lib/weather";
import { getRegion } from "../src/lib/regions";
import { synthesizeBulletinMeta } from "../src/lib/voice";
import type { VoiceLang } from "../src/lib/voice/langs";
import { bandFromPlan } from "../src/lib/voice/band";
import type { BulletinPayload } from "../src/lib/voice/band";
import { REPORTS_ARE_FICTIONAL, SELECTED_VOICE } from "../src/lib/voice/voices";

type Demo = { id: string; title: string; region: string; crop: string; lang: VoiceLang; asOf?: string; ago?: number; fictionalReports?: number[] };

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
  // Pluie corrigée par des signalements d'agriculteurs : FICTIFS (démonstration). Trois personnes différentes signalent la
  // veille 2, 2 et 8 mm ; la médiane prudente (2 mm, « pluie légère ») remplace la prévision pour ce jour.
  { id: "kairouan-olivier-signalements-aeb", title: "Kairouan · olive tree · rain corrected by fictional farmers' reports · Tunisian Arabic (Darija) voice", region: "kairouan", crop: "olivier", lang: "aeb", ago: 3, fictionalReports: [2, 2, 8] },
  { id: "kairouan-olivier-signalements-fr", title: "Kairouan · olive tree · rain corrected by fictional farmers' reports · French voice", region: "kairouan", crop: "olivier", lang: "fr", ago: 3, fictionalReports: [2, 2, 8] },
  { id: "kairouan-olivier-signalements-en", title: "Kairouan · olive tree · rain corrected by fictional farmers' reports · English voice", region: "kairouan", crop: "olivier", lang: "en", ago: 3, fictionalReports: [2, 2, 8] },
];

const OUT = join(process.cwd(), "public", "audio");

(async () => {
  mkdirSync(OUT, { recursive: true });
  const index: { id: string; title: string; lang: VoiceLang; region: string; crop: string; replayOf?: string; recordedAt: string; fictionalReports?: boolean }[] = [];
  for (const d of DEMOS) {
    let forecast;
    if (d.fictionalReports) {
      // même chemin de code que la vraie correction : summarize puis applyReports, sans passer par la base de données
      const region = getRegion(d.region)!;
      const fc = await fetchForecast(region.lat, region.lon);
      const yesterday = new Date(Date.parse(`${fc.today}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
      const rows = d.fictionalReports.map((mm, i) => ({ day: yesterday, mm, reporter_hash: `demo-${i}`, level: levelFromMm(mm) }));
      const { days, applied } = applyReports(fc.days, summarize(rows));
      forecast = { ...fc, days, localReports: applied };
    }
    const plan = await buildPlan({ regionId: d.region, cropId: d.crop, asOf: d.asOf, lastIrrigationDaysAgo: d.ago }, forecast);
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
      reportsFictional: plan.localReports?.length ? REPORTS_ARE_FICTIONAL : undefined,
      voiceName: SELECTED_VOICE.name,
      voiceValidated: SELECTED_VOICE.validated,
    };
    writeFileSync(join(OUT, `demo-${d.id}.json`), JSON.stringify({ ...payload, title: d.title }, null, 1));
    index.push({ id: d.id, title: d.title, lang: d.lang, region: d.region, crop: d.crop, replayOf: d.asOf, recordedAt: r.generatedAt, fictionalReports: d.fictionalReports ? true : undefined });
    console.log(`demo-${d.id} : ${Math.round(r.audio.length / 1024)} Ko, ${r.lines.length} lignes (${r.source})${plan.localReports?.length ? `, signalements : ${JSON.stringify(plan.localReports)}` : ""}`);
  }
  writeFileSync(join(OUT, "demo-index.json"), JSON.stringify(index, null, 1));
})();
