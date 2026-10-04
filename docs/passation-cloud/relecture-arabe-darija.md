# Textes arabes, tunisiens (aeb) et coréens ajoutés ou modifiés depuis `main` (a539d16) : à faire relire par un locuteur natif

Aucun de ces textes n'a été validé par un locuteur natif. Les lignes viennent du diff Git (lignes ajoutées contenant des lettres arabes ou coréennes), regroupées par fichier.
« ar » = arabe standard simple, « aeb » (TN) = darija tunisienne. Dans `src/components/ui/i18n.ts`, la clé se lit au début de chaque ligne ; les blocs `ar` puis `aeb` se suivent pour chaque clé.

Nouveautés de cette série : sous-titres du bouton d'écoute (`listenSubs`, `listenCaption`), bandeau et phrase de la page Preuve (`proofBanner`, `proofSub`), « 230 % » expliqué (`statAquiferSub`), drapeau (`heroTag`), 16 phrases d'hypothèses (`asm*`), note des langues de la ligne vocale.


## `scripts/ivr-check.ts` (1 lignes)

- ok(!/signal|rain report|report rain|تبليغ/i.test(`${r.text} ${r.en}`), `${r.id}.${r.lang} parle d'un signalement`);

## `src/components/call/strings.ts` (7 lignes)

- langOrderTitle: "اللغات",
- "يتكلم الخط بالفرنسية (الزر 1) وبالعربية (الزر 2). الترجمة بالإنجليزية. الصوت العربي عربية فصحى بسيطة بلكنة تونسية، وليس باللهجة التونسية؛ ونصّه لم يراجعه متحدث تونسي.",
- "مصمَّم للفلاح الذي لا يقرأ: يتصل فيسمع النصيحة بصوت بلكنة تونسية ويختار بأزرار الهاتف. يكفي هاتف بسيط وشبكة صوتية: لا إنترنت ولا تطبيق ولا قراءة. هذه محاكاة فقط: لا يوجد أي خط حقيقي.",
- "يحفظ في هذا المتصفح {n} تسجيلا ({size}): جمل القائمة وخطط العرض التجريبية. بعدها يعمل الخط بدون إنترنت (لم يُتحقق منه في وضع الطيران على هاتف). يجب أن تكونوا فتحتم الصفحة مرة واحدة مع الإنترنت.",
- plugTitle: "كيف سيُربط بالهاتف",
- plug1: "رقم قصير لدى مشغّل تونسي، أو خط SIP لدى مزوّد اتصالات. لا يوجد أي رقم.",
- plug5: "اتفاق مع مشغّل، كلفة الدقائق، التحقق من المتصل، الموافقة، وقاعدة عدم التسجيل.",

## `src/components/call/talkStrings.ts` (4 lignes)

- "يفهم الوكيل العربية (الدارجة أو الفصحى) والفرنسية، ويرحّب بعربية فصحى بسيطة ثم يجيب بلغة آخر رسالة للفلاح (عربية فصحى بسيطة أو الفرنسية). لا تظهر الإنجليزية إلا في ترجمة جواب المحرك.",
- waiting: "لا شيء: ابدؤوا محادثة.",
- "الحدود: التعرف على الدارجة التونسية صوتيا غير مضمون؛ قد يسيء الوكيل الفهم فيعيد السؤال أو يرفض؛ النصيحة إرشادية والقرار لشخص. فهم الدارجة المنطوقة لم يُقيَّم؛ والجواب يُقرأ بعربية فصحى بسيطة أو بالفرنسية.",
- noAgent: "لم يُنشأ الوكيل الصوتي.",

## `src/components/phone/strings.ts` (3 lignes)

- truth: "تعمل بدون إنترنت بعد التحميل الأول (جُرّبت في Chrome مع إيقاف الخادم، ولم تُجرَّب في وضع الطيران على هاتف)، ولا تعوّض شبكة الهاتف.",
- simCallNote: "الخط الصوتي المحاكى: تستمع إلى النصيحة وتختار بالأزرار.",
- logEmpty: "لا شيء: لا يُستدعى الخادم إلا عند الضغط على زر رد.",

## `src/components/telegram/strings.ts` (2 lignes)

