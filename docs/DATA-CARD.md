# Fiche des données — Sakia

Exigée et **notée** par le jury (PDF officiel, section 7.2) : pour chaque jeu, **source, licence, taille, et ce qu'il ne couvre pas**. Les cases « à mesurer » sont à remplir avant le rendu.

## A. Données qui montrent le problème (preuves, avec source, année, pays)

| Fait | Valeur | Source | Année | Réserve |
|---|---|---|---|---|
| Part de l'agriculture dans les prélèvements d'eau | 75,5 % (2,71 sur 3,59 km³) | FAO AQUASTAT, fiche Tunisie | 2022 | certaines valeurs imputées |
| Nappe de Kairouan exploitée à | 230 % | African Manager (presse) | 2024 | presse, pas un rapport officiel |
| Ménages de Kairouan avec internet | 20,7 % (national 40,4 %) | INS, bulletin TIC | 2025 | définition « ménage », pas « individu » |
| Analphabétisme à Kairouan (10 ans et plus) | 25,5 à 28,5 % (national 17,3 %) | INS, recensement | 2024 | fourchette lue dans un résumé |
| SMS reçus au bon moment dans un pilote | environ 15 à 16 % (421 répondants, 3 régions) | ICARDA, ICT2Scale (WOCAT ; rapport d'évaluation MEL, août 2021) | 2019-2021 | petit pilote ; SMS génériques, pas spécifiques à l'irrigation |
| Messages jugés sans utilité à Kairouan (pilote ICT2Scale) | 34,6 % « aucune utilité », 24,6 % « utilité faible » ; réseau = premier obstacle (62,5 %) | Rapport d'évaluation ICT2Scale (MEL/CGIAR) | 2021 | échantillon à Kairouan limité |
| Irrigation de céréales à Kairouan en zones privées / publiques | 27 160 ha / 840 ha | African Manager | 2024-25 | année où les barrages étaient vides ; pas un ratio sur toutes les cultures |
| Mode de distribution de l'eau publique | à la demande (75 % des périmètres) ou tour d'eau ; volumes décidés par saison selon les barrages | Rapport national du secteur de l'eau 2017 (MARHP), études IRD/CIRAD | 2017 et antérieur | ancien ; aucun calendrier mensuel officiel trouvé |
| Pompage plus coûteux pour les exploitations < 3 ha | 1,25 à 1,5 fois | Cahiers Agricultures | 2024 | lu via un résumé |

## B. Données avec lesquelles l'outil travaille

| Jeu | Rôle | Source | Licence | Taille | Ce qu'il ne couvre pas |
|---|---|---|---|---|---|
| Prévision météo (ET0 FAO, pluie, température) | Plan des 7 jours | Open-Meteo (modèles ECMWF, ICON, GFS) | CC BY 4.0 ; usage gratuit non commercial | 23 jours × 5 variables ≈ _à mesurer_ Ko par région | Maille de 9 à 25 km, **aucune station locale** ; l'ET0 de maille peut **sous-estimer** le besoin (étude au Maroc : −2 à −37 %) ; vent peu fiable ; fiabilité faible au-delà de 7 jours |
| Archive météo ERA5 | Backtest sur 11 saisons | Open-Meteo (ERA5) | CC BY 4.0 | 4 291 jours pour Kairouan | Même limites ; point du chef-lieu, pas la parcelle |
| Coefficients de culture (Kc, p, Zr, Ky) | Besoin en eau | FAO Irrigation and Drainage Paper 56 (tableaux 11, 12, 22, 24) ; Pereira et al. 2024 (arbres) | Publications FAO / Springer (valeurs citées, non redistribuées en bloc) | 18 cultures | **Valeurs génériques, pas d'essais tunisiens** ; Ky absent pour l'orge, le melon et tous les arbres ; coefficients du grenadier et du figuier par analogie |
| Calendrier agricole de la Tunisie | Dates de semis | FAO CropCalendar | FAO | 15 cultures annuelles | Absent pour olivier, amandier, vigne, agrumes, dattier, luzerne ; pas de calendrier propre à Kairouan hors piment, olive, céréales |
| Eau utile du sol | Réserve en eau | FAO-56 tableau 19 (valeurs indicatives : 90, 150, 170 mm/m) | FAO | 3 classes | **Pas de carte de sol réelle** (SoilGrids possible, non intégré) |
| Voix de synthèse | Bulletin parlé | ElevenLabs (voix « Rima M », accent tunisien) | Conditions ElevenLabs (plan Creator) | ~4 Ko par seconde de son | Dialecte tunisien non garanti : le modèle lit de l'arabe ; **non validé par un locuteur natif** |
| Reconnaissance vocale | Question parlée de l'agriculteur | ElevenLabs Scribe | Conditions ElevenLabs | — | Précision publiée : français excellent, arabe moyen, **dérija non évaluée par le fournisseur** ; à mesurer sur nos phrases |
| Données d'entraînement du petit modèle d'intentions | Comprendre « zitoun kairouan » | **Synthétiques**, générées par nous (modèles de phrases FR / AR / arabizi) | Produites pour ce projet | _à mesurer_ | **Étiquetées synthétiques** ; pas de vrais messages d'agriculteurs ; couvre 18 cultures et 24 gouvernorats |

## C. Ce que nos données ne couvrent PAS (noté par le jury)
- Aucun essai de terrain en Tunisie : les coefficients sont génériques ; le conseil est **indicatif**.
- Pas de station météo locale ni de capteur d'humidité du sol.
- Pas de registre d'agriculteurs, pas de prix de marché, pas de salinité de l'eau.
- Le « calendrier fixe » du backtest est une **hypothèse** : le vrai calendrier de l'administration n'a pas été obtenu.
- Le rendement relatif n'est estimé que pour 9 cultures ayant un Ky publié, **jamais pour les arbres**.
- Reconnaissance du dialecte tunisien : à évaluer (voir ci-dessous) ; non garantie.
- Aucune donnée personnelle collectée au-delà d'un identifiant de conversation, d'une langue, d'une région, d'une culture et de quelques réglages.

## D. Évaluations à faire avant le rendu (« preuve que ça marche »)
1. **Backtest** : 11 saisons, 18 cultures (fait, `scripts/engine-check.ts`).
2. **Intentions** : précision du petit modèle sur un jeu de test écrit à la main par Anthony (au moins 30 phrases FR / arabe / arabizi, dont des fautes de frappe).
3. **Reconnaissance vocale** : 10 à 20 phrases enregistrées par Anthony (ou des proches), passées dans Scribe ; mesurer la part de phrases correctement comprises pour chaque langue. **Dire le résultat tel quel, même mauvais** : le jury note l'honnêteté.
4. **Tailles** : JSON du plan, audio du bulletin, appli installée.
5. **Hors connexion** : vidéo en mode avion.
