// Mesure ce que l'agent vocal COMPREND : pour chaque phrase d'agriculteur, trouve-t-il la bonne culture et la bonne région ?
// Les phrases sont envoyées en TEXTE (mode « texte seulement » d'ElevenLabs) : on mesure la compréhension de l'agent,
// pas la reconnaissance vocale. Chaque phrase ouvre une conversation neuve. L'outil get_irrigation_plan est exécuté ici,
// avec le même code que la route /api/agent/plan, comme le fait la page /call/talk.
//
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/agent-eval.ts            → liste les phrases, ne consomme rien
//   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/agent-eval.ts --go        → lance la mesure (consomme des minutes de conversation)
//   options : --only 3,4  (numéros des phrases)   --verbose   (affiche les messages reçus)
//
// Résultat dans src/lib/voiceagent/eval-results.json. Les phrases ont été écrites par le poste (français, arabe standard, darija,
// mélanges) : elles ne remplacent pas de vraies phrases d'agriculteurs, qu'Anthony peut ajouter dans CASES.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { agentId, signedUrl } from "../src/lib/voiceagent/api";
import { agentPlan } from "../src/lib/voiceagent/plan";
import type { AgentPlanResult } from "../src/lib/voiceagent/plan";
import { REFUSAL, TOOL_NAME } from "../src/lib/voiceagent/prompt";

type Kind = "plan" | "ask" | "refuse";
// plan = l'agent doit appeler l'outil avec cette culture et cette région ; ask = il doit poser une question (information manquante) ;
// refuse = il doit refuser (hors sujet ou culture inconnue).
type Case = { id: number; text: string; style: string; kind: Kind; crop?: string; region?: string; ago?: number | null; lang?: "fr" | "ar" };

const CASES: Case[] = [
  // français
  { id: 1, style: "fr", text: "J'ai du blé à Kairouan.", kind: "plan", crop: "ble", region: "kairouan", lang: "fr" },
  { id: 2, style: "fr", text: "Je voudrais savoir quand arroser mes tomates à Sidi Bouzid, j'ai arrosé hier.", kind: "plan", crop: "tomate", region: "sidi-bouzid", ago: 1, lang: "fr" },
  { id: 3, style: "fr", text: "Mon olivier a soif ? Je suis à Sfax, j'ai arrosé il y a quatre jours.", kind: "plan", crop: "olivier", region: "sfax", ago: 4, lang: "fr" },
  { id: 4, style: "fr", text: "Piment, Kairouan, je ne sais plus quand j'ai arrosé.", kind: "plan", crop: "piment", region: "kairouan", ago: null, lang: "fr" },
  { id: 5, style: "fr", text: "J'ai des amandiers près de Kasserine.", kind: "plan", crop: "amandier", region: "kasserine", lang: "fr" },
  { id: 6, style: "fr", text: "Bonjour, je cultive des pommes de terre.", kind: "ask", lang: "fr" },
  // arabe standard
  { id: 7, style: "ar", text: "عندي القمح في القيروان", kind: "plan", crop: "ble", region: "kairouan", lang: "ar" },
  { id: 8, style: "ar", text: "متى أسقي الزيتون في صفاقس؟", kind: "plan", crop: "olivier", region: "sfax", lang: "ar" },
  { id: 9, style: "ar", text: "أريد معلومات عن الطماطم في سيدي بوزيد، سقيت أمس", kind: "plan", crop: "tomate", region: "sidi-bouzid", ago: 1, lang: "ar" },
  { id: 10, style: "ar", text: "سقيت البطاطا قبل يومين في جندوبة", kind: "plan", crop: "pomme-de-terre", region: "jendouba", ago: 2, lang: "ar" },
  // darija tunisienne
  { id: 11, style: "darija", text: "عندي الفلفل في القيروان وسقيتو البارح", kind: "plan", crop: "piment", region: "kairouan", ago: 1, lang: "ar" },
  { id: 12, style: "darija", text: "نحب نعرف كيفاش نسقي الزيتون في سيدي بوزيد", kind: "plan", crop: "olivier", region: "sidi-bouzid", lang: "ar" },
  { id: 13, style: "darija", text: "الدلاع متاعي في قابس، شنوة نعمل؟", kind: "plan", crop: "pasteque", region: "gabes", lang: "ar" },
  { id: 14, style: "darija", text: "عندي نخل في قبلي، آخر سقية كانت من خمسة أيام", kind: "plan", crop: "dattier", region: "kebili", ago: 5, lang: "ar" },
  { id: 15, style: "darija", text: "السخانة برشا، نسقي القمح؟", kind: "ask", lang: "ar" },
  // mélanges
  { id: 16, style: "mix", text: "j'ai du قمح fi القيروان", kind: "plan", crop: "ble", region: "kairouan" },
  { id: 17, style: "mix", text: "نحب نسقي les tomates, أنا في نابل", kind: "plan", crop: "tomate", region: "nabeul" },
  // hors sujet et culture inconnue : refus
  { id: 18, style: "refus", text: "شنوة سعر الزيت اليوم؟", kind: "refuse", lang: "ar" },
  { id: 19, style: "refus", text: "Quel engrais pour mes tomates ?", kind: "refuse", lang: "fr" },
  { id: 20, style: "refus", text: "J'ai du manioc à Tunis, quand dois-je l'arroser ?", kind: "refuse", lang: "fr" },
];

