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
    truth: "Fonctionne sans internet après un premier chargement (vérifié dans Chrome, serveur arrêté ; non vérifié en mode avion sur un téléphone) ; ne remplace pas le réseau mobile.",
    offline: "Hors connexion",
    lastPlan: "dernier plan mis à jour",
    noPlan: "aucun plan enregistré sur cet appareil",
    phoneTitle: "Téléphone à touches : le SMS du matin (simulation)",
    phoneIntro: "Voici comment le plan des 7 jours arriverait chaque matin, en un SMS, sur un téléphone à touches. Rien à écrire : on répond avec les touches.",
    simulated: "SIMULATION : aucun vrai SMS n'est envoyé ni reçu, aucun vrai appel n'est passé, aucun vrai numéro n'est utilisé.",
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
    planIntro: "Le calcul se fait dans votre téléphone avec la dernière météo gardée : changez le dernier arrosage (ou la culture, dans l'inscription ci-dessus), même sans réseau.",
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
    signupTitle: "Inscription au SMS du matin",
    signupIntro: "Deux choix obligatoires : la région et la culture. Ajoutez le dernier arrosage : sans lui, le SMS dit « pas sûr ».",
    regionError: "Choisissez une région.",
    cropError: "Choisissez une culture.",
    signupMissing: "Choisissez une région et une culture pour recevoir le SMS.",
    signupDone: (crop, region) => `Inscription faite : ${crop} · ${region}.`,
    prefilled: "Choix repris du profil enregistré sur cet appareil : vous pouvez les changer.",
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
    simCallNote: "La ligne vocale simulée : on écoute le conseil et on choisit avec les touches.",
    simulatedDetail:
      "Le SMS du matin est calculé maintenant, avec la météo du jour, par le même moteur que le service SMS ; aucun opérateur n'est branché. Les réponses passent par la porte d'entrée SMS du serveur, comme celles d'un vrai fournisseur, et c'est le serveur qui répond.",
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
    keysIntro: "Ici, on répond sans écrire : chaque touche envoie un court message, identique à un SMS écrit à la main. C'est le serveur de Sakia qui répond.",
    kHelp: "Aide",
    kLang: "Langue",
    kStop: "Stop",
    kHelpDesc: "Recevoir le message d'aide du service.",
    kLangDesc: "Choisir la langue des SMS : français, arabe ou anglais.",
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
      "Réservé aux curieux et aux techniciens. Un agriculteur peut aussi écrire lui-même « zitoun kairouan » : le serveur comprend les noms de cultures et de régions écrits à la main (arabe, français, arabizi), avec des fautes de frappe tolérées. Ce n'est pas le parcours principal.",
    planNeedChoice: "Choisissez d'abord une région et une culture dans l'inscription, plus haut.",
  },
  ar: {
    truth: "تعمل بدون إنترنت بعد التحميل الأول (جُرّبت في Chrome مع إيقاف الخادم، ولم تُجرَّب في وضع الطيران على هاتف)، ولا تعوّض شبكة الهاتف.",
    offline: "بدون اتصال",
    lastPlan: "آخر تحديث للخطة",
    noPlan: "لا توجد خطة محفوظة على هذا الجهاز",
    phoneTitle: "هاتف بأزرار: رسالة الصباح (محاكاة)",
    phoneIntro: "هكذا تصل خطة 7 أيام كل صباح في رسالة SMS واحدة على هاتف بأزرار. لا شيء للكتابة: الرد يكون بالأزرار.",
    simulated: "محاكاة: لا تُرسل ولا تُستقبل أي رسالة حقيقية، ولا تُجرى أي مكالمة حقيقية، ولا يُستعمل أي رقم حقيقي.",
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
    planIntro: "يتم الحساب داخل هاتفك بآخر طقس محفوظ: غيّر آخر سقية (أو المحصول في الاشتراك أعلاه)، حتى بدون شبكة.",
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
    signupTitle: "الاشتراك في رسالة الصباح",
    signupIntro: "اختياران إلزاميان: الولاية والمحصول. أضف آخر سقية: من دونها تقول الرسالة «غير متأكد».",
    regionError: "اختر الولاية.",
    cropError: "اختر المحصول.",
    signupMissing: "اختر الولاية والمحصول لتصلك الرسالة.",
    signupDone: (crop, region) => `تم الاشتراك: ${crop} · ${region}.`,
    prefilled: "اختيارات مأخوذة من الملف المحفوظ على هذا الجهاز: يمكنك تغييرها.",
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
    simCallNote: "الخط الصوتي المحاكى: تستمع إلى النصيحة وتختار بالأزرار.",
    simulatedDetail:
      "تُحسب رسالة الصباح الآن بطقس اليوم، بنفس المحرك الذي تستعمله خدمة الرسائل؛ ولا يوجد أي مشغّل متصل. تمر الردود عبر بوابة الرسائل في الخادم كما يفعل مزوّد حقيقي، والخادم هو الذي يجيب.",
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
    keysIntro: "هنا نجيب دون كتابة: كل زر يرسل رسالة قصيرة مطابقة لرسالة نصية مكتوبة باليد. وخادم ساقية هو الذي يرد.",
    kHelp: "مساعدة",
    kLang: "اللغة",
    kStop: "إيقاف",
    kHelpDesc: "استقبال رسالة المساعدة من الخدمة.",
    kLangDesc: "اختيار لغة الرسائل: الفرنسية أو العربية أو الإنجليزية.",
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
      "للفضوليين والتقنيين فقط. يمكن للفلاح أيضا أن يكتب بنفسه «زيتون القيروان»: يفهم الخادم أسماء المحاصيل والولايات المكتوبة باليد (بالعربية أو الفرنسية أو العربيزي)، مع التسامح مع أخطاء الكتابة. هذا ليس المسار الرئيسي.",
    planNeedChoice: "اختر أولا الولاية والمحصول في الاشتراك أعلاه.",
  },
  en: {
    truth: "Works without internet after a first load (checked in Chrome with the server stopped; not checked in a phone's airplane mode); it does not replace the mobile network.",
    offline: "Offline",
    lastPlan: "last plan updated",
    noPlan: "no plan saved on this device",
    phoneTitle: "Keypad phone: the morning SMS (simulation)",
    phoneIntro: "This is how the 7-day plan would arrive each morning, as one SMS, on a keypad phone. Nothing to write: you reply with the keys.",
    simulated: "SIMULATION: no real SMS is sent or received, no real call is made, no real phone number is used.",
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
    planIntro: "The calculation runs inside your phone using the last weather it kept: change the last irrigation (or the crop, in the sign-up above), even without a network.",
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
    signupTitle: "Sign up for the morning SMS",
    signupIntro: "Two required choices: region and crop. Add your last irrigation: without it, the SMS says \"not sure\".",
    regionError: "Choose a region.",
    cropError: "Choose a crop.",
    signupMissing: "Choose a region and a crop to receive the SMS.",
    signupDone: (crop, region) => `Signed up: ${crop} · ${region}.`,
    prefilled: "Choices taken from the profile saved on this device: you can change them.",
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
    simCallNote: "The simulated voice line: you listen to the advice and choose with the keys.",
    simulatedDetail:
      "The morning SMS is worked out now, with today's weather, by the same engine as the SMS service; no operator is connected. Replies go through the server's SMS entry point, like those of a real provider, and the server does the answering.",
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
    keysIntro: "Here you reply without writing: each key sends a short message, identical to an SMS written by hand. Sakia's server does the answering.",
    kHelp: "Help",
    kLang: "Language",
    kStop: "Stop",
    kHelpDesc: "Receive the service's help message.",
    kLangDesc: "Choose the SMS language: French, Arabic or English.",
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
      "For the curious and for technicians. A farmer can also write “zitoun kairouan” by hand: the server understands crop and region names written by hand (Arabic, French, Arabizi), with typing mistakes tolerated. This is not the main path.",
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
