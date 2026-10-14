# Changelog

Les changements notables d'OUCH sont notés ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et les versions numérotées suivent le [versionnage sémantique](https://semver.org/lang/fr/) : tant que le projet est en `0.x`, des changements peuvent casser des habitudes d'une version à l'autre.

Chaque version est aussi une [release GitHub](https://github.com/maxauvy/OUCH/releases), et le site déployé affiche en pied de page la version qu'il exécute (avec le commit entre deux versions).

## [Non publié]

### Ajouté
- Un **verrou par code**, facultatif et en **accès anticipé** (il n'apparaît dans Réglages, Rappel et affichage, qu'une fois les fonctions à l'essai activées : cinq touches rapides sur la ligne « Créé avec soin par… » ; un verrou déjà réglé reste toujours accessible, pour le changer ou le retirer) : un code à quatre chiffres demandé à l'ouverture de l'app et quand on y revient après un moment. **C'est un verrou d'affichage, pas un chiffrement** : il cache le journal à quelqu'un qui regarde un appareil déverrouillé, mais les données restent en clair dans le navigateur. L'écran de verrouillage montre le logo, « Ton journal est à l'abri des regards », quatre points (« Voir » les affiche) et un clavier rond à grosses touches. Le délai se règle en pastilles : aussitôt, 1 min (par défaut), 5 min ou 15 min ; « Verrouiller maintenant » verrouille tout de suite ; « Changer le code » et le retrait demandent le code actuel. L'activation commence par la date de la dernière sauvegarde et propose d'en faire une d'abord, puis le code se tape deux fois. Les quatre premiers codes faux de suite ne coûtent rien ; dès le cinquième, une pause de 30 secondes, qui double jusqu'à 15 minutes ; pendant une pause, même le bon code est refusé, et **rien n'est jamais effacé**. L'app est masquée dès qu'elle quitte l'écran, avant l'aperçu du sélecteur d'applications. Le code n'est gardé que sous forme d'empreinte salée, sur l'appareil, hors de toute sauvegarde : il ne peut pas être réaffiché. « Code oublié ? » explique que la seule issue est d'effacer les données de l'appareil (après confirmation) puis de restaurer une sauvegarde. « Supprimer toutes mes données » retire aussi le verrou. L'écran de verrouillage est dessiné dans la langue de l'app dès le démarrage (elle est gardée avec le verrou, avant que les réglages soient lus). Pas de verrou dans le mode démo. Voir `PRIVACY.md`.
- Une sauvegarde automatique chiffrée vers Dropbox, en **accès anticipé** : elle n'apparaît que sur un appareil où l'on a activé les fonctions à l'essai, le temps de l'essayer sur téléphone : cinq touches rapides sur la ligne « Créé avec soin par… » au bas d'une page (un message le confirme, et cinq touches de plus les coupent), ou `?autobackup` ajouté à l'adresse (`?autobackup=0` les retire). Le réglage est propre à l'appareil et ne touche pas aux données. Dans Réglages (Mes données), une carte « Sauvegarde automatique » : un assistant en trois temps (où ranger, mot de passe, première copie envoyée sur place), puis une carte qui dit quand la dernière copie est partie, sa taille et qu'elle a été vérifiée. Une copie part 30 secondes après une modification du journal, au plus toutes les 15 minutes, et quand l'app revient au premier plan (une web-app n'a rien qui tourne en arrière-plan, donc elle ne part que quand l'app est ouverte). C'est le même fichier chiffré que la sauvegarde exportée, fabriqué sur l'appareil ; Dropbox ne voit que ce fichier, dans un dossier réservé à OUCH, et on garde les trois dernières copies. Après chaque envoi, OUCH relit la copie, compare son empreinte SHA-256 et vérifie qu'elle s'ouvre : une copie qui ne passe pas est retirée. Une copie réussie compte comme une sauvegarde (la date sur « Aujourd'hui » et le rappel la suivent). « Restaurer » liste les copies, permet d'en vérifier une (sans mot de passe) ou de la restaurer (avec le mot de passe, par le même import que la sauvegarde exportée). En cas d'échec, la carte le dit sans reproche et affiche ce que Dropbox a répondu. « Arrêter » efface la clé et les jetons de l'appareil et révoque le lien chez Dropbox. Ni la clé ni les jetons ne sont dans une sauvegarde. Voir `PRIVACY.md`.

### Corrigé
- Le verrou par code ne demandait pas le code quand on fermait l'app puis qu'on la relançait dans la minute (le délai s'appliquait aussi aux relances). Une app fermée, par soi ou par le système, demande maintenant toujours le code au lancement ; le délai ne joue plus que lorsque l'app revient à l'écran sans avoir été fermée.
- Le verrou par code redemandait le code juste après une mise à jour (« Recharger »). L'app laisse maintenant, au moment de se recharger elle-même depuis un état déverrouillé, un laissez-passer de 10 secondes, utilisé une seule fois : le code n'est pas redemandé deux fois de suite, et ce laissez-passer ne sert pas à rouvrir une app verrouillée, ni à un lancement à froid. En contrepartie, deux contournements possibles sont fermés : un verrou « verrouillé » (par « Verrouiller maintenant » ou après le délai) le reste maintenant après un rechargement de la page, et une app verrouillée qui quitte l'écran ne repart plus le compte du délai. Avec « Aussitôt », le rechargement de la page rouvrait aussi l'écran de verrouillage même juste après avoir saisi le code ; c'est réglé pour le cas de « Recharger ».

## [0.4.0] - 2026-10-12

### Ajouté
- Un mode démo dans l'app, pour la découvrir sans rien saisir : 90 jours fictifs (une personne, deux poussées, un changement de traitement), dans la langue de l'app. On y entre par un lien « Découvrir avec un exemple » sous le bouton de l'assistant, par une carte de Réglages (À propos) ou par le lien `?demo` ajouté à l'adresse (la langue du navigateur décide alors). La démo vit dans une base séparée : ton vrai journal n'est jamais touché ni lu. Une pastille « Mode démo » reste affichée avec un bouton « Quitter », qui efface l'exemple sans demander de confirmation ; les rapports portent une bande « Données fictives — démonstration ». Une visite guidée en 3 étapes (la douleur du jour, Tendances, le rapport) s'ouvre au premier lancement et se passe d'un geste ; « Revoir la visite » dans Réglages la relance. Dans la démo, pas de météo automatique (aucun appel réseau), pas de sauvegarde, d'export CSV ni de suppression, pas de rappel ni de cartes d'installation ou de soutien.
- Un export CSV du journal, dans une « Zone sensible » rouge de Réglages (Mes données) qui réunit désormais l'export et « Supprimer toutes mes données » (deux lignes, chacune avec son icône ; chacune ouvre une fenêtre qui dit ce qui est en jeu avant d'agir). « Exporter en CSV, en clair » produit deux fichiers pour un tableur ou un logiciel d'analyse, `ouch-journal-…csv` (une ligne par jour) et `ouch-prises-…csv` (une ligne par prise de traitement, avec la posologie en vigueur ce jour-là). Standard international : UTF-8, virgule, point décimal, noms de colonnes en anglais. Une cellule vide veut dire « non noté ». Les notes libres peuvent être exclues (« Inclure mes notes »). Sur téléphone, la feuille de partage ; sur ordinateur, deux téléchargements. La fenêtre de l'export dit avant le bouton (« Exporter quand même ») que ces fichiers ne sont pas chiffrés : quiconque les ouvre lit tout le journal, notes comprises. Ils ne servent pas à restaurer OUCH et ne comptent pas comme une sauvegarde (la date de dernière sauvegarde et le rappel ne bougent pas). Un texte qui commence par `=`, `+`, `-` ou `@` reçoit une apostrophe en tête, pour qu'un tableur l'affiche au lieu de le calculer.
- Pour chaque maladie suivie, on peut dire si elle est « diagnostiquée » ou « suspectée » (assistant et Réglages : sous les puces, « Précise pour chacune »). C'est facultatif et rien n'est coché d'avance : sans réponse, la maladie est listée comme avant. Pour une maladie diagnostiquée, un champ facultatif demande l'année du diagnostic (quatre chiffres, de 1900 à cette année), que les médecins demandent souvent. Le rapport reprend le statut dans la mention « Maladies déclarées par le patient : fibromyalgie (diagnostiquée en 2019), polyarthrite rhumatoïde (suspectée) ». Choisir « Autre » permet de taper le nom de la maladie, repris tel quel sur le rapport (jamais sur la page Enfants). Les statuts, les années et ce nom sont restaurés avec une sauvegarde ; décocher une maladie, ou passer à « suspectée », efface ce qui s'y rapporte.
- Dans les deux rapports (médecin traitant et Centre douleur), un tableau « Douleur selon le jour de la semaine » : la douleur moyenne de chaque jour, son écart à la moyenne de la période, le nombre de jours, et une bande grise qui montre l'écart que le hasard suffit à produire (le plus grand des sept écarts, au seuil de 5 %, erreur-type avec correction de Bonferroni, sur le jour le moins représenté). Une barre pleine sort de la bande, une barre pâle reste dedans. Il n'apparaît qu'à partir de 4 jours notés pour chaque jour de la semaine. La note de lecture rappelle que les journées ne sont pas indépendantes (une poussée dure plusieurs jours) et que c'est une description, sans lien de cause.

### Modifié
- La carte « Tes jours de la semaine » de Tendances ne disparaît plus tant qu'elle n'a pas assez de jours : une carte à sa place dit qu'elle apparaît après environ 4 semaines de suivi (4 jours notés pour chaque jour de la semaine, sur la période choisie). Elle reste absente avant 14 jours de journal, où le message sur les premiers motifs suffit.
- L'onglet Enfants n'explique plus en détail une maladie seulement suspectée : son texte dit « maman a une… », ce qui annoncerait à l'enfant un diagnostic qui n'existe pas encore. Elle reçoit le texte général (« Cette maladie »), une seule fois même s'il y en a plusieurs.
- La carte « Tes journées sont en moyenne meilleures le samedi… » de Tendances devient « Tes jours de la semaine » : deux grandes tuiles, « Ton jour le plus doux » et « Ton jour le plus exigeant », avec leur douleur moyenne et le nombre de jours derrière chacune (« sur 12 samedis »). Elle n'apparaît plus qu'à partir de 4 jours notés pour chaque jour de la semaine (au lieu de 7 jours en tout, soit environ un jour par jour de la semaine, donc surtout du hasard), et seulement avec les deux tuiles quand l'un des deux jours sort de ce que le hasard suffit à produire ; sinon elle dit que les jours se ressemblent pour l'instant.

### Corrigé
- Juste après une release, un navigateur qui avait chargé la version publiée par le push sur `main` continuait d'afficher « 0.4.0+abc1234 » au lieu de « v0.4.0 » : le push et l'étiquette de release portent le même commit, bâti deux fois, et seul le second sait qu'il est la release, alors que la comparaison ne regardait que le commit. `version.json` dit maintenant aussi si la version est étiquetée, et l'app propose « Recharger » quand ce n'est pas la même que la sienne.

## [0.3.1] - 2026-10-12

### Ajouté
- La date de la dernière sauvegarde sur l'écran « Aujourd'hui », sous le titre : « Dernière sauvegarde : 3 oct. » (« Aucune sauvegarde pour l'instant. » quand il y a déjà des jours notés et aucune sauvegarde). La ligne ouvre la section de sauvegarde. La carte de rappel garde sa règle : elle ne s'affiche toujours qu'au bout de 7 jours notés sans sauvegarde, ou 30 jours et plus avec des changements.
- L'onglet Enfants devient optionnel. L'assistant pose la question (« Une page pour expliquer ta maladie à un enfant ? », Oui ou Non, rien de présélectionné) et le choix Maman / Papa n'apparaît qu'après « Oui » ; sans réponse, l'onglet reste masqué. Un interrupteur « Onglet Enfants » dans Réglages (Rappel et affichage) permet de le changer, et le choix est restauré avec une sauvegarde. Celles et ceux qui utilisaient déjà OUCH gardent l'onglet.
- Dans Tendances, un message sur ce qui s'affiche quand il y a peu de données : « Rien à montrer pour l'instant » quand le journal est vide, et, avant 14 jours de journal, « Les premiers motifs apparaissent après environ 2 semaines de suivi » avec le nombre de jours déjà notés.
- « Douleur myofasciale » dans la liste des maladies suivies (assistant, Réglages, rapport et onglet Enfants, avec une explication prudente pour chaque âge : on y dit que les médecins l'expliquent encore de façons différentes et qu'aucun examen ne la prouve). Ces textes d'explication sont à faire relire par un professionnel de santé avant d'être tenus pour définitifs.
- Des documents pour les professionnels de santé, hors de l'app (dossier `docs/soignants` et à la racine) : une plaquette de deux pages, une page d'entrée pour les soignants, un dictionnaire des données (chaque champ, ses échelles, ce qui est calculé plutôt que stocké), un protocole de test en consultation, un statut de validation et un cadrage réglementaire (ces deux derniers en brouillon, à relire), une politique de confidentialité (`PRIVACY.md`), des règles de contribution (`CONTRIBUTING.md`) et un modèle de retour clinique pour GitHub.

### Modifié
- Dans le calendrier du Journal, chaque jour porte l'icône de sa météo (soleil, nuages, pluie, orage…) à la place du petit point de couleur. Le contrôle de contraste montrait que la couleur seule ne distinguait pas les niveaux : les fonds de deux météos voisines ne différaient que de 1,00 à 1,04 contre 1 et le point était sous 3 contre 1 sur sa teinte pour les trois premiers niveaux. L'icône, dans l'encre du niveau, est à 4,6 contre 1 ou plus. La barre des jours de poussée passe sous l'icône. Un test garde le contraste de l'encre sur sa teinte et la distinction des cinq icônes.
- « OUCH n'est pas un dispositif médical » est dit explicitement : dans la note du premier écran de l'assistant, en bas de Réglages (À propos), dans l'encadré de prudence des deux rapports et dans les README (qui disaient déjà que OUCH ne remplace pas un avis médical, et le rapport qu'il ne pose ni diagnostic ni recommandation).
- Accessibilité du rapport : tous les tableaux déclarent maintenant leurs en-têtes de colonnes et de lignes (`scope`), pas seulement ceux des poussées et du bilan de traitement.
- « Arthrite » devient « Polyarthrite rhumatoïde », le nom de ce que l'onglet Enfants expliquait déjà, et « spondylarthrite » devient « spondyloarthrite », l'orthographe médicale actuelle. Les profils et les sauvegardes existants n'ont rien à migrer : seuls les mots changent.
- Des libellés moins promettants, pour que l'app décrive sans laisser croire qu'elle prédit ou conclut. La carte « Bilan d'un changement » de Tendances s'appelle « Avant et après un changement », et son état « bilan en cours » devient « comparaison en cours » (dans l'app et dans le rapport). L'écran d'accueil ne promet plus d'« anticiper et mieux traverser les crises » : l'app aide à voir ce qui accompagne les bons et les mauvais jours, pour mieux en parler. Dans Tendances, « Ce qui semble jouer sur ta douleur » devient « Ce qui accompagne ta douleur », car l'app observe des associations, sans dire ce qui agit sur quoi. Le mot « poussée » reste : c'est celui des patients, et chaque écran dit comment il est défini.
- Toucher une zone du corps (ou noter autre chose) avant de régler la douleur n'enregistre plus une douleur à 0 : la journée est gardée sans niveau de douleur, comme « pas encore notée », et ne compte plus dans les moyennes, les poussées, le rapport ni la météo. Dans le Journal, ces jours portent un petit rond creux sous leur numéro. Les jours déjà enregistrés avec un 0 restent tels quels (on ne peut pas les distinguer d'un vrai 0). Restaurée dans une version antérieure à celle-ci, une sauvegarde exportée après ce changement perd ses jours sans niveau de douleur (les autres jours sont restaurés).
- Rapport : la variation de pression atmosphérique est calculée à partir de la pression de deux jours notés qui se suivent. Rien dans l'app n'écrivait cette variation, donc la ligne « Variation de pression atmosphérique » du tableau des associations n'atteignait jamais les 14 valeurs nécessaires et n'apparaissait pas. Une variation déjà enregistrée (ancienne sauvegarde, démo) garde la priorité.
- Rapport : un changement de dose se lit « 30 mg → 60 mg » dans les points clés, comme dans les tableaux, et le tableau « Les 3 jours avant chaque poussée » n'écrit plus deux points après un mois abrégé (« le 11 sept.. »).
- Le rappel de sauvegarde sur « Aujourd'hui » parle d'abri plutôt que de perte : il ne dit plus « tout disparaît » mais qu'une sauvegarde garde le journal à l'abri si l'on change ou réinitialise son appareil. Les règles d'affichage ne changent pas.

## [0.3.0] - 2026-10-08

### Ajouté
- Dans Tendances, une carte « Bilan d'un changement » pour chaque début, changement de dose ou arrêt d'un traitement de fond : la douleur moyenne, les jours de poussée, les prises au besoin, le sommeil et les effets signalés avec ce traitement, sur les 28 jours d'avant puis les 28 jours qui suivent sa première semaine (qu'on ne compte pas : un traitement de fond n'agit pas tout de suite), avec le nombre de jours notés de chaque côté. Il faut 14 jours notés de chaque côté ; tant que les 28 jours ne sont pas écoulés, le bilan est « en cours ». Avec assez d'historique (6 écarts entre deux périodes de 28 jours qui se suivent, hors celles du changement lui-même), chaque mesure est aussi placée à côté de l'écart que la personne a eu, 8 fois sur 10, entre deux mois qui se suivent (« Dans / Au-delà de tes écarts habituels »). La courbe, avec les moyennes avant et après, s'ouvre à la demande. C'est une description : elle ne dit pas si le traitement « marche », et le dit. Un autre changement au même moment, ou un changement fait pendant une poussée, est signalé.
- Dans les deux rapports (médecin traitant et Centre douleur), un tableau « Changements de traitement de fond » : pour chaque changement de la période ou des 5 semaines d'avant, la douleur, les jours de poussée et les prises au besoin avant → après, les jours renseignés de chaque côté, et ce qu'il faut savoir (bilan en cours, autre changement au même moment, effets signalés), avec l'écart habituel du patient quand le journal est assez long.
- Pendant une poussée, l'écran « Aujourd'hui » allégé note la douleur avec onze grosses cases à toucher (0 à 10) à la place du curseur, et deux gros boutons « un point de moins / de plus » pour corriger. Rien n'est présélectionné, pour ne pas ancrer la réponse sur une valeur de départ ; la barre se remplit d'un seul bleu qui s'intensifie, sans vert ni rouge, et la case choisie est aussi cerclée. C'est la même échelle 0-10 qu'avant : les entrées et le rapport ne changent pas. Le formulaire complet garde son curseur.
- Une invitation à installer OUCH sur l'écran d'accueil, tant que l'app tourne dans un navigateur : Safari risque moins d'effacer le journal d'une app installée, qui s'ouvre aussi sans la barre du navigateur. Dans la dernière étape de l'assistant, une ligne discrète (« Installer OUCH sur l'écran d'accueil ») se déplie sur les étapes, chacune avec un petit dessin de ce qu'on voit à l'écran ; dans Réglages, la même carte, dépliée, tant que l'app n'est pas installée. Sur iPhone et iPad (Safari), les étapes couvrent le menu de la page, Partager, « En voir plus » et « Sur l'écran d'accueil » ; dans les navigateurs qui le proposent (Chrome, Edge), un bouton « Installer » ouvre l'invite du navigateur ; ailleurs, une phrase renvoie au menu du navigateur. Rien n'est mémorisé ni envoyé, et la carte disparaît d'elle-même une fois l'app installée.
- Tout en bas de Réglages, une carte « Soutenir OUCH » avec une tasse de café : une phrase et un lien « m'offrir un café » vers la page de dons du développeur. C'est un simple lien sortant : aucun script ni widget tiers, rien d'envoyé, rien de débloqué en échange. Elle n'apparaît qu'à partir de 15 jours de journal, pour ne rien demander à quelqu'un qui découvre l'app.
- Une note méthodologique pour les soignants (`docs/note-methodologique`, 7 pages A4, en français) : comment OUCH calcule ses chiffres, avec ses seuils et ses références.
- Un fichier `FUNDING.yml` : le dépôt GitHub affiche un bouton « Sponsor » vers la page de dons.

### Modifié
- Le bilan sur deux semaines de la carte « Tes traitements » (« Dans les 2 semaines après le passage à… ») est remplacé par ce bilan sur 28 jours, qui compte plus de jours et dit combien étaient notés.
- Un changement de dose s'écrit « 30 mg → 60 mg » (et non « 30 mg · 1/j → 60 mg · 1/j ») quand c'est la dose qui change, dans l'app comme dans le rapport.
- Dépendances mises à jour : vite 8.3.2, oxlint 1.86, sharp 0.35.5 et @types/node 26.6.4.

## [0.2.1] - 2026-10-07

### Modifié
- Dans Réglages, tous les groupes sont repliés au départ (Mon profil était ouvert), pour une page plus claire. Le rappel de sauvegarde ouvre toujours Mes données.
- Dans Tendances, la légende du nombre de jours ne répète plus le chiffre : « 22 », puis « jours suivis ».
- Le pied de page affiche la version (v0.2.1) au lieu du seul numéro de commit, avec un lien vers la release ; entre deux versions, il affiche 0.2.1 suivi du commit.

## [0.2.0] - 2026-10-06

### Ajouté
- Dans le rapport, la courbe de douleur ombre les poussées, la synthèse les résume (nombre, jours, la plus longue, comparaison à la période précédente) et le rapport « Centre douleur » les détaille dans un tableau : dates, durée, pic, niveau habituel, retour à l'habituel et jours de prise au besoin.
- Les poussées sont visibles dans l'app, plus seulement dans le rapport : dans Tendances, une carte « Poussées » sous la courbe (dates, durée, pic, niveau habituel, retour à l'habituel ou « en cours ») et des bandes ombrées sur la courbe ; dans le Journal, un petit trait sous le numéro des jours concernés, avec son entrée dans la légende et la mention « poussée » pour les lecteurs d'écran. La carte n'apparaît qu'une fois assez de jours notés pour savoir ce qui est habituel.
- Sur l'écran « Aujourd'hui », un mot bienveillant (« Ces derniers jours ont été plus durs ») quand une poussée est en cours. Il rappelle, surlignés, jusqu'à trois gestes que la personne avait elle-même notés comme utiles les jours de poussée précédents. Il s'affiche une seule fois par poussée, se ferme d'un geste, ne dépend pas de ce qui est saisi dans la journée, et se désactive dans Réglages (« Un mot les jours difficiles »).
- Pendant une poussée, l'écran « Aujourd'hui » s'allège : il ne montre que la douleur, puis, une fois notée, propose « Où ça fait mal », « Mes médicaments » et « Une note », une chose à la fois. Le premier jour, la carte bienveillante porte le lien « Afficher le formulaire complet » ; les jours suivants, une phrase sous le titre (« Écran allégé pendant ces jours plus durs. ») le remplace. Le formulaire complet reste à un geste, son choix vaut pour la journée, et le mode s'arrête seul à la fin de la poussée. Un interrupteur de Réglages (« Écran allégé les jours difficiles ») le désactive.
- Dans le rapport « Centre douleur », un tableau « Les 3 jours avant chaque poussée » : pour chaque poussée, la moyenne de la durée et de la qualité du sommeil, du stress, de la fatigue, du brouillard mental et de l'humeur sur les 3 jours précédents, avec dessous la moyenne habituelle des 28 jours d'avant (hors poussées), et les changements de traitement des 14 jours précédents (début, changement de dose, arrêt). C'est une description, sans rien mettre en avant : un essai de signalement des mesures « inhabituelles » en repérait pour 37 % des fenêtres de 3 jours qui ne précèdent aucune poussée, ce qui se lirait à tort comme une cause. Les poussées qui ne vont pas dans le sens attendu y figurent comme les autres. Rien n'est ajouté à la synthèse du médecin traitant.
- Un bouton rouge en bas de Réglages pour supprimer toutes ses données de l'appareil : journal, traitements et réglages, langue comprise. Une fenêtre annonce ce qui sera perdu (jours de journal, traitements), rappelle qu'il n'y a pas de copie ailleurs et que les sauvegardes déjà exportées ne sont pas supprimées, propose de faire une sauvegarde d'abord, et demande d'écrire « SUPPRIMER » (« DELETE » en anglais) pour activer le bouton final. L'app revient alors à son premier lancement, avec un message. Seules les données d'OUCH sont effacées, pas celles d'autres pages du même site.
- Une carte « Sources scientifiques » dans Réglages : les 15 références du rapport, chacune avec un résumé de sa conclusion, ce qu'OUCH en retient et un lien PubMed. Un encart du dernier écran de l'assistant de démarrage y renvoie.
- 8 références au rapport (seuils de pertinence clinique, météo, sommeil, activité), vérifiées sur PubMed et citées dans les notes de méthode et le tableau des facteurs associés.
- Dans le rapport « Centre douleur », chaque référence est suivie d'une phrase sur l'usage qu'OUCH en fait.

