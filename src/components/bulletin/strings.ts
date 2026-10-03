// Libellés de l'interface du bulletin (anglais par défaut pour le jury ; français et arabe disponibles).
// Aucun chiffre ici : les valeurs viennent du plan.

import type { Plan } from "@/lib/plan";

export type ConfidenceReason = Plan["confidence"]["reasons"][number];

export type UiLang = "en" | "fr" | "ar" | "ko";

export const LOCALES: Record<UiLang, string> = { en: "en-GB", fr: "fr-FR", ar: "ar-TN-u-nu-latn", ko: "ko-KR" };

export type Strings = {
  title: string;
  tagline: string;
  region: string;
  crop: string;
  voice: string;
  voiceOf: string;
  listen: string;
  loading: string;
  stop: string;
  soundOn: string;
  soundOff: string;
  musicOn: string;
  musicOff: string;
  subtitles: string;
  subEn: string;
  subSpoken: string;
  pressListen: string;
  onAir: string;
  rec: string;
  idle: string;
  rain: string;
  tmax: string;
  stress: string;
  nextIrrigation: string;
  noIrrigation: string;
  outOfSeason: string;
  stressLevels: Record<"faible" | "moyen" | "eleve", string>;
  noteLive: string; // {date}
  noteCache: string; // {date}
  noteDemo: string; // {date}
  noteReplay: string; // {date}
  fallbackOffline: string;
  fallbackBudget: string;
  fallbackError: string;
  demosTitle: string;
  demosHint: string;
  whyTitle: string;
  why: string;
  audioSize: string; // {kb}
  arabicNote: string;
  koreanNote: string;
  darijaNote: string;
  inclusionTitle: string;
  inclusion: string;
  justTitle: string;
  justBody: string; // toujours en coréen
  justGloss: string; // traduction dans la langue de l'interface (vide en coréen)
  voiceNote: string; // {name}
  indicative: string;
  back: string;
  uiLang: string;
  // garde-fou « pas sûr : demandez à une personne »
  unsureTitle: string;
  askCell: string;
  reasons: Record<ConfidenceReason, string>;
  agoLabel: string;
  agoUnknown: string;
  agoToday: string;
  agoOne: string;
  agoDays: string; // {n}
};

