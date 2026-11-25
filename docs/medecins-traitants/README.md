# Pour les médecins traitants

Trois documents pour convaincre des généralistes de recommander OUCH à leurs patients douloureux chroniques :

- `pourquoi.html` : « Pourquoi recommander OUCH », A4 recto verso, style Aube. Le recto dit ce que le médecin gagne (la page une minute, les décisions suivies, les antalgiques au besoin, l’essai tiré au sort, les questions du patient), avec la page 1 du rapport ; le verso dit ce que OUCH ne fait pas, comment le recommander avec la carte A6 (`docs/carte-medecin/`) et où trouver le reste.
- `pilote.md` : le protocole d’un pilote de deux mois avec 3 à 5 généralistes, et son tableau de recueil.
- `mail-cpts.md` : un mail type pour une CPTS ou l’URPS médecins.

Captures dans `img/` : données fictives de la démo. Pour le PDF :

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --virtual-time-budget=6000 \
  --print-to-pdf=OUCH-pourquoi-recommander.pdf docs/medecins-traitants/pourquoi.html
```

Sans ombre portée floue (Chrome les imprime en voiles gris). À refaire à la prochaine release, avec les captures de la page 1 et de la carte. Le document décrit les fonctions des PR #399 à #402.
