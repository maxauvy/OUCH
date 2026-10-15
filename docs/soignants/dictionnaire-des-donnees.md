# Dictionnaire des données d'OUCH

*Décrit d'après le code de `main` au 9 octobre 2026 : la v0.3.0, plus deux corrections fusionnées le même jour (douleur facultative, variation de pression), complété jusqu'à la v0.5.0 le 14 octobre 2026 (état local de la sauvegarde automatique, verrou par code), puis jusqu'à la v0.6.0 le 15 octobre 2026 (pistes de Tendances, essais d'une semaine) (`src/db/types.ts`, `src/lib/backupSanitize.ts`, `src/lib/loggedEntries.ts`, les écrans de saisie). À mettre à jour quand un champ change.*

Ce document dit, champ par champ, ce que le patient saisit, sous quelle forme c'est enregistré, et ce que cela signifie. Il sert à lire un rapport, à comparer avec vos propres outils, ou à relire une sauvegarde.

## Principes

- **Une entrée par jour**, identifiée par sa date locale (`AAAA-MM-JJ`). Le patient peut revenir corriger n'importe quelle journée ; `updatedAt` garde la dernière modification.
- **Un champ absent veut dire « non renseigné »**, jamais « zéro » ni « normal ». Les calculs du rapport excluent ces jours et n'imputent rien.
- **Un jour ne compte que s'il a un niveau de douleur.** Un jour où le patient n'a noté qu'une zone, une note ou un traitement est enregistré, et le Journal le montre par un rond creux (« noté, sans niveau de douleur »), mais il est **exclu des statistiques** : moyennes, poussées, rapport (y compris les prises de traitement de ce jour) et tendance de la carte de la météo du jour. « Jours renseignés » veut dire, partout, « jours avec un niveau de douleur ». Le patient peut aussi désactiver un facteur dans les réglages : son absence est alors un choix, pas un oubli.
- **Les échelles sont des entiers de 0 à 10**, sauf la durée du sommeil. Les extrémités affichées à l'écran sont données ci-dessous, car elles fixent le sens de la valeur.
- **Les textes libres ne sont pas normalisés** (actions qui ont aidé, effets indésirables, notes, raison d'un traitement) : deux orthographes d'une même action (« Bain chaud », « bain chaud ») comptent pour deux actions dans le rapport et dans Tendances, et pour une seule dans le mot des jours difficiles.
- Aucune heure n'est enregistrée dans la journée, hormis les horodatages de création et de modification de l'entrée.

## Entrée quotidienne

| Champ | Ce que voit le patient | Valeurs | Remarques |
|---|---|---|---|
| `date` | Le jour | `AAAA-MM-JJ`, unique | Jour local de l'appareil |
| `painLevel` | **Douleur** : 0 « Aucune », 10 « Insupportable » | entier 0 à 10, **ou absent** | Rien n'oblige à le saisir, mais sans lui le jour ne compte pas dans les statistiques (voir « Principes »). Absent : jamais enregistré comme 0 |
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
| `pressureDeltaFromPrevious` | nombre, en hPa | **L'application ne l'enregistre pas** : seul le générateur de données de démonstration (et d'éventuelles anciennes sauvegardes) le remplit. S'il est présent, le rapport l'utilise ; sinon il calcule la variation lui-même (voir « Pièges ») |

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
| `illnesses` | fibromyalgie, polyarthrite rhumatoïde (identifiant `arthrite`), spondyloarthrite (identifiant `spondylarthrite`), endométriose, migraine, lombalgie, sclérose en plaques, douleur myofasciale, autre | Oui. Déclaré par le patient, repris en en-tête du rapport sous cette mention |
| `illnessStatus` | par maladie : `diagnosed` (diagnostiquée) ou `suspected` (suspectée), facultatif | Oui. Déclaré par le patient et non vérifié ; sans réponse, le rapport n'indique aucun statut. Effacé quand la maladie est décochée. Une maladie seulement suspectée est expliquée en termes généraux dans l'onglet Enfants |
| `illnessYear` | par maladie : année du diagnostic (entier de 1900 à l'année en cours), facultatif | Oui. Seulement pour une maladie déclarée « diagnostiquée » ; effacée si le statut change ou si la maladie est décochée. Reprise dans le rapport : « fibromyalgie (diagnostiquée en 2019) » |
| `otherIllnessName` | texte libre, 60 caractères au plus | Oui. Le nom saisi pour « autre », repris tel quel dans l'en-tête du rapport, jamais dans l'onglet Enfants |
| `kidsTabEnabled` | vrai / faux | Oui. L'onglet Enfants est masqué tant que la personne n'a pas répondu oui à la question de l'assistant (ou activé l'interrupteur de Réglages) |
| `enabledFactors` | parmi : fatigue, sommeil, stress, brouillard mental, humeur, activité, météo, médicaments, actions positives, zones douloureuses, notes | Oui |
| `cycleTrackingEnabled` | vrai / faux | Oui |
| `autoWeatherEnabled`, `autoWeatherLat`, `autoWeatherLon`, `autoWeatherLabel` | booléen, **latitude et longitude exactes**, nom de la ville | Oui : une sauvegarde contient donc la position exacte, si elle a été enregistrée |
| `reminderEnabled`, `reminderTime` | booléen, `HH:MM` | Oui |
| `language`, `theme`, `onboardingDone`, `parentGender` | `fr` / `en`, `system` / `light` / `dark`, booléen, `maman` / `papa` (écran Enfants) | Oui |
| `hardDaysCardEnabled`, `lightFormEnabled` | booléens | Oui. Le mot des jours difficiles et l'écran allégé pendant une poussée |
| `leadChoices` | par piste de Tendances (clé `sleep`, `stress`, `activity` ou `action:` suivi de l'action en minuscules) : la réponse du patient (`kept` « à noter pour ma consultation », ou `dismissed` « pas vraiment »), la date, et l'écart de douleur et le nombre de jours sur lesquels il a répondu | Oui. Un choix du patient : il ne change aucun calcul, il décide de ce qui figure dans la rubrique « Ce que le patient a remarqué » du rapport |
| `leadTrial`, `leadTrialHistory` | un essai d'une semaine : la piste d'origine, l'action telle que le patient l'a écrite, premier et dernier jour. `leadTrial` est l'essai en cours (ou terminé, en attente d'être clos), `leadTrialHistory` les semaines closes (30 au plus) | Oui. Seule la semaine est enregistrée : le résultat est recalculé à partir du journal, à chaque affichage |
| `leadPromptEnabled`, `weeklySentenceEnabled`, `leadDotEnabled`, `trialsEnabled` | booléens, tous vrais par défaut | Oui. La carte d'une piste sur la page du jour, la phrase du dimanche, le point sur l'onglet Tendances, et l'offre d'un essai d'une semaine |
| `lastBackupAt`, `backupReminderSnoozedUntil`, `fullFormDay`, `hardDaysSeen`, `leadsSeen` | état local de l'appareil (`leadsSeen` : ce que les cartes de pistes ont déjà montré) | **Non** : propres à chaque appareil |
| `autoBackup` | état local de la sauvegarde automatique, facultative et en accès anticipé : fournisseur, dernière copie envoyée et vérifiée (nom, taille, empreinte, date), dernière tentative, et ce que le fournisseur a répondu en cas d'échec | **Non** : propre à chaque appareil, jamais dans une sauvegarde ni dans une copie |

Nom et date de naissance saisis pour un rapport ne sont **pas** des réglages : ils ne sont pas enregistrés.

Le **verrou par code**, facultatif, n'est pas un réglage de la base : il est gardé à part dans le stockage du navigateur (une empreinte salée du code, jamais le code, le délai choisi, le nombre d'erreurs de suite, la langue et l'état verrouillé), et ne fait partie d'aucune sauvegarde ni d'aucun export. Il cache l'écran sans chiffrer les données (voir [`PRIVACY.md`](../../PRIVACY.md)).

## Ce qui est calculé, et non enregistré

Ces valeurs sont recalculées à chaque affichage à partir des données ci-dessus : moyennes et statistiques, moyenne glissante sur 7 jours, poussées, contexte des 3 jours avant une poussée, comparaison avant et après un changement de traitement, corrélations, pistes de Tendances (sommeil, stress, activité de la veille, actions), phrase du dimanche, résultat d'un essai d'une semaine, score de la « météo du jour ». Leurs formules, seuils et limites sont dans la [note méthodologique](../note-methodologique/).

## Sauvegarde et migration

- Une sauvegarde est un fichier JSON chiffré contenant la version du format, la date d'export, **toutes les entrées, tous les traitements et les réglages** ci-dessus (voir [`PRIVACY.md`](../../PRIVACY.md) pour le chiffrement). Elle seule permet de restaurer OUCH.
- À l'import, chaque champ est revérifié : une entrée sans date valide est ignorée, ainsi qu'une entrée dont la douleur est présente mais n'est pas un nombre de 0 à 10 ; une entrée sans niveau de douleur est conservée ; toute autre valeur hors plage est écartée, jamais corrigée. Une sauvegarde faite après la correction contient des jours sans niveau de douleur : importée dans une version antérieure, ces jours sont ignorés. Les entrées sont fusionnées par date, et celles de la sauvegarde l'emportent en cas de doublon.
- Les anciennes versions sont migrées sans rien deviner : zones enregistrées avec leur libellé français (version 1) remplacées par leur identifiant stable ; traitements saisis en texte libre (version 3) convertis en traitements « non précisés » que le patient peut décrire ensuite.

## Export CSV

Réglages, zone sensible, « Exporter en CSV, en clair » : deux fichiers en clair (non chiffrés), qui ne servent pas à restaurer OUCH et ne comptent pas comme une sauvegarde. UTF-8, séparateur virgule, point décimal, fins de ligne CRLF (RFC 4180) ; les noms de colonnes sont en anglais, quelle que soit la langue de l'app ; une cellule vide veut dire « non noté » (un jour sans niveau de douleur n'est pas un jour de douleur 0). Plusieurs valeurs dans une cellule sont séparées par `|`. Un texte qui commence par `=`, `+`, `-` ou `@` reçoit une apostrophe en tête, pour qu'un tableur l'affiche au lieu de le calculer.

- **`ouch-journal-AAAA-MM-JJ.csv`**, une ligne par jour avec une entrée, du plus ancien au plus récent : `date`, `pain`, `fatigue`, `sleep_quality`, `sleep_hours`, `stress`, `brain_fog`, `mood`, `activity` (échelles de 0 à 10 sauf `sleep_hours`), `period_day` (1 / 0), `weather_source` (`auto` / `manual`), `weather_condition` (identifiant), `temperature_c`, `pressure_hpa`, `pain_locations` et `positive_actions` (valeurs séparées par `|`), `notes` (colonne absente si la personne a décoché « Inclure mes notes »).
- **`ouch-prises-AAAA-MM-JJ.csv`**, une ligne par prise d'un traitement : `date`, `medication` (vide si le traitement n'existe plus), `medication_id`, `regimen` (`scheduled` / `asNeeded` / `unspecified`), `dose_amount` et `dose_unit` (la posologie en vigueur ce jour-là, vides pour un traitement non précisé), `doses` (le nombre noté : vide = pris sans nombre, 0 = prise oubliée), `taken` (0 seulement pour un 0 noté), `relief` (0 à 3), `side_effects` (séparés par `|`).

