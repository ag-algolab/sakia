// Textes du bot en français, arabe et anglais. Les textes du plan viennent de src/lib/messages.ts.
// L'ARABE EST À FAIRE VALIDER par un locuteur tunisien (arabe standard simple).

import type { Lang } from "../messages";

export type Strings = {
  askRegion: string;
  askCrop: string;
  askAgo: string;
  ago: { today: string; d12: string; d35: string; d6: string; unknown: string };
  btnVoice: string;
  btnRefresh: string;
  btnChange: string;
  btnIrrigated: string;
  btnDelete: string;
  btnDailyOn: string;
  saved: (region: string, crop: string) => string;
  langSaved: string;
  irrigatedNoted: string;
  alreadyUpToDate: string;
  updatedAt: (when: string) => string;
  dailyHeader: string;
  voiceTextHeader: string;
  voiceCaption: string;
  stopped: string;
  dailyOn: string;
  deleted: string;
  help: string;
  hint: string;
  error: string;
  askAgoHint: string;
  heard: (text: string) => string;
  notUnderstood: string;
  voiceTooLong: string;
  voiceLimit: string;
  voiceFailed: string;
  btnRain: string;
  askRain: string;
  rainThanks: (level: string, region: string) => string;
  rainCount: (n: number, region: string, level: string) => string;
  rainApplied: string;
  rainRule: string;
  rainFailed: string;
  rainLimit: string;
};

const fr: Strings = {
  askRegion: "📍 Dans quelle région (gouvernorat) se trouve votre parcelle ?",
  askCrop: "🌿 Quelle culture ?",
  askAgo: "💧 À quand remonte le dernier arrosage ?",
  ago: { today: "Aujourd'hui", d12: "Il y a 1-2 jours", d35: "Il y a 3-5 jours", d6: "Plus de 5 jours", unknown: "Je ne sais pas" },
  btnVoice: "🔊 Bulletin vocal",
  btnRefresh: "🔄 Mettre à jour",
  btnChange: "⚙️ Changer culture ou région",
  btnIrrigated: "💧 J'ai arrosé aujourd'hui",
  btnDelete: "🗑 Supprimer mes données",
  btnDailyOn: "🔔 Réactiver le bulletin quotidien",
  saved: (region, crop) => `✅ ${crop} · ${region}`,
  langSaved: "✅ Langue enregistrée.",
  irrigatedNoted: "💧 Noté : arrosage aujourd'hui.",
  alreadyUpToDate: "Déjà à jour",
  updatedAt: (when) => `🕒 Données météo mises à jour : ${when} (heure de Tunis)`,
  dailyHeader: "☀️ Bulletin du jour",
  voiceTextHeader: "🔊 Bulletin du jour (version texte)",
  voiceCaption: "Conseil indicatif : à valider auprès de l'administration agricole régionale.",
  stopped: "🔕 Bulletin quotidien désactivé. Vous pouvez toujours demander /plan.",
  dailyOn: "🔔 Bulletin quotidien réactivé.",
  deleted: "✅ Vos données ont été supprimées. Envoyez /start pour recommencer.",
  help:
    "🌱 Sakia dit quand et combien irriguer pendant 7 jours, à partir de la météo réelle.\n\n" +
    "/plan : le plan des 7 jours\n/bulletin : le bulletin vocal\n/pluie : signaler la pluie chez vous\n/langue : changer de langue\n/stop : arrêter le bulletin quotidien\n/aide : cette aide\n/start : tout reconfigurer\n\n" +
    "🎙 Vous pouvez aussi envoyer un message vocal ou écrire, par exemple « olivier Kairouan » (français, arabe, arabizi). Le vocal est transcrit par un service externe (ElevenLabs) ; nous ne gardons ni l'audio ni le texte.\n\n" +
    "Conseil indicatif, à valider auprès de l'administration agricole régionale.",
  hint: "Utilisez les boutons ci-dessus, ou /aide pour la liste des commandes.",
  error: "Désolé, un problème est survenu. Réessayez dans un instant.",
  askAgoHint: "💧 Dernier arrosage inconnu ou ancien : indiquez-le ci-dessous pour un conseil plus sûr.",
  heard: (x) => `🎙 J'ai compris : « ${x} »`,
  notUnderstood: "Je n'ai pas bien compris. Écrivez ou dites par exemple : « olivier Kairouan », ou utilisez /start.",
  voiceTooLong: "🎙 Message trop long (30 secondes maximum). Dites seulement la culture et la région.",
  voiceLimit: "🎙 Trop de messages vocaux pour le moment. Utilisez les boutons ou écrivez la culture et la région.",
  voiceFailed: "🎙 Je n'ai pas pu écouter ce message. Écrivez la culture et la région, ou utilisez /start.",
  btnRain: "☔ Il a plu ici",
  askRain: "☔ Quelle quantité de pluie est tombée chez vous aujourd'hui ?",
  rainThanks: (level, region) => `☔ Merci ! Noté à ${region} aujourd'hui : ${level}.`,
  rainCount: (n, region, level) =>
    n === 1
      ? `Vous êtes la première personne à signaler la pluie à ${region} aujourd'hui.`
      : `${n} agriculteurs ont signalé de la pluie à ${region} aujourd'hui (niveau retenu : ${level}).`,
  rainApplied: "✅ Pris en compte dans votre plan, avec une valeur prudente : appuyez sur « Mettre à jour ». Signalement d'agriculteurs, pas une mesure.",
  rainRule: "Pris en compte dans le plan quand au moins 3 personnes différentes signalent la même journée, avec une valeur prudente (le bas de la fourchette). Signalement d'agriculteurs, pas une mesure.",
  rainFailed: "Je n'ai pas pu enregistrer votre signalement pour le moment. Réessayez plus tard.",
  rainLimit: "Trop de signalements pour le moment. Réessayez dans une heure.",
};

