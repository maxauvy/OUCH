# Statut de validation d'OUCH

*Version 0.1, brouillon pour relecture. Établi le 9 octobre 2026 d'après le code de la v0.3.0.*

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
| **Fatigue, sommeil, brouillard mental, humeur, stress, activité** | Échelles numériques simples, présentées comme telles | **Aucune validation.** Pas de comparaison avec un instrument validé de ces dimensions |
| **Catégories légère, modérée, sévère** (≤ 3, 4–6, ≥ 7) | Seuils conventionnels, choisis dans la littérature (5) et indiqués comme variables selon le retentissement | Pas de calibration sur les patients d'OUCH ; ils ne tiennent pas compte du retentissement fonctionnel |
| **Calculs descriptifs** (moyenne, médiane, quartiles, écart-type, répartition, moyenne glissante sur 7 jours) | Formules simples, vérifiées par 147 tests automatiques (dont des valeurs de référence, comme la méthode de calcul des quantiles de R) ; jours manquants jamais imputés | Pas de comparaison systématique avec un logiciel de statistique sur de gros jeux de données. L'usage de la moyenne sur 7 jours reprend la pratique des essais, sans validation propre |
| **Variation relative, repère de 30 %** | Repère issu d'études d'amélioration sous traitement (2, 4, 8, 9), cité comme tel | Établi pour des groupes de patients et des baisses ; non validé pour un individu ni pour une hausse |
| **Poussées** | Définition écrite, paramétrée, testée sur des cas construits (19 tests) | **Voir ci-dessous** : définition propre à OUCH, calibrée sur des données fictives, jamais comparée à des poussées identifiées par des patients ou des soignants |
| **Contexte des 3 jours avant une poussée** | Description seule, sans signal | Aucun lien établi ; abandon volontaire d'un repérage des mesures « inhabituelles » (voir ci-dessous) |
| **Avant et après un changement de traitement** et « écart habituel » | Fenêtres et seuils fixés, testés sur des séries construites ; l'écart habituel donne un repère de hasard pour ne pas lire une différence comme un effet | Les durées (28, 7, 28 jours ; 14 jours renseignés ; 6 paires ; 80e centile) sont des choix de conception sans base empirique citée. Aucun test statistique. Retour vers la moyenne non corrigé |
| **Corrélations** (Spearman) et comparaisons de médianes | Méthode standard, libellés de force conventionnels | Pas de correction des comparaisons multiples ni de l'autocorrélation ; pas de valeur p ni d'intervalle de confiance |
| **Score de la « météo du jour »** (carte à partager) | Pondérations 0,60 / 0,25 / 0,15 | **Aucune validation** : choisies par le concepteur ; hors du rapport médical |
| **Références du rapport** | Les 15 références ont été vérifiées à la source (PubMed ou texte officiel) | Le choix des références n'a pas fait l'objet d'une revue systématique |
| **Logiciel** | Lint, tests et build à chaque modification (intégration continue), politique de sécurité de contenu, import de sauvegarde durci, mises à jour de dépendances automatisées | Pas d'audit de sécurité externe. Les contrôles d'accessibilité menés avant certaines publications ne font pas l'objet d'un rapport publié |
| **Utilité du rapport en consultation** | Un [protocole de test](protocole-de-test.md) est rédigé | **Aucun test mené à ce jour** auprès de soignants |

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
6. Le suivi quotidien a-t-il un coût psychologique pour certains patients (fixation sur la douleur, anxiété) ?

## Une étude minimale pour y répondre

Pistes, dans l'ordre où elles coûtent le moins ; chacune demande un cadre éthique et réglementaire, et un statisticien pour dimensionner l'échantillon (je ne propose pas de chiffres que je ne pourrais pas justifier).

1. **Utilité et lisibilité** : le [protocole de test](protocole-de-test.md) existant, avec des soignants. Répond à la question 5 de manière qualitative.
2. **Accord sur les poussées** : un groupe de patients tient OUCH pendant plusieurs mois et note de son côté, indépendamment, ce qu'il appelle une poussée (journal papier, entretien). On compare les épisodes d'OUCH à ces repères : sensibilité, spécificité, valeur prédictive, accord (kappa), tolérance sur les dates, et sensibilité aux paramètres (durée minimale, seuil). Réponse à la question 1.
3. **Validité de convergence des échelles** : comparer fatigue, sommeil, humeur d'OUCH à des instruments validés de ces dimensions, passés aux mêmes patients. Le choix et les droits d'utilisation des instruments sont à voir (voir la note sur les questionnaires). Réponse à la question 3.
4. **Équivalence téléphone et papier** pour la douleur, et **observance du journal** (jours renseignés, abandons). Réponses aux questions 2 et 4.
5. **Étude comparative** sur l'effet en consultation (avec et sans rapport), si les étapes précédentes le justifient. Réponse à la question 5, et en partie à la 6 avec un suivi d'événements indésirables.

## Ce qu'on peut dire dès maintenant

| On peut dire | On ne dit pas |
|---|---|
| « OUCH reprend l'échelle numérique de 0 à 10 » | « OUCH est validé » |
| « Le rapport décrit les données déclarées par le patient » | « OUCH mesure l'évolution de la maladie » |
| « Les poussées sont repérées par rapport au niveau habituel du patient, selon une définition propre à OUCH » | « OUCH détecte les crises » |
| « Une comparaison avant et après un changement de traitement, sans conclusion sur son effet » | « OUCH mesure l'efficacité d'un traitement » |
| « 147 tests automatiques vérifient les calculs » | « Les calculs sont cliniquement validés » |

## Mise à jour

Ce document doit changer à chaque modification d'un algorithme ou d'un seuil, et dès qu'une des études ci-dessus produit un résultat. Pour une question ou une correction : [maxime@open-freax.fr](mailto:maxime@open-freax.fr), ou le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml).
