# Statut de validation d'OUCH

*Version 0.3, brouillon pour relecture. Établi le 9 octobre 2026 d'après le code de la v0.3.0 ; mis à jour le 14 octobre 2026 pour la v0.5.0 (nombre de tests, tableau par jour de la semaine, statut des maladies déclarées, sauvegarde chiffrée et verrou par code, et la note sur les [questionnaires validés](questionnaires-valides.md)), puis le 15 octobre 2026 pour la v0.6.0 : pistes de Tendances, essais d'une semaine, rubrique « Ce que le patient a remarqué » du rapport.*

Ce document dit, sans l'enjoliver, **ce qui a été vérifié dans OUCH et ce qui ne l'a pas été**. « Validé » n'est employé que pour un instrument reconnu par la littérature, utilisé tel quel. Pour tout le reste, le mot juste est « conçu », « testé » ou « non évalué ».

## Quatre niveaux à ne pas confondre

1. **La mesure** : l'échelle que le patient remplit mesure-t-elle ce qu'elle prétend ?
2. **Le logiciel** : calcule-t-il ce qu'il annonce, sans erreur ?
3. **Les algorithmes propres à OUCH** (poussées, comparaisons avant et après un changement) : repèrent-ils ce qu'un patient ou un soignant appelle une poussée, ou un effet ?
4. **L'utilité clinique** : le rapport aide-t-il vraiment une consultation, et à quoi ?

OUCH est en bonne position sur le niveau 2, partiellement sur le 1, et **n'a pas été évalué** sur les niveaux 3 et 4.

## Composant par composant

