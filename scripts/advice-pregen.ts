// Prépare les messages courts (bouton « écouter » de l'accueil) avec la météo du jour et les range dans Supabase Storage.
// Ce que fait aussi la tâche planifiée du matin (/api/advice/pregen) ; ce script sert à le lancer à la main.
// Lancer : node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/advice-pregen.ts [--dry] [--lang=aeb,fr,ar]
//   --dry : ne dépense rien, compte seulement ce qui reste à préparer.

import { pregenerate } from "../src/lib/advice/clip";
import { isVoiceLang } from "../src/lib/voice/langs";
import type { VoiceLang } from "../src/lib/voice/langs";

(async () => {
  const dry = process.argv.includes("--dry");
  const langArg = process.argv.find((a) => a.startsWith("--lang="))?.slice(7);
  const langs = langArg ? (langArg.split(",").filter(isVoiceLang) as VoiceLang[]) : undefined;
  const rep = await pregenerate({ maxMs: 8 * 60 * 1000, concurrency: 5, dryRun: dry, langs });
  console.log(JSON.stringify(rep, null, 2));
  if (dry) console.log(`(à blanc) ${rep.distinctTexts - rep.alreadyStored} message(s) à préparer, ≈ ${rep.chars} caractères ≈ ${Math.round(rep.chars * 0.12)} crédits`);
})().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