### Modifié
- Dans le rapport, une poussée se repère par rapport au niveau habituel de la personne (médiane des 28 jours précédents, hors poussées) et non plus à un seuil fixe de 7/10 : au moins 3 jours consécutifs au-dessus de ce niveau d'au moins 2 points ou 30 %, et d'au moins 4/10. Les seuils reprennent les écarts cliniquement pertinents, établis pour l'amélioration : leur usage pour une aggravation est une extrapolation, et le rapport le dit.
- L'ancien design « Classique » est supprimé : il ne reste que le design « Santé ». Les personnes qui avaient choisi « Classique » passent sur « Santé » sans rien perdre : leurs données et leurs réglages sont conservés, seul ce choix disparaît.
- La page Réglages est rangée en cinq groupes repliables : Mon profil, Mon suivi, Rappel et affichage, Mes données, À propos. Chaque groupe replié résume ses valeurs en une ligne (« Rappel à 20:00 · Auto · Français », « Dernière sauvegarde : 2 oct. 2026 »). Mon profil est ouvert au départ ; le rappel de sauvegarde ouvre directement Mes données.
- Dans Mes données, l'import d'une sauvegarde a un vrai bouton « Choisir un fichier », puis affiche le nom du fichier choisi avec une croix pour le retirer, à la place du sélecteur natif discret du navigateur.
- Le nom du lieu s'affiche enfin dans Réglages et sous le bouton de météo de la saisie du jour. Il venait d'un service d'Open-Meteo qui n'existe pas, d'où le « pas de position enregistrée » alors que la météo fonctionnait. Il vient maintenant de Nominatim (OpenStreetMap), qui ne reçoit qu'une position arrondie à environ 1 km, et seulement quand la position est mise à jour. Sans nom trouvé, les coordonnées arrondies s'affichent.
- Le rapport précise que les catégories de douleur dépendent du retentissement fonctionnel.
- Sur le dernier écran de l'assistant, les notes sur le rapport, la sauvegarde et les sources ont une icône.

