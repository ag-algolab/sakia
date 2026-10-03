// Ligne « reports » du bulletin : quand la pluie d'un ou plusieurs jours vient de signalements d'agriculteurs de la région
// (plan.localReports, au moins 2 personnes différentes, médiane prudente) et non du modèle météo, le bulletin le dit.
//
// Règles (HANDOFF section 13) : on dit « signalé par des agriculteurs », jamais « mesuré » ; on dit que le signalement
// remplace la prévision ; on ne cite aucun nom. On parle en ÉCHELLE (pas de pluie, très légère, légère, beaucoup,
// énormément), comme les agriculteurs la donnent, pas en millimètres : la voix reste simple et sans chiffre à deviner.
// Le nombre de personnes est dit en toutes lettres en darija. Textes darija, arabe standard et coréen à faire valider.

import type { BulletinLine } from "../messages";
import type { Plan } from "../plan";
import { levelFromMm } from "../rainLevels";
import type { RainLevel } from "../rainLevels";
import type { VoiceLang } from "./langs";
import { arabicNumber } from "./numbers-ar";

type Report = NonNullable<Plan["localReports"]>[number];

const MAX_DAYS_SPOKEN = 3; // les plus récents d'abord ; au-delà, la ligne deviendrait longue pour une écoute unique

// Jour relatif à aujourd'hui (les signalements portent sur aujourd'hui et les 3 derniers jours).
const REL: Record<VoiceLang, string[]> = {
  fr: ["Aujourd'hui", "Hier", "Avant-hier", "Il y a trois jours"],
  en: ["Today", "Yesterday", "The day before yesterday", "Three days ago"],
  ar: ["اليوم", "أمس", "أول أمس", "قبل ثلاثة أيام"],
  aeb: ["اليوم", "البارح", "قبل البارح", "قبل ثلاثة أيام"],
  ko: ["오늘", "어제", "그저께", "사흘 전"],
};

const LEVEL: Record<VoiceLang, Record<RainLevel, string>> = {
  fr: { none: "pas de pluie", very_light: "une pluie très légère, quelques gouttes", light: "une pluie légère", heavy: "beaucoup de pluie", very_heavy: "énormément de pluie" },
  en: { none: "no rain", very_light: "very light rain, a few drops", light: "light rain", heavy: "a lot of rain", very_heavy: "a huge amount of rain" },
  ar: { none: "لا مطر", very_light: "مطر خفيف جدا، قطرات", light: "مطر خفيف", heavy: "مطر غزير", very_heavy: "مطر غزير جدا" },
  aeb: { none: "ما فمّاش شتا", very_light: "شتا خفيفة برشا، شوية قطرات", light: "شتا خفيفة", heavy: "شتا برشا", very_heavy: "شتا كبيرة برشا" },
  ko: { none: "비 없음", very_light: "아주 약한 비, 몇 방울", light: "약한 비", heavy: "많은 비", very_heavy: "매우 많은 비" },
};

const KO_COUNT = ["", "한", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"]; // « 두 명 », pas « 이 명 »

const CLOSING: Record<VoiceLang, string> = {
  fr: "Nous avons retenu leur signalement à la place de la prévision. C'est un signalement, pas une mesure.",
  en: "We used their report instead of the forecast. It is a report, not a measurement.",
  ar: "أخذنا ببلاغهم بدل التوقعات. هذا بلاغ وليس قياسا.",
  aeb: "خذينا بكلامهم بدل التوقعات. هذا كلام فلاحين، موش قياس.",
  ko: "예보 대신 이 신고를 반영했습니다. 측정값이 아니라 농민들의 신고입니다.",
};

function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86400000);
}

function sentence(lang: VoiceLang, rel: string, n: number, level: string): string {
  switch (lang) {
    case "fr":
      return `${rel}, ${n} agriculteurs de la région ont signalé : ${level}.`;
    case "en":
      return `${rel}, ${n} farmers in the area reported: ${level}.`;
    case "ar":
      return `${rel}، أبلغ ${n} من الفلاحين في المنطقة عن: ${level}.`;
    case "aeb":
      return `${rel}، ${arabicNumber(n)} من الفلاحين من الجهة قالو: ${level}.`;
    case "ko":
      return `${rel} 이 지역 농민 ${n <= 10 ? `${KO_COUNT[n]}명` : `${n}명`}이 “${level}”라고 알려 왔습니다.`;
  }
}

export function reportsLineText(lang: VoiceLang, today: string, reports: Report[]): string {
  const recent = [...reports].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, MAX_DAYS_SPOKEN);
  const parts = recent.map((r) => {
    const back = Math.min(3, Math.max(0, daysBetween(today, r.date)));
    const level = r.level ?? levelFromMm(r.medianMm);
    return sentence(lang, REL[lang][back], r.n, LEVEL[lang][level]);
  });
  return [...parts, CLOSING[lang]].join(" ");
}

// Insère la ligne « reports » juste après la ligne « rain », seulement quand le plan a un conseil d'irrigation et des
// jours corrigés par des signalements.
export function withReportsLine(lines: BulletinLine[], lang: VoiceLang, plan: Plan): BulletinLine[] {
  const reports = plan.localReports ?? [];
  if (plan.status !== "ok" || reports.length === 0) return lines;
  const at = lines.findIndex((l) => l.id === "rain");
  if (at < 0) return lines;
  const line: BulletinLine = { id: "reports", text: reportsLineText(lang, plan.today, reports) };
  return [...lines.slice(0, at + 1), line, ...lines.slice(at + 1)];
}
