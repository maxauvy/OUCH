# OUCH pour les professionnels de santé

OUCH est un carnet de douleur libre et gratuit, pour la fibromyalgie et les autres douleurs chroniques. Le patient note sa journée en moins d'une minute sur son téléphone ; ses données restent sur l'appareil. Quand il le souhaite, il en tire un rapport à apporter en consultation, qui **décrit** les données sans les interpréter : ni diagnostic, ni conseil de traitement.

Cette page rassemble ce qu'un soignant peut vouloir lire, essayer, ou discuter.

## À lire

| Document | Pour quoi faire | Où |
|---|---|---|
| Plaquette (2 pages) | Voir en un coup d'œil ce que le patient saisit, pourquoi c'est pertinent, et ce que contient le rapport | [PDF](https://github.com/maxauvy/OUCH/releases/download/v0.3.0/OUCH-plaquette-soignants-v0.3.0.pdf) · [source](../plaquette-soignants/) |
| Note méthodologique (8 pages) | Vérifier chaque calcul : formules, seuils, sources, limites, et sept questions qui vous sont posées | [PDF](https://github.com/maxauvy/OUCH/releases/download/v0.3.0/OUCH-note-methodologique-v0.3.0.pdf) · [source](../note-methodologique/) |
| Vie privée | Savoir ce qui est enregistré, où, et ce qui quitte l'appareil | [`PRIVACY.md`](../../PRIVACY.md) |
| Sécurité | Chiffrement des sauvegardes, signalement d'une faille | [`SECURITY.md`](../../SECURITY.md) |
| Dictionnaire des données | Savoir précisément ce que chaque champ saisi veut dire, comment il est enregistré, et les pièges de lecture | [`dictionnaire-des-donnees.md`](dictionnaire-des-donnees.md) |
| Protocole de test | Participer à un pilote avec des soignants : phases, ce qui est recueilli, garde-fous | [`protocole-de-test.md`](protocole-de-test.md) |
| Sources scientifiques | Les 15 références du rapport, avec leur résumé et l'usage qu'OUCH en fait | Dans l'application : Réglages, puis À propos |
| Journal des versions | Ce qui change d'une version à l'autre | [`CHANGELOG.md`](../../CHANGELOG.md) |

Les PDF sont joints à la [release v0.3.0](https://github.com/maxauvy/OUCH/releases/tag/v0.3.0) et correspondent à cette version du code ; les sources sont des pages HTML conçues pour s'imprimer en PDF, et chaque dossier donne la commande pour les produire.

## Essayer en deux minutes

1. Ouvrir <https://maxauvy.github.io/OUCH/> sur un téléphone ou un ordinateur, et passer l'assistant de démarrage.
2. Pour voir l'application remplie plutôt que vide, importer un historique fictif de 90 jours : la marche à suivre est dans le [README](../../README.md#essayer-avec-des-données-de-démo) (fichier généré par `node scripts/generate-demo-history.mjs`, mot de passe `demo`).
3. Dans l'onglet Tendances, ouvrir « Rapport pour mon médecin », choisir *Médecin traitant* (2 pages) ou *Centre douleur* (environ 5 pages), et regarder le résultat.

Rien de ce qui est saisi ne quitte l'appareil. Les données de démonstration sont fictives.

## Ce qu'OUCH est, et n'est pas

- C'est un journal que le patient tient, et un résumé de ce journal.
- Ce n'est pas un dispositif médical, ni un avis médical : le rapport est descriptif, ses seuils citent leurs sources, et les choix propres à OUCH (comme la définition d'une poussée) sont signalés comme tels.
- Les données sont auto-déclarées et non vérifiées. Les échelles de fatigue, de sommeil, d'humeur et de brouillard mental sont des échelles simples **non validées** ; la douleur est notée sur l'échelle numérique de 0 à 10.

## Vous pouvez aider

Le projet a surtout besoin de regards de terrain. Dans l'ordre où cela coûte le moins de temps :

1. **Lire la note méthodologique** et répondre, même brièvement, aux sept questions de ses dernières pages : la définition d'une poussée, les catégories de douleur, ce que vous ne voulez pas voir dans un rapport.
2. **Donner un retour précis** : un libellé qui prête à confusion, une donnée qui manque, un seuil que vous contestez. Le plus simple est le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml) ; il ne demande pas de savoir utiliser GitHub.
3. **Essayer avec quelques patients** qui le souhaitent, et dire ce que le rapport a changé, ou non, en consultation. Le [protocole de test](protocole-de-test.md) décrit comment, et ce qui est (ou n'est pas) recueilli.
4. **Relire les références** : une étude manquante ou mal résumée se signale de la même façon.

Ne mettez jamais de donnée de patient identifiable dans un retour : l'historique de démonstration suffit pour illustrer.

## Contact

Pour un échange qui ne passe pas par GitHub : [maxime@open-freax.fr](mailto:maxime@open-freax.fr). N'y joignez aucune donnée de patient identifiable.

Pour une faille de sécurité, utiliser le signalement privé décrit dans [`SECURITY.md`](../../SECURITY.md), pas une issue publique.