### Corrigé
- Dans le rapport « Médecin traitant », les notes ⁸ et ⁹ renvoyaient à des références absentes de la liste, qui n'affichait que les trois premières. La liste reprend maintenant exactement les références citées par chaque rapport.

## [0.1.2] - 2026-10-04

### Modifié
- L'image de partage s'intitule « Météo santé de <prénom> » (« Météo santé du jour » sans prénom) au lieu de « Météo douleur… », plus naturel pour les proches.

### Corrigé
- Sur iPhone, dans l'app installée, la première ligne de chaque page ne tombe plus dans le flou de la barre d'état : un espace de 28 px est ajouté en haut. Réglé d'après une capture, à confirmer sur le téléphone.

## [0.1.1] - 2026-10-03

### Ajouté
- Une politique de sécurité (`SECURITY.md`) : signalement privé des vulnérabilités, ce qui est concerné et ce qui ne l'est pas.
- Une vidéo de présentation d'une minute dans le README, et les scripts pour la refaire (`scripts/promo/`).
- Une version anglaise du README (`README.en.md`).
- Un bandeau sur la page du jour, au-dessus de la douleur : le temps du jour en grand, avec son niveau sur 5. Il suit les curseurs et reste en place, vide (« Note ta douleur ») tant qu'aucune douleur n'est saisie.

