# Contribuer à OUCH

OUCH est un projet libre ([CeCILL v2.1](LICENSE)), maintenu par une personne. Les contributions sont les bienvenues, et pas seulement le code : un regard de soignant ou de patient sur un mot, un seuil ou un écran est aussi utile qu'une correction de bug.

## Sans écrire de code

- **Vous êtes soignant** : le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml) est fait pour vous. La page [`docs/soignants/`](docs/soignants/README.md) rassemble ce qu'il faut pour se faire une idée du projet.
- **Vous êtes patient ou proche** : une issue ordinaire suffit, pour dire ce qui gêne un jour difficile, un mot maladroit, une saisie qui manque.
- **Vous voulez relire** : la [note méthodologique](docs/note-methodologique/) et la section « Sources scientifiques » de l'application sont faites pour être contestées. Une référence mal résumée ou un seuil discutable se signale par une issue.

**Ne mettez jamais de donnée de santé réelle dans une issue ou une PR**, ni la vôtre ni celle d'un patient. L'historique de démonstration (`node scripts/generate-demo-history.mjs`) sert à illustrer ou à reproduire.

Pour une faille de sécurité, ne pas ouvrir d'issue publique : voir [`SECURITY.md`](SECURITY.md).

## Les règles du projet

Elles viennent de ce à quoi le projet tient. Une PR qui les enfreint sera discutée avant d'être fusionnée.

1. **Descriptif seulement.** Le rapport et les écrans décrivent des données : pas de diagnostic, pas de conseil de traitement, pas de verdict (« le traitement marche »). Une association n'est jamais présentée comme une cause.
2. **Tout seuil est sourcé.** Un chiffre qui sert de repère (30 %, 2 points, ≤ 3 / 4–6 / ≥ 7…) cite une référence, vérifiée à la source (PubMed pour les articles), ajoutée à `src/lib/references.ts` à la fin de la liste (les numéros de note renvoient à la position). Quand le repère est extrapolé ou propre à OUCH, le texte le dit.
3. **Les jours manquants ne sont jamais comblés.** Une moyenne repose sur les jours renseignés, et dit combien.
4. **Un ton doux pour des personnes qui souffrent.** Pas de couleur d'alerte pour une douleur, pas de reproche, pas d'élément qui a l'air d'un bouton sans en être un. L'application ne demande presque rien un jour difficile.
5. **Rien ne quitte l'appareil sans geste de la personne.** Les seuls appels sortants sont ceux de [`PRIVACY.md`](PRIVACY.md) ; la politique de sécurité de contenu (`vite.config.ts`) les limite. Ajouter un appel réseau, un script tiers ou une mesure d'audience change cette promesse : cela demande une discussion préalable et la mise à jour de `PRIVACY.md`.
6. **Français et anglais ensemble.** Chaque texte visible existe dans `src/i18n/locales/fr.ts` et `en.ts`, et les pluriels passent par `{{n:jour|jours}}`.
7. **Accessible.** Contraste suffisant, cibles à toucher assez grandes, texte qui suit la taille réglée sur l'appareil, lecteurs d'écran : tester avant de proposer une modification d'interface.

## Pour les développeurs

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (node --test)
npm run lint     # oxlint
npm run build    # tsc + build de production
```

- Chaque PR passe par le lint, les tests et le build (GitHub Actions). Un calcul modifié ou ajouté vient avec un test dans `tests/`.
- Les messages de commit et titres de PR sont en anglais, à l'impératif et sans préfixe (« Add a review of each change of treatment »). La description d'une PR dit ce qui change et ce qui n'a **pas** été vérifié.
- Les changements visibles par la personne ou par le soignant sont notés, en français, sous « Non publié » dans [`CHANGELOG.md`](CHANGELOG.md).
- Un calcul du rapport qui change doit aussi mettre à jour la [note méthodologique](docs/note-methodologique/) : la note dit « ce que fait le code », elle ne doit pas se périmer.
- Le code est organisé comme décrit dans la section « Organisation du code » du [README](README.md#organisation-du-code).

## Licence

En contribuant, vous acceptez que votre contribution soit distribuée sous la même licence, CeCILL v2.1.
