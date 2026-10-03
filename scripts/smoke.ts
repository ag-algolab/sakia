// Contrôle de bout en bout d'un déploiement (production par défaut) : pages, API, cohérence voix/écran, protections.
// Ne dépense aucun crédit : n'appelle jamais une route qui fabrique de la voix à la demande (les messages courts testés sont ceux
// préparés à l'avance, en `prefetch=1`).
// Lancer : npx tsx scripts/smoke.ts [https://sakia-opal.vercel.app]

const BASE = (process.argv[2] ?? "https://sakia-opal.vercel.app").replace(/\/$/, "");
const results: { ok: boolean; name: string; detail: string; ms: number }[] = [];

async function get(path: string, init?: RequestInit): Promise<{ res: Response; ms: number }> {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { ...init, signal: AbortSignal.timeout(30000), redirect: "manual" });
  return { res, ms: Date.now() - t0 };
}

async function check(name: string, fn: () => Promise<string>) {
  const t0 = Date.now();
  try {
    const detail = await fn();
    results.push({ ok: true, name, detail, ms: Date.now() - t0 });
  } catch (e) {
    results.push({ ok: false, name, detail: (e as Error).message, ms: Date.now() - t0 });
  }
}

function must(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

type PlanJson = {
  today: string;
  status: string;
  days: { date: string; action: string }[];
  confidence: { level: string; askAPerson: boolean; reasons: string[]; notes?: string[] };
  summary: { rainExpectedMm: number };
};

(async () => {
  // 1) pages
  for (const p of ["/", "/bulletin", "/call", "/call/talk", "/phone", "/about", "/backtest", "/offline"]) {
    await check(`page ${p}`, async () => {
      const { res, ms } = await get(p);
      must(res.status === 200, `HTTP ${res.status}`);
      const html = await res.text();
      must(html.length > 2000, `page trop courte (${html.length} o)`);
      return `${Math.round(html.length / 1024)} Ko, ${ms} ms`;
    });
  }
  for (const [p, type] of [["/manifest.webmanifest", "json"], ["/sw.js", "javascript"]] as const) {
    await check(`fichier ${p}`, async () => {
      const { res } = await get(p);
      must(res.status === 200, `HTTP ${res.status}`);
      must((res.headers.get("content-type") ?? "").includes(type), `type ${res.headers.get("content-type")}`);
      return "ok";
    });
  }

  // 2) catalogue
  let crops: string[] = [];
  await check("catalogue", async () => {
    const { res } = await get("/api/catalog");
    must(res.status === 200, `HTTP ${res.status}`);
    const j = (await res.json()) as { crops: { id: string }[]; regions: { id: string }[] };
    crops = j.crops.map((c) => c.id);
    must(crops.length === 18, `${crops.length} cultures (18 attendues)`);
    must(j.regions.length === 24, `${j.regions.length} régions (24 attendues)`);
    return "18 cultures, 24 régions";
  });

  // 3) plans : garde-fou cohérent pour chaque culture, dernier arrosage inconnu puis connu
  const plans = new Map<string, PlanJson>();
  for (const crop of crops) {
    await check(`plan ${crop} (arrosage inconnu)`, async () => {
      const { res, ms } = await get(`/api/plan?region=kairouan&crop=${crop}`);
      must(res.status === 200, `HTTP ${res.status}`);
      const p = (await res.json()) as PlanJson;
      if (p.status === "hors_vegetation") return `hors saison (aucun conseil d'arrosage), ${ms} ms`; // pas de dernier arrosage à demander
      must(p.confidence.askAPerson, "dernier arrosage inconnu : « pas sûr » attendu");
      must(p.confidence.reasons.includes("unknown_last_irrigation"), `raisons : ${p.confidence.reasons.join(",")}`);
      return `${p.confidence.level}, ${ms} ms`;
    });
    await check(`plan ${crop} (arrosé il y a 3 jours)`, async () => {
      const { res } = await get(`/api/plan?region=kairouan&crop=${crop}&ago=3`);
      must(res.status === 200, `HTTP ${res.status}`);
      const p = (await res.json()) as PlanJson;
      plans.set(crop, p);
      if (p.status === "hors_vegetation") return "hors saison";
      must(p.days.length > 0 || p.confidence.level === "none", "aucun jour dans le plan");
      const analogy = p.confidence.reasons.includes("analogy_coefficients");
      if (p.confidence.level === "ok") must(!p.confidence.askAPerson, "niveau ok mais « pas sûr »");
      if (analogy) must(p.confidence.askAPerson, "coefficients par analogie : « pas sûr » attendu");
      return `${p.status}, ${p.confidence.level}, ${p.days.filter((d) => d.action === "irriguer").length} arrosage(s)`;
    });
  }

  const off = [...plans].filter(([, p]) => p.status === "hors_vegetation").map(([c]) => c);
  console.log(`Cultures hors saison à la date du contrôle (aucun conseil d'arrosage) : ${off.length}/${plans.size} — ${off.join(", ")}
`);

  // 4) la voix du message court dit la même chose que le plan (niveau et jour)
  for (const crop of ["olivier", "piment", "tomate"]) {
    await check(`voix ${crop} cohérente avec le plan`, async () => {
      const q = `region=kairouan&crop=${crop}&lang=aeb&soil=limoneux&system=goutte`;
      const [{ res: plan }, { res: voice, ms }] = await Promise.all([get(`/api/plan?region=kairouan&crop=${crop}&soil=limoneux&system=goutte`), get(`/api/advice?${q}&prefetch=1`)]);
      must(voice.status === 200, `voix HTTP ${voice.status}`);
      must((voice.headers.get("content-type") ?? "") === "audio/mpeg", `type ${voice.headers.get("content-type")}`);
      const size = (await voice.arrayBuffer()).byteLength;
      must(size > 20000 && size < 160000, `taille ${size} o`);
      const p = (await plan.json()) as PlanJson;
      must(voice.headers.get("x-advice-level") === p.confidence.level, `niveau voix ${voice.headers.get("x-advice-level")} ≠ plan ${p.confidence.level}`);
      must(voice.headers.get("x-advice-today") === p.today, `jour voix ${voice.headers.get("x-advice-today")} ≠ plan ${p.today}`);
      return `${Math.round(size / 1024)} Ko, ${ms} ms, niveau ${p.confidence.level}`;
    });
  }

  // 5) protections (aucune ne doit répondre 200)
  const refused = async (name: string, path: string, init?: RequestInit, ok: number[] = [400, 401, 403, 404, 405, 503]) =>
    check(name, async () => {
      const { res } = await get(path, init);
      must(ok.includes(res.status), `HTTP ${res.status} (attendu ${ok.join("/")})`);
      return `HTTP ${res.status}`;
    });
  await refused("tâche du matin (voix) sans clé", "/api/advice/pregen", undefined, [403, 503]);
  await refused("envoi quotidien Telegram sans clé", "/api/telegram/daily", undefined, [403, 503]);
  await refused("webhook Telegram sans secret", "/api/telegram", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }, [401, 403, 404, 405]);
  await refused("rapport de pluie sans jeton serveur", "/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ regionId: "kairouan", level: "light", reporter: "smoke-test-without-token" }) }, [400, 401, 403]);
  await refused("message court avec une date quelconque", "/api/advice?region=kairouan&crop=olivier&asOf=2026-05-01", undefined, [400]);
  await refused("région inconnue", "/api/advice?region=zzz&crop=olivier", undefined, [400]);

  // 6) rapport
  const bad = results.filter((r) => !r.ok);
  const w = Math.max(...results.map((r) => r.name.length));
  for (const r of results) console.log(`${r.ok ? "OK  " : "ÉCHEC"}  ${r.name.padEnd(w)}  ${r.detail}`);
  const avg = Math.round(results.reduce((s, r) => s + r.ms, 0) / results.length);
  console.log(`\n${results.length - bad.length}/${results.length} contrôles réussis sur ${BASE} (moyenne ${avg} ms)`);
  process.exit(bad.length ? 1 : 0);
})();
