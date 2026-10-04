// Contrôle du film /story : on dessine chaque scène à chaque instant (toutes les 0,25 s) pour plusieurs états du conseil
// (arroser, attendre, pas sûr, hors saison, prévision courte, dernier arrosage inconnu, preuve vide) et on cherche
// tout ce qui ne doit jamais s'afficher : NaN, undefined, Infinity, [object. Aucun réseau, aucun crédit de voix.
// Lancer : npx tsx scripts/story-check.ts

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CUTS, SCENES, TOTAL, backdropAt, sceneOpacity } from "../src/components/story/timeline";
import { SNAPSHOT_DATA, buildFilmData } from "../src/components/story/data";
import type { FilmData } from "../src/components/story/data";
import Open from "../src/components/story/scenes/Open";
import Problem from "../src/components/story/scenes/Problem";
import Answer from "../src/components/story/scenes/Answer";
import Channels from "../src/components/story/scenes/Channels";
import Guard from "../src/components/story/scenes/Guard";
import Proof from "../src/components/story/scenes/Proof";
import Close from "../src/components/story/scenes/Close";
import { TECH_SCENES, TECH_TOTAL } from "../src/components/story/tech/timeline";
import TechIntro from "../src/components/story/tech/Intro";
import TechPipeline from "../src/components/story/tech/Pipeline";
import TechSmall from "../src/components/story/tech/Small";
import TechStack from "../src/components/story/tech/Stack";
import TechSafeguards from "../src/components/story/tech/Safeguards";

const VIEWS = [Open, Problem, Answer, Channels, Guard, Proof, Close];
const BAD = [/NaN/, /undefined/, /Infinity/, /\[object/];

const base = SNAPSHOT_DATA.plan;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const variants: { name: string; data: FilmData }[] = [
  { name: "arroser (copie du 3 oct.)", data: SNAPSHOT_DATA },
  {
    name: "attendre",
    data: buildFilmData(
      {
        ...clone(base),
        days: base.days.map((d) => ({ ...d, action: "attendre" as const, grossMm: 0, netMm: 0, m3PerHa: 0 })),
        summary: { ...base.summary, nextIrrigation: undefined, irrigationCount: 0, totalGrossMm: 0, totalM3PerHa: 0 },
      },
      true,
      SNAPSHOT_DATA.proof,
      true,
    ),
  },
  {
    name: "pas sûr (aucun conseil)",
    data: buildFilmData({ ...clone(base), confidence: { level: "none", askAPerson: true, reasons: ["very_stale_data"] } }, true, SNAPSHOT_DATA.proof, true),
  },
  { name: "hors saison", data: buildFilmData({ ...clone(base), status: "hors_vegetation", days: [] }, true, SNAPSHOT_DATA.proof, true) },
  { name: "prévision courte (3 jours)", data: buildFilmData({ ...clone(base), days: base.days.slice(0, 3) }, true, SNAPSHOT_DATA.proof, true) },
  {
    name: "dernier arrosage inconnu",
    data: buildFilmData({ ...clone(base), summary: { ...base.summary, daysSinceLastIrrigation: null } }, true, SNAPSHOT_DATA.proof, true),
  },
  { name: "preuve : un seul rang", data: buildFilmData(clone(base), true, [{ name: "Wheat", pct: 26.9 }], true) },
];

let problems = 0;
let frames = 0;
const fail = (msg: string) => {
  problems++;
  if (problems <= 40) console.log("  ✗", msg);
};

// 1. Les scènes, à chaque instant, pour chaque état.
for (const v of variants) {
  const before = problems;
  SCENES.forEach((s, i) => {
    for (let t = -0.5; t <= s.end - s.start + 0.5; t += 0.25) {
      frames++;
      let html = "";
      try {
        html = renderToStaticMarkup(createElement(VIEWS[i], { t, data: v.data }));
      } catch (e) {
        fail(`${v.name} · ${s.id} · t=${t.toFixed(2)} : exception ${(e as Error).message}`);
        continue;
      }
      for (const re of BAD) {
        const m = html.match(re);
        if (m) {
          const at = html.indexOf(m[0]);
          fail(`${v.name} · ${s.id} · t=${t.toFixed(2)} : « ${m[0]} » dans …${html.slice(Math.max(0, at - 70), at + 50).replace(/\s+/g, " ")}…`);
          break;
        }
      }
    }
  });
  console.log(`${problems === before ? "✓" : "✗"} ${v.name}`);
}

// 1b. Le film technique, à chaque instant (il n'a pas de données variables : un seul état).
{
  const before = problems;
  const views = [TechIntro, TechPipeline, TechSmall, TechStack, TechSafeguards];
  if (TECH_TOTAL > 60) fail(`film technique : ${TECH_TOTAL} s, au-dessus de la limite de 60 s du formulaire`);
  TECH_SCENES.forEach((s, i) => {
    for (let t = -0.5; t <= s.end - s.start + 0.5; t += 0.25) {
      frames++;
      try {
        const html = renderToStaticMarkup(createElement(views[i], { t, data: SNAPSHOT_DATA }));
        for (const re of BAD) if (re.test(html)) fail(`tech · ${s.id} · t=${t.toFixed(2)} : « ${re.source} » dans le rendu`);
      } catch (e) {
        fail(`tech · ${s.id} · t=${t.toFixed(2)} : exception ${(e as Error).message}`);
      }
    }
  });
  console.log(`${problems === before ? "✓" : "✗"} film technique (${TECH_TOTAL} s, limite 60 s)`);
}

// 2. La mécanique du temps : fond, fondus enchaînés, au moins une scène visible à chaque instant.
const before = problems;
for (let t = 0; t <= TOTAL + 0.001; t += 0.05) {
  const bg = backdropAt(t);
  if (/NaN|undefined/.test(bg)) fail(`fond invalide à t=${t.toFixed(2)} : ${bg}`);
  const ops = SCENES.map((_, i) => sceneOpacity(i, t));
  if (ops.some((o) => !(o >= 0 && o <= 1))) fail(`opacité hors [0,1] à t=${t.toFixed(2)} : ${ops.join(", ")}`);
  if (Math.max(...ops) < 0.5) fail(`écran presque vide à t=${t.toFixed(2)} : ${ops.map((o) => o.toFixed(2)).join(", ")}`);
}
console.log(`${problems === before ? "✓" : "✗"} fond et fondus enchaînés (0 à ${TOTAL} s)`);

// 3. Les coupes sont croissantes et la durée annoncée (97 s) est la vraie.
const sorted = CUTS.every((c, i) => i === 0 || c > CUTS[i - 1]);
if (!sorted) fail("les coupes ne sont pas croissantes");
if (Math.round(TOTAL) !== 97) fail(`durée ${TOTAL} s, alors que l'écran annonce 97 secondes`);

console.log(`\n${frames} images dessinées, ${problems} problème(s).`);
process.exit(problems === 0 ? 0 : 1);