- "هنا الصوت متوقف: يردّ البوت بنص النشرة، ولا يمكن إرسال رسائل صوتية.",
- "هنا الصوت مقطوع: البوت يجاوب بنص النشرة، وما تنجمش تبعث رسائل صوتية.",

## `src/components/ui/i18n.ts` (43 lignes)

- asmWeatherLive: "طقس حقيقي من Open-Meteo (نقطة مركز ولاية {region})، يُحدَّث كل 3 ساعات تقريبا.",
- asmWeatherReplay: "إعادة تشغيل ليوم {date}: طقس مرصود من ERA5 (Open-Meteo، مركز ولاية {region})، وليس توقعا.",
- asmSoil: "التربة: {soil} (ماء متاح تقريبي). السقي: {system}، الكفاءة {eff} %.",
- asmKc: "معاملات المحصول FAO-56.",
- asmKcAdjusted: "معاملات المحصول FAO-56 (بعض القيم معدلة أو مستكملة: انظروا بطاقة المحصول).",
- asmRainRule: "المطر المفيد (قاعدة FAO-56): يُهمل إن قل عن 0.2 × ET0، ويُحتسب كاملا بخلاف ذلك؛ الجريان السطحي غير مُنمذج.",
- asmTrees: "الكثافة المفترضة: {n} شجرة/هكتار (قابلة للتعديل).",
- asmUnits: "الاحتياجات معبَّر عنها بالمليمتر وبالمتر المكعب للهكتار.",
- asmClimato: "ابتداء من {date}، الطقس مقدَّر انطلاقا من المناخ المعتاد 2015-2025 (وليس توقعا).",
- asmHorizon: "الأفق مغطى بتوقعات الطقس.",
- asmAdvisory: "نصيحة إرشادية: القرار لشخص. يجب التحقق منها لدى الإدارة الفلاحية الجهوية.",
- asmBtWeather: "طقس مرصود من ERA5 (Open-Meteo) لمركز الولاية (وليس توقعات ماضية)، مواسم أُعيد تشغيلها منذ 2015.",
- asmBtFixed: "جدول سقي موسمي ثابت: سقية كل {n} أيام، والجرعة مضبوطة على الطلب المتوسط للشهر في كل المواسم (مرجع صارم عن قصد). فرضية يجب استبدالها بالجدول الفعلي للإدارة.",
- asmBtYield: "المردود النسبي: علاقة FAO-33، تقدير بالنموذج وليس قياسا؛ موثوق للعجز المعتدل فقط.",
- asmBtKcAdjusted: "معاملات المحصول FAO-56، بعض القيم معدلة أو مستكملة: نتائج إرشادية.",
- asmBtKc: "معاملات المحصول FAO-56 كما هي.",
- proofBanner: "محاكاة على الحاسوب، كأن التوقعات كانت دقيقة تماما. وليست تجربة في الحقل.",
- listenCaption: "استمع إلى نصيحة اليوم بالعربية، مع الترجمة المكتوبة",
- listenSubs: "الترجمة المكتوبة",
- heroTag: "تونس",
- statAquiferSub: "من حجمها المتجدد: يُسحب منها 2.3 ضعف ما تستعيده",
- proofSub: "الطقس المرصود من 2015 إلى اليوم: السقي كل أسبوع كالمعتاد، أو اتباع نصيحة «ساقية».",
- asmWeatherLive: "طقس حقيقي من Open-Meteo (نقطة مركز ولاية {region})، يتبدّل كل 3 ساعات تقريبا.",
- asmWeatherReplay: "عاودنا نهار {date}: طقس ERA5 اللي صار فعلا (Open-Meteo، مركز ولاية {region})، موش توقّعات.",
- asmSoil: "الأرض: {soil} (الماء المفيد تقريبي). السقي: {system}، النجاعة {eff} %.",
- asmKc: "معاملات الزرعة FAO-56.",
- asmKcAdjusted: "معاملات الزرعة FAO-56 (شوية قيم معدّلة ولا مقدّرة: شوف بطاقة الزرعة).",
- asmRainRule: "الشتا المفيدة (قاعدة FAO-56): ما تتحسبش كان أقلّ من 0,2 × ET0، وتتحسب كاملة كان لا؛ جريان الماء على وجه الأرض ما حسبناهوش.",
- asmTrees: "الكثافة اللي افترضناها: {n} شجرة في الهكتار (تتبدّل كيما تحب).",
- asmUnits: "الحاجيات بالمليمتر وبالمتر المكعّب في الهكتار.",
- asmClimato: "من {date}، الطقس مقدّر من المناخ العادي 2015-2025 (موش توقّعات).",
- asmHorizon: "الأيام كلها مغطّاة بتوقّعات الطقس.",
- asmAdvisory: "نصيحة برّك: الشخص هو اللي يقرّر. لازم تتثبّت منها عند المصالح الفلاحية بالولاية.",
- asmBtWeather: "طقس ERA5 (Open-Meteo) اللي صار فعلا في مركز الولاية (موش توقّعات قديمة)، مواسم عاودناها من 2015.",
- asmBtFixed: "جدول سقي ثابت في الموسم: سقية كل {n} أيام، والكمية على قدّ حاجة الشهر في المتوسط لكل المواسم (مرجع صعيب بالقصد). فرضية لازم تتبدّل بجدول الإدارة الحقيقي.",
- asmBtYield: "المردود النسبي: علاقة FAO-33، تقدير بالنموذج موش قياس؛ تعتمد عليه كان في النقص الخفيف.",
- asmBtKcAdjusted: "معاملات الزرعة FAO-56، شوية قيم معدّلة ولا مقدّرة: نتائج إرشادية.",
- asmBtKc: "معاملات الزرعة FAO-56 كيما هي.",
- proofBanner: "محاكاة في الكمبيوتر، كأنّ التوقّعات كانت صحيحة تماما. موش تجربة في الغيط.",
- listenSubs: "النصّ المكتوب",
- heroTag: "تونس",
- statAquiferSub: "من حجمها المتجدّد: يسحبو منها 2,3 مرة أكثر مما ترجّع",
- proofSub: "الطقس اللي صار فعلا من 2015 لليوم: السقي كل أسبوع كيما العادة، ولا اتباع نصيحة ساقية.",

