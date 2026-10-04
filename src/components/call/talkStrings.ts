// Libellés de la page /call/talk (agent vocal) en anglais, français et arabe. L'anglais sert aussi de repli quand une clé manque.
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.

import type { UiLang } from "./strings";

type Dict = Record<string, string>;

const en: Dict = {
  title: "Talk to Sakia",
  intro: "Say your crop and your region, in English, French or Arabic.",
  whyAi:
    "This is where AI earns its place: a spreadsheet or an SMS menu cannot understand a farmer who speaks Arabic, French or a mix of both. The irrigation calculation itself stays deterministic, so it can be checked.",
  langOrder:
    "The agent understands Arabic, spoken or standard, and French. It greets in simple standard Arabic, then answers in the language of the farmer's last message (simple standard Arabic or French). English only appears as subtitles of the engine's answer.",
  start: "Talk to Sakia",
  stop: "End the conversation",
  again: "Talk again",
  connecting: "Connecting…",
  live: "Listening… speak now",
  liveNoMic: "No microphone available: type your sentence below. The agent still answers out loud.",
  speaking: "Sakia is speaking",
  ended: "Conversation ended",
  maxCall: "A conversation lasts 2 minutes at most.",
  typeLabel: "Or type your sentence",
  typePlaceholder: "I grow olives in Kairouan",
  send: "Send",
  you: "You",
  agent: "Sakia",
  understoodTitle: "What the agent understood",
  moreTitle: "How it works",
  fieldSaved: "Your field is saved: {crop} · {region}.",
  seePlan: "See my plan",
  crop: "Crop",
  region: "Region",
  lastIrrigation: "Last irrigation",
  unknownIrrigation: "not known (so the engine will say “not sure”)",
  daysAgo: "{n} days ago",
  dayAgo: "1 day ago",
  today: "today",
  spokenLanguage: "Language of the answer",
  engineAnswer: "Answer of the irrigation engine (read by the agent)",
  guardAsk: "Not sure: please ask an agricultural technician (CRDA).",
  guardOk: "No reservation from the engine on this advice.",
  waiting: "Nothing to show: start a conversation.",
  errorTitle: "The voice agent is not available",
  measuredTitle: "How well does it understand? (measured, not promised)",
  measured:
    "{passed} of {n} written test phrases handled correctly (Arabic, Tunisian Arabic, French, mixes, off-topic questions). Crop and region found: {both}. Answer read word for word: {verbatim}. Median time to call the engine: {ms} ms. These phrases were written by us and typed, not spoken: real farmers' speech will be harder.",
  limits: "Limits: speech recognition of the Tunisian dialect is not guaranteed; the AI agent can misunderstand and then asks again or refuses; the advice is indicative and a person decides. The answer is read in English, simple standard Arabic or French.",
  backToKeypad: "Back to the keypad phone",
  noAgent: "The voice agent has not been created.",
};

const fr: Dict = {
  title: "Parler à Sakia",
  intro: "Dites votre culture et votre région, en anglais, français ou arabe.",
  whyAi:
    "C'est ici que l'IA sert vraiment : un tableur ou un menu de SMS ne comprend pas un agriculteur qui parle arabe, français ou un mélange des deux. Le calcul d'irrigation, lui, reste déterministe, donc vérifiable.",
  langOrder:
    "L'agent comprend l'arabe, parlé ou standard, et le français. Il accueille en arabe standard simple, puis répond dans la langue du dernier message de l'agriculteur (arabe standard simple ou français). L'anglais n'apparaît que dans les sous-titres de la réponse du moteur.",
  start: "Parler à Sakia",
  stop: "Terminer la conversation",
  again: "Reparler",
  connecting: "Connexion…",
  live: "J'écoute… parlez maintenant",
  liveNoMic: "Pas de micro disponible : tapez votre phrase ci-dessous. L'agent répond quand même à voix haute.",
  speaking: "Sakia parle",
  ended: "Conversation terminée",
  maxCall: "Une conversation dure 2 minutes au plus.",
  typeLabel: "Ou tapez votre phrase",
  typePlaceholder: "J'ai des oliviers à Kairouan",
  send: "Envoyer",
  you: "Vous",
  agent: "Sakia",
  understoodTitle: "Ce que l'agent a compris",
  moreTitle: "Comment ça marche",
  fieldSaved: "Votre champ est enregistré : {crop} · {region}.",
  seePlan: "Voir mon plan",
  crop: "Culture",
  region: "Région",
  lastIrrigation: "Dernier arrosage",
  unknownIrrigation: "inconnu (le moteur dira donc « pas sûr »)",
  daysAgo: "il y a {n} jours",
  dayAgo: "il y a 1 jour",
  today: "aujourd'hui",
  spokenLanguage: "Langue de la réponse",
  engineAnswer: "Réponse du moteur d'irrigation (lue par l'agent)",
  guardAsk: "Pas sûr : demandez à un technicien agricole (CRDA).",
  guardOk: "Aucune réserve du moteur sur ce conseil.",
  waiting: "Rien à afficher : lancez une conversation.",
  errorTitle: "L'agent vocal n'est pas disponible",
  measuredTitle: "Comprend-il bien ? (mesuré, pas promis)",
  measured:
    "{passed} phrases de test sur {n} traitées correctement (arabe, arabe tunisien, français, mélanges, questions hors sujet). Culture et région trouvées : {both}. Réponse lue mot pour mot : {verbatim}. Délai médian avant l'appel du moteur : {ms} ms. Ces phrases ont été écrites par nous et tapées, pas dites : la parole de vrais agriculteurs sera plus difficile.",
  limits: "Limites : la reconnaissance du dialecte tunisien n'est pas garantie ; l'agent peut mal comprendre, il redemande alors ou refuse ; le conseil est indicatif et une personne décide. La réponse est lue en anglais, en arabe standard simple ou en français.",
  backToKeypad: "Retour au téléphone à touches",
  noAgent: "L'agent vocal n'a pas été créé.",
};

