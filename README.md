# OUCH 🌤️

*Ouch, Understand, Chart, Heal*

**[maxauvy.github.io/OUCH](https://maxauvy.github.io/OUCH/)** · Licence [CeCILL v2.1](#licence) · Français et anglais · [Changelog](CHANGELOG.md) · [English version](README.en.md)

https://github.com/user-attachments/assets/36824d23-e5ff-4257-9254-b0164c30e334

OUCH est un carnet de douleur pour la fibromyalgie et les autres douleurs chroniques. On y note sa journée en moins d'une minute, tout reste sur son téléphone, et c'est toujours soi qui décide de ce qu'on partage, et avec qui.

Les carnets de suivi existants (Pain Diary, MyPainDiary…) sont fermés, ou pénibles à utiliser les jours où l'on n'en peut plus. OUCH fait le choix inverse : de gros boutons, presque rien d'obligatoire, et aucune donnée qui quitte l'appareil sans que la personne l'ait décidé.

## Ce qu'on peut faire

### Noter sa journée

Seule la douleur est obligatoire, de 0 à 10. On peut y ajouter la fatigue, le sommeil, le stress, le brouillard mental, l'humeur, l'activité, les zones douloureuses, la météo du jour (par géolocalisation ou à la main) et, si on le souhaite, le cycle. On note aussi ce qui a aidé : une marche courte, un bain chaud, de la méditation… Tout ce dont on ne se sert pas peut être désactivé dans les réglages.

À la première ouverture, un assistant propose de préparer le suivi : maladies suivies, prénom, traitements, rappel quotidien. Tout est facultatif, on peut passer à tout moment et le relancer depuis les réglages.

### Suivre ses traitements

On déclare ses traitements une fois : de fond ou pris au besoin, la dose, les changements de posologie, les arrêts. Ensuite, les traitements de fond sont cochés d'office chaque jour. Pour ceux pris au besoin, on note le nombre de prises, le soulagement obtenu et les éventuels effets indésirables. Les changements de dose apparaissent directement sur la courbe de douleur.

### Sa météo du jour, à partager

Les mesures du jour se résument en une image, du ciel dégagé à l'orage, avec la douleur, la fatigue et l'humeur. On peut y ajouter un petit mot, puis l'envoyer soi-même à ses proches. Rien n'est envoyé automatiquement.

### Journal et tendances

Le journal est un calendrier du mois, coloré selon la météo de chaque jour. On peut revenir corriger n'importe quelle journée.

Tendances affiche la courbe de douleur sur 7, 30 ou 90 jours, ou depuis le début, avec sa moyenne sur 7 jours. On y voit aussi les jours de la semaine où ça va le mieux ou le moins bien, ce qui semble lié aux douleurs (sommeil, stress, fatigue, brouillard mental, humeur, activité, température), ce qui accompagne les meilleurs jours, et l'usage des traitements. Ce sont des associations relevées dans ses propres données, pas des preuves : l'app le dit.

### Un rapport pour le médecin

Depuis Tendances, on génère un rapport à imprimer ou à enregistrer en PDF. Il couvre la période depuis la dernière consultation et la compare à la même durée juste avant. Il existe en deux versions : une synthèse de 2 pages pour le médecin traitant, et un rapport détaillé de 5 pages pour un centre douleur (CETD), avec la consommation d'antalgiques et les facteurs associés. Il se lit en français ou en anglais et mentionne les maladies déclarées.

Le rapport décrit les données sans les interpréter, et ses seuils citent leurs sources (IMMPACT, HAS). Il est fabriqué sur l'appareil ; le nom et la date de naissance qu'on y saisit ne sont pas enregistrés.

### Expliquer à son enfant

L'onglet Enfants est fait pour être montré à un enfant. Il raconte la météo du jour avec des mots simples (« aujourd'hui, le ciel de maman est un peu voilé »), propose des idées pour aider, et explique la maladie (fibromyalgie, arthrite, spondylarthrite, endométriose, migraine, lombalgie, sclérose en plaques) pour trois âges : 4–7, 8–12 et 13–17 ans. On choisit maman ou papa.

### Et aussi

- Français et anglais, au choix à la première ouverture, modifiable à tout moment.
- Un design sobre centré sur les chiffres, et un mode sombre.
- L'app s'installe sur l'écran d'accueil (mobile ou ordinateur) et marche hors connexion après la première ouverture. Le texte suit la taille de police réglée sur le téléphone.
- Les données restent dans le navigateur (IndexedDB). Pour sauvegarder ou changer d'appareil, on exporte un fichier chiffré avec un mot de passe de son choix (AES-256-GCM, dans le navigateur), qu'on réimporte ensuite. L'app rappelle de faire une sauvegarde quand il y a quelque chose à perdre, et demande au navigateur de ne pas effacer les données.

## Essayer avec des données de démo

Pour voir l'app remplie sans saisir 90 jours à la main :

```bash
node scripts/generate-demo-history.mjs
```

