# Lire un rapport OUCH

Une fiche d'une page (A4, `index.html`, anglais `index.en.html`) un flyer A5 (`flyer.html`, `flyer.en.html`) et un flyer A4 plus complet (`flyer-a4.html`, `flyer-a4.en.html`) pour un soignant qui reçoit un rapport OUCH pour la première fois : ce que c'est, comment lire la première page, les deux versions, ce que le rapport ne dit pas. Décrits d'après la v0.11.2.

Les PDF sont produits par `scripts/build-clinician-docs.sh` (fiche A4, plaquette et note méthodologique, dans `public/soignants/`, offerts par l'application aux soignants) ; le flyer A5 s'imprime de la même façon :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=6000 \
  --print-to-pdf=OUCH-flyer-lire-un-rapport-A5.pdf docs/lire-un-rapport/flyer.html
```

Les polices viennent de `node_modules` (Public Sans) et de Google Fonts (flyer : connexion nécessaire). Les pages sont explicites : si un texte s'allonge, vérifier qu'il tient avant d'imprimer.

Les flyers n'ont pas d'ombre portée (Chrome les imprime en voiles gris) : un fin liseré tient lieu de relief. Les captures du rapport (`rapport*.png`) viennent de la démo (données fictives) : `node scripts/capture-docs.mjs` les refait (la période est fixée à un mois pour que les comparaisons s'affichent). Les repères numérotés du flyer A4 sont placés en pourcentage de la hauteur de `rapport-page1*.png` : à replacer si la page 1 change.
