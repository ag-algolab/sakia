// Tous les chiffres de la page Preuve, culture par culture : y en a-t-il d'aberrants ?
const crops = ["ble","orge","tomate","piment","pomme-de-terre","pasteque","melon","oignon","sorgho","olivier","amandier","pistachier","vigne","oranger","dattier","grenadier","figuier","luzerne"];
const region = process.argv[2] || "kairouan";
const rows = [];
for (const c of crops) {
  try {
    const r = await fetch(`http://localhost:3100/api/backtest?region=${region}&crop=${c}`, { signal: AbortSignal.timeout(60000) });
    if (!r.ok) { rows.push({ c, err: r.status }); continue; }
    const d = await r.json();
    const s = d.summary;
    rows.push({ c, seasons: s.seasons, fixedMm: Math.round(s.meanGrossFixed), advMm: Math.round(s.meanGrossAdaptive), saved: Math.round(s.waterSavedPct * 10) / 10, stressFixed: Math.round(s.meanStressDaysFixed * 10) / 10, stressAdv: Math.round(s.meanStressDaysAdaptive * 10) / 10, yFixed: s.meanRelYieldFixed != null ? Math.round(s.meanRelYieldFixed * 100) : null, yAdv: s.meanRelYieldAdaptive != null ? Math.round(s.meanRelYieldAdaptive * 100) : null, fixedEvery: s.fixedEveryDays });
  } catch (e) { rows.push({ c, err: String(e).slice(0, 60) }); }
}
console.table(rows);
