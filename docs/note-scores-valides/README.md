# Note de cadrage : des scores validés dans OUCH

Source HTML de la note de deux pages (A4) à lire avec des professionnels de santé : ce qu'OUCH pourrait faire avec des questionnaires validés, ce qu'il ne ferait pas, un tableau des outils envisagés maladie par maladie avec leurs droits d'usage, et cinq questions à trancher. Deux versions : `index.html` (français) et `index.en.html` (anglais). Décrite d'après la v0.5.0. Le détail de la position est dans [`docs/soignants/questionnaires-valides.md`](../soignants/questionnaires-valides.md).

**Les droits d'usage viennent de sources publiques et ne sont pas confirmés par les détenteurs** : le tableau et le pied de page le disent. À mettre à jour dès qu'une démarche est faite ou qu'un questionnaire est envisagé.

La police Public Sans est lue dans `node_modules` (`npm install`). Pour obtenir les PDF :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=4000 \
  --print-to-pdf=OUCH-note-scores-valides.pdf docs/note-scores-valides/index.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=4000 \
  --print-to-pdf=OUCH-validated-scores-note.pdf docs/note-scores-valides/index.en.html
```
