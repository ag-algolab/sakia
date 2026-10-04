@AGENTS.md

# Décisions du propriétaire (Anthony), 4 octobre 2026

À lire par toute session avant de toucher au produit. Ces décisions viennent d'Anthony ; si un autre texte du dépôt les contredit
(README, HANDOFF, commentaires), c'est cet autre texte qu'on corrige.

## 1. Plus aucun « signalement de pluie »

- La fonction « les agriculteurs signalent la pluie » est SUPPRIMÉE du produit, partout : accueil, bulletin parlé, téléphone à touches
  (touche Pluie, SMS « PLUIE »), ligne vocale (touche 7), robot Telegram, API (`/api/reports`, `/api/ivr/rain`), table `rain_reports`,
  documents. **Ne la réintroduire sous aucune forme** (ni « seuil de 3 personnes », ni pluie déclarée, ni bouton « Il a plu »).
- Raison : elle n'apportait rien, retirait de la clarté et donnait l'air d'un produit pas fini.
- La pluie du plan vient uniquement du modèle météo (Open-Meteo). Contrôle : `grep -rniE "signalement|rain_?report|reporter" src scripts`
  ne doit rien trouver d'autre que des mentions de cette suppression.

## 2. Un produit fini : jamais « provisoire »

- Aucune phrase « pour l'instant », « bientôt », « en cours », « provisoire », « à venir » dans l'interface visible : ce qui n'existe pas
  n'est pas montré. Quand on arrive sur le site, l'effet voulu est « c'est net, ça marche ».
- Exception voulue : les étiquettes d'honnêteté restent (SIMULÉ / RÉEL sur les portes, « conseil indicatif », « pas sûr : demandez à un
  technicien », texte en arabe tunisien non encore validé par un locuteur natif sur la page À propos). Elles disent ce que le produit
  fait vraiment ; ce ne sont pas des excuses.
- Moins, c'est mieux : pas de sous-titre que personne ne lira, pas de phrase répétée à trois endroits, titres sur 1 ligne (2 au plus) sur
  ordinateur, contenu sur toute la largeur quand il n'y a pas de décor de chaque côté.

## 3. Langues et mots

- Jamais « (Darija) » entre parenthèses : on écrit « arabe » (ou « arabe tunisien » dans une phrase qui explique le choix).
- Le gros bouton d'écoute de l'accueil lit le conseil en arabe tunisien ET affiche des **sous-titres** dans la langue de l'écran (en anglais
  par défaut : le jury ne parle pas arabe). Ils viennent du serveur avec le son, construits à partir du même plan que la voix (en-tête
  `x-advice-subs` de `/api/advice`, `src/lib/adviceClient.ts`, `src/components/ui/ListenHero.tsx`).
- Ligne téléphonique : **anglais d'abord** (décision d'Anthony, 4 octobre, 08 h 30 : « tapez 1 pour l'anglais, tapez 2 pour le français,
  tapez 3 pour l'arabe » ; le jury est anglophone). L'accueil est dit en anglais, puis en français, puis en arabe ; avant le choix, la ligne
  parle anglais. Les touches viennent d'une seule liste (`LANG_CHOICES`, `src/lib/ivr/menu.ts`). Partout où le site répond, l'anglais
  est la langue par défaut.
- Les 4 langues de l'écran (fr, en, ar, aeb) restent à parité : `npx tsx scripts/i18n-parity.ts` (compare les clés de `components/ui/i18n.ts`).
  Tout texte arabe ou tunisien nouveau est listé pour relecture par un locuteur natif.

## 4. Telegram : valide 24 h/24

- Le robot est un webhook (`/api/telegram`), pas un programme à garder allumé. Contrôle : `GET /api/telegram/health` (200 = vivant ;
  503 = quelque chose à réparer, la liste est dans `problems`). À brancher sur une sonde externe (toutes les 5 min). Le bulletin du matin
  (`/api/telegram/daily`) réenregistre le webhook s'il a disparu (jamais s'il pointe ailleurs).
- Ne jamais lancer `scripts/telegram-poll.ts` en même temps que le webhook en production.
- La page `/telegram` embarque une version du robot dans le navigateur (`/api/telegram/sim`, sans état) : elle marche même si le vrai
  robot est coupé.
- Test à blanc sans réseau : `npx tsx scripts/telegram-selftest.ts` et `npx tsx scripts/telegram-health-selftest.ts`.

## 5. Règles qui restent

- Région et culture OBLIGATOIRES sur l'accueil, la preuve et le bulletin. Seule exception, décidée par Anthony (4 octobre, 09 h 30) :
  à la toute première visite (ni région ni culture gardées sur l'appareil), l'accueil et la preuve préremplissent un champ d'exemple
  affiché en clair et modifiable (Kairouan, culture de saison, arrosé il y a 6 jours : `firstVisitProfile`, `src/components/ui/profile.tsx`).
- Honnêteté d'abord : README et `docs/DATA-CARD.md` font foi. Tout chiffre affiché a une source ou un calcul reproductible (tableau de la
  page À propos). Une simulation se dit simulation.
- Jamais de secret dans le code, les journaux ou les captures ; jamais de donnée de test dans la vraie base de l'utilisateur.
- Next.js ici n'est pas celui qu'on connaît : lire `node_modules/next/dist/docs/` avant une API peu familière (voir AGENTS.md). Ne pas
  lancer `next dev` (il réécrit AGENTS.md) : `npx next build` puis `npx next start`. Vérifier avec `npx eslint src scripts`.