### Modifié
- Le README est réécrit et mis à jour : traitements, pistes d'action, partage de la météo, onglet Enfants, données de démo, tests et déploiement.
- La carte de partage s'intitule « Météo douleur de <prénom> » (« Météo douleur du jour » sans prénom), pour que le lien avec la douleur se lise tout de suite.
- La frise des cinq temps, sur la carte de partage et sur la page Enfants, devient une règle à cinq segments : celui du jour est plein et porte son icône, les autres s'effacent. Elle se lit « Peu de douleur » à « Beaucoup de douleur ».

### Corrigé
- Sur iPhone, le haut des pages n'est plus recouvert par le flou de la barre d'état. Pas encore vérifié sur un vrai téléphone.

## [0.1.0] - 2026-09-29

Première version publique.

### Ajouté
- **Saisie du jour** : douleur (seule donnée obligatoire), fatigue, sommeil, stress, brouillard mental, humeur, activité, zones douloureuses, traitements, météo extérieure, cycle en option.
- **Météo de la douleur** : la journée résumée en une image, exportable pour la partager soi-même.
- **Journal** en calendrier et **Tendances** : courbe et moyenne sur 7 jours, jours de la semaine, ce qui semble lié aux douleurs, ce qui aide, usage des traitements.
- **Rapport pour le médecin**, imprimable ou en PDF : une synthèse de 2 pages pour le médecin traitant, un rapport détaillé de 5 pages pour un centre douleur. Il décrit les données sans rien interpréter.
- **Registre des traitements** avec prises quotidiennes, doses, changements de posologie et arrêts.
- **« Expliquer à mon enfant »** : la météo du jour et la maladie racontées pour trois tranches d'âge.
- **Assistant de démarrage**, suivi de plusieurs maladies, français et anglais, deux designs (Santé et Classique), mode sombre.
- **Sauvegarde** exportée chiffrée (AES-256-GCM, mot de passe au choix), avec import.
- **Application installable** (PWA), qui fonctionne hors ligne après une première ouverture.
- **Protection du stockage** : l'app demande au navigateur de ne pas effacer les données de lui-même, et affiche dans les réglages s'il a accepté.
- **Rappel de sauvegarde** sur la page du jour : après une semaine de journal sans sauvegarde, puis tous les 30 jours si le journal a changé. « Plus tard » le repousse d'une semaine, et la date de la dernière sauvegarde est visible dans les réglages.
- **Pied de page** avec le commit et la date de la version, et une invitation à recharger quand une version plus récente est en ligne.

### Sécurité
- Tout reste dans le navigateur (IndexedDB) : le seul appel réseau est la météo (Open-Meteo), et seulement si elle est activée.
- Import d'une sauvegarde validé champ par champ, politique de sécurité de contenu (CSP), écran de secours en cas d'erreur.
- Les données du journal sont stockées **en clair** sur l'appareil ; seules les sauvegardes exportées sont chiffrées (voir la section Vie privée du README).

### Outillage
- CI sur chaque pull request (lint, tests, build) et règle de protection de `main`.
- 84 tests sur les sauvegardes, les tendances, le rapport et la météo de la douleur.
- GitHub Actions épinglées par SHA, mises à jour groupées par Dependabot, déploiement continu sur GitHub Pages.

[Non publié]: https://github.com/maxauvy/OUCH/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/maxauvy/OUCH/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/maxauvy/OUCH/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/maxauvy/OUCH/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/maxauvy/OUCH/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/maxauvy/OUCH/compare/v0.1.2...v0.2.0
[0.1.2]: https://github.com/maxauvy/OUCH/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/maxauvy/OUCH/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/maxauvy/OUCH/releases/tag/v0.1.0
