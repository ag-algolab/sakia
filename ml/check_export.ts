// Vérifie que le rejoueur TypeScript (src/lib/ml/catboost.ts) donne les mêmes prédictions que CatBoost sur le VRAI modèle M1.
// Lancer depuis la racine : node node_modules/tsx/dist/cli.mjs ml/check_export.ts
import { readFileSync } from "node:fs";
import { predict } from "../src/lib/ml/catboost";
const model = JSON.parse(readFileSync("ml/results/m1_compact.json", "utf8"));
const exp = JSON.parse(readFileSync("ml/results/m1_expected.json", "utf8")) as { rows: Record<string, number>[]; expected: number[] };
let worst = 0;
exp.rows.forEach((r, i) => (worst = Math.max(worst, Math.abs(predict(model, r) - exp.expected[i]))));
console.log(`${exp.rows.length} lignes, ${model.trees.length} arbres : écart maximal navigateur vs CatBoost = ${worst.toExponential(2)} mm/jour`);
process.exit(worst < 1e-3 ? 0 : 1);
