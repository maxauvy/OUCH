# Dictionnaire des données d'OUCH

*Décrit d'après le code de la v0.3.0 (`src/db/types.ts`, `src/lib/backupSanitize.ts`, les écrans de saisie). À mettre à jour quand un champ change.*

Ce document dit, champ par champ, ce que le patient saisit, sous quelle forme c'est enregistré, et ce que cela signifie. Il sert à lire un rapport, à comparer avec vos propres outils, ou à relire une sauvegarde.

## Principes

- **Une entrée par jour**, identifiée par sa date locale (`AAAA-MM-JJ`). Le patient peut revenir corriger n'importe quelle journée ; `updatedAt` garde la dernière modification.
- **Un champ absent veut dire « non renseigné »**, jamais « zéro » ni « normal ». Les calculs du rapport excluent ces jours et n'imputent rien. Le patient peut aussi désactiver un facteur dans les réglages : son absence est alors un choix, pas un oubli.
- **Les échelles sont des entiers de 0 à 10**, sauf la durée du sommeil. Les extrémités affichées à l'écran sont données ci-dessous, car elles fixent le sens de la valeur.
- **Les textes libres ne sont pas normalisés** (actions qui ont aidé, effets indésirables, notes, raison d'un traitement) : deux orthographes d'une même action (« Bain chaud », « bain chaud ») comptent pour deux actions dans le rapport et dans Tendances, et pour une seule dans le mot des jours difficiles.
- Aucune heure n'est enregistrée dans la journée, hormis les horodatages de création et de modification de l'entrée.

## Entrée quotidienne

| Champ | Ce que voit le patient | Valeurs | Remarques |
|---|---|---|---|
| `date` | Le jour | `AAAA-MM-JJ`, unique | Jour local de l'appareil |
| `painLevel` | **Douleur** : 0 « Aucune », 10 « Insupportable » | entier 0 à 10 | Seul champ obligatoire. Voir « Pièges » (zéro par défaut) |
| `fatigueLevel` | **Fatigue** : « En forme » à « À plat » | entier 0 à 10 | ↑ = plus fatigué |
| `sleepQuality` | **Qualité du sommeil** : « Très mauvaise » à « Excellente » | entier 0 à 10 | ↑ = meilleure ; décrit par convention la nuit qui précède |
| `sleepHours` | **Durée de sommeil** | 0 à 12 par pas de 0,5 | En heures, déclarée |
| `stressLevel` | **Stress** : « Calme » à « Sous pression » | entier 0 à 10 | ↑ = plus de stress |
| `brainFog` | **Brouillard mental** : « Esprit clair » à « Confusion » | entier 0 à 10 | ↑ = plus gêné |
| `moodLevel` | **Humeur** : « Difficile » à « Très bonne » | entier 0 à 10 | ↑ = meilleure |
| `activityLevel` | **Activité physique** : « Repos total » à « Intense » | entier 0 à 10 | ↑ = plus actif |
| `painLocations` | **Où as-tu mal ?** | liste parmi 13 zones | `head` Tête, `neck` Cou, `shoulders` Épaules, `arms` Bras, `hands` Mains, `upperBack` Dos haut, `lowerBack` Dos bas, `chest` Poitrine, `stomach` Ventre, `hips` Hanches, `legs` Jambes, `feet` Pieds, `generalized` Généralisée |
| `weather` | **Météo extérieure** (facultative) | objet, voir ci-dessous | Automatique ou à la main |
| `intakes` | **Médicaments pris** | liste d'objets, voir ci-dessous | Liés au registre des traitements |
| `positiveActions` | **Ce qui a aidé aujourd'hui** | liste de textes | Suggestions : repos / sieste, chaleur, froid, étirements doux, marche courte, méditation / respiration, bain chaud, kiné / soins, etc. ; le patient ajoute les siennes |
| `periodDay` | **Règles aujourd'hui** | vrai / faux | N'apparaît que si le suivi du cycle est activé |
| `notes` | **Notes** | texte libre | |
| `createdAt`, `updatedAt` | (non affichés) | horodatages en millisecondes | Création et dernière modification de l'entrée |

### Météo (`weather`)

| Sous-champ | Valeurs | Remarques |
|---|---|---|
| `source` | `auto` ou `manual` | Automatique : relevé via Open-Meteo pour la position enregistrée |
| `condition` | `ensoleille`, `variable`, `nuageux`, `pluvieux`, `orageux`, `neige` | Condition dominante de la journée (automatique) ou choisie |
| `tempC` | nombre, en °C | Automatique : température maximale de la journée, arrondie |
| `pressureHpa` | nombre, en hPa | Automatique : pression moyenne de la journée au niveau de la mer, arrondie |
| `pressureDeltaFromPrevious` | nombre, en hPa | **Prévu pour la variation depuis le dernier jour renseigné, mais l'application ne l'enregistre pas** : seul le générateur de données de démonstration le remplit. Voir « Pièges » |

### Prise d'un traitement (`intakes`, une par traitement et par jour)

| Sous-champ | Valeurs | Remarques |
|---|---|---|
| `medicationId` | identifiant du traitement | Renvoie au registre ci-dessous |
| `doses` | nombre de prises | `0` : prise de fond **marquée oubliée**. Absent : pris, nombre non noté (anciennes saisies) |
| `relief` | `0` Aucun, `1` Léger, `2` Modéré, `3` Important | Demandé pour un traitement au besoin, quand une prise est notée |
| `sideEffects` | liste de textes | Suggestions : nausées, somnolence, vertiges, maux de tête, constipation, bouche sèche ; texte libre accepté |

## Registre des traitements (`Medication`)

| Champ | Valeurs | Remarques |
|---|---|---|
| `id` | UUID | Aléatoire, pour fusionner des sauvegardes de deux appareils sans collision |
| `name` | texte | Comparé sans tenir compte de la casse ni des espaces |
| `regimen` | `scheduled` de fond, `asNeeded` au besoin, `unspecified` non précisé | « Non précisé » : traitement ajouté à la volée ou saisi avant la version 3 |
| `reason` | texte libre | Ce pour quoi il est pris, avec les mots du patient |
| `periods` | liste, de la plus ancienne à la plus récente | Une période par posologie |
| `periods[].start`, `end` | `AAAA-MM-JJ`, bornes incluses | `end` absent : en cours |
| `periods[].dose` | `{ amount, unit }` | Unités : mg, g, µg, ml, gouttes, bouffées, patchs |
| `periods[].perDay` | nombre | De fond : prises prescrites par jour. Au besoin : maximum par jour |
| `periods[].stopReason` | `ineffective` inefficace, `sideEffects` effets indésirables, `improved` amélioration, `other` autre | Seulement à l'arrêt |
| `createdAt`, `updatedAt` | horodatages | |

Un changement de dose ferme la période en cours la veille et en ouvre une nouvelle ; un arrêt met une date de fin à la dernière période.

## Réglages (`Settings`)

| Champ | Valeurs | Sauvegardé ? |
|---|---|---|
| `displayName` | texte | Oui (prénom, affiché dans l'app ; pas le nom du rapport) |
| `illnesses` | fibromyalgie, arthrite, spondylarthrite, endométriose, migraine, lombalgie, sclérose en plaques, autre | Oui. Déclaré par le patient, repris en en-tête du rapport sous cette mention |
| `enabledFactors` | parmi : fatigue, sommeil, stress, brouillard mental, humeur, activité, météo, médicaments, actions positives, zones douloureuses, notes | Oui |
| `cycleTrackingEnabled` | vrai / faux | Oui |
| `autoWeatherEnabled`, `autoWeatherLat`, `autoWeatherLon`, `autoWeatherLabel` | booléen, **latitude et longitude exactes**, nom de la ville | Oui : une sauvegarde contient donc la position exacte, si elle a été enregistrée |
| `reminderEnabled`, `reminderTime` | booléen, `HH:MM` | Oui |
| `language`, `theme`, `onboardingDone`, `parentGender` | `fr` / `en`, `system` / `light` / `dark`, booléen, `maman` / `papa` (écran Enfants) | Oui |
| `hardDaysCardEnabled`, `lightFormEnabled` | booléens | Oui. Le mot des jours difficiles et l'écran allégé pendant une poussée |
| `lastBackupAt`, `backupReminderSnoozedUntil`, `fullFormDay`, `hardDaysSeen` | état local de l'appareil | **Non** : propres à chaque appareil |

Nom et date de naissance saisis pour un rapport ne sont **pas** des réglages : ils ne sont pas enregistrés.

## Ce qui est calculé, et non enregistré

Ces valeurs sont recalculées à chaque affichage à partir des données ci-dessus : moyennes et statistiques, moyenne glissante sur 7 jours, poussées, contexte des 3 jours avant une poussée, bilan d'un changement de traitement, corrélations, score de la « météo du jour ». Leurs formules, seuils et limites sont dans la [note méthodologique](../note-methodologique/).

## Sauvegarde et migration

- Une sauvegarde est un fichier JSON chiffré contenant la version du format, la date d'export, **toutes les entrées, tous les traitements et les réglages** ci-dessus (voir [`PRIVACY.md`](../../PRIVACY.md) pour le chiffrement). Il n'y a pas encore d'export en clair ni de CSV.
- À l'import, chaque champ est revérifié : une entrée sans date valide ou sans douleur entre 0 et 10 est ignorée, une valeur hors plage est écartée, jamais corrigée. Les entrées sont fusionnées par date, et celles de la sauvegarde l'emportent en cas de doublon.
- Les anciennes versions sont migrées sans rien deviner : zones enregistrées avec leur libellé français (version 1) remplacées par leur identifiant stable ; traitements saisis en texte libre (version 3) convertis en traitements « non précisés » que le patient peut décrire ensuite.

## Pièges à connaître en lisant les données

1. **Un zéro de douleur peut être un faux zéro.** Si le patient touche autre chose que la douleur avant de la noter (une zone, un curseur, un médicament), l'application crée l'entrée du jour avec une douleur à 0 par défaut, et l'affiche comme enregistrée. Un jour « 0/10 » isolé, entouré de jours élevés et sans autre cause, mérite un doute. Une correction est à l'étude.
2. **Les traitements de fond sont cochés d'office** chaque jour, à leur nombre de prises prescrit : la saisie consiste à décocher une prise oubliée. Une prise oubliée mais non décochée compte comme prise, et l'observance déclarée peut être surestimée.
3. **La variation de pression n'est pas enregistrée** par l'application, contrairement à la pression elle-même. Le tableau des facteurs associés du rapport « Centre douleur » ne peut donc pas, avec des données réelles, afficher la ligne de variation de pression. Une correction est à l'étude, et la note méthodologique la décrit telle qu'elle est conçue.
4. **Un jour non renseigné n'est pas un jour sans douleur.** Les mauvais jours sont parfois moins remplis : le rapport affiche la part de jours renseignés pour que cela se voie.
5. **Échelles non validées** : fatigue, sommeil, brouillard mental, humeur, stress et activité sont des échelles numériques simples. Seule la douleur suit l'échelle numérique de 0 à 10 recommandée.
6. **Une saisie rétroactive est possible** : une journée peut être remplie ou corrigée plus tard, donc le rappel sur 24 h n'est pas garanti pour toutes les entrées.

## Ce qui n'est pas recueilli

Pas d'heure de la douleur dans la journée, pas de nature de la douleur (brûlure, décharge…), pas de retentissement fonctionnel ni de questionnaire validé (BPI, FIQ, HAD…), pas de poids, de pression artérielle ni de donnée d'une montre connectée, pas d'identité du patient autre que le prénom saisi dans l'app. L'ajout de questionnaires validés est l'objet d'une réflexion distincte, subordonnée aux droits d'utilisation de chaque outil.
