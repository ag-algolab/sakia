// Textes du faux téléphone et des bandeaux hors connexion, en français, arabe et anglais.
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien.
// Pas de "use client" : utilisable aussi par les pages serveur (page hors connexion).

export type UiLang = "fr" | "ar" | "en";
export const UI_LANGS: UiLang[] = ["en", "ar", "fr"]; // anglais d'abord (le jury), puis l'arabe, puis le français

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
  // inscription : région et culture obligatoires, sans valeur par défaut
  signupTitle: string;
  signupIntro: string;
  regionError: string;
  cropError: string;
  signupMissing: string;
  signupDone: (crop: string, region: string) => string;
  prefilled: string;
  changeChoice: string;
  // le téléphone à touches
  phoneLabel: string;
  screenLabel: string;
  keypadLabel: string;
  keyLeft: string;
  keyRight: string;
  keyCall: string;
  keyEnd: string;
  simBadge: string;
  seeSms: string;
  seeSmsNote: string;
  simCall: string;
  simCallNote: string;
  talkSakia: string; // parler à l'agent vocal (changer de culture ou de région en le disant)
  moreTitle: string; // pli « comment marche cette simulation »
  simulatedDetail: string;
  // écran du téléphone (LCD)
  lcdPickChoice: string;
  lcdNextSms: string;
  lcdTomorrow: string;
  lcdWaitingPlan: string;
  lcdNewMsg: string;
  lcdLangTitle: string;
  lcdStopQ: string;
  lcdYes: string;
  lcdNo: string;
  lcdSending: string;
  lcdSentText: string;
  lcdFailed: string;
  lcdFailedWhy: string;
  lcdRinging: string;
  lcdConnecting: string;
  lcdStopped: string;
  lcdUnavailable: string;
  softRead: string;
  softBack: string;
  softMessages: string;
  softAnswer: string;
  softDecline: string;
  softResume: string;
  srNewMessage: string;
  // touches : libellé court (écran) et ce qu'elles font
  keysTitle: string;
  keysIntro: string;
  kHelp: string;
  kLang: string;
  kStop: string;
  kHelpDesc: string;
  kLangDesc: string;
  kStopDesc: string;
  kBackDesc: string;
  // journal des échanges avec le serveur
  logTitle: string;
  logIntro: string;
  logEmpty: string;
  logOut: string;
  logIn: string;
  logAuto: string;
  // saisie à la main (pour les curieux)
  curiousSummary: string;
  curiousIntro: string;
  // « Mon plan » : choix repris de l'inscription
  planNeedChoice: string;
};