## `src/lib/sms/check.ts` (4 lignes)

- for (const text of ["PLUIE 10", "pluie", "PLUIE BEAUCOUP", "rain 10", "مطر 10", "shta 10"]) {
- const ar = await say("p2", "مطر 10");
- check("« مطر 10 » reçoit la réponse d'aide en arabe", /[؀-ۿ]/.test(ar) && ar.includes("AIDE"), ar);
- check(`l'aide (${lang}) ne cite aucune commande de pluie`, !/pluie|rain|مطر/i.test(R.help[lang]), R.help[lang]);

## `src/lib/sms/lexicon.ts` (1 lignes)

- export const RAIN_WORDS = ["pluie", "plu", "rain", "rained", "مطر", "امطار", "شتا", "شتاء", "shta", "chta", "matar", "mtar"];

## `src/lib/sms/replies.ts` (1 lignes)

- ar: "ساقية: أرسل المحصول والولاية وآخر سقي، مثال: زيتون القيروان البارح. خطة، لغة، ايقاف = مسح. *123# قائمة",

## `src/lib/telegram/i18n.ts` (1 lignes)

- "/plan : خطة 7 أيام\n/bulletin : النشرة الصوتية\n/langue : تغيير اللغة\n/stop : إيقاف النشرة اليومية\n/aide : هذه المساعدة\n/start : إعادة الإعداد\n\n" +

## `src/lib/voice/langs.ts` (1 lignes)

- { code: "aeb", native: "الدارجة التونسية", english: "Tunisian Arabic", htmlLang: "ar-TN", rtl: true, locale: "ar-TN-u-nu-latn", validated: false }, // à valider par un Tunisien


## Cure de texte du 4 octobre (poste UI, session locale) : `src/components/ui/i18n.ts` (26 clés)

Textes raccourcis pour le jury (« le jury ne lit pas ») : la plupart sont des coupes de phrases déjà relues ou non, quelques-uns sont nouveaux (bande « réseau faible » : `speed*`).

- `heroSub` (ar) : تخبركم «ساقية» متى وكم تسقون، بصوت بلكنة تونسية: لا حاجة إلى القراءة.
- `heroSub` (aeb) : ساقية تقولك وقتاش تسقي وقدّاش، بصوت بلهجة تونسية: ما تحتاجش تقرا.
- `door_web_line` (ar) : زر كبير وصور وصوت.
- `door_web_line` (aeb) : زر كبير، تصاور، وصوت.
- `locationPrivacy` (ar) : يبقى موقعكم على هاتفكم.
- `locationPrivacy` (aeb) : موقعك يبقى في التلفون متاعك.
- `lastWateringSet` (ar) : الخطة محسوبة انطلاقا من هذا التاريخ.
- `lastWateringSet` (aeb) : الخطة محسوبة من هالتاريخ.
- `fieldRequired` (ar) : اختاروا ولايتكم ومحصولكم.
- `fieldRequired` (aeb) : اختار الولاية والزرعة.
- `listenError` (ar) : الصوت غير متاح. انظروا إلى الصور أدناه.
- `listenError` (aeb) : الصوت موش متوفّر. شوف التصاور اللي تحت.
- `statWaterSrc` (ar) : محاكاة، {n} مواسم
- `statWaterSrc` (aeb) : محاكاة، {n} مواسم
- `statThirstyLabel` (ar) : أيام العطش في الموسم: الطريقة المعتادة → ساقية
- `statReadMore` (ar) : أكثر من شخص واحد من كل أربعة.
- `statReadMore` (aeb) : أكثر من واحد من أربعة.
- `statWeatherCheck` (ar) : تم التحقق من الطقس مقارنة بمحطات تونسية.
- `statWeatherCheck` (aeb) : الطقس تحقّقنا منو قدّام محطات تونسية.
- `weekHint` (ar) : يبيّن كل أنبوب كمية الماء التي تحتفظ بها التربة للمحصول.
- `weekHint` (aeb) : كل أنبوب يوريك قدّاش من الماء تحتفظ بيه الأرض للزرعة.
- `computedOnDevice` (ar) : الخطة محسوبة على هذا الجهاز وتعمل دون إنترنت.
- `computedOnDevice` (aeb) : الخطة تتحسب في التلفون وتخدم من غير انترنت.
- `footerAbout` (ar) : قرار سقي واحد كل يوم للفلاحين الذين لا يقرؤون أو لا يملكون هاتفا ذكيا. نصيحة إرشادية.
- `footerAbout` (aeb) : قرار سقي واحد كل نهار، للفلاحة اللي ما يقراوش ولا ما عندهمش سمارتفون. نصيحة للاسترشاد.
- `proofBanner` (ar) : محاكاة، كأن التوقعات كانت دقيقة تماما. وليست تجربة في الحقل.
- `proofBanner` (aeb) : محاكاة، كأنّ التوقّعات كانت صحيحة تماما. موش تجربة في الغيط.
- `proofSub` (ar) : من 2015 إلى اليوم: السقي كل أسبوع، أو اتباع «ساقية».
- `proofSub` (aeb) : من 2015 لليوم: السقي كل أسبوع، ولا اتباع ساقية.
- `usualWayDef` (ar) : الطريقة المعتادة: الكمية نفسها كل 7 أيام مهما كان الطقس (فرضية منا).
- `usualWayDef` (aeb) : الطريقة العادية: نفس الكمية كل 7 أيام كيفما كان الطقس (فرضية متاعنا).
- `withSakiaDef` (ar) : مع ساقية: السقي فقط في اليوم الذي تحتاج فيه التربة.
- `withSakiaDef` (aeb) : مع ساقية: تسقي برك النهار اللي الأرض تحتاج فيه.
- `waterSavedSub` (ar) : بالمعدل في الموسم
- `waterSavedSub` (aeb) : المعدّل في الموسم
- `stressSub` (ar) : في الموسم: أيام كانت فيها التربة جافة أكثر من اللازم للمحصول.
- `stressSub` (aeb) : في الموسم: نهارات الأرض كانت ناشفة برشا على الزرعة.
- `thirstyNone` (ar) : لا عطش في الحالتين: المكسب هنا هو الماء الموفَّر.
- `thirstyNone` (aeb) : ما فماش عطش في الزوز: الربح هو الماء اللي وفّرناه.
- `speedTitle` (ar) : مصمَّم لشبكة ضعيفة
- `speedTitle` (aeb) : مصنوع للشبكة الضعيفة
- `speedFirst` (ar) : في الزيارة الأولى
- `speedFirst` (aeb) : في أول زيارة
- `speedAfter` (ar) : بعد ذلك
- `speedAfter` (aeb) : من بعد
- `speedOffline` (ar) : يعمل دون أي اتصال: الوحيد بين المواقع التي قسناها.
- `speedOffline` (aeb) : يخدم من غير حتى اتصال: الوحيد في المواقع اللي قسناها.
- `speedLink` (ar) : القياس مقارنة بـ5 مواقع
- `speedLink` (aeb) : قسناه مع 5 مواقع
- `sizeNote` (ar) : قبل الضغط
- `sizeNote` (aeb) : قبل الضغط


## Cure de texte du 4 octobre, suite : pages Téléphone, Appel, Telegram (17 textes arabes ou tunisiens raccourcis)

Coupes de phrases existantes (rien d'inventé, sauf la ligne « محاكاة » du téléphone, reformulée plus court). Fichiers : `src/components/phone/strings.ts`, `src/components/call/strings.ts`, `src/components/telegram/strings.ts`.

- تصل خطة 7 أيام كل صباح في رسالة SMS واحدة. الرد يكون بالأزرار.
- محاكاة: لا رسالة حقيقية، ولا مكالمة حقيقية، ولا رقم حقيقي.
- الولاية والمحصول إلزاميان. من دون آخر سقية تقول الرسالة «غير متأكد».
- مأخوذة من الملف المحفوظ على هذا الجهاز.
- تستمع إلى النصيحة وتختار بالأزرار.
- تُحسب رسالة الصباح الآن بطقس اليوم، بنفس المحرك الذي تستعمله خدمة الرسائل؛ ولا يوجد أي مشغّل متصل: الخادم هو الذي يجيب.
- كل زر يرسل رسالة قصيرة. وخادم ساقية هو الذي يرد.
- يتم الحساب داخل هاتفك بآخر طقس محفوظ، حتى بدون شبكة.
- الإنجليزية، والعربية التونسية (بالحروف العربية وبالحروف اللاتينية «عربيزي»)، والفرنسية، مع التسامح مع أخطاء الكتابة. ما تم قياسه:
- جمل كتبها الفريق، لا الفلاحون: ليس قياسا ميدانيا.
- تعمل بدون إنترنت بعد التحميل الأول (جُرّبت في Chrome، ولم تُجرَّب في وضع الطيران على هاتف).
- مصمَّم للفلاح الذي لا يقرأ: يتصل فيسمع النصيحة ويختار بأزرار الهاتف. يكفي هاتف بسيط. هذه محاكاة فقط: لا يوجد أي خط حقيقي.
- في القيروان، 27,9 % من الأشخاص البالغين 10 سنوات فأكثر لا يقرؤون (المعهد الوطني للإحصاء، تعداد 2024، رقم نقلته الصحافة)، والرسالة النصية لا تنفع من لا يقرأ.
- حين لا يكون المحرك متأكدا، تقول المكالمة ذلك بصوت مسموع.
- يحفظ في هذا المتصفح {n} تسجيلا ({size}): بعدها يعمل الخط بدون إنترنت (لم يُتحقق منه في وضع الطيران على هاتف).
- دون حساب على تيليغرام: اضغطوا على الأزرار أو اكتبوا.
- من غير حساب تيليغرام: اضغط على الأزرار ولا اكتب.


## Points d'Anthony du 4 octobre, 07 h 30 (accueil, Preuve) : `src/components/ui/i18n.ts` (8 clés)

- `statAquiferLabel` (ar) : مائدة القيروان المائية: يُسحب منها 2.3 ضعف ما تستعيده.
- `statAquiferLabel` (aeb) : مائدة القيروان: يسحبو منها 2,3 مرة أكثر مما ترجّع.
- `proofBanner` (ar) : مواسم سابقة أُعيدت على الحاسوب، كأن الطقس كان معروفا مسبقا. ليست قياسا في حقول حقيقية.
- `proofBanner` (aeb) : مواسم فاتت عاودناها في الكمبيوتر، كأنّ الطقس كان معروف من قبل. موش قياس في غيطان حقيقية.
- `statsKairouan` (ar) : لنأخذ القيروان مثالا.
- `statsKairouan` (aeb) : ناخذو القيروان كمثال.
- `talkCta` (ar) : تحدّث مع ساقية
- `talkCta` (aeb) : احكي مع ساقية
- `talkHint` (ar) : بالعربية أو بالفرنسية، مع اتصال بالإنترنت
- `talkHint` (aeb) : بالعربي ولا بالفرنسي، يلزم انترنت
- `outOfSeason` (ar) : خارج موسم سقي هذا المحصول (من {from} إلى {to}): لا تبرمج ساقية أي سقي.
- `outOfSeason` (aeb) : برّا موسم السقي متاع الزرعة هاذي (من {from} لـ {to}): ساقية ما تبرمج حتى سقية.
- `statWaterSecond` (ar) : و{n} % ماء مضخوخ أقل
- `statWaterSecond` (aeb) : و{n} % ماء أقلّ تضخّو
- `verdictOffSeason` (ar) : لا سقي: خارج موسم السقي
- `verdictOffSeason` (aeb) : ما فمّاش سقي: برّا موسم السقي


## Page Preuve sans bandeau rouge (4 oct., 08 h) : `src/components/ui/i18n.ts` (4 clés)

- `proofSub` (ar) : محاكاة على طقس 2015 إلى اليوم: السقي كل أسبوع، أو اتباع «ساقية».
- `proofSub` (aeb) : محاكاة على طقس 2015 لليوم: السقي كل أسبوع، ولا اتباع ساقية.
- `relYieldSub` (ar) : مقدَّر بنموذج FAO-33
- `relYieldSub` (aeb) : مقدّر بنموذج FAO-33
- `proofMethod` (ar) : المنهجية: حوكي كل موسم منذ 2015 على الطقس الذي حدث فعلا (أرشيف ERA5، Open-Meteo)، كأن ساقية كانت تعرفه مسبقا. فرضية معقولة: قرار كل يوم لا يحتاج إلا إلى طقس ذلك اليوم، وهو الجزء الأكثر موثوقية في التوقعات.
- `proofMethod` (aeb) : الطريقة: كل موسم من 2015 عاودناه على الطقس اللي صار فعلا (أرشيف ERA5، Open-Meteo)، كأنّ ساقية كانت تعرفو من قبل. فرضية معقولة: قرار كل نهار يلزمو كان طقس النهار هاذاكا، وهو أصح جزء في التوقّعات.
- `proofMethodLink` (ar) : المنهجية
- `proofMethodLink` (aeb) : الطريقة


## Pages Appel et Téléphone, points d'Anthony de 08 h 20 (4 oct.)

- `src/components/call/strings.ts` intro (ar) : اتصلوا، استمعوا، واختاروا بأزرار الهاتف. يكفي هاتف بسيط.
- `src/components/call/strings.ts` keysNow (ar) : الأزرار
- `src/components/call/strings.ts` talkLink (ar) : أو تحدّثوا مع ساقية مباشرة
- `src/components/call/strings.ts` hint_lang_en (ar) : الإنجليزية (English)
- `src/components/call/strings.ts` simBadge (ar) : محاكاة
- `src/components/phone/strings.ts` talkSakia (ar) : تحدّث مع ساقية
- `src/components/phone/strings.ts` moreTitle (ar) : كيف تعمل هذه المحاكاة
- `src/components/phone/strings.ts` phoneTitle (ar) : هاتف بأزرار: رسالة الصباح
- `src/lib/sms/replies.ts` help (ar) : ساقية: لتغيير المحصول أو الولاية، اتصل بساقية وقلها. خطة، لغة، ايقاف = مسح. *123# قائمة

- `src/lib/ivr/prompts.ts` welcome (ar), ligne vocale en anglais d'abord : للعربية، اضغط ثلاثة.
