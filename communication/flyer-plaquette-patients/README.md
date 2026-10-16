# Flyer et plaquette pour les patients

Un flyer A5 (1 page) et une plaquette A4 (2 pages) qui présentent OUCH aux utilisateurs, en français et en anglais, en deux palettes (menthe eucalyptus, bleu ciel). Le texte est le même d'une palette à l'autre ; seules quatre couleurs changent.

- `flyer.fr.html`, `flyer.en.html`, `plaquette.fr.html`, `plaquette.en.html` : textes et mise en page.
- `base.css` : styles communs (A5, A4, mise en page des captures).
- `assets/` : logo, QR code (vers `maxauvy.github.io/OUCH`), police Public Sans, captures de l'app en mode démo (français : `today.png`, `piste.png`, `allege.png` ; anglais : `en-*.png`). Les données sont fictives, les documents le disent. À refaire quand un écran change.
- `build.py` : fabrique `build/` (un HTML par palette) et `pdf/` (les 8 PDF). `--previews` ajoute des PNG dans `apercus/`.

```bash
python3 communication/flyer-plaquette-patients/build.py            # les PDF
python3 communication/flyer-plaquette-patients/build.py --previews # + aperçus (npm i --no-save playwright)
```

Il faut Google Chrome et une connexion (Google Fonts, Material Symbols). `build/`, `pdf/` et `apercus/` ne sont pas versionnés : on les régénère.

Pour ajouter une palette, ajouter une entrée à `PALETTES` dans `build.py` (`y` surlignage, `lav` pastille, `ink` texte et fonds sombres, `paper` fond clair).

Les affirmations viennent du README et de PRIVACY.md (sauvegarde Dropbox « en essai », pistes présentées comme des rapprochements). À relire si l'un des deux change.

Pas encore fait : fond perdu et traits de coupe pour l'impression.
