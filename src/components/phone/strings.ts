// Textes du faux téléphone et des bandeaux hors connexion, en français, arabe et anglais.
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.
// Pas de "use client" : utilisable aussi par les pages serveur (page hors connexion).

export type UiLang = "fr" | "ar" | "en";
export const UI_LANGS: UiLang[] = ["fr", "ar", "en"];

export type Strings = {
  truth: string; // ce qui est vrai de l'appli hors connexion
  offline: string;
  lastPlan: string; // suivi de « il y a X h »
  noPlan: string;
  phoneTitle: string;
  phoneIntro: string;
  simulated: string;
  placeholder: string;
  send: string;
  erase: string;
  signalOn: string;
  signalOff: string;
  noSignal: string;
  waiting: string; // message en attente
  failed: string;
  sentTo: string;
  lastMessage: string;
  fromYou: string;
  fromSakia: string;
  examples: string;
  install: string;
  clearHistory: string;
  fakeNumber: string;
  smsCount: (n: number) => string;
  limitNote: string;
  offlineTitle: string;
  offlineBody: string;
  retry: string;
  home: string;
  openPhone: string;
  // plan calculé sur l'appareil
  planTitle: string;
  planIntro: string;
  regionLabel: string;
  cropLabel: string;
  lastIrrigLabel: string;
  unknownOpt: string;
  todayOpt: string;
  daysAgoOpt: (n: number) => string;
  onlineNote: (age: string) => string;
  offlineNote: (age: string) => string;
  noData: string;
  tooOld: string;
  askPerson: string;
  smsPreview: string;
  refresh: string;
  languagesTitle: string;
  languagesBody: string;
  measured: (ok: number, total: number) => string;
  measuredCaveat: string;
};

