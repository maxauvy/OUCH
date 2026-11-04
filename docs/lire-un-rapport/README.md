# Lire un rapport OUCH

Une fiche d'une page (A4, `index.html`, anglais `index.en.html`) et un flyer A5 (`flyer.html`, `flyer.en.html`) pour un soignant qui reçoit un rapport OUCH pour la première fois : ce que c'est, comment lire la première page, les deux versions, ce que le rapport ne dit pas. Décrits d'après la v0.10.1.

Les PDF sont produits par `scripts/build-clinician-docs.sh` (fiche A4, plaquette et note méthodologique, dans `public/soignants/`, offerts par l'application aux soignants) ; le flyer A5 s'imprime de la même façon :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=6000 \
  --print-to-pdf=OUCH-flyer-lire-un-rapport-A5.pdf docs/lire-un-rapport/flyer.html
```

Les polices viennent de `node_modules` (Public Sans) et de Google Fonts (flyer : connexion nécessaire). Les pages sont explicites : si un texte s'allonge, vérifier qu'il tient avant d'imprimer.