Le script crée `ouch-demo-90j.json`, un historique fictif de 90 jours (une poussée, un changement de traitement, puis une amélioration). Il s'importe depuis les réglages, dans la partie sauvegarde, avec le mot de passe `demo`. Avec `DEMO_LANG=en` devant la commande, les étiquettes, les notes et les médicaments sont en anglais.

Les vidéos de démonstration se génèrent aussi par script : `scripts/record-demo-video.mjs` pour un parcours simple, `scripts/promo/record.mjs` pour une vidéo de présentation d'une minute, en français ou en anglais, au format vertical ou horizontal. Les installations nécessaires (Playwright, ffmpeg) sont décrites en tête de chaque fichier.

## Lancer le projet

```bash
npm install
npm run dev       # développement, http://localhost:5173
npm test          # tests
npm run lint
npm run build     # version de production dans dist/
npm run preview   # servir cette version en local
```

Chaque pull request passe par le lint, les tests et le build (GitHub Actions). Le site est redéployé sur GitHub Pages à chaque fusion dans `main`.

## Publier sa propre version

`npm run build` produit un dossier `dist/` entièrement statique : pas de serveur ni de base de données à héberger. Il se dépose tel quel sur Vercel, Netlify, GitHub Pages, Cloudflare Pages, ou n'importe quel serveur de fichiers (nginx, Caddy…). Il faut seulement du HTTPS, que l'app installable et la géolocalisation exigent.

Comme tout reste dans le navigateur, le choix de l'hébergeur ne change rien à la confidentialité : ce qui compte, c'est l'appareil de la personne, pas le serveur.

## Organisation du code

```
src/
  db/            schéma Dexie (IndexedDB) et types
  i18n/          traductions FR/EN et outils de langue
  lib/           logique sans interface : météo de la douleur, chiffrement,
                 sauvegarde et import, tendances, rapport, traitements
  hooks/         hooks React (entrées, réglages, thème)
  components/    l'interface, rangée par domaine (entry, weather, journal,
                 trends, report, kids, settings, setup, ui)
  pages/         les cinq onglets (Aujourd'hui, Journal, Tendances, Enfants,
                 Réglages) et le rapport pour le médecin
scripts/         historique de démo, icônes, vidéos
tests/           tests des sauvegardes, des tendances, du rapport et de la météo
```

## Vie privée

- Rien ne quitte l'appareil sans action explicite : un export, ou le partage de sa météo du jour.
- Les données du journal sont stockées **en clair** dans le navigateur. Quiconque a accès à l'appareil déverrouillé, ou au profil du navigateur, peut les lire. Seuls les fichiers de sauvegarde exportés sont chiffrés (AES-GCM 256, clé dérivée du mot de passe par PBKDF2). Sans le mot de passe, une sauvegarde est perdue.
- Un navigateur peut effacer de lui-même les données d'un site quand l'appareil manque de place, et Safari le fait aussi après une semaine sans utilisation pour un site non installé. OUCH demande donc au navigateur de garder les données dès la première journée enregistrée, et les réglages montrent s'il a accepté. Il reste libre de refuser : seule une sauvegarde exportée met vraiment les données à l'abri.
- La météo automatique appelle [Open-Meteo](https://open-meteo.com/) directement depuis le navigateur, sans clé ni compte. À chaque récupération, Open-Meteo reçoit les **coordonnées** de l'appareil (latitude et longitude) et voit forcément son adresse IP. C'est le seul appel réseau que l'app fait d'elle-même, et seulement si cette fonction est activée. Une politique de sécurité de contenu (CSP) limite d'ailleurs les appels sortants de la version de production à ce service.
- Le rappel quotidien utilise l'API de notification du navigateur. Il n'y a volontairement pas de serveur d'envoi : le rappel arrive quand l'app est ouverte ou a servi récemment, pas quand elle est totalement fermée.

Pour signaler une faille de sécurité, voir [`SECURITY.md`](SECURITY.md).

## Idées pour la suite

- Export CSV du journal.
- Une carte du corps à toucher, à la place de la liste de zones.
- Un vrai rappel push (il demanderait un petit serveur).
- Plusieurs profils sur le même appareil.
- Comparer deux périodes directement dans Tendances.
- Des widgets iOS et Android (il faudrait passer à une app native ou à Capacitor).

## Licence

OUCH est distribué sous licence **[CeCILL v2.1](https://cecill.info/licences/Licence_CeCILL_V2.1-fr.html)** (SPDX `CECILL-2.1`). C'est une licence libre à copyleft fort, écrite par le CEA, le CNRS et l'INRIA pour être valide en droit français, et compatible avec la GPL dans les deux sens.

On peut utiliser, étudier, modifier et redistribuer OUCH librement. Quiconque diffuse une version modifiée, y compris en la mettant simplement à disposition sur un site ou un service en ligne, doit en fournir le code source sous CeCILL (ou sous une licence GPL compatible), sans restriction supplémentaire. Le but est qu'OUCH et ses dérivés restent libres, pour la communauté fibromyalgie comme pour tout le monde.

Le texte complet est dans [`LICENSE`](./LICENSE), à la racine du projet.
