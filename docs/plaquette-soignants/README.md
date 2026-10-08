# Plaquette pour les professionnels de santé

Source HTML de la plaquette recto-verso (A4, français) qui présente OUCH à un soignant : ce que le patient saisit, pourquoi c'est utile, ce que contient le rapport, et ses limites. Décrite d'après la v0.3.0. Les références numérotées sont celles de la [note méthodologique](../note-methodologique/).

Les captures de `img/` viennent de l'application lancée sur l'historique de démonstration (`node scripts/generate-demo-history.mjs`, importé avec le mot de passe `demo`) : les données sont fictives, et la plaquette le dit. À refaire quand un écran change.

La police Public Sans est lue dans `node_modules` (`npm install`). Pour obtenir le PDF :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=4000 \
  --print-to-pdf=OUCH-plaquette-soignants.pdf docs/plaquette-soignants/index.html
```
