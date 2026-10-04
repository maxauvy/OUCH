# Changelog

Les changements notables d'OUCH sont notés ici. Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), et les versions numérotées suivent le [versionnage sémantique](https://semver.org/lang/fr/) : tant que le projet est en `0.x`, des changements peuvent casser des habitudes d'une version à l'autre.

Chaque version est aussi une [release GitHub](https://github.com/maxauvy/OUCH/releases), et le site déployé affiche en pied de page le commit qu'il exécute.

## [Non publié]

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

[Non publié]: https://github.com/maxauvy/OUCH/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/maxauvy/OUCH/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/maxauvy/OUCH/releases/tag/v0.1.0
