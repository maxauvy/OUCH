# Note méthodologique pour les soignants

Source HTML de la note « Comment OUCH calcule ses chiffres » (7 pages A4, français), décrite d'après le code de la v0.2.1. À mettre à jour quand un calcul, un seuil ou une référence change (`src/lib/report.ts`, `flares.ts`, `flareContext.ts`, `references.ts`).

Les pages sont explicites (`.page`, 297 mm) : si un texte s'allonge, vérifier qu'il tient encore dans sa page avant d'imprimer. La police Public Sans est lue dans `node_modules` (`npm install`).

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=4000 \
  --print-to-pdf=OUCH-note-methodologique.pdf docs/note-methodologique/index.html
```
