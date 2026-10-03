// Mesure la part de phrases comprises : npx tsx src/lib/sms/measure.ts
// Jeu de phrases : src/lib/sms/testset.ts (écrit à la main, pas recueilli sur le terrain).

import { scoreTestset } from "./testset";

const s = scoreTestset();
for (const r of s.results.filter((x) => !x.ok)) console.log(`NON COMPRIS  « ${r.case.text} »  attendu ${JSON.stringify(r.case.expect)}  obtenu ${r.got}${r.case.note ? `  (${r.case.note})` : ""}`);
console.log("");
for (const [g, v] of Object.entries(s.byGroup)) console.log(`${g.padEnd(9)} ${v.ok}/${v.total}  (${Math.round((100 * v.ok) / v.total)} %)`);
console.log(`${"total".padEnd(9)} ${s.ok}/${s.total}  (${Math.round((100 * s.ok) / s.total)} %)`);
console.log("Phrases écrites à la main par l'équipe : ce n'est pas une mesure sur le terrain.");
