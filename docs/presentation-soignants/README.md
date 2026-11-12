# Guide papier et diaporama pour présenter OUCH à des professionnels de santé

Deux supports pour une séance de présentation, en français, décrits d'après la v0.12.0 :

- `guide.html` : un guide A4 de 13 pages (en bref, vue d'ensemble, une page par onglet, les deux rapports, ce que cela peut changer pour qui, confiance et limites, essayer et aider), plus une **fiche animateur** (annexe, page 13) : déroulé de 45 minutes, questions à poser, préparation. Il s'imprime en recto-verso et se laisse aux participants.
- `diaporama.html` : 27 diapositives 16:9 avec des **notes d'orateur**. Ouvert dans un navigateur : flèches ou espace pour avancer, `N` affiche les notes, `F` le plein écran. Avec `?print` à la fin de l'adresse, toutes les diapositives s'affichent à la suite (c'est ce que lit `build.mjs` pour fabriquer le PDF).

Les captures de `img/` viennent du mode démo de l'application (données fictives, les deux supports le disent) : `node scripts/capture-presentation.mjs` les refait, avec l'application servie (`npm run dev -- --port 5180`) et Playwright (`npm i --no-save playwright`). À refaire quand un écran change.

```bash
node docs/presentation-soignants/build.mjs               # pdf/ : le guide et le diaporama
node docs/presentation-soignants/build.mjs --previews    # + un PNG par page dans apercus/
node docs/presentation-soignants/build.mjs guide         # un seul des deux
```

Il faut Google Chrome et `npm install` (la police Public Sans est lue dans `node_modules`). `build.mjs` signale une page qui déborde. `pdf/` et `apercus/` ne sont pas versionnés : on les régénère.

Les affirmations viennent du README, de `PRIVACY.md`, du `CHANGELOG.md` et de `docs/soignants/` (statut de validation, cadre réglementaire). **À relire si l'un d'eux change**, en particulier : la définition d'une poussée, la liste des fonctions qui « s'approchent » du dispositif médical, l'absence de test auprès de soignants, le nombre de tests (« plus de 600 »), les sauvegardes en accès anticipé. Les rubriques « ce que cela peut changer, pour qui » sont présentées comme des hypothèses de conception : aucun test n'a été mené auprès de soignants.

Les numéros de diapositives cités dans la fiche animateur (guide, page 13) suivent `diaporama.html` : à mettre à jour si l'on ajoute ou retire une diapositive.