const ar: Dict = {
  title: "تحدّث مع ساقية",
  intro: "قولوا المحصول والولاية، بالإنجليزية أو بالفرنسية أو بالعربية.",
  whyAi:
    "هنا يفيد الذكاء الاصطناعي حقا: جدول بيانات أو قائمة رسائل نصية لا تفهم فلاحا يتكلم بالدارجة أو بالفرنسية أو بخليط منهما. أما حساب السقي فيبقى حتميا، ولذلك يمكن التحقق منه.",
  langOrder:
    "يفهم الوكيل العربية (الدارجة أو الفصحى) والفرنسية، ويرحّب بعربية فصحى بسيطة ثم يجيب بلغة آخر رسالة للفلاح (عربية فصحى بسيطة أو الفرنسية). لا تظهر الإنجليزية إلا في ترجمة جواب المحرك.",
  start: "تحدثوا إلى ساقية",
  stop: "إنهاء المحادثة",
  again: "تحدثوا من جديد",
  connecting: "جارٍ الاتصال…",
  live: "أنا أسمع… تكلموا الآن",
  liveNoMic: "لا يوجد ميكروفون: اكتبوا جملتكم أسفله. يجيب الوكيل بصوت مسموع مع ذلك.",
  speaking: "ساقية تتكلم",
  ended: "انتهت المحادثة",
  maxCall: "تدوم المحادثة دقيقتين على الأكثر.",
  typeLabel: "أو اكتبوا جملتكم",
  typePlaceholder: "عندي زيتون في القيروان",
  send: "إرسال",
  you: "أنتم",
  agent: "ساقية",
  understoodTitle: "ما فهمه الوكيل",
  moreTitle: "كيف يعمل",
  fieldSaved: "تم حفظ حقلكم: {crop} · {region}.",
  seePlan: "عرض خطتي",
  crop: "المحصول",
  region: "الولاية",
  lastIrrigation: "آخر سقي",
  unknownIrrigation: "غير معروف (لذلك سيقول المحرك «غير متأكد»)",
  daysAgo: "قبل {n} أيام",
  dayAgo: "قبل يوم واحد",
  today: "اليوم",
  spokenLanguage: "لغة الجواب",
  engineAnswer: "جواب محرك السقي (يقرؤه الوكيل)",
  guardAsk: "لست متأكدا: اسألوا فنيا فلاحيا (CRDA).",
  guardOk: "لا تحفظ لدى المحرك على هذه النصيحة.",
  waiting: "لا شيء: ابدؤوا محادثة.",
  errorTitle: "الوكيل الصوتي غير متوفر",
  measuredTitle: "هل يفهم جيدا؟ (قياس وليس وعدا)",
  measured:
    "{passed} من {n} جملة اختبار عولجت بشكل صحيح (عربية، دارجة، فرنسية، خليط، أسئلة خارج الموضوع). المحصول والولاية: {both}. الجواب مقروء كلمة بكلمة: {verbatim}. المدة الوسطى قبل استدعاء المحرك: {ms} مللي ثانية. كتبنا هذه الجمل بأنفسنا وطبعناها، ولم تُنطق: كلام الفلاحين الحقيقيين أصعب.",
  limits: "الحدود: التعرف على الدارجة التونسية صوتيا غير مضمون؛ قد يسيء الوكيل الفهم فيعيد السؤال أو يرفض؛ النصيحة إرشادية والقرار لشخص. ويُقرأ الجواب بالإنجليزية أو بعربية فصحى بسيطة أو بالفرنسية.",
  backToKeypad: "العودة إلى الهاتف بالأزرار",
  noAgent: "لم يُنشأ الوكيل الصوتي.",
};

const DICTS: Record<UiLang, Dict> = { en, fr, ar };

export function tt(lang: UiLang, key: string, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang][key] ?? en[key] ?? key;
  return vars ? raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : raw;
}