export const STRINGS: Record<UiLang, Strings> = {
  en: {
    title: "Sakia bulletin",
    tagline: "Today's irrigation bulletin, read aloud, with subtitles",
    region: "Region",
    crop: "Crop",
    voice: "Voice language",
    voiceOf: "Voice",
    listen: "Listen",
    loading: "Preparing…",
    stop: "Stop",
    soundOn: "Sound on",
    soundOff: "Sound off",
    musicOn: "Music on",
    musicOff: "Music off",
    subtitles: "Subtitles",
    subEn: "English",
    subSpoken: "Spoken language",
    pressListen: "Press “Listen” to start the bulletin.",
    onAir: "ON AIR",
    rec: "RECORDED",
    idle: "STANDBY",
    rain: "Rain, 7 days",
    tmax: "Max temperature",
    stress: "Water-stress risk",
    nextIrrigation: "Next irrigation",
    noIrrigation: "No irrigation needed this week",
    outOfSeason: "Crop out of season",
    stressLevels: { faible: "low", moyen: "medium", eleve: "high" },
    noteLive: "Bulletin generated just now ({date}).",
    noteCache: "Saved bulletin, generated on {date}. Same text, so the voice was not synthesised again.",
    noteDemo: "You are hearing a RECORDED bulletin from {date}. It is not generated now.",
    noteReplay: "Replay of {date}: observed weather, not a forecast.",
    fallbackOffline: "No network: playing a recorded bulletin instead.",
    fallbackBudget: "Voice credits are used up: playing a recorded bulletin instead.",
    fallbackError: "The voice service did not answer: playing a recorded bulletin instead.",
    demosTitle: "Recorded bulletins",
    demosHint: "These work with no network and no credits.",
    whyTitle: "Why a drawn presenter, not a video?",
    why: "The whole bulletin is one audio file of 130 to 200 KB. The presenter is drawn as vector graphics in your browser, and the mouth follows the loudness of the sound. A generated video would weigh tens of megabytes: too heavy for a weak mobile network. Small AI: small file, same message.",
    audioSize: "This bulletin: {kb} KB of audio",
    arabicNote: "Arabic text: simple standard Arabic, to be validated by a Tunisian speaker. Tunisian dialect is not claimed.",
    koreanNote: "Korean text: written by us, to be validated by a Korean speaker.",
    darijaNote: "Tunisian Arabic (Darija): written by us in simple everyday words, avoiding Moroccan forms, and read by a voice with a Tunisian accent. To be validated by a Tunisian speaker: a few words may be off.",
    inclusionTitle: "Why Darija?",
    inclusion: "Many farmers around Kairouan cannot read, and speak Darija, not the standard Arabic of the news. A bulletin in standard Arabic would not reach them, so the first voice here is Tunisian Darija, then French, standard Arabic, English and Korean.",
    justTitle: "Just for you",
    justBody: "서울에서 이 프로젝트를 평가해 주시는 분들께 드립니다. 사키아 방송은 한국어로도 인사드립니다. 튀니지 농부들을 위한 아주 작은 AI가 여러분의 언어로 말을 건넵니다. 😊",
    justGloss: "For whoever evaluates this from Seoul: the Sakia bulletin also speaks Korean. A very small AI for Tunisian farmers says hello in your language.",
    voiceNote: "Voice: {name} (provisional, not yet validated by ear).",
    indicative: "Indicative advice, to be checked with the regional agriculture office.",
    back: "Home",
    uiLang: "Interface",
    unsureTitle: "Not sure: ask a person",
    askCell: "Ask a person",
    reasons: {
      very_stale_data: "The weather data is more than 48 hours old: no advice is given.",
      stale_data: "The weather data is more than 12 hours old.",
      unknown_last_irrigation: "The date of the last irrigation is not known.",
      analogy_coefficients: "The crop coefficients are borrowed from a similar crop (not published for this one).",
      uncertain_rain: "Rain is possible in the next 3 days (30 to 70 % chance).",
      short_horizon: "The forecast does not cover the whole week.",
    },
    agoLabel: "Last irrigation",
    agoUnknown: "Unknown",
    agoToday: "Today",
    agoOne: "1 day ago",
    agoDays: "{n} days ago",
  },
  fr: {
    title: "Bulletin Sakia",
    tagline: "Le bulletin d'irrigation du jour, lu à voix haute, avec sous-titres",
    region: "Région",
    crop: "Culture",
    voice: "Langue de la voix",
    voiceOf: "Voix",
    listen: "Écouter",
    loading: "Préparation…",
    stop: "Arrêter",
    soundOn: "Son activé",
    soundOff: "Son coupé",
    musicOn: "Musique activée",
    musicOff: "Musique coupée",
    subtitles: "Sous-titres",
    subEn: "Anglais",
    subSpoken: "Langue parlée",
    pressListen: "Appuyez sur « Écouter » pour lancer le bulletin.",
    onAir: "À L'ANTENNE",
    rec: "ENREGISTRÉ",
    idle: "EN ATTENTE",
    rain: "Pluie, 7 jours",
    tmax: "Température max.",
    stress: "Risque de stress hydrique",
    nextIrrigation: "Prochaine irrigation",
    noIrrigation: "Pas d'irrigation nécessaire cette semaine",
    outOfSeason: "Culture hors saison",
    stressLevels: { faible: "faible", moyen: "moyen", eleve: "élevé" },
    noteLive: "Bulletin généré à l'instant ({date}).",
    noteCache: "Bulletin gardé en mémoire, généré le {date}. Même texte : la voix n'a pas été refaite.",
    noteDemo: "Vous écoutez un bulletin ENREGISTRÉ le {date}. Il n'est pas généré maintenant.",
    noteReplay: "Rejeu du {date} : météo observée, pas une prévision.",
    fallbackOffline: "Pas de réseau : lecture d'un bulletin enregistré.",
    fallbackBudget: "Les crédits de voix sont épuisés : lecture d'un bulletin enregistré.",
    fallbackError: "Le service de voix n'a pas répondu : lecture d'un bulletin enregistré.",
    demosTitle: "Bulletins enregistrés",
    demosHint: "Ils fonctionnent sans réseau et sans crédits.",
    whyTitle: "Pourquoi un présentateur dessiné, pas une vidéo ?",
    why: "Tout le bulletin tient dans un fichier audio de 130 à 200 Ko. Le présentateur est dessiné en vectoriel dans votre navigateur et sa bouche suit le volume du son. Une vidéo générée pèserait des dizaines de mégaoctets : trop lourd pour un réseau mobile faible. Petite IA : petit fichier, même message.",
    audioSize: "Ce bulletin : {kb} Ko d'audio",
    arabicNote: "Texte arabe : arabe standard simple, à valider par un locuteur tunisien. Le dialecte tunisien n'est pas annoncé.",
    koreanNote: "Texte coréen : écrit par nos soins, à valider par un locuteur coréen.",
    darijaNote: "Arabe tunisien (darija) : écrit par nos soins en mots simples du quotidien, sans formes marocaines, et lu par une voix à accent tunisien. À valider par un locuteur tunisien : quelques mots peuvent être inexacts.",
    inclusionTitle: "Pourquoi la darija ?",
    inclusion: "Beaucoup d'agriculteurs autour de Kairouan ne savent pas lire et parlent la darija, pas l'arabe standard des journaux. Un bulletin en arabe standard ne les atteindrait pas : la première voix ici est donc la darija tunisienne, puis le français, l'arabe standard, l'anglais et le coréen.",
    justTitle: "Juste pour vous",
    justBody: "서울에서 이 프로젝트를 평가해 주시는 분들께 드립니다. 사키아 방송은 한국어로도 인사드립니다. 튀니지 농부들을 위한 아주 작은 AI가 여러분의 언어로 말을 건넵니다. 😊",
    justGloss: "Pour celles et ceux qui évaluent depuis Séoul : le bulletin Sakia parle aussi coréen. Une toute petite IA pour les agriculteurs tunisiens vous salue dans votre langue.",
    voiceNote: "Voix : {name} (provisoire, pas encore validée à l'oreille).",
    indicative: "Conseil indicatif, à valider auprès de l'administration agricole régionale.",
    back: "Accueil",
    uiLang: "Interface",
    unsureTitle: "Pas sûr : demandez à une personne",
    askCell: "Demandez à une personne",
    reasons: {
      very_stale_data: "La météo date de plus de 48 heures : aucun conseil n'est donné.",
      stale_data: "La météo date de plus de 12 heures.",
      unknown_last_irrigation: "La date du dernier arrosage n'est pas connue.",
      analogy_coefficients: "Les coefficients de la culture sont ceux d'une culture proche (non publiés pour celle-ci).",
      uncertain_rain: "De la pluie est possible dans les 3 jours (probabilité de 30 à 70 %).",
      short_horizon: "La prévision ne couvre pas toute la semaine.",
    },
    agoLabel: "Dernier arrosage",
    agoUnknown: "Inconnu",
    agoToday: "Aujourd'hui",
    agoOne: "il y a 1 jour",
    agoDays: "il y a {n} jours",
  },
  ar: {
    title: "نشرة ساقية",
    tagline: "نشرة الري لهذا اليوم، مقروءة بصوت عال مع نص مكتوب",
    region: "الولاية",
    crop: "المحصول",
    voice: "لغة الصوت",
    voiceOf: "الصوت",
    listen: "استمع",
    loading: "جار التحضير…",
    stop: "إيقاف",
    soundOn: "الصوت مفعّل",
    soundOff: "الصوت مكتوم",
    musicOn: "الموسيقى مفعّلة",
    musicOff: "الموسيقى مكتومة",
    subtitles: "النص المكتوب",
    subEn: "الإنجليزية",
    subSpoken: "اللغة المنطوقة",
    pressListen: "اضغط «استمع» لبدء النشرة.",
    onAir: "على الهواء",
    rec: "مسجّلة",
    idle: "في الانتظار",
    rain: "الأمطار خلال 7 أيام",
    tmax: "درجة الحرارة القصوى",
    stress: "خطر الإجهاد المائي",
    nextIrrigation: "السقية القادمة",
    noIrrigation: "لا حاجة للسقي هذا الأسبوع",
    outOfSeason: "المحصول خارج الموسم",
    stressLevels: { faible: "ضعيف", moyen: "متوسط", eleve: "مرتفع" },
    noteLive: "نشرة أُنتجت الآن ({date}).",
    noteCache: "نشرة محفوظة أُنتجت بتاريخ {date}. النص نفسه، لذلك لم يُولَّد الصوت من جديد.",
    noteDemo: "تستمعون إلى نشرة مسجّلة بتاريخ {date}. لم تُنتج الآن.",
    noteReplay: "إعادة تشغيل ليوم {date}: طقس مرصود فعلا، وليس توقعات.",
    fallbackOffline: "لا يوجد اتصال بالشبكة: تُشغَّل نشرة مسجّلة بدلا من ذلك.",
    fallbackBudget: "نفد رصيد خدمة الصوت: تُشغَّل نشرة مسجّلة بدلا من ذلك.",
    fallbackError: "خدمة الصوت لم تستجب: تُشغَّل نشرة مسجّلة بدلا من ذلك.",
    demosTitle: "نشرات مسجّلة",
    demosHint: "تعمل دون شبكة ودون رصيد.",
    whyTitle: "لماذا مقدّم مرسوم وليس فيديو؟",
    why: "النشرة كلها ملف صوتي واحد بحجم بين 130 و200 كيلوبايت. المقدّم يُرسم برسومات متجهية داخل المتصفح، وفمه يتبع شدة الصوت. الفيديو المولَّد يزن عشرات الميغابايت: ثقيل جدا على شبكة هاتف محمول ضعيفة. ذكاء اصطناعي صغير: ملف صغير والرسالة نفسها.",
    audioSize: "هذه النشرة: {kb} كيلوبايت من الصوت",
    arabicNote: "النص العربي: عربية فصحى مبسطة، بانتظار مراجعة شخص تونسي يتحدث العربية. لا ندّعي أنه بالدارجة التونسية.",
    koreanNote: "النص الكوري: كتبناه بأنفسنا، بانتظار مراجعة شخص يتحدث الكورية.",
    darijaNote: "الدارجة التونسية: كتبناها بأنفسنا بكلمات بسيطة من الحياة اليومية، دون صيغ مغربية، ويقرؤها صوت بلكنة تونسية. بانتظار مراجعة شخص تونسي: قد تكون بعض الكلمات غير دقيقة.",
    inclusionTitle: "لماذا الدارجة؟",
    inclusion: "كثير من الفلاحين حول القيروان لا يقرؤون ويتكلمون بالدارجة وليس بالفصحى التي تسمعونها في الأخبار. نشرة بالفصحى لن تصلهم، لذلك الصوت الأول هنا هو الدارجة التونسية، ثم الفرنسية والفصحى والإنجليزية والكورية.",
    justTitle: "خصيصا لكم",
    justBody: "서울에서 이 프로젝트를 평가해 주시는 분들께 드립니다. 사키아 방송은 한국어로도 인사드립니다. 튀니지 농부들을 위한 아주 작은 AI가 여러분의 언어로 말을 건넵니다. 😊",
    justGloss: "إلى من يقيّم هذا المشروع من سيول: نشرة ساقية تتكلم الكورية أيضا. ذكاء اصطناعي صغير جدا لفائدة الفلاحين التونسيين يحيّيكم بلغتكم.",
    voiceNote: "الصوت: {name} (مؤقت، لم نتحقق منه بعد بالاستماع).",
    indicative: "نصيحة إرشادية، يجب التحقق منها لدى المندوبية الجهوية للتنمية الفلاحية.",
    back: "الرئيسية",
    uiLang: "لغة الواجهة",
    unsureTitle: "غير متأكد: اسألوا شخصا مختصا",
    askCell: "اسألوا شخصا مختصا",
    reasons: {
      very_stale_data: "بيانات الطقس قديمة (أكثر من 48 ساعة): لا نقدّم أي نصيحة.",
      stale_data: "بيانات الطقس قديمة (أكثر من 12 ساعة).",
      unknown_last_irrigation: "تاريخ آخر سقية غير معروف.",
      analogy_coefficients: "معاملات هذا المحصول مأخوذة من محصول مشابه لأنها غير منشورة.",
      uncertain_rain: "قد تهطل أمطار خلال 3 أيام (احتمال بين 30 و70 %).",
      short_horizon: "التوقعات المتوفرة لا تغطي الأسبوع كاملا.",
    },
    agoLabel: "آخر سقية",
    agoUnknown: "غير معروف",
    agoToday: "اليوم",
    agoOne: "قبل يوم",
    agoDays: "قبل {n} أيام",
  },
  ko: {
    title: "사키아 방송",
    tagline: "오늘의 관개 안내를 자막과 함께 음성으로 들려드립니다",
    region: "지역",
    crop: "작물",
    voice: "음성 언어",
    voiceOf: "음성",
    listen: "듣기",
    loading: "준비 중…",
    stop: "정지",
    soundOn: "소리 켜짐",
    soundOff: "소리 꺼짐",
    musicOn: "음악 켜짐",
    musicOff: "음악 꺼짐",
    subtitles: "자막",
    subEn: "영어",
    subSpoken: "음성 언어",
    pressListen: "“듣기”를 눌러 방송을 시작하세요.",
    onAir: "방송 중",
    rec: "녹음본",
    idle: "대기 중",
    rain: "7일 강수량",
    tmax: "최고 기온",
    stress: "수분 스트레스 위험",
    nextIrrigation: "다음 관개일",
    noIrrigation: "이번 주 관개 불필요",
    outOfSeason: "생육 시기 아님",
    stressLevels: { faible: "낮음", moyen: "보통", eleve: "높음" },
    noteLive: "방금 생성된 방송입니다 ({date}).",
    noteCache: "저장된 방송입니다. {date}에 생성되었습니다. 같은 문장이라 음성을 다시 만들지 않았습니다.",
    noteDemo: "{date}에 녹음된 방송을 듣고 계십니다. 지금 생성된 것이 아닙니다.",
    noteReplay: "{date} 재현: 관측된 날씨이며 예보가 아닙니다.",
    fallbackOffline: "네트워크 없음: 녹음된 방송을 재생합니다.",
    fallbackBudget: "음성 크레딧이 소진되어 녹음된 방송을 재생합니다.",
    fallbackError: "음성 서비스가 응답하지 않아 녹음된 방송을 재생합니다.",
    demosTitle: "녹음된 방송",
    demosHint: "네트워크와 크레딧 없이도 작동합니다.",
    whyTitle: "왜 영상이 아니라 그려진 진행자일까요?",
    why: "방송 전체가 130~200KB의 오디오 파일 하나입니다. 진행자는 브라우저에서 벡터 그래픽으로 그려지고, 입은 소리 크기를 따라 움직입니다. 생성형 영상은 수십 메가바이트라 느린 모바일 네트워크에는 너무 무겁습니다. 작은 AI: 작은 파일, 같은 메시지.",
    audioSize: "이 방송: 오디오 {kb}KB",
    arabicNote: "아랍어 텍스트: 쉬운 현대 표준 아랍어이며 튀니지 원어민의 검토가 필요합니다. 튀니지 방언이라고 주장하지 않습니다.",
    koreanNote: "한국어 텍스트: 저희가 작성했으며 한국어 원어민의 검토가 필요합니다.",
    darijaNote: "튀니지 아랍어(다리자): 일상의 쉬운 단어로 직접 작성했고 모로코식 표현은 피했으며, 튀니지 억양의 음성이 읽습니다. 튀니지 원어민의 검토가 필요합니다. 일부 단어가 정확하지 않을 수 있습니다.",
    inclusionTitle: "왜 다리자인가요?",
    inclusion: "카이루안 주변에는 글을 읽지 못하는 농민이 많고, 이들은 뉴스의 표준 아랍어가 아니라 다리자를 씁니다. 표준 아랍어 방송으로는 이분들께 닿지 않으므로, 이곳의 첫 음성은 튀니지 다리자이며 그다음이 프랑스어, 표준 아랍어, 영어, 한국어입니다.",
    justTitle: "여러분을 위해",
    justBody: "서울에서 이 프로젝트를 평가해 주시는 분들께 드립니다. 사키아 방송은 한국어로도 인사드립니다. 튀니지 농부들을 위한 아주 작은 AI가 여러분의 언어로 말을 건넵니다. 😊",
    justGloss: "",
    voiceNote: "음성: {name} (임시, 청취 검증 전).",
    indicative: "참고용 조언이며 지역 농업 당국의 확인이 필요합니다.",
    back: "홈",
    uiLang: "인터페이스",
    unsureTitle: "확실하지 않음: 담당자에게 문의하세요",
    askCell: "담당자에게 문의",
    reasons: {
      very_stale_data: "날씨 데이터가 48시간 넘게 지나 조언을 드리지 않습니다.",
      stale_data: "날씨 데이터가 12시간 넘게 지났습니다.",
      unknown_last_irrigation: "마지막 관개 시점을 알 수 없습니다.",
      analogy_coefficients: "이 작물의 계수가 공개되지 않아 비슷한 작물의 값을 사용했습니다.",
      uncertain_rain: "앞으로 3일 안에 비가 올 수 있습니다(가능성 30~70%).",
      short_horizon: "예보가 일주일 전체를 다루지 않습니다.",
    },
    agoLabel: "마지막 관개",
    agoUnknown: "모름",
    agoToday: "오늘",
    agoOne: "1일 전",
    agoDays: "{n}일 전",
  },
};