const GO = process.argv.includes("--go");
const VERBOSE = process.argv.includes("--verbose");
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 ? process.argv[i + 1].split(",").map(Number) : null;
})();

type Outcome = {
  id: number;
  style: string;
  text: string;
  kind: Kind;
  toolCalled: boolean;
  toolArgs?: Record<string, unknown>;
  toolMs?: number; // du message de l'agriculteur à l'appel de l'outil
  firstReplyMs?: number; // du message de l'agriculteur à la première réponse de l'agent
  reply: string; // ce que l'agent a dit en dernier
  readVerbatim?: boolean; // l'agent a-t-il lu spoken_text sans le changer ?
  refusalOk?: boolean;
  cropOk?: boolean;
  regionOk?: boolean;
  agoOk?: boolean;
  langOk?: boolean;
  pass: boolean;
  seconds: number;
  error?: string;
  followUps?: number;
};

const norm = (s: string) => s.replace(/[\s‏‎،,.:;!?؟«»"'()\-–]+/g, " ").trim().toLowerCase();

function runCase(c: Case, url: string): Promise<Outcome> {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const out: Outcome = { id: c.id, style: c.style, text: c.text, kind: c.kind, toolCalled: false, reply: "", pass: false, seconds: 0 };
    const replies: string[] = [];
    let toolResult: AgentPlanResult | null = null;
    let sent = false;
    let sentAt = 0;
    let followUps = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let done = false;
    const ws = new WebSocket(url);
    const finish = (err?: string) => {
      if (done) return;
      done = true;
      clearTimeout(settle);
      clearTimeout(hard);
      try {
        ws.close();
      } catch {
        // déjà fermée
      }
      out.error = err;
      out.followUps = followUps;
      out.seconds = Math.round((Date.now() - t0) / 100) / 10;
      out.reply = replies.filter((r, i) => i > 0 || replies.length === 1).join(" ").trim() || replies.join(" ");
      score(c, out, toolResult, replies);
      resolve(out);
    };
    const hard = setTimeout(() => finish("délai dépassé (45 s)"), 45_000);
    // l'agent a fini quand plus rien n'arrive pendant 3,5 s après sa dernière réponse (ou 6 s après le résultat de l'outil)
    const rearm = (ms: number) => {
      clearTimeout(settle);
      settle = setTimeout(() => finish(), ms);
    };
    const send = (o: unknown) => ws.send(JSON.stringify(o));
    ws.onerror = () => finish("erreur de connexion");
    ws.onclose = () => finish();
    ws.onopen = () => send({ type: "conversation_initiation_client_data", conversation_config_override: { conversation: { text_only: true } } });
    ws.onmessage = async (ev) => {
      let m: any;
      try {
        m = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (VERBOSE) console.log(`   [${m.type}]`, JSON.stringify(m).slice(0, 240).replace(/signed_url|token/gi, "…"));
      switch (m.type) {
        case "conversation_initiation_metadata":
          if (!sent) {
            sent = true;
            sentAt = Date.now();
            send({ type: "user_message", text: c.text });
            rearm(20_000);
          }
          break;
        case "ping":
          send({ type: "pong", event_id: m.ping_event?.event_id });
          break;
        case "agent_response": {
          const text: string = m.agent_response_event?.agent_response ?? "";
          if (!sent || !text) break;
          if (out.firstReplyMs === undefined) out.firstReplyMs = Date.now() - sentAt;
          replies.push(text);
          // l'agent pose une question (dernier arrosage, région...) : l'agriculteur répond une fois qu'il ne sait pas, comme au téléphone
          if (c.kind === "plan" && !out.toolCalled && followUps < 2 && /[?؟]\s*$/.test(text.trim())) {
            followUps++;
            send({ type: "user_message", text: c.lang === "ar" ? "ما نعرفش" : "Je ne sais pas." });
            rearm(20_000);
            break;
          }
          rearm(toolResult ? 6000 : 3500);
          break;
        }
        case "client_tool_call": {
          const call = m.client_tool_call;
          if (call?.tool_name !== TOOL_NAME) break;
          out.toolCalled = true;
          out.toolArgs = call.parameters;
          out.toolMs = Date.now() - sentAt;
          const p = call.parameters ?? {};
          toolResult = await agentPlan({ region: p.region_id, crop: p.crop_id, ago: p.last_irrigation_days_ago, lang: p.language });
          send({ type: "client_tool_result", tool_call_id: call.tool_call_id, result: JSON.stringify(toolResult), is_error: false });
          rearm(20_000);
          break;
        }
        case "interruption":
        case "agent_response_correction":
          break;
      }
    };
  });
}

function score(c: Case, o: Outcome, tool: AgentPlanResult | null, replies: string[]) {
  const args = o.toolArgs ?? {};
  const spokenAfterTool = replies.join(" ");
  if (c.kind === "plan") {
    o.cropOk = args.crop_id === c.crop;
    o.regionOk = args.region_id === c.region;
    if (c.ago !== undefined) o.agoOk = (c.ago === null ? args.last_irrigation_days_ago == null : args.last_irrigation_days_ago === c.ago);
    if (c.lang) o.langOk = args.language === c.lang;
    if (tool) o.readVerbatim = norm(spokenAfterTool).includes(norm(tool.spoken_text));
    // si l'agriculteur a dit « je ne sais pas » après une question, l'outil doit être appelé SANS dernier arrosage (le moteur dira « pas sûr »)
    if (c.ago === undefined && (o.followUps ?? 0) > 0) o.agoOk = args.last_irrigation_days_ago == null;
    o.pass = !!o.toolCalled && !!o.cropOk && !!o.regionOk && o.agoOk !== false;
  } else if (c.kind === "ask") {
    // information manquante : l'agent ne doit PAS appeler l'outil (il ne devine pas) et doit poser une question
    o.pass = !o.toolCalled && replies.length > 0 && /[?؟]/.test(spokenAfterTool);
  } else {
    const refusals = [REFUSAL.fr, REFUSAL.ar];
    o.refusalOk = refusals.some((r) => norm(spokenAfterTool).includes(norm(r)));
    o.pass = !o.toolCalled && !!o.refusalOk;
  }
}

(async () => {
  const cases = CASES.filter((c) => !ONLY || ONLY.includes(c.id));
  console.log(`${cases.length} phrases : ${cases.map((c) => c.style).join(" ")}`);
  if (!GO) {
    for (const c of cases) console.log(`  ${String(c.id).padStart(2)} [${c.style}] ${c.text}  → ${c.kind}${c.crop ? ` ${c.crop}/${c.region}` : ""}`);
    console.log("Simulation seulement. Relancer avec --go (consomme des minutes de conversation).");
    return;
  }
  const id = agentId();
  if (!id) throw new Error("agent non créé (scripts/agent-create.ts --go)");
  const results: Outcome[] = [];
  let seconds = 0;
  for (const c of cases) {
    const { signed_url } = await signedUrl(id);
    const r = await runCase(c, signed_url);
    results.push(r);
    seconds += r.seconds;
    console.log(`${r.pass ? "OK  " : "KO  "} ${String(c.id).padStart(2)} [${c.style}] ${c.text}\n       outil : ${r.toolCalled ? JSON.stringify(r.toolArgs) : "non appelé"} · réponse en ${r.firstReplyMs ?? "?"} ms · ${r.seconds} s${r.error ? " · " + r.error : ""}\n       agent : ${r.reply.slice(0, 160)}`);
  }
  const plans = results.filter((r) => r.kind === "plan");
  const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)} %)` : "n/a");
  const ms = results.map((r) => r.toolMs).filter((x): x is number => x !== undefined).sort((a, b) => a - b);
  const median = ms.length ? ms[Math.floor(ms.length / 2)] : null;
  const summary = {
    phrases: results.length,
    passed: results.filter((r) => r.pass).length,
    plan_crop_ok: pct(plans.filter((r) => r.cropOk).length, plans.length),
    plan_region_ok: pct(plans.filter((r) => r.regionOk).length, plans.length),
    plan_both_ok: pct(plans.filter((r) => r.cropOk && r.regionOk).length, plans.length),
    plan_read_verbatim: pct(plans.filter((r) => r.readVerbatim).length, plans.filter((r) => r.toolCalled).length),
    ask_ok: pct(results.filter((r) => r.kind === "ask" && r.pass).length, results.filter((r) => r.kind === "ask").length),
    refuse_ok: pct(results.filter((r) => r.kind === "refuse" && r.pass).length, results.filter((r) => r.kind === "refuse").length),
    median_ms_to_tool_call: median,
    conversation_seconds: Math.round(seconds),
  };
  console.log("\nRésumé :", JSON.stringify(summary, null, 1));
  writeFileSync(join(process.cwd(), "src", "lib", "voiceagent", "eval-results.json"), JSON.stringify({ at: new Date().toISOString(), summary, results }, null, 1));
})().catch((e) => {
  console.error("ERREUR :", (e as Error).message);
  process.exit(1);
});
