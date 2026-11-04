# Texte d'accompagnement des visuels OUCH 0.10.0

Deux séries, de même style que la 0.9.0 : une pour les patients (tutoiement), une pour les soignants (vouvoiement). Sources : `visuels.html` (patients), `soignants.html` (soignants), `render.mjs` (`node communication/visuels-0.10.0/render.mjs [visuels|soignants]`). Captures dans `captures/` (mode démo : données fictives).

| Série | Image du post | Diapositives | Document LinkedIn |
|---|---|---|---|
| Patients | `png/ouch-0.10.0-post.png` | `png/ouch-0.10.0-carrousel-1.png` à `-8.png` | `png/ouch-0.10.0-carrousel.pdf` |
| Soignants | `png/ouch-0.10.0-soignants-post.png` | `png/ouch-0.10.0-soignants-carrousel-1.png` à `-7.png` | `png/ouch-0.10.0-soignants-carrousel.pdf` |

> Mise à jour du 2026-11-04 : visuels refaits d'après `main` (types de rendez-vous, nom du soignant, rapport en couleurs avec flèches de tendance). Ces changements ne sont pas dans le tag v0.10.0 : les images portent « v0.10 », à publier avec une 0.10.1 ou à garder pour plus tard. Les textes ci-dessous n'ont pas été réécrits.

Les trois premières lignes d'un texte LinkedIn sont ce qui s'affiche avant « …voir plus ». « OUCH 0.10.0 » est en faux gras Unicode : seulement les mots sans accent, les lettres accentuées n'existent pas dans ces caractères.

## Patients : version longue (LinkedIn)

𝗢𝗨𝗖𝗛 𝟬.𝟭𝟬.𝟬 : et si ton rendez-vous médical était mieux préparé ?

Le carnet de douleur libre et gratuit t'aide maintenant à arriver en consultation avec tout sous la main 🌤️

➜ Tu notes tes questions quand tu y penses, pas dans le cabinet, et ce dont tu veux parler en priorité. Une carte douce te le rappelle quinze jours avant.
➜ Après, tu gardes une trace de ce qui a été dit, avec la durée de l'ordonnance : OUCH te prévient une semaine avant la fin.
➜ Quand c'est plus dur, tu le notes toi-même. Tu peux comparer deux périodes côte à côte, et le rapport pour ton médecin reprend tout.

Rien de tout ça n'est un diagnostic ni un conseil de traitement : ça décrit ton carnet, sans dire pourquoi. Pas de compte, tes données restent sur ton téléphone, le code est ouvert à tous.

👉 Aux soignants : la plaquette (2 pages) et la note méthodologique (12 pages) sont sur la page de la release. Les textes sur le rythme (« Après tes jours actifs ») n'ont pas encore été relus par un professionnel de santé : si vous en êtes un, j'ai besoin de vous.

#douleurchronique #fibromyalgie #opensource #santénumérique #carnetdedouleur

Premier commentaire : https://maxauvy.github.io/OUCH (« Découvrir avec un exemple » : 90 jours fictifs, sans rien saisir)

## Patients : version courte (X, Bluesky, Mastodon)

OUCH 0.10.0 : le carnet de douleur libre et gratuit t'aide à préparer ton rendez-vous. Tes questions, l'ordonnance à renouveler, tes périodes plus difficiles, deux périodes côte à côte, et un rapport pour ton médecin. Sans compte, données sur ton téléphone.
maxauvy.github.io/OUCH
#douleurchronique #opensource

## Patients : texte alternatif

- **Post** : fond doré. « Ton rendez-vous, mieux préparé. » et pastille « Nouveau · v0.10 ». Trois puces : tes questions, notées ; l'ordonnance à renouveler ; un rapport pour ton médecin. Un téléphone montre la feuille « Ton rendez-vous » de l'app : date, questions, priorité. Données fictives.
1. Fond doré. « Ton rendez-vous, mieux préparé. » et pastille « Nouveau · v0.10 ». Tes questions, ton ordonnance, ton rapport.
2. Fond crème. « Note tes questions. » Un téléphone montre la feuille du rendez-vous avec deux questions et la priorité « Reprendre la marche ». Une carte douce rappelle le rendez-vous quinze jours avant. Tout reste sur le téléphone.
3. Fond lavande. « Après, garde une trace. » Un téléphone montre la partie « Après le rendez-vous » : une note, puis « Une ordonnance a été remise ? » avec la durée (1, 3, 6 mois ou autre), la date de début et le rappel 7 ou 14 jours avant la fin.
4. Fond bleu clair. « Ton ordonnance, sans y penser. » Un téléphone montre les cartes « Rendez-vous » et « Ordonnance » de la page du jour. Pas de notification : la carte attend que tu ouvres l'app.
5. Fond nuit. « Quand c'est plus dur, tu le dis. » Un téléphone montre la feuille « Une période plus difficile » : quand elle a commencé (aujourd'hui, hier, autre jour), ce qui a pu y contribuer (sommeil, stress, effort, météo, règles, infection, traitement), un petit mot.
6. Fond doré. « Deux périodes, côte à côte. » La carte « Comparer deux périodes » : douleur moyenne, jours à 7 ou plus, jours de poussée, raideur au réveil, jours notés, pour deux périodes de 30 jours, et la phrase « Ça décrit, ça ne dit pas pourquoi. » Données fictives.
7. Fond crème. « Un rapport qui reprend tout. » Le haut de la première page du rapport pour le médecin traitant : chiffres clés, courbe. Données fictives.
8. Fond violet. « Essaie, sans rien saisir. » Un QR code et l'adresse maxauvy.github.io/OUCH. Gratuit, libre, sans compte, données sur ton téléphone.