export const STRINGS: Record<UiLang, Strings> = {
  fr: {
    truth: "Fonctionne sans internet après un premier chargement ; ne remplace pas le réseau mobile.",
    offline: "Hors connexion",
    lastPlan: "dernier plan mis à jour",
    noPlan: "aucun plan enregistré sur cet appareil",
    phoneTitle: "Téléphone à touches (SMS simulé)",
    phoneIntro: "Un téléphone basique suffit : on écrit « olivier kairouan » (ou « zitoun kairouan », ou en arabe) et le plan des 7 jours revient en un SMS.",
    simulated: "Simulation : aucun vrai SMS n'est envoyé, aucun vrai numéro n'est utilisé. Le texte passe par la même porte qu'un fournisseur de SMS réel.",
    placeholder: "Écrire un message…",
    send: "Envoyer",
    erase: "Effacer",
    signalOn: "Signal : couper",
    signalOff: "Signal : rétablir",
    noSignal: "Pas de signal",
    waiting: "message en attente",
    failed: "échec d'envoi",
    sentTo: "Envoyé",
    lastMessage: "dernier message reçu",
    fromYou: "Moi",
    fromSakia: "Sakia",
    examples: "Essayer",
    install: "Installer : menu du navigateur → « Installer l'application » (Chrome) ou « Sur l'écran d'accueil » (iPhone).",
    clearHistory: "Vider la conversation",
    fakeNumber: "Numéro fictif",
    smsCount: (n) => `${n} SMS`,
    limitNote: "160 caractères par SMS ; en arabe, 70.",
    offlineTitle: "Pas de connexion",
    offlineBody: "Cette page n'est pas encore gardée sur cet appareil. Ouvrez Sakia une fois avec internet : ensuite l'application et le dernier plan s'ouvrent sans internet.",
    retry: "Réessayer",
    home: "Accueil",
    openPhone: "Téléphone SMS",
    planTitle: "Mon plan, calculé sur cet appareil",
    planIntro: "Le calcul se fait dans votre téléphone avec la dernière météo gardée : changez la culture ou le dernier arrosage, même sans réseau.",
    regionLabel: "Région",
    cropLabel: "Culture",
    lastIrrigLabel: "Dernier arrosage",
    unknownOpt: "je ne sais pas",
    todayOpt: "aujourd'hui",
    daysAgoOpt: (n) => `il y a ${n} jour${n > 1 ? "s" : ""}`,
    onlineNote: (age) => `En ligne · météo mise à jour ${age}`,
    offlineNote: (age) => `Hors connexion · plan recalculé sur l'appareil avec la météo gardée ${age}`,
    noData: "Pas encore de météo gardée sur cet appareil : connectez-vous une fois pour la télécharger.",
    tooOld: "La météo gardée est trop ancienne pour la date d'aujourd'hui : connectez-vous pour la renouveler.",
    askPerson: "Pas sûr : demandez à une personne (technicien agricole, CRDA).",
    smsPreview: "Ce que recevrait un téléphone basique",
    refresh: "Actualiser",
    languagesTitle: "Langues comprises par le SMS",
    languagesBody: "Arabe tunisien (écriture arabe et écriture latine « arabizi »), français et anglais, avec tolérance aux fautes de frappe. Le dialecte n'est pas garanti : voici ce qui a été mesuré.",
    measured: (ok, total) => `${ok} phrases comprises sur ${total}`,
    measuredCaveat: "Phrases écrites à la main par l'équipe, pas recueillies auprès d'agriculteurs : ce n'est pas une mesure sur le terrain.",
  },
  ar: {
    truth: "تعمل بدون إنترنت بعد التحميل الأول، ولا تعوّض شبكة الهاتف.",
    offline: "بدون اتصال",
    lastPlan: "آخر تحديث للخطة",
    noPlan: "لا توجد خطة محفوظة على هذا الجهاز",
    phoneTitle: "هاتف بأزرار (رسائل نصية تجريبية)",
    phoneIntro: "يكفي هاتف بسيط: اكتب «زيتون القيروان» (أو «zitoun kairouan») فتصلك خطة 7 أيام في رسالة واحدة.",
    simulated: "تجربة فقط: لا تُرسل أي رسالة حقيقية ولا يُستعمل أي رقم حقيقي. النص يمر بنفس البوابة التي يستعملها مزوّد رسائل حقيقي.",
    placeholder: "اكتب رسالة…",
    send: "إرسال",
    erase: "مسح",
    signalOn: "الإشارة: قطع",
    signalOff: "الإشارة: إعادة",
    noSignal: "لا توجد إشارة",
    waiting: "رسالة في الانتظار",
    failed: "فشل الإرسال",
    sentTo: "أُرسلت",
    lastMessage: "آخر رسالة وصلت",
    fromYou: "أنا",
    fromSakia: "ساقية",
    examples: "جرّب",
    install: "للتثبيت: قائمة المتصفح ← «تثبيت التطبيق» (Chrome) أو «إلى الشاشة الرئيسية» (iPhone).",
    clearHistory: "مسح المحادثة",
    fakeNumber: "رقم وهمي",
    smsCount: (n) => `${n} SMS`,
    limitNote: "160 حرفا في الرسالة، و70 بالعربية.",
    offlineTitle: "لا يوجد اتصال",
    offlineBody: "هذه الصفحة غير محفوظة بعد على هذا الجهاز. افتح ساقية مرة واحدة مع الإنترنت، وبعدها يعمل التطبيق وآخر خطة بدون إنترنت.",
    retry: "إعادة المحاولة",
    home: "الرئيسية",
    openPhone: "الهاتف التجريبي",
    planTitle: "خطتي، محسوبة على هذا الجهاز",
    planIntro: "يتم الحساب داخل هاتفك بآخر طقس محفوظ: غيّر المحصول أو آخر سقية، حتى بدون شبكة.",
    regionLabel: "الولاية",
    cropLabel: "المحصول",
    lastIrrigLabel: "آخر سقية",
    unknownOpt: "لا أعرف",
    todayOpt: "اليوم",
    daysAgoOpt: (n) => `منذ ${n} أيام`,
    onlineNote: (age) => `متصل · تحديث الطقس ${age}`,
    offlineNote: (age) => `بدون اتصال · أُعيد حساب الخطة على الجهاز بطقس محفوظ ${age}`,
    noData: "لا يوجد طقس محفوظ على هذا الجهاز بعد: اتصل مرة واحدة لتحميله.",
    tooOld: "الطقس المحفوظ قديم جدا بالنسبة لتاريخ اليوم: اتصل لتجديده.",
    askPerson: "غير متأكد: اسأل شخصا (فني فلاحي، المندوبية الجهوية).",
    smsPreview: "ما يصل إلى هاتف بسيط",
    refresh: "تحديث",
    languagesTitle: "اللغات التي تفهمها الرسائل النصية",
    languagesBody: "العربية التونسية (بالحروف العربية وبالحروف اللاتينية «عربيزي»)، والفرنسية والإنجليزية، مع التسامح مع أخطاء الكتابة. اللهجة غير مضمونة: هذا ما تم قياسه.",
    measured: (ok, total) => `${ok} جملة مفهومة من ${total}`,
    measuredCaveat: "جمل كتبها الفريق يدويا، لم تُجمع من فلاحين: ليس قياسا ميدانيا.",
  },
  en: {
    truth: "Works without internet after a first load; it does not replace the mobile network.",
    offline: "Offline",
    lastPlan: "last plan updated",
    noPlan: "no plan saved on this device",
    phoneTitle: "Keypad phone (simulated SMS)",
    phoneIntro: "A basic phone is enough: type “olivier kairouan” (or “zitoun kairouan”, or in Arabic) and the 7-day plan comes back as one SMS.",
    simulated: "Simulation: no real SMS is sent and no real phone number is used. The text goes through the same door a real SMS provider would use.",
    placeholder: "Write a message…",
    send: "Send",
    erase: "Delete",
    signalOn: "Signal: cut",
    signalOff: "Signal: restore",
    noSignal: "No signal",
    waiting: "message waiting",
    failed: "send failed",
    sentTo: "Sent",
    lastMessage: "last message received",
    fromYou: "Me",
    fromSakia: "Sakia",
    examples: "Try",
    install: "Install: browser menu → “Install app” (Chrome) or “Add to Home Screen” (iPhone).",
    clearHistory: "Clear conversation",
    fakeNumber: "Fake number",
    smsCount: (n) => `${n} SMS`,
    limitNote: "160 characters per SMS; 70 in Arabic.",
    offlineTitle: "No connection",
    offlineBody: "This page is not saved on this device yet. Open Sakia once with internet: after that the app and the last plan open without internet.",
    retry: "Try again",
    home: "Home",
    openPhone: "SMS phone",
    planTitle: "My plan, computed on this device",
    planIntro: "The calculation runs inside your phone using the last weather it kept: change the crop or the last irrigation, even without a network.",
    regionLabel: "Region",
    cropLabel: "Crop",
    lastIrrigLabel: "Last irrigation",
    unknownOpt: "I don't know",
    todayOpt: "today",
    daysAgoOpt: (n) => `${n} day${n > 1 ? "s" : ""} ago`,
    onlineNote: (age) => `Online · weather updated ${age}`,
    offlineNote: (age) => `Offline · plan recomputed on the device with weather kept ${age}`,
    noData: "No weather saved on this device yet: connect once to download it.",
    tooOld: "The saved weather is too old for today's date: connect to renew it.",
    askPerson: "Not sure: ask a person (agricultural technician, CRDA).",
    smsPreview: "What a basic phone would receive",
    refresh: "Refresh",
    languagesTitle: "Languages the SMS understands",
    languagesBody: "Tunisian Arabic (Arabic script and Latin-letter “arabizi”), French and English, tolerating typing mistakes. The dialect is not guaranteed: here is what was measured.",
    measured: (ok, total) => `${ok} of ${total} sentences understood`,
    measuredCaveat: "Sentences written by hand by the team, not collected from farmers: this is not a field measurement.",
  },
};

// « il y a 3 h », « 3 h ago », « منذ 3 ساعات » : la formulation vient du navigateur.
export function formatAge(ms: number, lang: UiLang): string {
  const locale = lang === "ar" ? "ar-TN-u-nu-latn" : lang === "en" ? "en-GB" : "fr-FR";
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "short" });
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (minutes < 1) return rtf.format(0, "second");
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return rtf.format(-hours, "hour");
  return rtf.format(-Math.floor(hours / 24), "day");
}
