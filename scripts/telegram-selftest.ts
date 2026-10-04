// Test à blanc de la conversation : fausse API Telegram, fausse base en mémoire, vrai moteur et vraie météo.
// Usage : npx tsx scripts/telegram-selftest.ts

import { handleUpdate } from "../src/lib/telegram/bot";
import type { Deps } from "../src/lib/telegram/bot";
import { computePlan } from "../src/lib/telegram/bot";
import { RateLimiter } from "../src/lib/telegram/ratelimit";
import { agoKeyboard, cropKeyboard, langKeyboard, parseAction, planKeyboard, regionKeyboard } from "../src/lib/telegram/keyboards";
import type { Plan } from "../src/lib/plan";
import type { Subscriber } from "../src/lib/telegram/store";
import type { InlineKeyboard } from "../src/lib/telegram/types";

type Sent = { kind: string; text: string; markup?: InlineKeyboard };
let out: Sent[] = [];
const rows = new Map<number, Subscriber>();

let planCalls = 0;
let withVoice = false;
let heard = null as { text: string; language?: "fr" | "ar" | "en" } | null;
// modifie le vrai plan pour simuler un cas du garde-fou
let planOverride = null as ((p: Plan) => Plan) | null;

const deps: Deps = {
  api: {
    async sendMessage(_c, text, markup) { out.push({ kind: "send", text, markup }); },
    async editMessage(_c, _m, text, markup) { out.push({ kind: "edit", text, markup }); },
    async answerCallback(_id, text) { out.push({ kind: "answer", text: text ?? "" }); },
    async sendChatAction() {},
    async sendAudio(_c, _a, mime, caption) { out.push({ kind: "audio", text: `${mime} ${caption}` }); },
    async downloadFile() { return { data: Buffer.from("fake"), mime: "audio/ogg" }; },
  },
  store: {
    async get(id) { return rows.get(id) ?? null; },
    async upsert(id, patch) {
      const cur = rows.get(id) ?? { chat_id: id, lang: "fr", region_id: "kairouan", crop_id: "olivier", soil: "limoneux", system: "goutte", last_irrigation: null, daily_bulletin: true };
      const next = { ...cur, ...patch } as Subscriber;
      rows.set(id, next);
      return next;
    },
    async remove(id) { rows.delete(id); },
    async listDaily() { return [...rows.values()].filter((r) => r.daily_bulletin); },
  },
  synth: async () => (withVoice ? { audio: Buffer.from("mp3"), mime: "audio/mpeg" } : null),
  stt: async () => { if (!heard) throw new Error("panne"); return heard; },
  limiter: new RateLimiter(),
  voiceLimiter: new RateLimiter(10, 3_600_000),
  plan: async (sub, f) => {
    planCalls++;
    const p = await computePlan(sub, f);
    return planOverride ? planOverride(p) : p;
  },
};

