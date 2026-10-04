// Test à blanc de la conversation : fausse API Telegram, fausse base en mémoire, vrai moteur et vraie météo.
// Usage : npx tsx scripts/telegram-selftest.ts

import { handleUpdate } from "../src/lib/telegram/bot";
import type { Deps } from "../src/lib/telegram/bot";
import { computePlan } from "../src/lib/telegram/bot";
import { RateLimiter } from "../src/lib/telegram/ratelimit";
import { agoKeyboard, cropKeyboard, langKeyboard, parseAction, planKeyboard, rainKeyboard, regionKeyboard } from "../src/lib/telegram/keyboards";
import type { Plan } from "../src/lib/plan";
import { reporterHash } from "../src/lib/reports";
import type { Subscriber } from "../src/lib/telegram/store";
import type { InlineKeyboard } from "../src/lib/telegram/types";

type Sent = { kind: string; text: string; markup?: InlineKeyboard };
let out: Sent[] = [];
const rows = new Map<number, Subscriber>();

// faux « rapports de pluie » en mémoire (même empreinte anonyme que le vrai code)
type FakeRow = { region: string; day: string; mm: number; level: string; token: string };
const fakeRows: FakeRow[] = [];
let reportsDown = false;
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
  reportLimiter: new RateLimiter(20, 3_600_000),
  reports: {
    async save(region, day, mm, token, level) {
      if (reportsDown) return false;
      const i = fakeRows.findIndex((r) => r.region === region && r.day === day && r.token === token);
      if (i >= 0) Object.assign(fakeRows[i], { mm, level });
      else fakeRows.push({ region, day, mm, level: level ?? "", token });
      return true;
    },
    async load(region, since) {
      return fakeRows.filter((r) => r.region === region && r.day >= since).map((r) => ({ day: r.day, mm: r.mm, reporter_hash: reporterHash(r.token), level: r.level }));
    },
  },
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
  all.push(rainKeyboard("fr"), planKeyboard("fr", { regionId: "sidi-bouzid", cropId: "pomme-de-terre" }));
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
  check(plan?.markup?.inline_keyboard.length === 5, "boutons sous le plan (bulletin, mise à jour, arrosé, pluie, changer)");
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

  // ---- rapports de pluie (mise à jour n°2) : échelle à cinq degrés ----
  await press("a:fr:kairouan:olivier:0");
  await press("L:fr");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Tunis" }).format(new Date());
  check(planKeyboard("fr").inline_keyboard.flat().some((b) => b.callback_data === "act:rain"), "bouton « ☔ Il a plu ici » sous le plan");
  m = await press("act:rain");
  show("choix de la pluie", m);
  const rainBtns = m.find((x) => x.kind === "send")?.markup?.inline_keyboard.flat() ?? [];
  check(rainBtns.length === 5 && rainBtns.map((b) => b.callback_data).join() === "rain:none,rain:very_light,rain:light,rain:heavy,rain:very_heavy", "5 degrés : pas de pluie, très légère, légère, beaucoup, énormément");
  check(!rainBtns.some((b) => /mm/.test(b.text)), "aucun millimètre demandé");
  m = await say("/pluie");
  check(m.length === 1 && m[0].markup?.inline_keyboard.flat().length === 5, "/pluie");
  m = await press("rain:light");
  let conf = m.find((x) => x.kind === "edit")!;
  show("signalement (1re personne)", m);
  check(/Légère/.test(conf.text) && /Kairouan/.test(conf.text) && /première personne/.test(conf.text) && /au moins 3 personnes/.test(conf.text) && /prudente/.test(conf.text), "1er signalement : confirmation + règle des 3 personnes + valeur prudente");
  check(fakeRows.length === 1 && fakeRows[0].region === "kairouan" && fakeRows[0].mm === 2 && fakeRows[0].level === "light" && fakeRows[0].token === `tg:${chat.id}`, "enregistré : région, journée, bas de la fourchette (2 mm), degré, identifiant anonyme");
  check(!/tg:|4242/.test(conf.text), "aucun identifiant affiché");
  fakeRows.push({ region: "kairouan", day: today, mm: 25, level: "very_heavy", token: "tg:999999999" });
  m = await press("rain:heavy");
  conf = m.find((x) => x.kind === "edit")!;
  show("signalement (2e personne)", m);
  check(/2 agriculteurs ont signalé de la pluie à Kairouan/.test(conf.text) && /niveau retenu : Beaucoup/.test(conf.text) && /au moins 3 personnes/.test(conf.text) && !/✅/.test(conf.text), "2 personnes : « 2 agriculteurs ont signalé… », niveau retenu, PAS encore pris en compte (il en faut 3, comme le plan)");
  check(fakeRows.filter((r) => r.token === `tg:${chat.id}`).length === 1, "un seul rapport par personne et par jour (le second remplace le premier)");
  check(!/999999999/.test(conf.text), "l'identifiant d'un autre n'est jamais affiché");
  m = await press("rain:light");
  check(/niveau retenu : Légère/.test(m.find((x) => x.kind === "edit")?.text ?? ""), "médiane prudente : 2 mm et 25 mm → 2 mm (Légère)");
  fakeRows.push({ region: "kairouan", day: today, mm: 8, level: "heavy", token: "tg:888888888" });
  m = await press("rain:very_light");
  const third = m.find((x) => x.kind === "edit")?.text ?? "";
  check(/3 agriculteurs ont signalé/.test(third) && /✅ Pris en compte dans votre plan/.test(third), "3 personnes : seuil atteint, « Pris en compte dans votre plan » (même seuil que le plan)");
  await press("L:ar");
  m = await press("rain:none");
  show("signalement (arabe)", m);
  check(/القيروان/.test(m.find((x) => x.kind === "edit")?.text ?? "") && fakeRows.find((r) => r.token === `tg:${chat.id}`)?.mm === 0, "signalement en arabe, « pas de pluie » = 0 mm");
  await press("L:fr");
  reportsDown = true;
  m = await press("rain:light");
  check(/pas pu enregistrer/.test(m.find((x) => x.kind === "edit")?.text ?? "") && !/Error|panne/.test(JSON.stringify(m)), "enregistrement impossible → message poli");
  reportsDown = false;
  deps.reportLimiter = new RateLimiter(20, 3_600_000);
  for (let i = 0; i < 20; i++) await press("rain:light");
  m = await press("rain:light");
  check(/Trop de signalements/.test(m.find((x) => x.kind === "edit")?.text ?? ""), "plus de 20 signalements par heure refusés");
  deps.reportLimiter = new RateLimiter(20, 3_600_000);
  rows.delete(chat.id);
  m = await press("rain:light");
  check(m.some((x) => x.kind === "send" && x.markup?.inline_keyboard[0].length === 3), "sans abonnement : on renvoie vers la configuration");
  await press("a:fr:kairouan:olivier:0");

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

  // erreur de base : message poli, sans trace
  const broken: Deps = { ...deps, limiter: new RateLimiter(), store: { ...deps.store, get: async () => { throw new Error("secret interne"); } } };
  out = [];
  await handleUpdate({ update_id: ++n, message: { message_id: 1, chat, text: "/plan", date: 0 } }, broken);
  check(out.length === 1 && !/secret interne|Error/.test(out[0].text), "erreur interne : message poli sans trace");

  console.log(failures ? `\n${failures} échec(s)` : "\nTout est bon.");
  process.exitCode = failures ? 1 : 0;
}

main();
