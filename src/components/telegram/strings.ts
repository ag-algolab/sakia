// Textes de la page /telegram en français, anglais, arabe et darija (les quatre langues du site).
// Les messages DU BOT, eux, restent dans la langue du bot (français, arabe ou anglais, choisie dans la conversation) :
// ils viennent de src/lib/telegram/i18n.ts, jamais d'ici. Aucun chiffre ni conseil d'irrigation n'est écrit ici.
// L'ARABE ET LA DARIJA SONT À FAIRE VALIDER par un locuteur tunisien (aucun des deux n'a été relu).
// Pas de "use client" : le fichier ne contient que des données.

import type { Lang } from "@/components/ui/i18n";

export type TgStrings = {
  eyebrow: string;
  title: string;
  lead: string;
  open: string; // suivi de @sakia_tn_bot
  openHint: string;
  demoTitle: string;
  demoLead: string;
  howTitle: string;
  steps: { title: string; body: string }[];
  noteTitle: string;
  notes: string[];
  // fenêtre de conversation
  chatSub: string;
  banner: string;
  logLabel: string;
  inputLabel: string;
  placeholder: string;
  send: string;
  jump: string; // bouton flottant « aller au dernier message »
  startLabel: string; // lecteur d'écran : le bouton « /start »
  restart: string;
  you: string;
  bot: string;
  errBusy: string;
  errTooMany: string;
  errOffline: string;
  errTimeout: string;
  retry: string;
};

const fr: TgStrings = {
  eyebrow: "Telegram",
  title: "Sakia sur Telegram",
  lead: "Choisissez votre région et votre culture avec des boutons, puis recevez chaque matin le plan d'irrigation des 7 jours. Un bouton lit le bulletin à voix haute.",
  open: "Ouvrir",
  openHint: "S'ouvre dans Telegram, sur l'application ou sur le web.",
  demoTitle: "Essayez-le ici",
  demoLead: "Sans compte Telegram : touchez les boutons ou écrivez, comme dans le vrai bot.",
  howTitle: "Comment ça marche",
  steps: [
    { title: "Ouvrez le bot", body: "Sur Telegram, appuyez sur « Démarrer » et choisissez le français, l'arabe ou l'anglais." },
    { title: "Touchez vos choix", body: "Votre région, votre culture, le dernier arrosage : tout se fait avec des boutons. Vous pouvez aussi écrire « zitoun kairouan »." },
    { title: "Recevez le plan", body: "Le plan des 7 jours arrive chaque matin, avec un bouton pour le bulletin vocal. Il rappelle que le conseil est indicatif : la décision vous appartient." },
  ],
  noteTitle: "À savoir sur cette démonstration",
  notes: [
    "Ce chat exécute le même code que le vrai bot, sur notre serveur, pour la démonstration.",
    "Il ne demande aucun compte Telegram, n'envoie rien à Telegram et n'enregistre rien dans notre base de données : la conversation reste dans votre navigateur.",
    "Ici, la voix est coupée : le bot répond avec le texte du bulletin, et les messages vocaux ne sont pas possibles.",
    "Le vrai bot demande Telegram. Sa voix de synthèse vient d'ElevenLabs (un service externe) ; sans elle, il envoie le texte.",
    "Le vrai bot garde votre identifiant de conversation, votre langue, votre région, votre culture et quelques réglages. La commande /stop permet de les supprimer.",
  ],
  chatSub: "démo intégrée",
  banner: "Démo : rien n'est envoyé à Telegram ni enregistré.",
  logLabel: "Conversation avec Sakia (démo)",
  inputLabel: "Votre message",
  placeholder: "Ex. : zitoun kairouan",
  send: "Envoyer",
  jump: "Aller au dernier message",
  startLabel: "Envoyer la commande /start",
  restart: "Recommencer",
  you: "Vous",
  bot: "Sakia",
  errBusy: "La démo ne répond pas pour le moment. Réessayez dans un instant.",
  errTooMany: "Trop de messages d'un coup. Attendez une minute.",
  errOffline: "Pas de connexion : la démo a besoin d'internet.",
  errTimeout: "La démo met trop de temps à répondre. Réessayez dans un instant.",
  retry: "Réessayer",
};

