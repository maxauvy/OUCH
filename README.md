# OUCH 🌤️

*Ouch, Understand, Chart, Heal*

**[maxauvy.github.io/OUCH](https://maxauvy.github.io/OUCH/)** · Licence [CeCILL v2.1](#licence) · 100% local, rien n'est envoyé à un serveur · FR / EN

Un journal de douleur simple et privé, pensé pour la fibromyalgie et les douleurs chroniques en général. L'idée de base : noter sa journée en moins d'une minute, garder tout sur son appareil, et pouvoir partager sa "météo du jour" avec ses proches quand on le décide, pas automatiquement.

Les carnets de suivi existants (Pain Diary, MyPainDiary, etc.) sont soit fermés soit pénibles à utiliser au quotidien. OUCH essaie de faire l'inverse : gros boutons, pas de friction les jours difficiles, et aucune donnée qui sort de l'appareil sans qu'on l'ait décidé.

## Ce que ça fait

**Saisie du jour.** Douleur (seule donnée obligatoire), fatigue, sommeil, stress, brouillard mental, humeur, activité, localisation de la douleur, médicaments, météo extérieure (géolocalisation ou saisie manuelle), cycle menstruel en option. Chaque facteur peut être désactivé dans les réglages si on ne s'en sert pas.

**Météo de la douleur.** Les mesures du jour se résument en une image, du ciel dégagé à l'orage, exportable en PNG avec un petit mot si on veut, pour l'envoyer soi-même à qui on veut.

**Journal.** Calendrier mensuel coloré par intensité, on peut revenir corriger n'importe quel jour après coup.

**Tendances.** Courbe de douleur, moyennes par jour de la semaine, et une analyse basique de ce qui semble corrélé aux douleurs (sommeil, stress, météo...). Présenté comme une observation, pas une preuve scientifique.

**Expliquer à mon enfant.** Un écran à part, pensé pour être montré à un enfant : la météo du jour reformulée en langage simple ("aujourd'hui maman a un ciel un peu voilé"), des idées concrètes pour aider, et une explication de la maladie elle-même (fibromyalgie, arthrite, endométriose, migraine, lombalgie, SEP...) adaptée à son âge. Le ton (petit / plus grand) et le parent concerné se règlent à la volée.

**Bilingue.** Français et anglais, choix à la première ouverture et modifiable à tout moment dans les réglages.

**100% local.** Stockage dans IndexedDB, rien ne part vers un serveur. Pour sauvegarder ou changer d'appareil : export/import d'un fichier chiffré avec un mot de passe choisi par toi (AES-256-GCM, tout se passe dans le navigateur).

**PWA installable.** Fonctionne hors-ligne après une première ouverture, s'installe sur l'écran d'accueil comme une vraie app (mobile et desktop).

## Démarrer

```bash
npm install
npm run dev       # développement, http://localhost:5173
npm run build     # build de production dans dist/
npm run preview   # servir le build localement
```

## Déployer

`npm run build` produit un dossier `dist/` entièrement statique : pas de serveur, pas de base de données à héberger. Ça se dépose tel quel sur :

- **Vercel** ou **Netlify** : glisser-déposer `dist/`, ou connecter le repo (build `npm run build`, sortie `dist`).
- **GitHub Pages** / **Cloudflare Pages** : même principe.
- **Un serveur perso** : n'importe quel serveur de fichiers statiques (nginx, Caddy...) fait l'affaire. Il faut du HTTPS, la PWA (service worker, géolocalisation) l'exige.

Comme tout reste dans le navigateur, l'hébergeur n'a pas d'importance pour la confidentialité — c'est l'appareil de la personne qui compte, pas le serveur.

## Structure du projet

```
src/
  db/            schéma Dexie (IndexedDB) et types
  i18n/          traductions FR/EN et helpers de locale
  lib/           logique pure : météo de la douleur, chiffrement,
                 sauvegarde/import, analyse des facteurs, thème
  hooks/         hooks React (entrées, réglages, thème sombre)
  components/    UI par domaine (entry, weather, journal, trends, settings, ui)
  pages/         les 4 onglets (Aujourd'hui, Journal, Tendances, Réglages)
                 + l'écran "Expliquer à mon enfant"
```

## Vie privée

- Rien ne quitte l'appareil sans action explicite (export, ou partage de la météo du jour).
- La météo extérieure automatique appelle [Open-Meteo](https://open-meteo.com/) directement depuis le navigateur, sans clé ni compte. C'est le seul appel réseau que l'app fait de son propre chef, et seulement si cette fonctionnalité est activée.
- Le rappel quotidien passe par l'API Notification du navigateur. Il n'y a volontairement pas de serveur d'envoi : ça marche quand l'app est ouverte ou a été utilisée récemment, pas app totalement fermée. Un vrai rappel push demanderait un petit backend, à voir si c'est vraiment utile un jour.

## Pistes pour la suite

- Export PDF/CSV du journal pour l'apporter en consultation.
- Carte du corps interactive (SVG) plutôt qu'une liste de zones.
- Vrai rappel push (nécessite un petit backend).
- Plusieurs profils sur le même appareil.
- Comparaison de périodes ("ce mois-ci vs le mois dernier").
- Widget iOS/Android (impliquerait de passer en app native ou Capacitor).

## Licence

OUCH est distribué sous licence **[CeCILL v2.1](https://cecill.info/licences/Licence_CeCILL_V2.1-fr.html)** (SPDX `CECILL-2.1`), une licence libre à copyleft fort rédigée par le CEA, le CNRS et l'INRIA pour être nativement valide en droit français, et compatible GPL dans les deux sens.

Concrètement : usage, étude, modification et redistribution libres. Quiconque distribue une version modifiée, y compris en la rendant simplement accessible via un site ou un service en ligne, doit en fournir le code source sous CeCILL (ou une licence GPL compatible), sans restriction supplémentaire. L'objectif : qu'OUCH et ses dérivés restent toujours libres, pour la communauté fibromyalgie comme pour n'importe qui d'autre.

Texte complet de la licence dans [`LICENSE`](./LICENSE) à la racine du projet.
