# Ce qu'OUCH est, et n'est pas : cadre réglementaire

*Version 0.1, brouillon de travail. Établi le 9 octobre 2026 d'après la v0.3.0 ; les points sur les envois facultatifs (sauvegarde automatique) et le verrou par code ont été ajoutés le 14 octobre 2026, pour la v0.5.0, puis les pistes de Tendances et les essais d'une semaine le 15 octobre 2026, pour la v0.6.0. **Ce document n'est pas un avis juridique ni une analyse de conformité** : il expose un raisonnement et ses points faibles, pour qu'un professionnel du droit ou de la réglementation puisse le contester.*

## En bref

OUCH se présente comme un **carnet** que le patient tient, et un **résumé descriptif** de ce carnet. Il ne se présente pas comme un dispositif médical, et ses textes sont écrits pour ne pas lui en attribuer l'usage : pas de diagnostic, pas de conseil de traitement, pas de prédiction. Ce positionnement est un choix de conception. Il n'a **pas** reçu de confirmation extérieure, et deux fonctions s'en approchent (voir plus bas).

## 1. Le raisonnement sur les dispositifs médicaux

**Principe.** Dans l'Union européenne, c'est la **destination prévue** annoncée par le fabricant qui fait d'un logiciel un dispositif médical (règlement (UE) 2017/745, dit MDR) : un logiciel destiné à des fins médicales, comme le diagnostic, le suivi (« monitoring »), la prédiction, le pronostic ou le traitement d'une maladie, en relève. Le document d'orientation européen sur la qualification des logiciels (MDCG 2019-11) précise qu'un logiciel qui se borne à stocker, archiver ou transmettre des données, sans les transformer, n'en est pas un.

**Ce qu'OUCH affiche comme destination.** Tenir un journal de douleur personnel, et préparer une consultation en résumant ce journal. Les textes visibles disent : « données auto-déclarées », « ce rapport décrit ces données : il ne formule ni diagnostic ni recommandation thérapeutique », « OUCH ne remplace pas un avis médical ». Le README, la plaquette et la note méthodologique tiennent le même discours.

**Les garde-fous déjà en place.**
- Le rapport décrit et ne conclut pas : aucun verdict (« le traitement marche »), aucune association présentée comme une cause.
- Chaque seuil cite une source, et signale quand il est extrapolé ou propre à OUCH.
- Aucun conseil de traitement adressé au patient. Le seul message déclenché par ses valeurs est le mot des jours difficiles, bienveillant : il ne renvoie qu'à ce que le patient a lui-même noté, se ferme d'un geste et se désactive (voir section 2).
- Les limites sont écrites en clair (échelles non validées, poussées non comparées à un repère extérieur).
- Le rapport porte la mention « données auto-déclarées, non vérifiées par un soignant ».

## 2. Là où le raisonnement est le plus exposé

OUCH ne se contente pas de stocker : il **calcule**. Six fonctions peuvent se lire comme du suivi de maladie ou une aide à la décision, ce qui est le critère à discuter :

