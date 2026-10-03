// Mesure la compréhension des questions « culture + région » (mise à jour n°1).
//
// 1) Sans argument : teste l'analyseur de mots-clés sur des phrases TELLES QUE LA RECONNAISSANCE VOCALE LES ÉCRIRAIT
//    (français, arabe, arabizi, anglais, phrases longues avec mots parasites). Ce n'est PAS une mesure du son :
//    elle ne dit rien de la qualité de la transcription de l'accent tunisien.
// 2) Avec un dossier : npx tsx scripts/telegram-voice-eval.ts <dossier>
//    Chaque enregistrement (.ogg .mp3 .wav .m4a) a un fichier du même nom en .txt contenant « <culture> <région> »,
//    par exemple « olivier kairouan ». Le script transcrit (ElevenLabs Scribe, consomme des crédits) et compare.
//    C'est la vraie mesure : à faire avec de vraies voix (idéalement des agriculteurs ou des Tunisiens).

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { parseSms } from "../src/lib/sms/parse";
import { loadLocalEnv } from "../src/lib/telegram/env";
import { transcribe } from "../src/lib/telegram/stt";

type Case = { say: string; crop: string; region: string };

const PHRASES: Case[] = [
  // français
  { say: "olivier à Kairouan", crop: "olivier", region: "kairouan" },
  { say: "je veux arroser mon blé à Sidi Bouzid", crop: "ble", region: "sidi-bouzid" },
  { say: "mes tomates à Nabeul", crop: "tomate", region: "nabeul" },
  { say: "pomme de terre Kasserine", crop: "pomme-de-terre", region: "kasserine" },
  { say: "mes amandiers à Sfax", crop: "amandier", region: "sfax" },
  { say: "dattier Tozeur", crop: "dattier", region: "tozeur" },
  { say: "piments Kairouan", crop: "piment", region: "kairouan" },
  { say: "orge Béja", crop: "orge", region: "beja" },
  { say: "luzerne Gafsa", crop: "luzerne", region: "gafsa" },
  { say: "bonjour, quand dois-je arroser mes oliviers à Kairouan ?", crop: "olivier", region: "kairouan" },
  // arabizi (tunisien écrit en lettres latines)
  { say: "zitoun kairouan", crop: "olivier", region: "kairouan" },
  { say: "9amh sidi bouzid", crop: "ble", region: "sidi-bouzid" },
  { say: "batata kasserine", crop: "pomme-de-terre", region: "kasserine" },
  { say: "tmatem nabeul", crop: "tomate", region: "nabeul" },
  { say: "felfel kairouan", crop: "piment", region: "kairouan" },
  { say: "louz sfax", crop: "amandier", region: "sfax" },
  { say: "tmar tozeur", crop: "dattier", region: "tozeur" },
  { say: "cha3ir beja", crop: "orge", region: "beja" },
  { say: "salam, nheb na3ref waqtech nsqi zitoun fi kairouan", crop: "olivier", region: "kairouan" },
  // arabe
  { say: "زيتون القيروان", crop: "olivier", region: "kairouan" },
  { say: "قمح سيدي بوزيد", crop: "ble", region: "sidi-bouzid" },
  { say: "طماطم نابل", crop: "tomate", region: "nabeul" },
  { say: "بطاطا القصرين", crop: "pomme-de-terre", region: "kasserine" },
  { say: "فلفل القيروان", crop: "piment", region: "kairouan" },
  { say: "تمر توزر", crop: "dattier", region: "tozeur" },
  { say: "لوز صفاقس", crop: "amandier", region: "sfax" },
  { say: "شعير باجة", crop: "orge", region: "beja" },
  { say: "شنوة نعمل في الزيتون في القيروان", crop: "olivier", region: "kairouan" },
  // anglais
  { say: "olive Kairouan", crop: "olivier", region: "kairouan" },
  { say: "wheat Sidi Bouzid", crop: "ble", region: "sidi-bouzid" },
];

function score(cases: { heard: string; crop: string; region: string; label: string }[]) {
  let cropOk = 0;
  let regionOk = 0;
  let both = 0;
  const misses: string[] = [];
  for (const c of cases) {
    const p = parseSms(c.heard);
    const gotCrop = p.kind === "plan" ? p.cropId : undefined;
    const gotRegion = p.kind === "plan" ? p.regionId : undefined;
    const a = gotCrop === c.crop;
    const b = gotRegion === c.region;
    if (a) cropOk++;
    if (b) regionOk++;
    if (a && b) both++;
    else misses.push(`  « ${c.heard} » → culture ${gotCrop ?? "?"}, région ${gotRegion ?? "?"} (attendu ${c.crop}, ${c.region})${c.label ? ` [${c.label}]` : ""}`);
  }
  const pct = (x: number) => `${Math.round((100 * x) / cases.length)} %`;
  console.log(`${cases.length} phrases : culture ${cropOk} (${pct(cropOk)}), région ${regionOk} (${pct(regionOk)}), les deux ${both} (${pct(both)})`);
  if (misses.length) console.log(`Ratés :\n${misses.join("\n")}`);
}

async function main() {
  loadLocalEnv();
  const dir = process.argv[2];
  if (!dir) {
    console.log("Analyseur sur des transcriptions types (pas une mesure du son) :");
    score(PHRASES.map((p) => ({ heard: p.say, crop: p.crop, region: p.region, label: "" })));
    return;
  }
  if (!existsSync(dir)) throw new Error(`Dossier introuvable : ${dir}`);
  const files = readdirSync(dir).filter((f) => [".ogg", ".mp3", ".wav", ".m4a", ".oga"].includes(extname(f).toLowerCase()));
  const cases: { heard: string; crop: string; region: string; label: string }[] = [];
  for (const f of files) {
    const expectedFile = join(dir, f.replace(/\.[^.]+$/, ".txt"));
    if (!existsSync(expectedFile)) {
      console.log(`Ignoré (pas de .txt) : ${f}`);
      continue;
    }
    const [crop, region] = readFileSync(expectedFile, "utf8").trim().split(/\s+/);
    const heard = await transcribe(readFileSync(join(dir, f)), "audio/ogg");
    console.log(`${f} → « ${heard.text} » (langue ${heard.language ?? "?"})`);
    cases.push({ heard: heard.text, crop, region, label: f });
  }
  if (cases.length) score(cases);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : "échec");
  process.exit(1);
});