let n = 0;
let failures = 0;
const check = (ok: boolean, label: string) => {
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "FAIL"} ${label}`);
};

const chat = { id: 4242, type: "private" };
const say = async (text: string) => { out = []; deps.limiter = new RateLimiter(); await handleUpdate({ update_id: ++n, message: { message_id: n, chat, text, date: 0 } }, deps); return out; };
const speak = async (duration = 5) => { out = []; deps.limiter = new RateLimiter(); await handleUpdate({ update_id: ++n, message: { message_id: n, chat, voice: { file_id: "f", duration }, date: 0 } }, deps); return out; };
const press = async (data: string) => { out = []; deps.limiter = new RateLimiter(); await handleUpdate({ update_id: ++n, callback_query: { id: `cb${n}`, from: { id: chat.id }, data, message: { message_id: 1, chat, date: 0 } } }, deps); return out; };
const show = (label: string, msgs: Sent[]) => { console.log(`\n--- ${label} ---`); for (const m of msgs) console.log(`[${m.kind}] ${m.text}`); };

async function main() {
  // claviers
  const all: InlineKeyboard[] = [langKeyboard("l"), langKeyboard("L"), regionKeyboard("fr"), regionKeyboard("ar"), cropKeyboard("ar", "sidi-bouzid"), agoKeyboard("ar", "sidi-bouzid", "pomme-de-terre"), planKeyboard("en")];
  all.push(planKeyboard("fr", { regionId: "sidi-bouzid", cropId: "pomme-de-terre" }));
  const buttons = all.flatMap((k) => k.inline_keyboard.flat());
  check(buttons.every((b) => Buffer.byteLength(b.callback_data) <= 64), "données des boutons ≤ 64 octets");
  check(buttons.every((b) => parseAction(b.callback_data) !== null), "toutes les données de boutons sont reconnues");
  check(regionKeyboard("fr").inline_keyboard.flat().length === 24, "24 gouvernorats");
  check(cropKeyboard("fr", "kairouan").inline_keyboard.flat().length === 18, "18 cultures");
  check(parseAction("r:fr:atlantide") === null && parseAction("n'importe quoi") === null, "données inconnues refusées");

  // parcours complet : /start → langue → région → culture → arrosage → plan (4 touches après /start)
  let m = await say("/start");
  show("/start", m);
  check(m.length === 1 && m[0].markup?.inline_keyboard[0].length === 3, "/start propose 3 langues");
  m = await press("l:fr");
  check(m.some((x) => x.kind === "edit" && x.markup?.inline_keyboard.flat().length === 24), "langue → 24 régions");
  m = await press("r:fr:kairouan");
  check(m.some((x) => x.kind === "edit" && x.markup?.inline_keyboard.flat().length === 18), "région → 18 cultures");
  m = await press("c:fr:kairouan:olivier");
  check(m.some((x) => x.kind === "edit" && x.markup?.inline_keyboard.length === 5), "culture → 5 réponses d'arrosage");
  check(!rows.has(chat.id), "rien n'est stocké avant la fin de la configuration");
  m = await press("a:fr:kairouan:olivier:2");
  show("plan (fr)", m);
  const plan = m.find((x) => x.kind === "send");
  check(!!plan && /indicatif/i.test(plan.text), "le plan affiche « conseil indicatif »");
  check(!!plan && /mises? à jour/i.test(plan.text), "le plan affiche la date de mise à jour");
  check(plan?.markup?.inline_keyboard.length === 4, "boutons sous le plan (bulletin, mise à jour, arrosé, changer)");
  check(rows.get(chat.id)?.crop_id === "olivier" && rows.get(chat.id)?.last_irrigation != null, "abonné enregistré");

  // actions et commandes
  show("voix (repli texte)", await press("act:voice"));
  m = await press("act:upd");
  check(m.some((x) => x.kind === "edit" || x.kind === "answer"), "mettre à jour répond");
  m = await press("act:irr");
  check(m.some((x) => x.kind === "edit") && rows.get(chat.id)?.last_irrigation === new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date()), "« j'ai arrosé » met à jour le dernier arrosage");
  check((await press("act:chg")).some((x) => x.kind === "send" && x.markup?.inline_keyboard.flat().length === 24), "changer région repart du choix de région");
  check((await say("/plan")).some((x) => x.kind === "send"), "/plan");
  check((await say("/bulletin")).some((x) => x.kind === "send" && /texte/.test(x.text)), "/bulletin (texte tant que la voix n'existe pas)");
  check((await say("/aide")).length === 1, "/aide");
  check((await say("bonjour")).length === 1, "texte libre → aide courte");
  m = await say("/stop");
  check(rows.get(chat.id)?.daily_bulletin === false, "/stop désactive le bulletin quotidien");
  await press("act:daily");
  check(rows.get(chat.id)?.daily_bulletin === true, "réactivation");

  // langues
  for (const lang of ["ar", "en"] as const) {
    await press(`L:${lang}`);
    m = await say("/plan");
    show(`plan (${lang})`, m);
    check(rows.get(chat.id)?.lang === lang && !!m[0], `plan en ${lang}`);
  }
  m = await press("a:ar:sidi-bouzid:pomme-de-terre:u");
  check(m.some((x) => x.kind === "send") && rows.get(chat.id)?.last_irrigation === null, "pomme de terre à Sidi Bouzid, arrosage inconnu → plan");

  // ---- garde-fou « pas sûr » (mise à jour n°1) ----
  const unsure = /Je ne suis pas sûr/;
  m = await press("a:fr:kairouan:olivier:u");
  let sent = m.find((x) => x.kind === "send")!;
  check(unsure.test(sent.text) && /dernier arrosage n'est pas connu/.test(sent.text), "arrosage inconnu → « Je ne suis pas sûr » avec la raison");
  check(sent.markup?.inline_keyboard.flat().filter((b) => b.callback_data.startsWith("a:fr:kairouan:olivier:")).length === 4, "arrosage inconnu → on le redemande avec 4 boutons");
  m = await press("a:fr:kairouan:olivier:0");
  sent = m.find((x) => x.kind === "send")!;
  check(!/dernier arrosage n'est pas connu/.test(sent.text) && !sent.markup?.inline_keyboard.flat().some((b) => b.callback_data.startsWith("a:")), "arrosage connu → plus de question");
  rows.get(chat.id)!.last_irrigation = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date(Date.now() - 10 * 86400000));
  sent = (await say("/plan")).find((x) => x.kind === "send")!;
  check(/dernier arrosage n'est pas connu/.test(sent.text), "dernier arrosage vieux de plus de 7 jours → traité comme inconnu");
  rows.get(chat.id)!.last_irrigation = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date());
  const before = planCalls;
  await press("act:upd");
  check(planCalls === before + 1, "« Mettre à jour » recalcule toujours le plan");

  // niveau « none » : aucun conseil, ni texte, ni voix, ni bulletin
  planOverride = (p) => ({ ...p, days: [], summary: { ...p.summary, irrigationCount: 0, nextIrrigation: undefined }, confidence: { level: "none", askAPerson: true, reasons: ["very_stale_data"] } });
  withVoice = true;
  m = await say("/plan");
  sent = m.find((x) => x.kind === "send")!;
  check(unsure.test(sent.text) && !/irriguer|attendre|irrigat/i.test(sent.text.split("\n").slice(1).join("\n").replace(/Je ne suis pas sûr.*/g, "")), "level none : aucun conseil dans le plan");
  m = await say("/bulletin");
  check(m.every((x) => x.kind !== "audio") && m.some((x) => unsure.test(x.text)) && !m.some((x) => /pas d'irrigation nécessaire/.test(x.text)), "level none : /bulletin sans audio et sans « pas d'irrigation nécessaire »");
  heard = { text: "zitoun kairouan", language: "ar" };
  m = await speak();
  check(m.every((x) => x.kind !== "audio"), "level none : question vocale sans audio");
  planOverride = null;

  // ---- question vocale (mise à jour n°1) ----
  withVoice = true;
  heard = { text: "zitoun kairouan", language: "ar" };
  m = await speak();
  show("voix : « zitoun kairouan » (arabe)", m);
  check(m[0]?.text.includes("zitoun kairouan") && m.some((x) => /الزيتون/.test(x.text)) && m.some((x) => x.kind === "audio"), "arabizi → plan en arabe, en texte et en voix");
  heard = { text: "زيتون القيروان", language: "ar" };
  check((await speak()).some((x) => /الزيتون/.test(x.text)), "arabe écrit → plan");
  heard = { text: "je voudrais arroser mes oliviers à Sidi Bouzid", language: "fr" };
  m = await speak();
  show("voix : oliviers à Sidi Bouzid (français)", m);
  check(m.some((x) => /Olivier · Sidi Bouzid/.test(x.text)), "français → plan de la bonne culture et de la bonne région");
  check(m.some((x) => x.markup?.inline_keyboard.flat().every((b) => b.callback_data.startsWith("a:"))), "autre culture → seuls les boutons d'arrosage");
  heard = { text: "battikh kairouan", language: "ar" };
  m = await speak();
  check(m.some((x) => x.markup?.inline_keyboard.flat().length === 2), "« battikh » → on demande pastèque ou melon");
  heard = { text: "blablabla", language: "fr" };
  m = await speak();
  check(m.length === 2 && /pas bien compris/.test(m[1].text), "phrase incomprise → message poli");
  heard = null;
  m = await speak();
  check(m.length === 1 && !/panne|Error/.test(m[0].text), "reconnaissance en panne → message poli sans trace");
  heard = { text: "olivier kairouan", language: "fr" };
  m = await speak(45);
  check(m.length === 1 && /30 secondes/.test(m[0].text), "message vocal de plus de 30 s refusé");
  deps.voiceLimiter = new RateLimiter(10, 3_600_000);
  for (let i = 0; i < 12; i++) await speak();
  m = await speak();
  check(/Trop de messages vocaux/.test(m[0]?.text ?? ""), "plus de 10 messages vocaux par heure refusés");
  deps.voiceLimiter = new RateLimiter(10, 3_600_000);
  m = await say("zitoun kairouan");
  check(m.length === 1 && !m[0].text.includes("🎙") && /الزيتون|Olivier/.test(m[0].text), "texte libre « zitoun kairouan » → plan");
  withVoice = false;

  // ---- l'aide et le menu ne parlent que des commandes qui existent ----
  await press("a:fr:kairouan:olivier:0");
  await press("L:fr");
  m = await say("/aide");
  const help = m[0]?.text ?? "";
  check(["/plan", "/bulletin", "/langue", "/stop", "/aide", "/start"].every((c) => help.includes(c)), "/aide liste /plan, /bulletin, /langue, /stop, /aide et /start");
  check(!/pluie|rain|☔/i.test(help), "/aide ne parle d'aucune commande de pluie");
  m = await say("/pluie");
  check(m.length === 1 && /\/aide/.test(m[0].text) && !m[0].markup, "/pluie n'est plus une commande : même réponse que pour toute commande inconnue");
  check(planKeyboard("fr").inline_keyboard.flat().every((b) => !/☔|rain|pluie/i.test(`${b.text} ${b.callback_data}`)), "aucun bouton de pluie sous le plan");
  check(parseAction("act:rain") === null && parseAction("rain:light") === null, "les anciennes données de boutons de pluie ne sont plus reconnues");
  m = await press("rain:light");
  check(m.length === 1 && m[0].kind === "answer" && m[0].text === "", "un ancien bouton de pluie, resté dans un vieux message, ne fait rien : simple accusé de réception, aucun texte");

  // suppression
  await press("act:del");
  check(!rows.has(chat.id), "suppression des données");
  m = await say("/plan");
  check(m.length === 1 && m[0].markup?.inline_keyboard[0].length === 3, "sans abonnement, /plan renvoie vers la configuration");

  // groupes et limite
  out = [];
  await handleUpdate({ update_id: ++n, message: { message_id: 1, chat: { id: -1, type: "group" }, text: "/start", date: 0 } }, deps);
  check(out.length === 0, "les groupes sont ignorés");
  const limited: Deps = { ...deps, limiter: new RateLimiter() };
  let replies = 0;
  for (let i = 0; i < 25; i++) {
    out = [];
    await handleUpdate({ update_id: ++n, message: { message_id: i, chat: { id: 777, type: "private" }, text: "/aide", date: 0 } }, limited);
    replies += out.length;
  }
  check(replies === 20, `limite : ${replies} réponses sur 25 messages (attendu 20)`);

  // base des abonnés en panne ou en pause : les questions en clair et l'aide continuent de marcher (robot joignable 24 h/24)
  const down: Deps = { ...deps, limiter: new RateLimiter(), store: { ...deps.store, get: async () => { throw new Error("base en pause"); } } };
  const sayDown = async (text: string) => { out = []; down.limiter = new RateLimiter(); await handleUpdate({ update_id: ++n, message: { message_id: n, chat, text, date: 0 } }, down); return out; };
  m = await sayDown("olivier kairouan");
  check(m.length >= 1 && m.some((x) => /Olivier · Kairouan/.test(x.text)) && !m.some((x) => /réessayer|problème|erreur/i.test(x.text)), "base en panne : « olivier kairouan » reçoit quand même son plan");
  m = await sayDown("/aide");
  check(m.length === 1 && ["/plan", "/aide"].every((c) => m[0].text.includes(c)), "base en panne : /aide répond");
  m = await sayDown("/plan");
  check(m.length === 1 && !/base en pause|Error/.test(m[0].text), "base en panne : /plan (qui a besoin de la mémoire) → message poli, sans trace");

  // erreur de base : message poli, sans trace
  const broken: Deps = { ...deps, limiter: new RateLimiter(), store: { ...deps.store, get: async () => { throw new Error("secret interne"); } } };
  out = [];
  await handleUpdate({ update_id: ++n, message: { message_id: 1, chat, text: "/plan", date: 0 } }, broken);
  check(out.length === 1 && !/secret interne|Error/.test(out[0].text), "erreur interne : message poli sans trace");

  console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
  process.exitCode = failures ? 1 : 0;
}

main();
