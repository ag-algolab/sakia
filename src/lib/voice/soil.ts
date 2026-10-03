// Ligne « soil » du bulletin : dit pour quel sol et quel système d'irrigation le conseil est calculé. Sans chiffre.
//
// - Sans choix explicite (la route ne reçoit ni `soil` ni `system`) : le plan est calculé avec les valeurs par défaut du
//   moteur (sol limoneux, goutte-à-goutte) et la phrase le dit, en renvoyant vers l'application pour le détail.
// - Avec un choix (`soil` et/ou `system`, valeurs validées comme dans /api/plan) : la phrase NOMME le sol et le système
//   réellement utilisés pour calculer le plan (l'autre valeur, si absente, est la valeur par défaut du moteur). La voix
//   ne peut donc pas contredire l'écran.
// Les noms suivent ceux de l'interface (src/components/ui/i18n.ts). Textes darija, arabe standard et coréen à faire relire.

import type { BulletinLine } from "../messages";
import type { IrrigationSystem, SoilName } from "../waterBalance";
import type { VoiceLang } from "./langs";

export type SoilChoice = { soil: SoilName; system: IrrigationSystem };

export const DEFAULT_CHOICE: SoilChoice = { soil: "limoneux", system: "goutte" };

// Phrase quand rien n'est précisé : textes fournis par Anthony (darija, arabe standard, français, anglais) ; coréen de nous.
export const SOIL_LINE: Record<VoiceLang, string> = {
  aeb: "هاذي النصيحة لتربة عادية، طميية، وسقي قطرة قطرة. للتفاصيل، اختارو نوع التربة متاعكم في التطبيق.",
  ar: "هذه النصيحة لتربة عادية طميية وسقي بالتقطير. للتفاصيل، اختاروا نوع تربتكم في التطبيق.",
  fr: "Ce conseil est donné pour un sol normal, limoneux, avec goutte-à-goutte. Pour les détails, choisissez votre type de sol dans l'application.",
  en: "This advice is for a normal loam soil with drip irrigation. For the details, choose your soil type in the app.",
  ko: "이 조언은 보통 양토에 점적 관개를 기준으로 합니다. 자세한 내용은 앱에서 토양 종류를 선택해 주세요.",
};

type Names = { soil: Record<SoilName, string>; system: Record<IrrigationSystem, string>; build: (soil: string, system: string) => string };

const NAMES: Record<VoiceLang, Names> = {
  fr: {
    soil: { sableux: "sableux", limoneux: "limoneux", argileux: "argileux" },
    system: { goutte: "goutte-à-goutte", aspersion: "aspersion", gravitaire: "irrigation gravitaire, à la raie" },
    build: (s, i) => `Ce conseil est donné pour un sol ${s}, avec ${i}. Si ce n'est pas votre cas, changez-le dans l'application.`,
  },
  en: {
    soil: { sableux: "sandy", limoneux: "loam", argileux: "clay" },
    system: { goutte: "drip", aspersion: "sprinkler", gravitaire: "furrow (gravity)" },
    build: (s, i) => `This advice is for a ${s} soil with ${i} irrigation. If that is not your case, change it in the app.`,
  },
  ar: {
    soil: { sableux: "رملية", limoneux: "طميية", argileux: "طينية" },
    system: { goutte: "بالتقطير", aspersion: "بالرش", gravitaire: "بالجاذبية عبر السواقي" },
    build: (s, i) => `هذه النصيحة لتربة ${s} وسقي ${i}. إذا لم يكن هذا وضعكم، غيّروه في التطبيق.`,
  },
  aeb: {
    soil: { sableux: "رملية", limoneux: "طميية", argileux: "طينية" },
    system: { goutte: "قطرة قطرة", aspersion: "بالرشّ", gravitaire: "بالسواقي" },
    build: (s, i) => `هاذي النصيحة لتربة ${s}، وسقي ${i}. إذا هذا موش وضعكم، بدّلوه في التطبيق.`,
  },
  ko: {
    soil: { sableux: "사질토", limoneux: "양토", argileux: "점토질 토양" },
    system: { goutte: "점적 관개", aspersion: "스프링클러 관개", gravitaire: "이랑을 따라 흘려보내는 중력식 관개" },
    build: (s, i) => `이 조언은 ${s}에 ${i}를 기준으로 합니다. 해당하지 않으면 앱에서 바꿔 주세요.`,
  },
};

export function soilLineText(lang: VoiceLang, choice?: Partial<SoilChoice>): string {
  if (!choice || (choice.soil === undefined && choice.system === undefined)) return SOIL_LINE[lang];
  const soil = choice.soil ?? DEFAULT_CHOICE.soil;
  const system = choice.system ?? DEFAULT_CHOICE.system;
  const n = NAMES[lang];
  return n.build(n.soil[soil], n.system[system]);
}

// Insère la ligne « soil » juste avant la phrase d'avertissement (`caveat`). Pas de ligne quand il n'y a aucun conseil
// d'irrigation à qualifier (culture hors saison).
export function withSoilLine(lines: BulletinLine[], lang: VoiceLang, hasAdvice: boolean, choice?: Partial<SoilChoice>): BulletinLine[] {
  if (!hasAdvice) return lines;
  const at = lines.findIndex((l) => l.id === "caveat");
  const soil: BulletinLine = { id: "soil", text: soilLineText(lang, choice) };
  return at < 0 ? [...lines, soil] : [...lines.slice(0, at), soil, ...lines.slice(at)];
}