## Pièges à connaître en lisant les données

1. **Des faux zéros hérités.** Jusqu'à la v0.3.0 incluse, toucher autre chose que la douleur avant de la noter (une zone, un curseur, un médicament) créait l'entrée du jour avec une douleur à 0 par défaut, affichée comme enregistrée. C'est corrigé dans le code (PR #117) : un tel jour est désormais enregistré sans niveau de douleur. **Les zéros déjà enregistrés ne sont pas rectifiés** et ne se distinguent pas des vrais : sur des données saisies avec la v0.3.0 ou avant, un jour isolé à « 0/10 » entouré de jours élevés, sans autre cause, mérite un doute.
2. **Les traitements de fond sont cochés d'office** chaque jour, à leur nombre de prises prescrit : la saisie consiste à décocher une prise oubliée. Une prise oubliée mais non décochée compte comme prise, et l'observance déclarée peut être surestimée.
3. **La variation de pression est calculée, pas enregistrée.** Le champ `pressureDeltaFromPrevious` n'est jamais rempli par l'application. Depuis la correction du 9 octobre 2026 (PR #113), le rapport « Centre douleur » calcule lui-même la variation : pression moyenne du jour moins celle du **jour précédent ayant un niveau de douleur** (des jours sans saisie peuvent les séparer), en hPa. Il faut une pression à la fois pour le jour et pour le précédent, c'est-à-dire que la météo automatique doit avoir été utilisée régulièrement ; en dessous de 14 jours exploitables, la ligne n'apparaît pas. Avant cette correction, la ligne ne pouvait pas apparaître avec de vraies données.
4. **Un jour non renseigné n'est pas un jour sans douleur.** Les mauvais jours sont parfois moins remplis : le rapport affiche la part de jours renseignés pour que cela se voie.
5. **Échelles non validées** : fatigue, sommeil, brouillard mental, humeur, stress et activité sont des échelles numériques simples. Seule la douleur suit l'échelle numérique de 0 à 10 recommandée.
6. **Les pistes gardées sont une sélection du patient.** La rubrique « Ce que le patient a remarqué » du rapport reprend ce que le patient a choisi de garder (et les essais d'une semaine qu'il a menés) : ce qui lui parle, pas tout ce que les données montrent. Les actions d'un essai sont celles que le patient a **notées lui-même** dans « Ce qui a aidé aujourd'hui » (texte libre) : OUCH n'en propose aucune. Les semaines d'essai incluent les jours de poussée qui tombent dans la semaine.
7. **Une saisie rétroactive est possible** : une journée peut être remplie ou corrigée plus tard, donc le rappel sur 24 h n'est pas garanti pour toutes les entrées.

## Ce qui n'est pas recueilli

Pas d'heure de la douleur dans la journée, pas de nature de la douleur (brûlure, décharge…), pas de retentissement fonctionnel ni de questionnaire validé (BPI, FIQ, HAD…), pas de poids, de pression artérielle ni de donnée d'une montre connectée, pas d'identité du patient autre que le prénom saisi dans l'app. L'ajout de questionnaires validés est l'objet d'une réflexion distincte, subordonnée aux droits d'utilisation de chaque outil.
