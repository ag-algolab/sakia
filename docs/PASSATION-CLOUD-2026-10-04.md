# Passation de la session cloud (4 octobre 2026) vers une session locale

Écrit par la session cloud (Claude Code, branche `claude/poste-ui-cloud-migration-6d8wjy`). Le conteneur cloud disparaît : tout ce qu'il faut
pour reprendre est ici ou dans `docs/passation-cloud/`. Ce fichier complète votre `docs/PASSATION-UI.md` local (ignoré par Git, que la session
cloud n'a jamais vu) : ajoutez-y une ligne qui renvoie ici.

## 0. En trois phrases

1. La PR n°2 (« Poste UI ») a été fusionnée dans `main` à 02:50 (+01:00). Tout ce que la session cloud a fait depuis tient dans **un commit de
   travail** (« Suite du 4 octobre… »), un petit correctif de la page /call et le commit de cette passation, posés sur `main` (a539d16).
2. **Aucune PR n'est ouverte** pour ce travail : c'est à vous de l'ouvrir (texte prêt en section 8), ou à une session locale.
3. Ce qu'il reste ne peut pas se faire depuis le cloud : site en ligne, vrai robot Telegram, vraie voix, vraie base, vrai téléphone (section 3).

## 1. État du dépôt et des contrôles

- Branche : `claude/poste-ui-cloud-migration-6d8wjy`, repartie de `origin/main` (la PR n°2 étant fusionnée, on ne la réutilise pas).
  L'historique détaillé (agents, fusions) n'est pas gardé : il a été aplati en un commit pour ne résoudre qu'une fois les conflits avec `main`.
- Passé sur l'arbre final : `tsc` ; `eslint src scripts` (0 erreur, 1 avertissement d'origine dans `scripts/narration.mjs`, pas de nous) ;
  `next build` ; `npx tsx src/lib/sms/check.ts` (214 contrôles) ; contrôle automatique complet dans un vrai navigateur : **44 vues**
  (13 pages × langues × téléphone/ordinateur), 0 violation d'accessibilité (axe), 0 défilement horizontal, seul reproche : 2 petits liens de
  la page À propos (30 px de haut, déjà là avant), plus des avertissements sans gravité (service worker bloqué par Playwright).
- Passé sur l'arbre juste avant la fusion avec `main` : `telegram-selftest` (58 contrôles, dont 3 nouveaux), `telegram-health-selftest`,
  `assumptions-check`, `i18n-parity`, `ivr-check` (48 273 contrôles), `story-check` (3 221 images), `engine-check`, `messages-check`,
  sous-titres de bout en bout en 4 langues (vraie route `/api/advice`, stockage de voix simulé).
- **À relancer chez vous** (non refaits après la fusion avec `main`) : `telegram-selftest`, `ivr-check`, `voice-check`, les parcours
  téléphone / bulletin / Telegram dans le navigateur, les sous-titres de bout en bout. Commandes en 2.1 et outils en 6.

## 2. À faire, dans l'ordre

### 2.1 Récupérer et contrôler (sans rien déployer)

```bash
git fetch origin && git checkout claude/poste-ui-cloud-migration-6d8wjy && git log --oneline -4
npm ci && npx next typegen && npx tsc --noEmit
npx eslint src scripts
npx tsx scripts/i18n-parity.ts && npx tsx scripts/assumptions-check.ts && npx tsx scripts/telegram-health-selftest.ts
npx tsx scripts/telegram-selftest.ts          # vraie météo : il faut du réseau
npx tsx src/lib/sms/check.ts                  # idem
npx tsx scripts/ivr-check.ts && npx tsx scripts/story-check.ts && npx tsx scripts/voice-check.ts
npx next build
```

