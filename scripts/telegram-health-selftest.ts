// Test à blanc du contrôle « 24 h/24 » du robot (src/lib/telegram/health.ts) : aucun appel réseau, Telegram et la base sont simulés.
// Vérifie chaque panne qu'on veut voir (jeton absent ou refusé, webhook absent ou sur un autre site, messages bloqués, erreur récente,
// base injoignable), le réenregistrement du webhook, et qu'aucun secret ne sort du résultat.
// Usage : npx tsx scripts/telegram-health-selftest.ts

import { botHealth, ensureWebhook } from "../src/lib/telegram/health";
import { webhookSecret } from "../src/lib/telegram/config";

const TOKEN = "123456:TEST-ONLY-NOT-A-REAL-TOKEN";
const HOST = "sakia-test.vercel.app";

type Scenario = {
  token?: boolean;
  refused?: boolean;
  webhookUrl?: string;
  pending?: number;
  lastErrorAgoS?: number;
  store?: "ok" | "down" | "no_table";
};

const calls: { method: string; body: Record<string, unknown> }[] = [];
let sc: Scenario = {};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  if (url.startsWith("http://supabase.mock/")) {
    if (sc.store === "down") return new Response("down", { status: 503 });
    if (sc.store === "no_table") return json({ code: "42P01", message: 'relation "public.subscribers" does not exist' }, 404);
    return json([]);
  }
  const m = url.match(/^https:\/\/api\.telegram\.org\/bot[^/]+\/(\w+)$/);
  if (!m) throw new Error(`appel réseau inattendu : ${url.replace(TOKEN, "***")}`);
  const method = m[1];
  const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
  calls.push({ method, body });
  if (sc.refused) return json({ ok: false, error_code: 401, description: "Unauthorized" }, 401);
  if (method === "getMe") return json({ ok: true, result: { username: "SakiaTestBot" } });
  if (method === "getWebhookInfo") {
    return json({
      ok: true,
      result: {
        url: sc.webhookUrl ?? "",
        pending_update_count: sc.pending ?? 0,
        ...(sc.lastErrorAgoS != null ? { last_error_date: Math.round(Date.now() / 1000) - sc.lastErrorAgoS, last_error_message: "Wrong response from the webhook: 500" } : {}),
      },
    });
  }
  return json({ ok: true, result: true });
}) as typeof fetch;

let failed = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "OK    " : "ÉCHEC "} ${name}${ok ? "" : ` — ${detail}`}`);
  if (!ok) failed++;
};
const has = (h: { problems: string[] }, re: RegExp) => h.problems.some((p) => re.test(p));

async function main() {
  process.env.SUPABASE_URL = "http://supabase.mock";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "dummy";

  // 1. tout va bien
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;
  sc = { webhookUrl: `https://${HOST}/api/telegram`, pending: 0, store: "ok" };
  let h = await botHealth(HOST);
  check("tout va bien : ok", h.ok && h.token === "valid" && h.webhook === "ok" && h.store === "ok" && h.bot === "@SakiaTestBot", JSON.stringify(h));
  const printed = JSON.stringify(h);
  check("aucun secret dans le résultat (jeton, secret du webhook, chemin complet)", !printed.includes(TOKEN) && !printed.includes(webhookSecret()) && !printed.includes("/api/telegram"), printed);

  // 2. jeton absent
  delete process.env.TELEGRAM_BOT_TOKEN;
  h = await botHealth(HOST);
  check("jeton absent : signalé, pas de plantage", !h.ok && h.token === "missing" && has(h, /jeton absent/), JSON.stringify(h));
  process.env.TELEGRAM_BOT_TOKEN = TOKEN;

  // 3. jeton refusé
  sc = { refused: true, store: "ok" };
  h = await botHealth(HOST);
  check("jeton refusé (401) : signalé", !h.ok && h.token === "refused" && has(h, /refusé/), JSON.stringify(h));

  // 4. webhook absent
  sc = { webhookUrl: "", store: "ok" };
  h = await botHealth(HOST);
  check("webhook absent : signalé", !h.ok && h.webhook === "missing" && has(h, /aucun webhook/), JSON.stringify(h));

  // 5. webhook sur un autre site
  sc = { webhookUrl: "https://autre-site.example/api/telegram", store: "ok" };
  h = await botHealth(HOST);
  check("webhook sur un autre site : signalé", !h.ok && h.webhook === "other_site" && has(h, /autre site/), JSON.stringify(h));
  check("… sans comparaison si l'adresse du site est inconnue (local)", (await botHealth(undefined)).webhook === "ok");

  // 6. messages bloqués + erreur récente
  sc = { webhookUrl: `https://${HOST}/api/telegram`, pending: 57, lastErrorAgoS: 120, store: "ok" };
  h = await botHealth(HOST);
  check("57 messages en attente : signalé", !h.ok && h.pending === 57 && has(h, /57 messages/), JSON.stringify(h));
  check("erreur d'envoi récente : signalée avec son âge", h.lastError?.ageSeconds === 120 && has(h, /dernière heure/), JSON.stringify(h));
  sc = { webhookUrl: `https://${HOST}/api/telegram`, pending: 0, lastErrorAgoS: 5 * 3600, store: "ok" };
  h = await botHealth(HOST);
  check("erreur d'il y a 5 h : ignorée (déjà réglée)", h.ok && !h.lastError, JSON.stringify(h));

  // 7. base des abonnés
  sc = { webhookUrl: `https://${HOST}/api/telegram`, store: "down" };
  h = await botHealth(HOST);
  check("base injoignable : signalée", !h.ok && h.store === "unreachable", JSON.stringify(h));
  sc = { webhookUrl: `https://${HOST}/api/telegram`, store: "no_table" };
  h = await botHealth(HOST);
  check("table absente : signalée", !h.ok && h.store === "table_missing", JSON.stringify(h));

  // 8. réenregistrement du webhook
  sc = { webhookUrl: "", store: "ok" };
  delete process.env.VERCEL_ENV;
  calls.length = 0;
  check("hors production : rien n'est touché", (await ensureWebhook(HOST)) === "skipped" && calls.length === 0);
  process.env.VERCEL_ENV = "production";
  calls.length = 0;
  const r = await ensureWebhook(HOST);
  const set = calls.find((c) => c.method === "setWebhook");
  check("webhook absent en production : réenregistré", r === "repaired" && !!set, JSON.stringify({ r, calls: calls.map((c) => c.method) }));
  check("… sur l'adresse du site, avec le secret et les bons types de messages", set?.body.url === `https://${HOST}/api/telegram` && set?.body.secret_token === webhookSecret() && JSON.stringify(set?.body.allowed_updates) === '["message","callback_query"]', JSON.stringify(set?.body));
  check("… et le menu des commandes remis", calls.some((c) => c.method === "setMyCommands"), JSON.stringify(calls.map((c) => c.method)));

  sc = { webhookUrl: "https://autre-site.example/api/telegram", store: "ok" };
  calls.length = 0;
  check("webhook déjà là (même vers un autre site) : jamais écrasé", (await ensureWebhook(HOST)) === "ok" && !calls.some((c) => c.method === "setWebhook"));

  sc = { refused: true };
  check("panne de Telegram : ne lève rien", (await ensureWebhook(HOST)) === "failed");

  console.log(failed === 0 ? "\nTOUS LES CONTRÔLES PASSENT" : `\n${failed} CONTRÔLE(S) EN ÉCHEC`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