## Soignants : version longue (LinkedIn)

𝗢𝗨𝗖𝗛 𝟬.𝟭𝟬.𝟬 : ce que votre patient peut désormais vous apporter en consultation

OUCH est un carnet de douleur libre et gratuit que le patient remplit en une minute par jour. Cette version prépare le rendez-vous, et le rapport en tient compte 🌤️

➜ Une première page lisible en deux minutes : douleur moyenne, jours sévères, poussées, raideur au réveil, la courbe, chaque chiffre à côté de la période d'avant.
➜ Les questions du patient et ce dont il veut parler en priorité, en tête de page. Sa note du dernier rendez-vous, s'il le souhaite.
➜ Deux périodes côte à côte, l'écart de douleur lu contre ce qui est habituel pour ce patient (le quantile 80 % des écarts entre périodes consécutives, à partir de 6 paires). Descriptif : rien ne dit pourquoi les deux périodes diffèrent.
➜ Les périodes difficiles qu'il note lui-même, avec ce qu'il pense avoir joué, restent à part des poussées repérées par l'application. Rien n'est additionné.

Rien n'est interprété : ni diagnostic ni conseil de traitement, des seuils sourcés, des données auto-déclarées et non vérifiées. Les indicateurs récents ont eu une relecture rapide, pas une validation, et les textes sur le rythme n'ont pas encore été relus par un professionnel de santé.

La plaquette (2 pages) et la note méthodologique (12 pages : chaque formule, chaque seuil, chaque limite) sont jointes à la release. Ce que j'attends de vous : dites-moi ce qui est faux, flou ou inutile, surtout sur les libellés et les textes sur le rythme.

Libre (CeCILL v2.1), sans compte, données sur l'appareil du patient.

#douleurchronique #rhumatologie #médecinegénérale #santénumérique #opensource

Premier commentaire : https://github.com/maxauvy/OUCH/releases/tag/v0.10.0 (plaquette et note méthodologique en PDF, en français et en anglais). Démo sans rien saisir : https://maxauvy.github.io/OUCH (« Découvrir avec un exemple »).

## Soignants : version courte

OUCH 0.10.0, pour les soignants : le rapport du carnet de douleur de vos patients tient en une page, avec leurs questions, deux périodes comparées à leur écart habituel et leurs propres périodes difficiles, à part des poussées repérées. Descriptif, sourcé, relisable. Plaquette et note de 12 pages sur la release : vos retours m'intéressent.
https://github.com/maxauvy/OUCH/releases/tag/v0.10.0

## Soignants : texte alternatif

- **Post** : fond violet. « Le carnet de vos patients. » et pastille « Pour les soignants · v0.10 ». Trois puces : descriptif, jamais interprété ; chaque seuil cité, chaque limite dite ; votre relecture est bienvenue. Le haut de la première page du rapport pour le médecin traitant (données fictives) : période « depuis la dernière consultation », quatre chiffres clés, la courbe.
1. Fond violet. « Le patient arrive avec ses questions. » et pastille « Pour les soignants · v0.10 ».
2. Fond crème. « Sa première page, en deux minutes. » Le haut de la première page du rapport (données fictives, version médecin traitant).
3. Fond lavande. « Ses questions, en tête. » Un téléphone montre la feuille du rendez-vous : questions et priorité, rappel depuis la dernière consultation. Texte libre, repris tel quel.
4. Fond bleu clair. « Un écart à sa mesure. » La carte « Comparer deux périodes » et la mention « Descriptif : rien ne dit pourquoi. »
5. Fond nuit. « Ses mots, à part. » La feuille « Une période plus difficile » : facteurs évoqués, non mesurés.
6. Fond doré. « Rien n'est interprété. » Quatre puces : ni diagnostic ni conseil de traitement ; chaque seuil cite sa source ; données auto-déclarées, non vérifiées ; indicateurs récents relus rapidement, pas validés, textes sur le rythme à relire.
7. Fond violet. « Dites-moi ce qui cloche. » La plaquette et la note méthodologique sur la page de la release ; QR code et adresse maxauvy.github.io/OUCH ; libre (CeCILL v2.1), sans compte, données sur l'appareil.

## Conseils

- Carrousel : téléverser le PDF comme « document » (c'est ce qui donne le défilement sur LinkedIn). Pour Instagram, les PNG dans l'ordre.
- Deux publications distinctes, à quelques jours d'écart plutôt que le même jour, pour ne pas mélanger les publics.
- Le lien va dans le premier commentaire.
- Les captures sont celles du mode démo : les données sont fictives, les textes alternatifs le disent.
- Le QR code renvoie au site, pas à la release : l'adresse de la release est dans le premier commentaire de la série soignants.