const en: TgStrings = {
  eyebrow: "Telegram",
  title: "Sakia on Telegram",
  lead: "Pick your region and your crop with buttons, then get the 7-day irrigation plan every morning. One button reads the bulletin aloud.",
  open: "Open",
  openHint: "Opens in Telegram, in the app or on the web.",
  demoTitle: "Try it here",
  demoLead: "No Telegram account needed: tap the buttons or type, as in the real bot.",
  howTitle: "How it works",
  steps: [
    { title: "Open the bot", body: "On Telegram, tap “Start” and choose French, Arabic or English." },
    { title: "Tap your choices", body: "Your region, your crop, your last irrigation: all with buttons. You can also type “zitoun kairouan”." },
    { title: "Get the plan", body: "The 7-day plan arrives every morning, with a button for the voice bulletin. It reminds you that the advice is indicative: the decision is yours." },
  ],
  noteTitle: "About this demo",
  notes: [
    "This chat runs the same code as the real bot, on our server, for demonstration.",
    "It needs no Telegram account, sends nothing to Telegram and saves nothing in our database: the conversation stays in your browser.",
    "Here the voice is off: the bot answers with the text of the bulletin, and voice messages are not possible.",
    "The real bot needs Telegram. Its synthetic voice comes from ElevenLabs (an external service); without it, it sends the text.",
    "The real bot keeps your chat identifier, language, region, crop and a few settings. The /stop command lets you delete them.",
  ],
  chatSub: "built-in demo",
  banner: "Demo: nothing is sent to Telegram or saved.",
  logLabel: "Conversation with Sakia (demo)",
  inputLabel: "Your message",
  placeholder: "E.g. zitoun kairouan",
  send: "Send",
  jump: "Jump to the latest message",
  startLabel: "Send the /start command",
  restart: "Start over",
  you: "You",
  bot: "Sakia",
  errBusy: "The demo is not answering right now. Please try again in a moment.",
  errTooMany: "Too many messages at once. Wait a minute.",
  errOffline: "No connection: the demo needs the internet.",
  errTimeout: "The demo is taking too long to answer. Please try again in a moment.",
  retry: "Try again",
};

const ar: TgStrings = {
  eyebrow: "تيليغرام",
  title: "ساقية على تيليغرام",
  lead: "اختاروا ولايتكم ومحصولكم بالأزرار، ثم تصلكم كل صباح خطة الري لـ 7 أيام. وبزر واحد تسمعون النشرة الصوتية.",
  open: "افتحوا",
  openHint: "يُفتح في تيليغرام، في التطبيق أو على الويب.",
  demoTitle: "جرّبوه هنا",
  demoLead: "دون حساب على تيليغرام: اضغطوا على الأزرار أو اكتبوا، كما في البوت الحقيقي.",
  howTitle: "كيف يعمل",
  steps: [
    { title: "افتحوا البوت", body: "على تيليغرام، اضغطوا على «ابدأ» واختاروا الفرنسية أو العربية أو الإنجليزية." },
    { title: "اختاروا بالأزرار", body: "الولاية والمحصول وآخر سقية: كل ذلك بالأزرار. ويمكنكم أيضا الكتابة، مثلا «زيتون القيروان»." },
    { title: "استلموا الخطة", body: "تصلكم خطة الأيام السبعة كل صباح، مع زر للنشرة الصوتية. وتذكّركم بأن النصيحة إرشادية وأن القرار لكم." },
  ],
  noteTitle: "عن هذه التجربة",
  notes: [
    "هذه المحادثة تشغّل نفس برنامج البوت الحقيقي، على خادمنا، للعرض فقط.",
    "لا تتطلب حسابا على تيليغرام، ولا ترسل شيئا إلى تيليغرام، ولا تحفظ شيئا في قاعدة بياناتنا: تبقى المحادثة في متصفحكم.",
    "هنا الصوت متوقف: يردّ البوت بنص النشرة، ولا يمكن إرسال رسائل صوتية.",
    "البوت الحقيقي يتطلب تيليغرام. وصوته الاصطناعي من ElevenLabs (خدمة خارجية)، وبدونها يرسل النص.",
    "البوت الحقيقي يحتفظ بمعرّف المحادثة واللغة والولاية والمحصول وبعض الإعدادات. والأمر /stop يتيح حذفها.",
  ],
  chatSub: "تجربة مدمجة",
  banner: "تجربة فقط: لا يُرسل شيء إلى تيليغرام ولا يُحفظ شيء.",
  logLabel: "المحادثة مع ساقية (تجربة)",
  inputLabel: "رسالتكم",
  placeholder: "مثلا: زيتون القيروان",
  send: "إرسال",
  jump: "الانتقال إلى آخر رسالة",
  startLabel: "إرسال الأمر /start",
  restart: "البدء من جديد",
  you: "أنتم",
  bot: "ساقية",
  errBusy: "التجربة لا تستجيب حاليا. أعيدوا المحاولة بعد قليل.",
  errTooMany: "رسائل كثيرة دفعة واحدة. انتظروا دقيقة.",
  errOffline: "لا اتصال: التجربة تحتاج إلى الإنترنت.",
  errTimeout: "التجربة تتأخر في الرد. أعيدوا المحاولة بعد قليل.",
  retry: "أعد المحاولة",
};