const ar: Strings = {
  askRegion: "📍 في أي ولاية توجد أرضكم؟",
  askCrop: "🌿 ما هو المحصول؟",
  askAgo: "💧 متى كان آخر سقي؟",
  ago: { today: "اليوم", d12: "منذ يوم أو يومين", d35: "منذ 3 إلى 5 أيام", d6: "منذ أكثر من 5 أيام", unknown: "لا أعرف" },
  btnVoice: "🔊 النشرة الصوتية",
  btnRefresh: "🔄 تحديث",
  btnChange: "⚙️ تغيير المحصول أو الولاية",
  btnIrrigated: "💧 سقيت اليوم",
  btnDelete: "🗑 حذف بياناتي",
  btnDailyOn: "🔔 إعادة تفعيل النشرة اليومية",
  saved: (region, crop) => `✅ ${crop} · ${region}`,
  langSaved: "✅ تم حفظ اللغة.",
  irrigatedNoted: "💧 تم التسجيل: سقي اليوم.",
  alreadyUpToDate: "المعطيات محدّثة",
  updatedAt: (when) => `🕒 آخر تحديث لمعطيات الطقس: ${when} (توقيت تونس)`,
  dailyHeader: "☀️ نشرة اليوم",
  voiceTextHeader: "🔊 نشرة اليوم (نسخة نصية)",
  voiceCaption: "نصيحة إرشادية: يجب التحقق منها لدى المصالح الفلاحية الجهوية.",
  stopped: "🔕 تم إيقاف النشرة اليومية. يمكنكم طلب /plan في أي وقت.",
  dailyOn: "🔔 تمت إعادة تفعيل النشرة اليومية.",
  deleted: "✅ تم حذف بياناتكم. أرسلوا /start للبدء من جديد.",
  help:
    "🌱 ساقية تقول لكم متى وكم تسقون خلال 7 أيام، انطلاقا من الطقس الفعلي.\n\n" +
    "/plan : خطة 7 أيام\n/bulletin : النشرة الصوتية\n/pluie : الإبلاغ عن المطر عندكم\n/langue : تغيير اللغة\n/stop : إيقاف النشرة اليومية\n/aide : هذه المساعدة\n/start : إعادة الإعداد\n\n" +
    "🎙 يمكنكم أيضا إرسال رسالة صوتية أو الكتابة، مثلا «زيتون القيروان» (بالعربية أو الفرنسية أو الأرابيزي). تتم كتابة الرسالة الصوتية بواسطة خدمة خارجية (ElevenLabs)، ولا نحتفظ بالصوت ولا بالنص.\n\n" +
    "نصيحة إرشادية: يجب التحقق منها لدى المصالح الفلاحية الجهوية.",
  hint: "استعملوا الأزرار أعلاه، أو /aide لقائمة الأوامر.",
  error: "عذرا، حدث خطأ. حاولوا مرة أخرى بعد قليل.",
  askAgoHint: "💧 آخر سقي غير معروف أو قديم: حدّدوه بالأزرار أدناه للحصول على نصيحة أدق.",
  heard: (x) => `🎙 فهمتُ: «${x}»`,
  notUnderstood: "لم أفهم جيدا. اكتبوا أو قولوا مثلا: «زيتون القيروان»، أو استعملوا /start.",
  voiceTooLong: "🎙 الرسالة طويلة جدا (30 ثانية على الأكثر). قولوا فقط المحصول والولاية.",
  voiceLimit: "🎙 رسائل صوتية كثيرة حاليا. استعملوا الأزرار أو اكتبوا المحصول والولاية.",
  voiceFailed: "🎙 لم أتمكن من سماع هذه الرسالة. اكتبوا المحصول والولاية، أو استعملوا /start.",
  btnRain: "☔ أمطرت هنا",
  askRain: "☔ ما كمية المطر التي سقطت عندكم اليوم؟",
  rainThanks: (level, region) => `☔ شكرا! تم التسجيل في ${region} اليوم: ${level}.`,
  rainCount: (n, region, level) =>
    n === 1
      ? `أنتم أول من أبلغ عن المطر في ${region} اليوم.`
      : `أبلغ ${n} فلاحين عن المطر في ${region} اليوم (المستوى المعتمد: ${level}).`,
  rainApplied: "✅ تم أخذه بعين الاعتبار في خطتكم بقيمة حذرة: اضغطوا على «تحديث». إبلاغ من فلاحين وليس قياسا.",
  rainRule: "يُؤخذ بعين الاعتبار في الخطة عندما يبلغ ثلاثة أشخاص مختلفين على الأقل عن نفس اليوم، بقيمة حذرة (الحد الأدنى للمجال). إبلاغ من فلاحين وليس قياسا.",
  rainFailed: "تعذّر تسجيل إبلاغكم حاليا. حاولوا لاحقا.",
  rainLimit: "إبلاغات كثيرة حاليا. حاولوا بعد ساعة.",
};