1. **Le repérage des poussées** : un algorithme qualifie des périodes comme « poussée » à partir des notes du patient.
2. **La comparaison avant et après un changement de traitement**, présenté au soignant : même descriptif et accompagné de réserves, il porte sur l'effet apparent d'un traitement.
3. **Le rapport destiné au médecin**, lu pour informer une prise en charge, par un tiers qui n'est pas l'utilisateur.
4. **Le mot des jours difficiles et l'écran allégé**, qui se déclenchent quand l'algorithme repère une poussée en cours : l'application adapte son comportement à l'état supposé du patient, même sans lui donner de conseil.
5. **Les pistes de Tendances**, et les cartes qui les amènent (page du jour, point sur l'onglet, phrase du dimanche) : l'application relève des associations dans les notes et les met en avant, avec des mots qui évitent la cause (« une piste, pas une preuve ») mais qui orientent le regard du patient.
6. **L'essai d'une semaine** : l'application invite le patient à reprendre pendant sept jours une action qu'il a lui-même notée, puis compare ses jours avec et sans. L'action vient du patient et le résultat est décrit sans conclure, mais le geste ressemble à une intervention : c'est la raison des garde-fous du [protocole de test](protocole-de-test.md) (pas de suggestion d'action, rien pendant une poussée, texte libre qui peut contenir une modification de traitement).

Ce sont ces points qu'un expert réglementaire regardera d'abord, et c'est la **destination prévue** (ce que le fabricant dit, écrit et promet) qui comptera, davantage que la sobriété des textes. Si une qualification de dispositif médical était retenue, elle imposerait un tout autre cadre (système de qualité, évaluation clinique, marquage CE, classification selon la règle applicable aux logiciels).

**Ce que ce document ne conclut pas** : que OUCH est hors du champ du MDR. Il dit seulement que le projet a été conçu pour tenter de l'être, et que rien ne l'a confirmé.

## 3. Données de santé

- **Verrou par code.** Facultatif, c'est un verrou d'affichage et non un chiffrement : il cache le journal à quelqu'un qui regarde un appareil déverrouillé, mais les données restent lisibles dans le stockage du navigateur, et sur iPhone l'aperçu du sélecteur d'applications peut montrer le dernier écran (voir [`PRIVACY.md`](../../PRIVACY.md)). Il ne doit donc pas être présenté comme une mesure de sécurité des données.
- **Nature.** Le journal est une donnée de santé, catégorie particulière de données personnelles au sens du RGPD.
- **Qui traite quoi.** Les données restent sur l'appareil du patient ; le développeur n'y a pas accès et n'exploite ni serveur ni compte (voir [`PRIVACY.md`](../../PRIVACY.md)). Un usage purement personnel est en principe hors du champ du RGPD, mais la qualification du développeur, qui ne reçoit rien, et celle d'un professionnel qui recommande OUCH ou en recueille des extraits, sont des **questions ouvertes**.
- **Hébergement.** OUCH n'héberge pas de données de santé : la certification d'hébergeur de données de santé (HDS) n'est en principe pas en jeu, à confirmer si une fonction d'envoi vers un serveur d'OUCH était un jour ajoutée. La sauvegarde automatique, facultative et en accès anticipé, n'en est pas une : elle envoie des copies **déjà chiffrées sur l'appareil** (mot de passe que seule la personne connaît) vers le compte Dropbox de la personne, dans un dossier réservé à OUCH. L'hébergeur est alors celui que la personne a choisi, et il ne peut pas lire les copies ; la qualification de ce cas reste une question ouverte.
- **Données plus sensibles, facultatives.** Les nouveaux indicateurs (v0.7.0, accès anticipé) comprennent des données intimes : règles et saignements hors règles, douleur à la selle, troubles urinaires, fièvre ou infection. Elles sont facultatives, **présélectionnées selon la maladie à l'accueil** mais décochables d'un tap, et restent sur l'appareil comme le reste ; elles sont dans la sauvegarde chiffrée et dans l'export CSV (qui, lui, n'est pas chiffré : la personne en est prévenue). Le « nouveau symptôme depuis plus de 24 h » est une case que la personne coche : aucun algorithme ne la lit, elle n'est pas une poussée ni un diagnostic.
- **Appels extérieurs.** Les services contactés (météo, nom de ville) ne reçoivent pas de donnée du journal, et la sauvegarde automatique vers Dropbox, si la personne l'active, n'en reçoit que sous forme chiffrée ; ils reçoivent une position et une adresse IP, ce que [`PRIVACY.md`](../../PRIVACY.md) détaille.

## 4. Cadre des essais

Tester OUCH avec des soignants ou des patients est un autre sujet : voir la section 7 du [protocole de test](protocole-de-test.md) (comité de protection des personnes, DPO, consentement).

## 5. Ce qui est communiqué

La destination prévue ressort de tout ce qui est publié. Quelques règles pour la plaquette, le site, les réseaux, les vidéos et les échanges :

| À préférer | À éviter |
|---|---|
| « Carnet de douleur », « journal » | « Suivi médical », « dispositif de surveillance » |
| « Résume le journal du patient » | « Détecte », « diagnostique », « prédit », « alerte » |
| « Repère les jours nettement au-dessus de son niveau habituel » | « Détecte les crises » |
| « Décrit ce qui a changé autour d'un traitement » | « Mesure l'efficacité d'un traitement » |
| « Montre ce que les notes du patient laissent voir, comme une piste » ; « un essai d'une semaine que le patient mène lui-même, avec ses propres actions » | « Trouve ce qui soulage », « recommande », « personnalise votre prise en charge » |
| « Un support de discussion en consultation » | « Une aide à la décision » ; « améliore la prise en charge » |
| « Données auto-déclarées » | « Données fiables », « données cliniques » |

La même vigilance vaut pour les vidéos de présentation et les textes du magasin d'applications, le cas échéant.

## 6. Ce qui reste à faire

1. **Faire relire ce raisonnement** par une personne compétente en réglementation des dispositifs médicaux (consultant, juriste, ou un premier contact avec l'ANSM), en lui soumettant les quatre points de la section 2. Je ne peux pas le faire à sa place.
2. **Décider de la position** : maintenir un périmètre strictement descriptif, ou assumer une trajectoire dispositif médical (ce qui change l'organisation du projet).
3. **Revoir ce document** si une fonction est ajoutée qui interprète (alerte, prédiction, suggestion de traitement, envoi de données). Une telle fonction demande une revue préalable.
4. **Vérifier la qualification RGPD** du développeur et d'un éventuel usage en établissement, avec un DPO.

## Références de cadrage

- Règlement (UE) 2017/745 du 5 avril 2017 relatif aux dispositifs médicaux (MDR).
- MDCG 2019-11, *Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745 and 2017/746*, octobre 2019.
- Règlement (UE) 2016/679 (RGPD), article 9 sur les catégories particulières de données.

*Ces références sont citées de mémoire d'après leur intitulé : les numéros et dates sont à vérifier à la source avant toute utilisation.*
