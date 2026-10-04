// Garde-fou : chaque phrase d'hypothèse écrite par le moteur (planCore.ts, backtest.ts) doit être reconnue par
// src/components/ui/assumptionsText.ts, sinon l'écran anglais ou arabe la montrerait en français.
// Test à blanc : aucune météo réelle (prévision synthétique), aucun réseau.
// Usage : npx tsx scripts/assumptions-check.ts

import { computePlan } from "../src/lib/planCore";
import type { PlanRequest } from "../src/lib/planCore";
import { backtestAssumptions } from "../src/lib/backtest";
import { CROPS } from "../src/lib/crops";
import { REGIONS } from "../src/lib/regions";
import { DICTS, translate } from "../src/components/ui/i18n";
import type { Lang } from "../src/components/ui/i18n";
import { RULES, localizeAssumption } from "../src/components/ui/assumptionsText";

const LANGS: Lang[] = ["fr", "en", "ar", "aeb"];
const fmtNum = (n: number) => String(n);
const fmtDate = (iso: string) => iso;

function forecast(today: string, days: number) {
  const out = [];
  for (let i = -7; i < days; i++) {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    out.push({ date: d.toISOString().slice(0, 10), et0: 5.5, rain: i === 3 ? 4 : 0, tmax: 33, tmin: 21, rainProb: 20 });
  }
  return { days: out, today, fetchedAt: new Date().toISOString(), source: "open-meteo" as const };
}

const seen = new Set<string>();
let failed = 0;
function check(label: string, sentences: string[]) {
  for (const s of sentences) {
    seen.add(s);
    for (const lang of LANGS) {
      const r = localizeAssumption(s, { lang, t: (k, v) => translate(lang, k, v), fmtNum, fmtDate });
      const ok = r.translated && r.text !== "" && !/\{\w+\}/.test(r.text) && (lang === "fr" || r.text !== s);
      if (!ok) {
        failed++;
        console.log(`ÉCHEC [${lang}] ${label} : ${s}\n         → ${r.text}`);
      }
    }
  }
}

const today = "2026-07-17";
const regionId = REGIONS[0].id;
const scenarios: { label: string; crop: string; req: Partial<PlanRequest>; horizon?: number; replay?: boolean }[] = [
  { label: "plan en direct, culture annuelle", crop: "tomate", req: {} },
  { label: "plan en direct, arbres, goutte", crop: "olivier", req: { soil: "sableux", system: "aspersion" } },
  { label: "plan en direct, gravitaire, sol argileux", crop: "ble", req: { soil: "argileux", system: "gravitaire" } },
  { label: "rejeu", crop: "tomate", req: { asOf: today } },
  { label: "horizon au-delà de la prévision", crop: "olivier", req: {}, horizon: 3 },
];
for (const c of CROPS) scenarios.push({ label: `culture ${c.id}`, crop: c.id, req: {} });
for (const sc of scenarios) {
  const plan = computePlan({ regionId, cropId: sc.crop, ...sc.req } as PlanRequest, forecast(today, sc.horizon ?? 16), sc.label.includes("au-delà") ? { today, estimatedFrom: "2026-07-20" } : { today });
  check(sc.label, plan.assumptions);
}
for (const every of [7, 10]) for (const status of ["a_verifier", "ok"]) check(`preuve (${every} j, ${status})`, backtestAssumptions(every, status));

const unused = RULES.filter((r) => ![...seen].some((s) => r.re.test(s)));
for (const r of unused) {
  failed++;
  console.log(`ÉCHEC règle jamais utilisée (phrase du moteur changée ?) : ${r.key}`);
}
for (const lang of LANGS) {
  for (const r of RULES) if (!(r.key in DICTS[lang])) { failed++; console.log(`ÉCHEC clé ${r.key} absente en ${lang}`); }
}
console.log(`${seen.size} phrases du moteur, ${RULES.length} règles, 4 langues : ${failed === 0 ? "TOUT EST RECONNU ET TRADUIT" : failed + " ÉCHEC(S)"}`);
process.exit(failed === 0 ? 0 : 1);
