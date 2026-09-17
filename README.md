# OUCH 🌤️

*Ouch, Understand, Chart, Heal*

*Licence [CeCILL v2.1](#licence) · 100% local · aucune donnée envoyée à un serveur*

Un journal de douleur simple, privé et joli — pensé pour la fibromyalgie (et toute
douleur chronique). Note ta journée en moins d'une minute, comprends ce qui
l'influence, et partage ta « météo du jour » avec tes proches quand tu le
souhaites.

## Pourquoi cette app

Les carnets de suivi de douleur existants (Pain Diary, MyPainDiary…) sont soit
fermés, soit franchement pénibles à utiliser. OUCH part d'un principe
simple : **tout reste sur ton appareil**, l'interface est pensée pour les jours
difficiles (gros boutons, pas de friction), et le partage avec l'entourage est
une action volontaire, jamais automatique.

## Fonctionnalités

- **Saisie quotidienne rapide** : douleur (seule donnée obligatoire), fatigue,
  sommeil, stress, brouillard mental, humeur, activité, localisation de la
  douleur, médicaments, météo extérieure (auto via géolocalisation ou
  manuelle), cycle menstruel (optionnel). Chaque facteur peut être désactivé
  dans les réglages.
- **Météo de la douleur** : les mesures du jour sont résumées en une image
  (ciel dégagé → orage), exportable en PNG pour l'envoyer toi-même à qui tu
  veux, avec un petit mot optionnel.
- **Journal** : calendrier mensuel coloré par intensité, édition rétroactive
  de n'importe quel jour.
- **Tendances** : courbe de douleur, moyennes par jour de la semaine, et — le
  plus utile — une analyse simple de ce qui semble associé à tes douleurs
  (sommeil, stress, météo…), présentée comme une observation, pas une preuve.
- **100% local** : stockage dans IndexedDB, rien n'est envoyé à un serveur.
  Sauvegarde/synchro via export-import d'un fichier chiffré (mot de passe
  choisi par toi, chiffrement AES-256-GCM côté navigateur).
- **PWA installable** : fonctionne hors-ligne une fois ouverte une première
  fois, s'installe sur l'écran d'accueil (mobile et desktop).

## Démarrer

```bash
npm install
npm run dev       # développement, http://localhost:5173
npm run build     # build de production dans dist/
npm run preview   # servir le build localement
```

## Déployer

`npm run build` produit un dossier `dist/` 100% statique : aucun serveur,
aucune base de données à héberger. Tu peux le déposer tel quel sur :

- **Vercel** ou **Netlify** : glisser-déposer `dist/`, ou connecter le repo
  (commande de build `npm run build`, dossier de sortie `dist`).
- **GitHub Pages** / **Cloudflare Pages** : même principe.
- **Ton propre serveur** : n'importe quel serveur de fichiers statiques
  (nginx, Caddy…) servant `dist/` suffit. Sers-le en HTTPS — la PWA
  (service worker, géolocalisation) l'exige.

Comme toutes les données restent dans le navigateur, l'endroit où tu héberges
n'a pas d'importance pour la confidentialité : c'est ton appareil qui compte.

## Structure du projet

```
src/
  db/            schéma Dexie (IndexedDB) et types
  lib/           logique pure : météo de la douleur, chiffrement,
                 sauvegarde/import, analyse des facteurs, thème
  hooks/         hooks React (entrées, réglages, thème sombre)
  components/    UI par domaine (entry, weather, journal, trends, settings, ui)
  pages/         les 4 écrans (Aujourd'hui, Journal, Tendances, Réglages)
```

## Vie privée

- Aucune donnée ne quitte l'appareil sans action explicite (export ou
  partage de la météo du jour).
- La météo extérieure automatique appelle [Open-Meteo](https://open-meteo.com/)
  directement depuis le navigateur (pas de clé, pas de compte) — c'est le
  seul appel réseau que l'app fait de son propre chef, et seulement si tu
  actives cette fonctionnalité.
- Le rappel quotidien utilise l'API Notification du navigateur. Il n'y a
  volontairement pas de serveur d'envoi de notifications push : ça
  fonctionne quand l'app est ouverte ou récemment utilisée, pas app
  totalement fermée. Ajouter un vrai rappel « même app fermée » demanderait
  un petit backend — possible en v2 si utile.

## Idées pour la suite

Quelques pistes pour continuer à faire évoluer l'app ensemble :

- Export PDF/CSV du journal pour l'apporter en consultation médicale.
- Carte du corps interactive (SVG) plutôt qu'une liste de zones.
- Rappel « vraie » notification push (nécessite un petit backend).
- Plusieurs profils sur le même appareil.
- Comparaison de périodes (« ce mois-ci vs le mois dernier »).
- Widget iOS/Android (nécessiterait un passage en app native ou Capacitor).

N'hésite pas à me dire ce qui manque ou ce qui gêne à l'usage — c'est fait
pour être ajusté.

## Licence

OUCH est distribué sous licence **[CeCILL v2.1](https://cecill.info/licences/Licence_CeCILL_V2.1-fr.html)**
(identifiant SPDX `CECILL-2.1`) — une licence libre à copyleft fort, rédigée
par le CEA, le CNRS et l'INRIA pour être nativement valide en droit français,
et compatible GPL dans les deux sens.

Concrètement : tu peux utiliser, étudier, modifier et redistribuer ce
logiciel librement. Toute personne qui distribue une version modifiée —
y compris en la rendant simplement accessible via un site web ou un
service en ligne — doit en fournir le code source sous CeCILL (ou une
licence GPL compatible), sans pouvoir y ajouter de restriction
supplémentaire. L'objectif : qu'OUCH et ses dérivés restent toujours
libres, pour la communauté fibromyalgie comme pour n'importe qui d'autre.

Le texte complet de la licence se trouve dans le fichier [`LICENSE`](./LICENSE)
à la racine du projet.

