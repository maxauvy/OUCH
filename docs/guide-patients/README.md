# Guide papier pour les utilisateurs et les patients

`guide.html` (français, au tutoiement) et `guide.en.html` (anglais) : un guide A4 de 12 pages, sur le même modèle que le guide pour les professionnels de santé (`docs/presentation-soignants/guide.html`), décrit d'après la v0.15.2 : en bref, vue d'ensemble, commencer (installer, assistant, rappel, démo), une page par onglet (Aujourd'hui, Journal et Tendances, Soulager, Consultation), les proches, les données et la sauvegarde, questions fréquentes, et une **annexe à détacher** (le plan des jours difficiles sur papier, des listes à cocher avant et après une consultation). Il s'imprime en recto-verso.

Les styles (`base.css`), le logo, le QR code et les captures françaises sont ceux de `docs/presentation-soignants/` : `node scripts/capture-presentation.mjs` les refait (voir le README de ce dossier). Les captures anglaises sont dans `img-en/` et se refont avec l'application servie (`npm run dev -- --port 5180`) :

```bash
node scripts/capture-presentation.mjs --lang en --out docs/guide-patients/img-en --only today,journal,trends,soulager,consultation,compare,caresheet,kids,weather,plan,breathing,gestures,lead,report
```

(le script prend aussi trois pages du rapport centre douleur, que le guide n'utilise pas : on peut les supprimer). À refaire quand un écran change.

```bash
node docs/guide-patients/build.mjs               # pdf/OUCH-guide-utilisateurs.pdf et pdf/OUCH-user-guide.pdf
node docs/guide-patients/build.mjs --previews    # + un PNG par page dans apercus/
```

Il faut Google Chrome, Playwright (`npm i --no-save playwright`) et `npm install` (la police Public Sans est lue dans `node_modules`). `build.mjs` signale une page qui déborde. `pdf/` et `apercus/` ne sont pas versionnés.

Les affirmations viennent du README, de `PRIVACY.md` et des textes de l'application (`src/i18n/locales/fr.ts`, `en.ts` pour la version anglaise, qui reprend les libellés anglais de l'app). **À relire si l'un d'eux change**, en particulier : les chemins dans les Réglages (« Mes données », « Verrouillage »), ce qui sort du téléphone, la sauvegarde Dropbox et la météo envoyée chaque jour vers OUCH Duo, le verrou (4 chiffres, une minute), et les numéros d'urgence (15, 112, 3114 ; en anglais : 112, 3114 et Samaritans 116 123).
