// Script du bulletin en coréen (한국어), construit à partir du plan comme bulletinScript : mêmes lignes,
// mêmes `id`, aucun chiffre écrit à la main. Les noms de cultures et de gouvernorats ci-dessous sont des
// translittérations usuelles écrites par nous : À FAIRE RELIRE par un locuteur coréen avant diffusion.

import type { BulletinLine } from "../messages";
import type { Plan, PlanDay } from "../plan";

export const CROP_KO: Record<string, string> = {
  ble: "밀",
  orge: "보리",
  tomate: "토마토",
  piment: "고추",
  "pomme-de-terre": "감자",
  pasteque: "수박",
  melon: "멜론",
  oignon: "양파",
  sorgho: "수수",
  olivier: "올리브",
  amandier: "아몬드",
  pistachier: "피스타치오",
  vigne: "포도",
  oranger: "오렌지 등 감귤류",
  dattier: "대추야자",
  grenadier: "석류",
  figuier: "무화과",
  luzerne: "알팔파",
};

export const REGION_KO: Record<string, string> = {
  tunis: "튀니스",
  ariana: "아리아나",
  "ben-arous": "벤아루스",
  manouba: "마누바",
  nabeul: "나불",
  zaghouan: "자구완",
  bizerte: "비제르트",
  beja: "베자",
  jendouba: "젠두바",
  "le-kef": "케프",
  siliana: "실리아나",
  sousse: "수스",
  monastir: "모나스티르",
  mahdia: "마흐디아",
  sfax: "스팍스",
  kairouan: "카이루안",
  kasserine: "카세린",
  "sidi-bouzid": "시디부지드",
  gabes: "가베스",
  medenine: "메드닌",
  tataouine: "타타우인",
  gafsa: "가프사",
  tozeur: "토제르",
  kebili: "케빌리",
};

const STRESS_KO: Record<Plan["summary"]["stressRisk"], string> = { faible: "낮은 수준", moyen: "보통 수준", eleve: "높은 수준" };

// 10월 et 6월 se lisent « 시월 » et « 유월 » (lectures irrégulières) : on les écrit ainsi pour que la voix ne dise pas « 십월 ».
function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("ko-KR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(/^10월/, "시월")
    .replace(/^6월/, "유월");
}

function dose(d: PlanDay): string {
  if (d.litersPerTree != null) return `나무 한 그루당 ${Math.round(d.litersPerTree)}리터`;
  return `헥타르당 ${Math.round(d.m3PerHa)}세제곱미터`;
}

export function bulletinScriptKo(plan: Plan): BulletinLine[] {
  const region = REGION_KO[plan.regionId] ?? plan.regionId;
  const crop = CROP_KO[plan.cropId] ?? plan.cropId;
  const s = plan.summary;
  const rain = s.rainExpectedMm;
  const hot = Number.isFinite(s.tmaxMax) ? Math.round(s.tmaxMax) : null;
  const first = plan.days.find((d) => d.action === "irriguer");
  const L = (id: string, text: string): BulletinLine => ({ id, text });

  const lines: BulletinLine[] = [
    L("hello", "안녕하세요, 여러분. 사키아에 오신 것을 환영합니다."),
    L("where", `오늘의 관개 안내입니다. 지역은 ${region}, 작물은 ${crop}입니다.`),
  ];
  if (plan.status === "hors_vegetation") {
    lines.push(L("off", "이 작물은 지금 생육 시기가 아니므로 관개가 필요하지 않습니다."));
  } else {
    lines.push(
      rain >= 1
        ? L("rain", `이번 주 예상 강수량은 약 ${Math.round(rain)}밀리미터입니다.`)
        : L("rain", "이번 주에는 작물에 도움이 될 만한 비가 예상되지 않습니다."),
    );
    if (hot != null) lines.push(L("hot", `기온은 최고 ${hot}도까지 오를 수 있습니다.`));
    lines.push(
      first
        ? L("advice", `다음을 권장합니다. ${dayLabel(first.date)}에 관개하세요. 관개량은 ${dose(first)}입니다.`)
        : L("advice", "다음을 권장합니다. 앞으로 일주일 동안은 관개가 필요하지 않습니다."),
    );
    lines.push(L("stress", `수분 스트레스 위험은 ${STRESS_KO[s.stressRisk]}입니다.`));
  }
  // même règle que bulletinScript (messages.ts) : une ligne « je ne suis pas sûr » quand le plan manque de fiabilité
  if (plan.confidence.askAPerson) lines.push(L("unsure", "이번 조언은 확실하지 않습니다. 지역 농업 기술자에게 문의해 주세요."));
  lines.push(
    L("caveat", "이 조언은 참고용입니다. 지역 농업 당국에 확인해 주세요."),
    L("bye", "나라를 위해 애써 주시는 모든 분께 감사드립니다. 풍성한 수확을 기원합니다."),
  );
  return lines;
}