| Composant | Ce qui a été fait | Ce qui n'a pas été fait |
|---|---|---|
| **Douleur, échelle numérique 0 à 10** | Instrument recommandé pour l'intensité (IMMPACT, HAS) et largement validé, repris tel quel (références 1, 3, 10). Rappel sur 24 h, qui limite le biais de mémoire (6) | L'équivalence de la saisie sur téléphone (curseur, ou onze cases les jours de poussée) avec une échelle sur papier n'a pas été étudiée dans OUCH |
| **Fatigue, sommeil, brouillard mental, humeur, stress, activité** | Échelles numériques simples, présentées comme telles | **Aucune validation.** Pas de comparaison avec un instrument validé de ces dimensions. Aucun questionnaire complet n'est intégré (BASDAI, FIQR…) : voir la [note sur les questionnaires validés](questionnaires-valides.md) |
| **Maladies déclarées, statut « diagnostiquée » ou « suspectée », année du diagnostic** | Reprises telles que la personne les déclare, sans rien en déduire ; testées (13 tests sur le statut, l'année et le nom libre) | **Déclaratif, jamais vérifié par un soignant.** Le statut peut être pris pour un diagnostic établi : c'est l'objet de la question 10 du protocole |
| **Catégories légère, modérée, sévère** (≤ 3, 4–6, ≥ 7) | Seuils conventionnels, choisis dans la littérature (5) et indiqués comme variables selon le retentissement | Pas de calibration sur les patients d'OUCH ; ils ne tiennent pas compte du retentissement fonctionnel |
| **Calculs descriptifs** (moyenne, médiane, quartiles, écart-type, répartition, moyenne glissante sur 7 jours) | Formules simples, vérifiées par 313 tests automatiques (dont des valeurs de référence, comme la méthode de calcul des quantiles de R) ; jours manquants jamais imputés | Pas de comparaison systématique avec un logiciel de statistique sur de gros jeux de données. L'usage de la moyenne sur 7 jours reprend la pratique des essais, sans validation propre |
| **Variation relative, repère de 30 %** | Repère issu d'études d'amélioration sous traitement (2, 4, 8, 9), cité comme tel | Établi pour des groupes de patients et des baisses ; non validé pour un individu ni pour une hausse |
| **Poussées** | Définition écrite, paramétrée, testée sur des cas construits (19 tests) | **Voir ci-dessous** : définition propre à OUCH, calibrée sur des données fictives, jamais comparée à des poussées identifiées par des patients ou des soignants |
| **Jour de la semaine** (écart à la moyenne et bande que le hasard suffit à produire) | Formules écrites, testées sur des cas construits (6 tests) ; bande à 5 % avec correction de Bonferroni pour sept comparaisons ; rien d'affiché avant 4 jours notés pour chaque jour de la semaine | Les journées ne sont pas indépendantes (une poussée dure plusieurs jours), donc la bande est indicative ; description sans lien de cause ; pas de comparaison avec une autre méthode |
| **Contexte des 3 jours avant une poussée** | Description seule, sans signal | Aucun lien établi ; abandon volontaire d'un repérage des mesures « inhabituelles » (voir ci-dessous) |
| **Avant et après un changement de traitement** et « écart habituel » | Fenêtres et seuils fixés, testés sur des séries construites ; l'écart habituel donne un repère de hasard pour ne pas lire une différence comme un effet | Les durées (28, 7, 28 jours ; 14 jours renseignés ; 6 paires ; 80e centile) sont des choix de conception sans base empirique citée. Aucun test statistique. Retour vers la moyenne non corrigé |
| **Corrélations** (Spearman) et comparaisons de médianes | Méthode standard, libellés de force conventionnels | Pas de correction des comparaisons multiples ni de l'autocorrélation ; pas de valeur p ni d'intervalle de confiance |
| **Pistes de Tendances** (sommeil, stress, activité de la veille, actions notées) | Règle écrite, la même que celle des corrélations du rapport (au moins 14 jours, Spearman d'au moins 0,3 et d'environ 2/√n, deux groupes d'au moins 4 jours, un point d'écart), au plus trois pistes ; testée sur des cas construits (18 tests) | **Aucune validation.** Les seuils de 4 jours et d'un point sont des choix de conception. Pas de correction des comparaisons multiples : avec plusieurs facteurs, une fausse piste reste possible. Les pistes sont présentées comme « une piste, pas une preuve », mais leur effet sur ce que fait le patient (chercher des causes, s'y fixer) n'a pas été étudié |
| **Essai d'une semaine** (une action notée par le patient, ses jours avec et sans) | Description de sept jours, au moins deux jours de chaque sorte, « une idée, pas une réponse » ; testée sur des semaines construites (13 tests) | Aucun test statistique, sept jours seulement, les journées ne sont pas indépendantes, et rien ne contrôle ce qui change d'autre dans la semaine. Les jours de poussée tombant dans la semaine y sont comptés |
| **Cartes qui amènent une piste** (page du jour, point sur l'onglet, phrase du dimanche) | Règles écrites et testées (14 tests) : jamais pendant une poussée, une piste à la fois, chaque élément se coupe dans Réglages | L'effet sur le patient (sollicitation, anxiété, fixation) n'a pas été évalué : c'est l'objet de la question 6 ci-dessous |
| **Rubrique « Ce que le patient a remarqué »** (rapport) | Reprend les pistes gardées par le patient et ses essais terminés, avec leurs nombres de jours, recalculés sur les deux périodes du rapport ; une piste qui ne passe plus la règle n'y figure pas | Sélection faite par le patient, donc orientée vers ce qui lui parle ; son effet sur la discussion en consultation n'a pas été évalué (questions 8 et 11 du protocole) |
| **Score de la « météo du jour »** (carte à partager) | Pondérations 0,60 / 0,25 / 0,15 | **Aucune validation** : choisies par le concepteur ; hors du rapport médical |
| **Références du rapport** | Les 15 références ont été vérifiées à la source (PubMed ou texte officiel) | Le choix des références n'a pas fait l'objet d'une revue systématique |
| **Sauvegarde chiffrée** (fichier, et copies automatiques facultatives vers Dropbox, en accès anticipé) | AES-256-GCM avec une clé dérivée du mot de passe (PBKDF2, 600 000 itérations) ; aller-retour, altération et mauvais mot de passe testés ; pour les copies automatiques, comparaison de l'empreinte de ce qui revient du service et vérification que la copie s'ouvre (tests sur un faux fournisseur, et essais réels) | Pas d'audit externe du chiffrement ni du format ; les essais réels portent sur peu d'appareils |
| **Verrou par code** (facultatif) | Logique testée (27 tests : codes, pauses après des erreurs, délais, verrou conservé après un rechargement) et essayée sur un iPhone | **C'est un verrou d'affichage, pas un chiffrement.** Sur iPhone, l'aperçu du sélecteur d'applications peut montrer le dernier écran (mesuré, non contournable depuis une page web). Pas d'audit de sécurité |
| **Logiciel** | Lint, tests et build à chaque modification (intégration continue), politique de sécurité de contenu, import de sauvegarde durci, mises à jour de dépendances automatisées | Pas d'audit de sécurité externe. Les contrôles d'accessibilité menés avant certaines publications ne font pas l'objet d'un rapport publié |
| **Utilité du rapport en consultation** | Un [protocole de test](protocole-de-test.md) est rédigé (version 0.3, avec le mode démo de l'app pour la phase A) | **Aucun test mené à ce jour** auprès de soignants |

## Ce qu'il faut savoir sur les poussées

C'est le point où une lecture critique est la plus utile.

- **Origine.** Il n'existe pas de définition consensuelle d'une poussée dans les douleurs chroniques. OUCH retient : au moins 3 jours consécutifs à plus de 2 points ou 30 % au-dessus de la médiane des 28 jours précédents (hors poussées), et au moins 4/10. Les 2 points et 30 % viennent d'études sur l'amélioration (2, 4), appliqués à une aggravation : **extrapolation**, dite comme telle dans le rapport.
- **Calibrage sur des données fictives.** La durée minimale a été fixée en regardant l'historique de démonstration de 90 jours : avec 2 jours, l'algorithme repérait 4 épisodes légers qui n'en étaient pas, d'où 3 jours. Le même historique a servi à écarter le repérage des « mesures inhabituelles » avant une poussée : il en signalait avant 37 % des fenêtres sans poussée. **Ces essais portent sur des données construites par le concepteur, pas sur des patients.** Ils disent que l'algorithme se comporte comme voulu sur un cas fabriqué, pas qu'il est juste sur de vraies données.
- **Angle mort connu.** Au-dessus d'un niveau habituel d'environ 7,7/10, le seuil dépasse 10 : aucune poussée n'est détectable. Un patient dont la douleur est constamment élevée ne verra jamais de poussée, ce qui ne veut pas dire qu'il n'en a pas.
- **Comparaison.** Aucune comparaison avec des poussées déclarées par des patients ou repérées par des soignants. On ne connaît donc ni la sensibilité, ni la spécificité, ni l'accord.

## Ce que nous savons ne pas savoir

1. Les poussées d'OUCH correspondent-elles à celles que les patients et les soignants reconnaissent ?
2. La saisie sur téléphone donne-t-elle les mêmes notes de douleur que le papier ?
3. Les échelles simples de fatigue, de sommeil et d'humeur varient-elles comme des instruments validés ?
4. Un patient qui tient ce journal le tient-il longtemps, et que perd-on quand il s'arrête ?
5. Le rapport change-t-il quelque chose en consultation, et dans quel sens ?
6. Le suivi quotidien, et les pistes qui en sortent, ont-ils un coût psychologique pour certains patients (fixation sur la douleur, anxiété, recherche de causes) ?
7. Les pistes et les essais d'une semaine changent-ils ce que fait le patient, et dans quel sens ?

## Une étude minimale pour y répondre

Pistes, dans l'ordre où elles coûtent le moins ; chacune demande un cadre éthique et réglementaire, et un statisticien pour dimensionner l'échantillon (je ne propose pas de chiffres que je ne pourrais pas justifier).

1. **Utilité et lisibilité** : le [protocole de test](protocole-de-test.md) existant, avec des soignants. Répond à la question 5 de manière qualitative.
2. **Accord sur les poussées** : un groupe de patients tient OUCH pendant plusieurs mois et note de son côté, indépendamment, ce qu'il appelle une poussée (journal papier, entretien). On compare les épisodes d'OUCH à ces repères : sensibilité, spécificité, valeur prédictive, accord (kappa), tolérance sur les dates, et sensibilité aux paramètres (durée minimale, seuil). Réponse à la question 1.
3. **Validité de convergence des échelles** : comparer fatigue, sommeil, humeur d'OUCH à des instruments validés de ces dimensions, passés aux mêmes patients. Le choix et les droits d'utilisation des instruments sont à voir (voir la [note sur les questionnaires validés](questionnaires-valides.md)). Réponse à la question 3.
4. **Équivalence téléphone et papier** pour la douleur, et **observance du journal** (jours renseignés, abandons). Réponses aux questions 2 et 4.
5. **Étude comparative** sur l'effet en consultation (avec et sans rapport), si les étapes précédentes le justifient. Réponse à la question 5, et en partie à la 6 avec un suivi d'événements indésirables.

## Ce qu'on peut dire dès maintenant

| On peut dire | On ne dit pas |
|---|---|
| « OUCH reprend l'échelle numérique de 0 à 10 » | « OUCH est validé » |
| « Le rapport décrit les données déclarées par le patient » | « OUCH mesure l'évolution de la maladie » |
| « Les poussées sont repérées par rapport au niveau habituel du patient, selon une définition propre à OUCH » | « OUCH détecte les crises » |
| « Une comparaison avant et après un changement de traitement, sans conclusion sur son effet » | « OUCH mesure l'efficacité d'un traitement » |
| « 313 tests automatiques vérifient les calculs » | « Les calculs sont cliniquement validés » |

## Mise à jour

Ce document doit changer à chaque modification d'un algorithme ou d'un seuil, et dès qu'une des études ci-dessus produit un résultat. Pour une question ou une correction : [maxime@open-freax.fr](mailto:maxime@open-freax.fr), ou le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml).