const aeb: TgStrings = {
  eyebrow: "تيليغرام",
  title: "ساقية على تيليغرام",
  lead: "اختار الولاية والزرعة متاعك بالأزرار، وكل صباح تجيك خطة السقي متاع 7 أيام. وبزر واحد تسمع النشرة.",
  open: "افتح",
  openHint: "يتحلّ في تيليغرام، في التطبيق ولا في الويب.",
  demoTitle: "جرّبه هنا",
  demoLead: "من غير حساب تيليغرام: اضغط على الأزرار ولا اكتب، كيما في البوت الحقيقي.",
  howTitle: "كيفاش تخدم",
  steps: [
    { title: "افتح البوت", body: "في تيليغرام اضغط على «ابدأ» واختار الفرنسية ولا العربية ولا الإنجليزية." },
    { title: "اختار بالأزرار", body: "الولاية والزرعة وآخر سقية: كل شي بالأزرار. وتنجم تكتب زادة، مثلا «زيتون القيروان»." },
    { title: "تجيك الخطة", body: "خطة 7 أيام تجيك كل صباح، وفيها زر للنشرة الصوتية. وتذكّرك إنو النصيحة للاسترشاد برك وإنو القرار متاعك." },
  ],
  noteTitle: "على هالتجربة",
  notes: [
    "المحادثة هاذي تخدم بنفس برنامج البوت الحقيقي، في السيرفر متاعنا، للتجربة برك.",
    "ما تطلبش حساب تيليغرام، وما تبعث شي لتيليغرام، وما تسجّل شي في قاعدة المعلومات متاعنا: المحادثة تبقى في المتصفح متاعك.",
    "هنا الصوت مقطوع: البوت يجاوب بنص النشرة، وما تنجمش تبعث رسائل صوتية.",
    "البوت الحقيقي يلزمو تيليغرام. وصوته الاصطناعي من ElevenLabs (خدمة من برّا)، ومن غيرها يبعث النص.",
    "البوت الحقيقي يخزّن رقم المحادثة واللغة والولاية والزرعة وشوية إعدادات. والأمر /stop يخليك تمسحهم.",
  ],
  chatSub: "تجربة مدمجة",
  banner: "تجربة: ما يتبعث شي لتيليغرام وما يتسجّل شي.",
  logLabel: "المحادثة مع ساقية (تجربة)",
  inputLabel: "رسالتك",
  placeholder: "مثلا: زيتون القيروان",
  send: "ابعث",
  jump: "روح لآخر رسالة",
  startLabel: "ابعث الأمر /start",
  restart: "ابدا من جديد",
  you: "إنت",
  bot: "ساقية",
  errBusy: "التجربة ما تجاوبش توا. عاود بعد شوية.",
  errTooMany: "برشا رسائل مرة وحدة. استنّى دقيقة.",
  errOffline: "ما فمّاش انترنت: التجربة تحتاج الانترنت.",
  errTimeout: "التجربة تتأخر في الجواب. عاود بعد شوية.",
  retry: "عاود",
};

export const STRINGS: Record<Lang, TgStrings> = { fr, en, ar, aeb };