export const STRINGS: Record<UiLang, Strings> = {
  fr: {
    truth: "Marche sans internet après une première visite (vérifié dans Chrome, pas en mode avion sur un téléphone).",
    offline: "Hors connexion",
    lastPlan: "dernier plan mis à jour",
    noPlan: "aucun plan enregistré sur cet appareil",
    phoneTitle: "Téléphone à touches : le SMS du matin",
    phoneIntro: "Le plan des 7 jours arrive chaque matin en un SMS. On répond avec les touches.",
    simulated: "SIMULATION : aucun vrai SMS, aucun vrai appel, aucun vrai numéro.",
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
    openPhone: "Téléphone à touches (simulé)",
    planTitle: "Mon plan, calculé sur cet appareil",
    planIntro: "Calculé dans votre téléphone avec la dernière météo gardée, même sans réseau.",
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
    languagesBody: "Anglais, arabe tunisien (lettres arabes ou « arabizi ») et français, fautes de frappe tolérées. Mesuré :",
    measured: (ok, total) => `${ok} phrases comprises sur ${total}`,
    measuredCaveat: "Phrases écrites par l'équipe, pas par des agriculteurs : pas une mesure de terrain.",
    signupTitle: "Inscription au SMS du matin",
    signupIntro: "Région et culture obligatoires. Sans le dernier arrosage, le SMS dit « pas sûr ».",
    regionError: "Choisissez une région.",
    cropError: "Choisissez une culture.",
    signupMissing: "Choisissez une région et une culture pour recevoir le SMS.",
    signupDone: (crop, region) => `Inscription faite : ${crop} · ${region}.`,
    prefilled: "Repris du profil enregistré sur cet appareil.",
    changeChoice: "Modifier",
    phoneLabel: "Téléphone à touches simulé",
    screenLabel: "Écran du téléphone",
    keypadLabel: "Touches du téléphone",
    keyLeft: "Touche gauche sous l'écran",
    keyRight: "Touche droite sous l'écran",
    keyCall: "Touche verte : appeler ou décrocher",
    keyEnd: "Touche rouge : raccrocher ou revenir à l'accueil",
    simBadge: "Téléphone simulé",
    seeSms: "Voir le SMS de 6 h du matin",
    seeSmsNote: "Calculé maintenant, avec la météo du jour.",
    simCall: "Simuler un appel",
    simCallNote: "On écoute le conseil, on choisit avec les touches.",
    talkSakia: "Parler à Sakia",
    moreTitle: "Comment marche cette simulation",
    simulatedDetail:
      "Calculé maintenant avec la météo du jour par le vrai moteur. Aucun opérateur branché : c'est le serveur qui répond.",
    lcdPickChoice: "Choisissez région et culture au-dessus",
    lcdNextSms: "Prochain SMS à 06:00",
    lcdTomorrow: "demain",
    lcdWaitingPlan: "Calcul du SMS…",
    lcdNewMsg: "1 nouveau message",
    lcdLangTitle: "Langue des SMS",
    lcdStopQ: "Arrêter les SMS et effacer vos réglages ?",
    lcdYes: "Oui",
    lcdNo: "Non",
    lcdSending: "Envoi…",
    lcdSentText: "SMS envoyé :",
    lcdFailed: "Message non envoyé",
    lcdFailedWhy: "Pas de réseau, ou service indisponible.",
    lcdRinging: "Appel entrant",
    lcdConnecting: "Connexion à la ligne vocale…",
    lcdStopped: "SMS arrêtés",
    lcdUnavailable: "Impossible de calculer le SMS pour l'instant.",
    softRead: "Lire",
    softBack: "Retour",
    softMessages: "Messages",
    softAnswer: "Décrocher",
    softDecline: "Refuser",
    softResume: "Reprendre",
    srNewMessage: "Nouveau message de Sakia.",
    keysTitle: "Répondre avec les touches",
    keysIntro: "Chaque touche envoie un court SMS. Le serveur de Sakia répond.",
    kHelp: "Aide",
    kLang: "Langue",
    kStop: "Stop",
    kHelpDesc: "Recevoir le message d'aide du service.",
    kLangDesc: "Choisir la langue des SMS : anglais, arabe ou français.",
    kStopDesc: "Effacer vos réglages et arrêter les SMS.",
    kBackDesc: "Revenir en arrière.",
    logTitle: "Messages échangés avec le serveur",
    logIntro: "Ce que le téléphone a vraiment envoyé à POST /api/sms/incoming, et ce que le serveur a répondu.",
    logEmpty: "Aucun message : le serveur n'est appelé que lorsque vous appuyez sur une touche de réponse.",
    logOut: "Envoyé",
    logIn: "Reçu",
    logAuto: "automatique : règle la langue des réponses",
    curiousSummary: "Pour les curieux : écrire un SMS en arabizi",
    curiousIntro:
      "Réservé aux curieux et aux techniciens. Un agriculteur peut aussi écrire lui-même « zitoun kairouan » : le serveur comprend les noms de cultures et de régions écrits à la main (arabe, arabizi, français), avec des fautes de frappe tolérées. Ce n'est pas le parcours principal.",
    planNeedChoice: "Choisissez d'abord une région et une culture dans l'inscription, plus haut.",
  },
  ar: {
    truth: "تعمل بدون إنترنت بعد التحميل الأول (جُرّبت في Chrome، ولم تُجرَّب في وضع الطيران على هاتف).",
    offline: "بدون اتصال",
    lastPlan: "آخر تحديث للخطة",
    noPlan: "لا توجد خطة محفوظة على هذا الجهاز",
    phoneTitle: "هاتف بأزرار: رسالة الصباح",
    phoneIntro: "تصل خطة 7 أيام كل صباح في رسالة SMS واحدة. الرد يكون بالأزرار.",
    simulated: "محاكاة: لا رسالة حقيقية، ولا مكالمة حقيقية، ولا رقم حقيقي.",
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
    openPhone: "الهاتف بأزرار (محاكاة)",
    planTitle: "خطتي، محسوبة على هذا الجهاز",
    planIntro: "يتم الحساب داخل هاتفك بآخر طقس محفوظ، حتى بدون شبكة.",
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
    languagesBody: "الإنجليزية، والعربية التونسية (بالحروف العربية وبالحروف اللاتينية «عربيزي»)، والفرنسية، مع التسامح مع أخطاء الكتابة. ما تم قياسه:",
    measured: (ok, total) => `${ok} جملة مفهومة من ${total}`,
    measuredCaveat: "جمل كتبها الفريق، لا الفلاحون: ليس قياسا ميدانيا.",
    signupTitle: "الاشتراك في رسالة الصباح",
    signupIntro: "الولاية والمحصول إلزاميان. من دون آخر سقية تقول الرسالة «غير متأكد».",
    regionError: "اختر الولاية.",
    cropError: "اختر المحصول.",
    signupMissing: "اختر الولاية والمحصول لتصلك الرسالة.",
    signupDone: (crop, region) => `تم الاشتراك: ${crop} · ${region}.`,
    prefilled: "مأخوذة من الملف المحفوظ على هذا الجهاز.",
    changeChoice: "تعديل",
    phoneLabel: "هاتف بأزرار (محاكاة)",
    screenLabel: "شاشة الهاتف",
    keypadLabel: "أزرار الهاتف",
    keyLeft: "الزر الأيسر تحت الشاشة",
    keyRight: "الزر الأيمن تحت الشاشة",
    keyCall: "الزر الأخضر: اتصال أو رد",
    keyEnd: "الزر الأحمر: إنهاء أو العودة إلى الرئيسية",
    simBadge: "هاتف محاكى",
    seeSms: "شاهد رسالة السادسة صباحا",
    seeSmsNote: "محسوبة الآن بطقس اليوم.",
    simCall: "محاكاة مكالمة",
    simCallNote: "تستمع إلى النصيحة وتختار بالأزرار.",
    talkSakia: "تحدّث مع ساقية",
    moreTitle: "كيف تعمل هذه المحاكاة",
    simulatedDetail:
      "تُحسب رسالة الصباح الآن بطقس اليوم، بنفس المحرك الذي تستعمله خدمة الرسائل؛ ولا يوجد أي مشغّل متصل: الخادم هو الذي يجيب.",
    lcdPickChoice: "اختر الولاية والمحصول فوق",
    lcdNextSms: "الرسالة القادمة 06:00",
    lcdTomorrow: "غدا",
    lcdWaitingPlan: "جار تحضير الرسالة…",
    lcdNewMsg: "رسالة جديدة واحدة",
    lcdLangTitle: "لغة الرسائل",
    lcdStopQ: "إيقاف الرسائل ومسح إعداداتك؟",
    lcdYes: "نعم",
    lcdNo: "لا",
    lcdSending: "جار الإرسال…",
    lcdSentText: "الرسالة المرسلة:",
    lcdFailed: "لم تُرسل الرسالة",
    lcdFailedWhy: "لا توجد شبكة أو الخدمة غير متوفرة.",
    lcdRinging: "مكالمة واردة",
    lcdConnecting: "جار الاتصال بالخط الصوتي…",
    lcdStopped: "توقفت الرسائل",
    lcdUnavailable: "تعذر حساب الرسالة الآن.",
    softRead: "اقرأ",
    softBack: "رجوع",
    softMessages: "الرسائل",
    softAnswer: "رد",
    softDecline: "رفض",
    softResume: "استئناف",
    srNewMessage: "رسالة جديدة من ساقية.",
    keysTitle: "الرد بالأزرار",
    keysIntro: "كل زر يرسل رسالة قصيرة. وخادم ساقية هو الذي يرد.",
    kHelp: "مساعدة",
    kLang: "اللغة",
    kStop: "إيقاف",
    kHelpDesc: "استقبال رسالة المساعدة من الخدمة.",
    kLangDesc: "اختيار لغة الرسائل: الإنجليزية أو العربية أو الفرنسية.",
    kStopDesc: "مسح إعداداتك وإيقاف الرسائل.",
    kBackDesc: "الرجوع إلى الخلف.",
    logTitle: "الرسائل المتبادلة مع الخادم",
    logIntro: "ما أرسله الهاتف فعلا إلى POST /api/sms/incoming وما ردّ به الخادم.",
    logEmpty: "لا شيء: لا يُستدعى الخادم إلا عند الضغط على زر رد.",
    logOut: "أُرسل",
    logIn: "وصل",
    logAuto: "تلقائي: يضبط لغة الردود",
    curiousSummary: "للفضوليين: كتابة رسالة بالعربيزي",
    curiousIntro:
      "للفضوليين والتقنيين فقط. يمكن للفلاح أيضا أن يكتب بنفسه «زيتون القيروان»: يفهم الخادم أسماء المحاصيل والولايات المكتوبة باليد (بالعربية أو العربيزي أو الفرنسية)، مع التسامح مع أخطاء الكتابة. هذا ليس المسار الرئيسي.",
    planNeedChoice: "اختر أولا الولاية والمحصول في الاشتراك أعلاه.",
  },
  en: {
    truth: "Works without internet after one visit (checked in Chrome, not on a phone in airplane mode).",
    offline: "Offline",
    lastPlan: "last plan updated",
    noPlan: "no plan saved on this device",
    phoneTitle: "Keypad phone: the morning SMS",
    phoneIntro: "The 7-day plan arrives every morning as one SMS. Reply with the keys.",
    simulated: "SIMULATION: no real SMS, no real call, no real phone number.",
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
    openPhone: "Keypad phone (simulated)",
    planTitle: "My plan, computed on this device",
    planIntro: "Computed on your phone with the last saved weather, even with no network.",
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
    languagesBody: "English, Tunisian Arabic (Arabic letters or “arabizi”) and French, typing mistakes tolerated. Measured:",
    measured: (ok, total) => `${ok} of ${total} sentences understood`,
    measuredCaveat: "Sentences written by our team, not by farmers: not a field measurement.",
    signupTitle: "Sign up for the morning SMS",
    signupIntro: "Region and crop are required. Without your last watering, the SMS says “not sure”.",
    regionError: "Choose a region.",
    cropError: "Choose a crop.",
    signupMissing: "Choose a region and a crop to receive the SMS.",
    signupDone: (crop, region) => `Signed up: ${crop} · ${region}.`,
    prefilled: "From the profile saved on this device.",
    changeChoice: "Change",
    phoneLabel: "Simulated keypad phone",
    screenLabel: "Phone screen",
    keypadLabel: "Phone keys",
    keyLeft: "Left key under the screen",
    keyRight: "Right key under the screen",
    keyCall: "Green key: call or answer",
    keyEnd: "Red key: hang up or go back to the home screen",
    simBadge: "Simulated phone",
    seeSms: "See the 6 a.m. SMS",
    seeSmsNote: "Worked out now, with today's weather.",
    simCall: "Simulate a call",
    simCallNote: "Listen to the advice, choose with the keys.",
    talkSakia: "Talk to Sakia",
    moreTitle: "How this simulation works",
    simulatedDetail:
      "Worked out now with today's weather by the real engine. No operator is connected: the server answers.",
    lcdPickChoice: "Choose region and crop above",
    lcdNextSms: "Next SMS at 06:00",
    lcdTomorrow: "tomorrow",
    lcdWaitingPlan: "Preparing the SMS…",
    lcdNewMsg: "1 new message",
    lcdLangTitle: "SMS language",
    lcdStopQ: "Stop the SMS and erase your settings?",
    lcdYes: "Yes",
    lcdNo: "No",
    lcdSending: "Sending…",
    lcdSentText: "SMS sent:",
    lcdFailed: "Message not sent",
    lcdFailedWhy: "No network, or service unavailable.",
    lcdRinging: "Incoming call",
    lcdConnecting: "Connecting to the voice line…",
    lcdStopped: "SMS stopped",
    lcdUnavailable: "Cannot work out the SMS right now.",
    softRead: "Read",
    softBack: "Back",
    softMessages: "Messages",
    softAnswer: "Answer",
    softDecline: "Decline",
    softResume: "Resume",
    srNewMessage: "New message from Sakia.",
    keysTitle: "Reply with the keys",
    keysIntro: "Each key sends a short SMS. Sakia's server answers.",
    kHelp: "Help",
    kLang: "Language",
    kStop: "Stop",
    kHelpDesc: "Receive the service's help message.",
    kLangDesc: "Choose the SMS language: English, Arabic or French.",
    kStopDesc: "Erase your settings and stop the SMS.",
    kBackDesc: "Go back.",
    logTitle: "Messages exchanged with the server",
    logIntro: "What the phone really sent to POST /api/sms/incoming, and what the server answered.",
    logEmpty: "No messages: the server is only called when you press a reply key.",
    logOut: "Sent",
    logIn: "Received",
    logAuto: "automatic: sets the language of the replies",
    curiousSummary: "For the curious: typing an SMS in Arabizi",
    curiousIntro:
      "For the curious and for technicians. A farmer can also write “zitoun kairouan” by hand: the server understands crop and region names written by hand (Arabic, Arabizi, French), with typing mistakes tolerated. This is not the main path.",
    planNeedChoice: "First choose a region and a crop in the sign-up above.",
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
