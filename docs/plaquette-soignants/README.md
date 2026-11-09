# Plaquette pour les professionnels de santé

Source HTML de la plaquette recto-verso (A4, français ; la version anglaise est `index.en.html`, avec ses captures dans `img-en/`) qui présente OUCH à un soignant : ce que le patient saisit, pourquoi c'est utile, ce que contient le rapport, et ses limites. Décrite d’après la v0.11.1 (quatre onglets, rapports refaits en trois pages et en parties numérotées, historique des rendez-vous). Les références numérotées sont celles de la [note méthodologique](../note-methodologique/).

Les captures de `img/` (français) et `img-en/` (anglais) viennent du mode démo de l'application (données fictives, la plaquette le dit) : `node scripts/capture-docs.mjs` les refait toutes, avec celles des autres documents, quand un écran change. Aucune n'a de fond sombre, d'ombre ni de cadre autour.

La police Public Sans est lue dans `node_modules` (`npm install`). Pour obtenir le PDF :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=4000 \
  --print-to-pdf=OUCH-plaquette-soignants.pdf docs/plaquette-soignants/index.html
```
