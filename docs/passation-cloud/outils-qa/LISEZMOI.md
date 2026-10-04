# Outils de contrôle de la session cloud (hors application)

Ce sont les scripts avec lesquels la session cloud a vérifié l'interface dans un vrai navigateur. Ils ne font pas partie de l'application :
copiez-les où vous voulez (par exemple `qa/`), ils n'ont besoin que de Playwright et d'axe.

```bash
mkdir qa && cd qa && cp -r ../docs/passation-cloud/outils-qa/* . && npm init -y && npm i playwright-core axe-core
npx playwright install chromium            # ou : export CHROME_PATH=/chemin/vers/chrome
```

Les scripts lisent l'application sur `http://localhost:3100` (adresse réglable : `--base …` ou `BASE=…`). Lancez l'application EN VERSION CONSTRUITE
(`npx next build && npx next start -p 3100`), jamais `next dev` (il réécrit AGENTS.md). Les captures vont dans `./shots` ou `./qa-out`.

| Script | Ce qu'il vérifie |
| --- | --- |
| `node qa.mjs --pages /,/backtest,/bulletin,/phone,/telegram,/about,/call,/offline,/call/talk,/lab,/speed,/story,/story/tech --tag essai` puis `node summarize.mjs essai` | Toutes les pages × langues (en, fr, aeb, ar) × téléphone/ordinateur : un seul `main` et un seul `h1`, règles d'accessibilité axe, défilement horizontal, cibles tactiles trop petites, erreurs de console. Dernier résultat sur l'arbre final : 44 vues, 0 violation axe, 0 défilement horizontal. |
| `node subtitles-flow.mjs` (+ `mock-voice-store.cjs`) | Les sous-titres du bouton d'écoute, de bout en bout : clic, phrases qui défilent, bande retirée 4 s après la fin, 4 langues. Il lui faut un serveur dont le stockage de voix est simulé : voir `restart-both.sh` (port 3110) ; créez d'abord `clip22.mp3` : `ffmpeg -i public/audio/demo-kairouan-olivier-aeb.mp3 -t 22 -ac 1 -ar 22050 -b:a 32k clip22.mp3`. |
| `node phone-flow.mjs`, `node bulletin-flows.mjs`, `node bulletin-music.mjs`, `node telegram-e2e.mjs` | Parcours du téléphone à touches, du bulletin (dont absence de tout bouton de pluie), de la musique du bulletin, de la page Telegram web. Chacun prend l'adresse du serveur en option. |
| `node cls.mjs`, `node lang-flash.mjs` | Sauts de mise en page au chargement ; éclair de langue (accueil en darija). |
| `node proof-shot.mjs`, `node home-shot.mjs` | Captures de la page Preuve et du haut de l'accueil, dans plusieurs tailles et langues (`LANG_UI=fr SIZES=1440x900 node proof-shot.mjs`). |
| `node scan-numbers.mjs`, `node audit-backtest.mjs [région]` | Tous les chiffres affichés sur les pages ; tous les chiffres de la page Preuve, culture par culture. |
| `mock-openmeteo.cjs` | Fausse météo (hors réseau) : `NODE_OPTIONS="--require ./mock-openmeteo.cjs" npx next start`. |

`restart-both.sh` reconstruit puis relance l'application sur 3100 (vraie météo) et 3110 (vraie météo + stockage de voix simulé pour les sous-titres).
Dans le bac à sable de la session cloud, Node ne passait le réseau que par `NODE_USE_ENV_PROXY=1` ; chez vous, inutile.