Tout doit passer. Puis, dans un vrai navigateur, `docs/passation-cloud/outils-qa/` (mode d'emploi dans `LISEZMOI.md`) :
le contrôle complet des pages, les sous-titres, les parcours téléphone / bulletin / Telegram.

### 2.2 Ouvrir la PR n°3 vers `main`

Texte prêt à coller : section 8. Pas de modèle de PR dans le dépôt. Relire surtout : les 21 fichiers audio ou json supprimés (démos « signalements », remerciements, phrases de la touche 7), `src/lib/sms/*`
(fusion avec votre « dernier arrosage », section 5), `src/components/ui/i18n.ts` (72 lignes de clés de pluie retirées, 64 lignes d'hypothèses traduites ajoutées (16 phrases × 4 langues)).

### 2.3 Après la fusion et le déploiement : vérifier le site en ligne (le plus important : Telegram 24 h/24)

Le robot est un **webhook** de ce site, pas un programme à garder allumé. Il est joignable tant que le jeton, le webhook, la file de messages
et la base des abonnés vont bien. La nouvelle route le dit :

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://sakia-opal.vercel.app/api/telegram/health    # attendu : 200
curl -s https://sakia-opal.vercel.app/api/telegram/health                                      # sinon : lire « problems »
```

| Si la réponse dit… | Faire |
| --- | --- |
| `token: "missing"` ou `"refused"` | Variable `TELEGRAM_BOT_TOKEN` absente ou jeton révoqué (Vercel > Settings > Environment Variables), puis redéployer. |
| `webhook: "missing"` | `npx tsx scripts/telegram-webhook.ts https://sakia-opal.vercel.app` (ou attendre 05:00 UTC : le bulletin du matin le réenregistre tout seul). |
| `webhook: "other_site"` | Le webhook pointe ailleurs (un tunnel de test ?) : même commande. Le bulletin du matin ne l'écrase JAMAIS tant qu'il existe. |
| `pending` élevé ou `lastError` | Telegram n'arrive pas à joindre le site : regarder les journaux Vercel de `/api/telegram`. |
| `store: "unreachable"` | Base Supabase en pause ou clés absentes (réveiller le projet ; `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Le robot répond quand même aux questions en clair et à /aide. |
| `store: "table_missing"` | Exécuter `docs/supabase.sql` dans Supabase. |

Ensuite :

1. Brancher une sonde externe (UptimeRobot, Better Stack…) toutes les 5 minutes sur `/api/telegram/health`, alerte si le code n'est pas 200.
2. Envoyer un vrai message à @sakia_tn_bot : `/start`, « olivier kairouan », un message vocal.
3. Vérifier dans Vercel > Settings > Cron Jobs que les deux tâches de `vercel.json` sont actives (`/api/advice/pregen` 04:30 UTC,
   `/api/telegram/daily` 05:00 UTC) et que `CRON_SECRET` existe. Ne jamais lancer `scripts/telegram-poll.ts` pendant que le webhook est posé.
4. Variable `VERCEL_PROJECT_PRODUCTION_URL` : fournie par Vercel ; la route de contrôle compare le webhook à ce nom de domaine. Si la
   production utilise un domaine personnalisé, enregistrez le webhook sur CE domaine.

### 2.4 À l'oreille et à l'œil, sur le vrai site

- Le gros bouton d'écoute avec ses sous-titres, avec les vrais mp3 préparés : la phrase affichée doit suivre la voix à une seconde près
  (le message court est un mp3 sans alignement mot à mot : le calage est une proportion de lettres, voir section 7). Essayer sur un vrai
  iPhone et un vrai Android (lecture automatique, défilement de la page jusqu'aux sous-titres).
- Page Preuve sur ordinateur (titre sur une ligne, tuiles côte à côte), accueil (drapeau, sous-titre sur deux lignes), page À propos.
- Relecture des textes arabes et tunisiens par un locuteur natif : `docs/passation-cloud/relecture-arabe-darija.md` (68 lignes nouvelles).

## 3. Ce que la session cloud n'a PAS pu vérifier (dit tel quel)

| Sujet | Pourquoi | Ce qui a été fait à la place |
| --- | --- | --- |
| Le site en ligne (Vercel) | Le réseau du bac à sable refuse `sakia-opal.vercel.app` | Build et démarrage locaux, vraie météo |
| Le vrai robot Telegram | Pas de jeton (et je n'en demande jamais) | Tests à blanc avec une fausse API (conversation, pannes, jeton refusé, webhook absent, base en pause) |
| La vraie voix (ElevenLabs) | Pas de clé : `/api/advice` et `/api/voice/bulletin` répondent 502 en local | Sous-titres testés avec un stockage de voix simulé qui rend un mp3 de 22 s |
| La vraie base (Supabase) | Absente | Fausses réponses ; la table `rain_reports` n'est plus lue ni écrite par personne |
| Téléphone réel, iOS, service worker actif | Playwright bloque le service worker ; pas d'appareil | Navigateur de bureau et émulation de téléphone |
| Article « nappe de Kairouan à 230 % » | Le domaine africanmanager.com est refusé | Recherche web : les extraits confirment un chiffre du commissaire régional au développement agricole, relayé par African Manager. La page À propos le dit déjà « press report, not an official study » |
| Arabe et tunisien | Pas de relecteur natif | Tous les textes nouveaux sont listés pour relecture |

## 4. Décisions qui vous reviennent (des questions, oui ou non)

### 4.1 Le « dernier arrosage » : corriger le moteur ? (recommandé : oui)

Le « risque » dont parlent les écrans (faible, moyen, élevé) est le **risque que la plante manque d'eau** (stress hydrique). Ce n'est pas un coût.

Quand l'agriculteur dit « j'ai arrosé il y a 7 jours », le calcul remonte à ce jour-là avec un sol plein, puis avance jour par jour. Défaut : dans
les jours qui ont suivi, la règle « arroser quand le sol va manquer d'eau » s'applique AUSSI au passé, comme si l'agriculteur avait arrosé. Le sol
paraît plus humide qu'en réalité et le conseil vient trop tard. Exemple vérifié avec la météo du 17 juillet 2026 (canicule), tomate, Kairouan, goutte-à-goutte :

| « Dernier arrosage » | Moteur actuel | Avec la correction |
| --- | --- | --- |
| il y a 7 jours | attendre, arroser **demain** 38 mm, risque **moyen** (la même réponse qu'à « il y a 3 jours » : incohérent) | arroser **aujourd'hui** 63 mm, risque **élevé** |
| il y a 3 jours | demain, 38 mm, moyen | inchangé |
| aujourd'hui | dans 4 jours, 36 mm, faible | inchangé |

C'est la scène du rejeu de la démo (canicule, tomate, 7 jours) : la réponse actuelle est trop optimiste pour une plante sans eau depuis une semaine.

**Question : appliquer la correction ?** Si oui : `git apply docs/passation-cloud/proposition-moteur-dernier-arrosage.patch` (quelques lignes ; vérifié : il s'applique sur cet arbre), puis relancer
`engine-check`, `ivr-check`, `telegram-selftest`, `src/lib/sms/check.ts`, `story-check`. À savoir : le rejeu est gardé un jour par le CDN
(`/api/plan`, `s-maxage=86400`, `stale-while-revalidate` 7 jours) : l'ancienne réponse peut rester visible un moment après le déploiement ; les messages
courts préparés pour la scène de la canicule changent de texte (donc de fichier) et seront refaits au prochain passage de `/api/advice/pregen` ;
ajouter une phrase à la section « Moteur » du README et de la fiche de données (« la simulation part du jour du dernier arrosage, sans arrosage jusqu'à aujourd'hui »).

### 4.2 La présentatrice du bulletin : garder la bleue ? (recommandé : oui)

Image : `docs/passation-cloud/presentatrices-verte-alternative_bleue-en-place.png` (verte à gauche, bleue à droite). Ni l'une ni l'autre ne « fait peur » comme l'ancienne.

- **Bleue (en place sur le site)** : veste bleue, épingle en goutte d'eau, grands yeux avec reflets, joues roses, sourire ouvert quand elle parle. Déjà branchée et testée.
- **Verte (alternative, non branchée)** : veste verte, épingle en roue d'irrigation, yeux ronds plus petits, sourire permanent. Pour l'utiliser : copier
  `docs/passation-cloud/FriendlyPresenter.tsx.txt` en `src/components/bulletin/FriendlyPresenter.tsx` et, dans `BulletinPlayer.tsx` (ligne 30), remplacer
  `import Presenter from "./Presenter"` par `import Presenter from "./FriendlyPresenter"` ; mêmes propriétés (`svgRef`), même mécanique d'animation.

**Question : on garde la bleue ?** Sans réponse, on la garde.

### 4.3 La table `rain_reports` dans Supabase : la supprimer ?

Plus rien ne la lit ni ne l'écrit. Elle ne coûte rien et ne contenait que des rapports fictifs. Pour la supprimer : décommenter la ligne `drop table if exists rain_reports;`
dans `docs/supabase.sql` et l'exécuter dans l'éditeur SQL. À vous de voir.

### 4.4 Deux retraits décidés par un agent, à confirmer

- La note « Voix : X (provisoire, pas encore validée à l'oreille) » du bulletin a été retirée (règle « rien de provisoire » de `CLAUDE.md`). Si vous voulez la garder comme étiquette
  d'honnêteté, elle est dans l'historique de `main` (`src/components/bulletin/BulletinPlayer.tsx`, `strings.ts`).
- La seule phrase sur les adresses IP (en mémoire du serveur pour les limites de débit, dans les journaux de l'hébergeur) vivait dans la section À propos supprimée ;
  elle a été reprise mot pour mot dans la puce « Personal data » des garde-fous.

## 5. Ce qui a changé (pour relire la PR)

**Signalements de pluie, retirés partout** (décision d'Anthony ; ne jamais les réintroduire) : accueil (`RainReport.tsx`, notes de `WeekView`), bulletin (bouton « Il a plu »,
bandeau, 3 démos « signalements » en audio + json, `RainReportButton.tsx`, clés `rain*` `reports*` `reward*`), voix (`rainreports.ts`, `flags.ts`, 5 fichiers `thanks-*.mp3`,
`scripts/voice-thanks.ts`), À propos (section « Farmers as weather stations », ligne de tableau, phrases de données ; conclusion réécrite : « le plan utilise la pluie du modèle telle quelle »),
téléphone à touches (touche Pluie ; le menu du message se réduit à Aide, Langue, Stop), SMS (le mot PLUIE n'est plus une commande), ligne vocale (touche 7, 5 phrases enregistrées `rain_*` (10 fichiers),
`/api/ivr/rain`), Telegram (plus de bouton ni de commande ; un vieux bouton de pluie, resté dans une ancienne conversation, ne fait rien), cœur du plan (`plan.ts`, `planCore.ts`,
`weather.ts`, `messages.ts` ne lisent plus aucune pluie signalée), API `/api/reports` et sa route de jeton, bibliothèques `reports.ts`, `rainLevels.ts`, `reporterToken.ts`, 18 clés de
`ui/i18n.ts` par langue, animation CSS, `docs/supabase.sql`, README, fiche de données.
Contrôle : `grep -rniE "signalement|rain_?report|reporter" src scripts` ne doit trouver que `scripts/ivr-check.ts` (qui vérifie l'ABSENCE de ces phrases).

**Fusion avec votre « dernier arrosage par SMS »** (conflits dans `src/lib/sms/`) : gardés `ago`, `extractAgo`, les mots hier / aujourd'hui / jours / avant, l'aide « … hier ou 3j si arrosé »,
vos tests ; retirés le type `rain`, `extractNumber`, les mots de niveau de pluie, `rainThanks`. **Ajout voulu** : `RAIN_WORDS` reste dans le lexique, mais seulement comme garde-fou :
un message qui parle de pluie (« il a plu hier, olivier kairouan ») ne donne AUCUN dernier arrosage (sinon « hier » ferait croire que le sol a été arrosé hier). Deux tests le couvrent.
La puce « Our method… » de votre README a perdu les mots « farmers' own reports ».

**Sous-titres du gros bouton d'écoute** : `/api/advice?...&subs=en|fr|ar|aeb` renvoie, en plus du mp3, l'en-tête `x-advice-subs` (JSON en UTF-8 encodé en base64 : `{id, text, w}` par phrase),
construit avec le MÊME plan que la voix (`clipSubtitles` dans `src/lib/advice/clip.ts`). `src/lib/adviceClient.ts` le garde avec le son (cache `advice-clips-v1`, 12 h) et fournit `subtitleAt`.
`ListenHero.tsx` affiche la phrase dite dans la langue de l'écran (en anglais par défaut ; en `aeb` : le texte dit lui-même), sous le bouton, et fait défiler la page juste ce qu'il faut pour
la montrer (le bouton est tout en bas de la première page d'un écran de 900 px). Bande retirée 4 s après la fin. Les lecteurs d'écran reçoivent le texte complet une fois, pas la bande.

**Page Preuve** : titre sur une ligne ; une seule phrase sous le titre ; la réserve est dans le bandeau rouge, dite en clair (« Simulation sur ordinateur, comme si la météo avait été prévue sans erreur.
Pas un essai au champ. ») ; contenu à la largeur du site (`max-w-5xl`, comme l'en-tête) ; tuiles eau et soif côte à côte, autres cultures et saisons sur deux colonnes sur grand écran.
Ce que veut dire l'ancienne phrase « Simulation on observed weather (not on past forecasts)… » : on a rejoué des saisons passées avec la météo qui a VRAIMENT eu lieu, comme si on l'avait prévue parfaitement
(et non avec les prévisions de l'époque, parfois fausses) : dans un vrai champ, le gain serait un peu moindre. Et ce n'est pas un essai dans de vrais champs.

**Accueil** : petit drapeau de la Tunisie (dessiné en SVG : l'emoji s'affiche « TN » sous Windows) et nom du pays au-dessus du titre ; le sous-titre tient sur deux lignes.

**Textes** : plus de « (Darija) » entre parenthèses (« arabe » ou « arabe tunisien » dans une phrase qui explique le choix) ; la note des langues de la ligne vocale dit ce qui est vrai (français touche 1,
arabe touche 2, sous-titres en anglais, voix arabe = arabe standard simple à accent tunisien, texte non validé par un locuteur tunisien) ; « 230 % » expliqué (2,3 fois plus d'eau puisée qu'elle n'en retrouve).

**Hypothèses traduites** : le moteur écrit ses hypothèses en français ; l'écran anglais ou arabe les montrait en français avec la note « textes en français ». `src/components/ui/assumptionsText.ts` reconnaît les 16 phrases
connues et les affiche dans la langue de l'écran (clés `asm*`) ; une phrase inconnue reste en français. `scripts/assumptions-check.ts` échoue si le moteur change une phrase sans que sa règle suive. Si vous modifiez une hypothèse dans
`planCore.ts` ou `backtest.ts` : mettre à jour la règle ET les 4 traductions.

**Telegram 24 h/24** : `GET /api/telegram/health` (public, aucun secret, résultat gardé 30 s) ; le bulletin du matin réenregistre le webhook s'il N'EXISTE PLUS (seulement en production, jamais s'il pointe ailleurs) ;
questions en clair et /aide fonctionnent même base en panne (`subOrNull` dans `bot.ts`).

**Autres** : `scripts/i18n-parity.ts` (parité des 4 langues), `CLAUDE.md` (décisions d'Anthony, voir ci-dessous), `docs/passation-cloud/`.

## 6. Pièces de cette passation (`docs/passation-cloud/`)

| Fichier | Rôle |
| --- | --- |
| `proposition-moteur-dernier-arrosage.patch` | Correction du moteur de la section 4.1 (`git apply`) |
| `presentatrices-verte-alternative_bleue-en-place.png` + `FriendlyPresenter.tsx.txt` | Les deux présentatrices (section 4.2) |
| `relecture-arabe-darija.md` | Textes arabes et tunisiens nouveaux, à faire relire |
| `outils-qa/` | Scripts de contrôle dans un vrai navigateur (mode d'emploi : `LISEZMOI.md`) |

Une fois la passation faite : supprimer le bloc « Passation en cours » de `CLAUDE.md` ; ce dossier peut rester ou partir, il ne sert plus à l'application.

## 7. Choses à savoir

- Les sous-titres sont calés sur le son par PROPORTION de lettres dites, avec 0,2 s de marge au début et 0,5 s à la fin : le message court est un mp3 sans alignement mot à mot. Écart possible d'environ une seconde.
  Amélioration possible : demander à ElevenLabs la version « avec horodatage » lors de la préparation du matin et garder l'alignement avec le mp3.
- Les messages courts déjà préparés restent valides : le texte lu n'a pas changé (la ligne « signalements » n'en faisait pas partie). Les copies gardées dans les navigateurs AVANT cette version n'ont pas de sous-titres jusqu'à leur renouvellement (12 h au plus).
- Changer de langue d'écran change la demande de son (`subs=…` fait partie de l'adresse gardée) : nouveau chargement d'avance, servi depuis le stockage, sans nouvelle fabrication de voix si le message est déjà préparé.
- `next dev` réécrit `AGENTS.md` : toujours `npx next build` puis `npx next start`.
- Chiffres affichés, audités : la plus grosse valeur de la page Preuve est « 63 jours de soif par saison » pour le piment avec le calendrier fixe (3,7 avec Sakia) : elle dépend de notre hypothèse de référence
  (une irrigation tous les 7 jours, dose de la demande moyenne du mois), dite comme telle sur la page. L'économie d'eau va de 3 à 27 % selon la culture. « 27,9 % » d'illettrisme et « 230 % » viennent de la presse
  (INS, African Manager), avec leur réserve sur la page À propos. Rien d'autre d'aberrant trouvé sur les 8 pages relues.
- Non traités : deux `h1` sur les pages `/story` et `/story/tech` (films, pas de nous), deux liens courts (30 px) sur À propos.

## 8. Texte de la PR n°3 (à coller)

**Titre** : Suite du poste UI : plus de signalements de pluie, sous-titres sur le bouton d'écoute, Telegram 24 h/24

**Corps** :

Reprend le travail de la PR n°2 (fusionnée) sur la dernière version de `main` (SMS « dernier arrosage » inclus).

- **Signalements de pluie retirés partout** (accueil, bulletin, voix, À propos, téléphone, SMS, ligne vocale, Telegram, plan, API, base, documents). La pluie du plan vient uniquement du modèle météo.
- **Sous-titres sur le gros bouton d'écoute**, dans la langue de l'écran, construits avec le même plan que la voix ; la page défile pour les montrer.
- **Page Preuve** sur toute la largeur, titre sur une ligne, une seule phrase sous le titre ; **accueil** : drapeau et nom du pays ; plus de « (Darija) » ; « 230 % » expliqué ; hypothèses du moteur affichées dans la langue de l'écran.
- **Telegram 24 h/24** : `/api/telegram/health`, webhook réenregistré s'il disparaît, questions en clair même base en panne.
- `CLAUDE.md` : décisions du propriétaire du 4 octobre. `docs/PASSATION-CLOUD-2026-10-04.md` : ce qu'il reste à faire hors cloud.

À vérifier avant de fusionner : section 2.1 de la passation. Non vérifié depuis le cloud : site en ligne, vrai robot, vraie voix, vraie base, appareils réels (section 3).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01JcmMxpwbN7HtKmqyTrccsi
