# La carte à donner par le médecin

Une carte A6 (148 × 105 mm, recto verso) qu’un médecin garde au cabinet et donne à un patient pour lui conseiller OUCH. Le recto dit quoi noter chaque soir (le médecin coche au stylo), laisse la place pour la date du prochain rendez-vous et le nom du médecin, et porte un code QR. Le verso explique en trois étapes comment ça marche.

Le code QR ouvre `https://maxauvy.github.io/OUCH/?de=medecin` : à la première ouverture, l’accueil d’OUCH commence par « Ton médecin t’a conseillé ce carnet » et propose de noter la date du prochain rendez-vous (un rendez-vous chez le médecin traitant est créé, avec sa carte de rappel quinze jours avant). Les cases cochées ne passent pas dans le code : la personne choisit ses mesures à l’étape suivante. Rien ne part vers le médecin.

```bash
node docs/carte-medecin/build.mjs   # qr.svg, puis pdf/OUCH-carte-medecin-A6.pdf
```

Il faut Google Chrome et une connexion (Google Fonts). Style « Aube » des flyers, sans ombre portée (Chrome les imprime en voiles gris). `pdf/` n’est pas versionné.
