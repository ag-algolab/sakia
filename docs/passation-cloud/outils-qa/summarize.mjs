import fs from "node:fs";
const tag = process.argv[2] ?? "base";
const rep = JSON.parse(fs.readFileSync(`shots/${tag}/report.json`, "utf8"));
const v = (e) => `${e.page} ${e.lang}/${e.vp}`;

console.log("=== ERREURS DE CHARGEMENT / CONSOLE ===");
let any = false;
for (const e of rep) {
  if (e.error) { console.log("✗", v(e), e.error); any = true; }
  if (e.console?.length) { console.log("console", v(e), "→", e.console.join(" | ")); any = true; }
  if (e.failedRequests?.length) { console.log("http>=400", v(e), "→", e.failedRequests.join(" | ")); any = true; }
}
if (!any) console.log("(aucune)");

console.log("\n=== DÉBORDEMENT HORIZONTAL ===");
any = false;
for (const e of rep) {
  if (e.overflow?.scrolls || e.overflow?.offenders?.length) {
    any = true;
    console.log(v(e), `vw=${e.overflow.vw} scrollWidth=${e.overflow.sw}`, e.overflow.offenders.slice(0, 4).map((o) => `${o.tag}.${o.cls.split(" ").slice(0, 3).join(".")} [${o.left}..${o.right}] "${o.text}"`).join(" ;; "));
  }
}
if (!any) console.log("(aucun)");

console.log("\n=== STRUCTURE (html lang/dir, <main>, <h1>) ===");
for (const e of rep) {
  const s = e.structure; if (!s) continue;
  console.log(v(e).padEnd(28), `lang=${s.htmlLang} dir=${s.htmlDir} main×${s.mains} h1×${s.h1.length}`, s.title ? `title="${s.title.slice(0, 40)}"` : "", s.imgNoAlt ? `img sans alt: ${s.imgNoAlt}` : "");
}

console.log("\n=== AXE : règles violées (toutes vues) ===");
const byRule = new Map();
for (const e of rep) for (const a of e.axe ?? []) {
  const r = byRule.get(a.id) ?? { impact: a.impact, help: a.help, views: [], nodes: 0, ex: a };
  r.views.push(v(e)); r.nodes += a.n; byRule.set(a.id, r);
}
for (const [id, r] of [...byRule].sort((a, b) => ({ critical: 0, serious: 1, moderate: 2, minor: 3 }[a[1].impact] - { critical: 0, serious: 1, moderate: 2, minor: 3 }[b[1].impact]))) {
  console.log(`[${r.impact}] ${id} — ${r.help} | ${r.views.length} vue(s), ${r.nodes} nœud(s)`);
  console.log("     ex:", r.ex.targets.join(" ; "), "→", r.ex.fail.join(""));
  console.log("     vues:", [...new Set(r.views)].slice(0, 6).join(", "));
}

console.log("\n=== CIBLES TACTILES < 40 px (mobile) ===");
for (const e of rep) if (e.vp === "mobile" && e.smallTargets?.length) console.log(v(e).padEnd(26), e.smallTargets.map((t) => `${t.tag}"${t.text}"${t.w}×${t.h}`).join(" , "));