const en: Strings = {
  askRegion: "📍 Which region (governorate) is your field in?",
  askCrop: "🌿 Which crop?",
  askAgo: "💧 When was your last irrigation?",
  ago: { today: "Today", d12: "1-2 days ago", d35: "3-5 days ago", d6: "More than 5 days ago", unknown: "I don't know" },
  btnVoice: "🔊 Voice bulletin",
  btnRefresh: "🔄 Refresh",
  btnChange: "⚙️ Change crop or region",
  btnIrrigated: "💧 I irrigated today",
  btnDelete: "🗑 Delete my data",
  btnDailyOn: "🔔 Turn the daily bulletin back on",
  saved: (region, crop) => `✅ ${crop} · ${region}`,
  langSaved: "✅ Language saved.",
  irrigatedNoted: "💧 Noted: irrigated today.",
  alreadyUpToDate: "Already up to date",
  updatedAt: (when) => `🕒 Weather data updated: ${when} (Tunis time)`,
  dailyHeader: "☀️ Today's bulletin",
  voiceTextHeader: "🔊 Today's bulletin (text version)",
  voiceCaption: "Indicative advice: to be checked with the regional agriculture office.",
  stopped: "🔕 Daily bulletin turned off. You can still ask for /plan.",
  dailyOn: "🔔 Daily bulletin turned back on.",
  deleted: "✅ Your data has been deleted. Send /start to begin again.",
  help:
    "🌱 Sakia tells you when and how much to irrigate over 7 days, from real weather data.\n\n" +
    "/plan: the 7-day plan\n/bulletin: the voice bulletin\n/pluie: report rain at your place\n/langue: change language\n/stop: stop the daily bulletin\n/aide: this help\n/start: set everything up again\n\n" +
    "🎙 You can also send a voice message or type, for example “olive Kairouan” (Arabic, French or Arabizi). Voice messages are transcribed by an external service (ElevenLabs); we keep neither the audio nor the text.\n\n" +
    "Indicative advice, to be checked with the regional agriculture office.",
  hint: "Use the buttons above, or /aide for the list of commands.",
  error: "Sorry, something went wrong. Please try again in a moment.",
  askAgoHint: "💧 Last irrigation unknown or old: tell us below for safer advice.",
  heard: (x) => `🎙 I understood: “${x}”`,
  notUnderstood: "I did not quite understand. Write or say for example “olive Kairouan”, or use /start.",
  voiceTooLong: "🎙 Message too long (30 seconds maximum). Just say the crop and the region.",
  voiceLimit: "🎙 Too many voice messages right now. Use the buttons or type the crop and the region.",
  voiceFailed: "🎙 I could not listen to this message. Type the crop and the region, or use /start.",
  btnRain: "☔ It rained here",
  askRain: "☔ How much rain fell at your place today?",
  rainThanks: (level, region) => `☔ Thank you! Noted in ${region} today: ${level}.`,
  rainCount: (n, region, level) =>
    n === 1
      ? `You are the first person to report rain in ${region} today.`
      : `${n} farmers have reported rain in ${region} today (level kept: ${level}).`,
  rainApplied: "✅ Taken into account in your plan, with a cautious value: press “Refresh”. Reported by farmers, not a measurement.",
  rainRule: "Used in the plan once at least 3 different people report the same day, with a cautious value (the low end of the range). Reported by farmers, not a measurement.",
  rainFailed: "I could not save your report right now. Please try again later.",
  rainLimit: "Too many reports right now. Please try again in an hour.",
};

const ALL: Record<Lang, Strings> = { fr, ar, en };

export function t(lang: Lang): Strings {
  return ALL[lang] ?? fr;
}

// Premier message, avant que la langue soit connue : les trois langues.
export const WELCOME =
  "🌱 Sakia\nConseil d'irrigation pour la Tunisie · نصائح الري لتونس · Irrigation advice for Tunisia\n\nFR · العربية · EN";

const LOCALE: Record<Lang, string> = { fr: "fr-FR", ar: "ar-TN-u-nu-latn", en: "en-GB" };

export function formatWhen(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Tunis",
  }).format(new Date(iso));
}

export function sortLocale(lang: Lang): string {
  return lang === "ar" ? "ar" : lang === "en" ? "en" : "fr";
}
