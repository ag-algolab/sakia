// Génère le même court texte (français puis arabe) avec chacune des 4 voix tunisiennes candidates,
// avec quatre modèles (v2, v3, v4, v4t = v4 turbo), pour que l'on choisisse à l'oreille.
// Lancer : node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/voice-samples.ts
// Un fichier déjà présent n'est jamais regénéré. La consommation de chaque modèle est affichée à la fin
// (en-tête « character-cost » de la réponse quand il existe, sinon nombre de caractères envoyés).

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addSharedVoice, listMyVoices, subscription, ttsWithTimestamps } from "../src/lib/voice/elevenlabs";
import { CANDIDATES, SAMPLE_TEXT } from "../src/lib/voice/voices";

const MODELS = [
  { key: "v2", id: "eleven_multilingual_v2" },
  { key: "v3", id: "eleven_v3" },
  { key: "v4", id: "eleven_v4" },
  { key: "v4t", id: "eleven_v4_turbo" },
];
// Plafond de crédits pour une exécution du script (nouveaux échantillons seulement) : on s'arrête avant de le dépasser.
const RUN_BUDGET = Number(process.env.SAMPLES_BUDGET || 5000);
const LABEL = { fr: "Français", ar: "العربية (فصحى)", aeb: "الدارجة التونسية", en: "English", ko: "한국어" } as const;
const OUT = join(process.cwd(), "public", "audio", "samples");

(async () => {
  mkdirSync(OUT, { recursive: true });
  const before = await subscription();
  const mine = new Set((await listMyVoices()).map((v) => v.voice_id));

  for (const c of CANDIDATES) {
    if (!mine.has(c.voiceId)) {
      console.log(`ajout de la voix ${c.name} au compte`);
      await addSharedVoice(c.publicOwnerId, c.voiceId, `Sakia - ${c.name}`);
    }
  }

  const rows: string[] = [];
  const rimaRows: string[] = [];
  const used: Record<string, { chars: number; cost: number | null; files: number }> = {};
  let spent = 0;
  for (const c of CANDIDATES) {
    // français et arabe pour toutes les voix ; anglais et coréen seulement pour la voix retenue (Rima M)
    const langs = c.key === "rima" ? (["fr", "ar", "aeb", "en", "ko"] as const) : (["fr", "ar"] as const);
    for (const lang of langs) {
      for (const m of MODELS) {
        const file = `${c.key}-${m.key}-${lang}.mp3`;
        const path = join(OUT, file);
        if (!existsSync(path)) {
          const chars = SAMPLE_TEXT[lang].length;
          // coût attendu : ratio crédits/caractères déjà observé pour ce modèle, sinon 1 par caractère
          const seen = used[m.key];
          const ratio = seen && seen.cost != null && seen.chars > 0 ? seen.cost / seen.chars : 1;
          if (spent + chars * ratio > RUN_BUDGET) {
            console.log(`${file} : IGNORÉ, plafond de ${RUN_BUDGET} crédits atteint (${spent} déjà dépensés)`);
            continue;
          }
          try {
            const { audio, cost } = await ttsWithTimestamps(SAMPLE_TEXT[lang], c.voiceId, m.id);
            writeFileSync(path, audio);
            const u = (used[m.key] ??= { chars: 0, cost: 0, files: 0 });
            u.chars += chars;
            u.files += 1;
            u.cost = u.cost == null || cost == null ? null : u.cost + cost;
            spent += cost ?? chars;
            console.log(`${file} : ${Math.round(audio.length / 1024)} Ko, ${chars} caractères, coût déclaré ${cost ?? "n/d"}`);
          } catch (e) {
            console.log(`${file} : ÉCHEC ${(e as Error).message}`);
            continue;
          }
        }
        const row = `<tr><td>${c.name}</td><td>${m.key}</td><td>${LABEL[lang]}</td><td><audio controls preload="none" src="${file}"></audio></td></tr>`;
        rows.push(row);
        if (c.key === "rima") rimaRows.push(row);
      }
    }
  }

  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Échantillons de voix Sakia</title>
<style>body{font-family:system-ui;max-width:760px;margin:2rem auto;padding:0 1rem}td{padding:.4rem .6rem;border-bottom:1px solid #ddd}</style>
<h1>Échantillons de voix</h1>
<p>Même texte pour chaque voix, en français puis en arabe standard. <b>v2</b> = eleven_multilingual_v2, <b>v3</b> = eleven_v3, <b>v4</b> = eleven_v4, <b>v4t</b> = eleven_v4_turbo.</p>
<p>Texte français : « ${SAMPLE_TEXT.fr} »</p><p dir="rtl">${SAMPLE_TEXT.ar}</p><p dir="rtl">Darija : ${SAMPLE_TEXT.aeb}</p><p>English: “${SAMPLE_TEXT.en}”</p><p>한국어: ${SAMPLE_TEXT.ko}</p>
<table>${rows.join("\n")}</table>`;
  writeFileSync(join(OUT, "index.html"), html);
  // voix retenue (Rima M) : comparaison des quatre modèles seulement
  const rimaSorted = [...rimaRows].sort();
  writeFileSync(join(OUT, "rima.html"), html.replace("Échantillons de voix</h1>", "Rima M : comparer les modèles</h1>").replace(/<table>[\s\S]*<\/table>/, `<table>${rimaSorted.join("\n")}</table>`));

  // le compteur du compte peut mettre quelques secondes à se mettre à jour
  await new Promise((r) => setTimeout(r, 8000));
  const after = await subscription();
  console.log("\nConsommation par modèle (nouveaux échantillons de cette exécution) :");
  for (const [k, u] of Object.entries(used)) {
    console.log(`  ${k} : ${u.files} fichiers, ${u.chars} caractères envoyés, crédits déclarés par l'API : ${u.cost ?? "n/d"}`);
  }
  console.log(`Estimation de cette exécution : ${spent} crédits (plafond ${RUN_BUDGET}).`);
  console.log(`Compteur du compte : ${before.used} -> ${after.used} sur ${after.limit}.`);
  console.log("À écouter : http://localhost:3000/audio/samples/index.html");
})();
