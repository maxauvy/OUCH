# Mesure d'audience hebdomadaire — mise en place

OUCH peut dire, une fois par semaine et par installation, « actif cette semaine ». Rien d'autre n'est envoyé : ni page, ni version, ni langue, ni donnée de santé, ni identifiant. La déduplication se fait dans l'app (un drapeau local `ouch.audience.lastWeek` retient la dernière semaine envoyée) ; GoatCounter ne fait qu'additionner. Le code est dans `src/lib/audience.ts`.

Ce document décrit ce qu'il faut configurer **à la main**, une fois, pour le déploiement officiel.

## 1. Créer le site GoatCounter

Sur <https://www.goatcounter.com> (hébergé, gratuit pour un usage non commercial) : créer un site avec le code `ouch`. L'endpoint d'envoi est alors `https://ouch.goatcounter.com/count`.

## 2. Régler la collecte (Settings → Data collection)

| Option | Valeur | Raison |
|---|---|---|
| Sessions | **Off** | évite que l'IP et le User-Agent soient tenus en mémoire jusqu'à 8 h |
| Localisation (pays/région) | **Off** | déduite de l'IP |
| User-Agent (navigateur/système) | **Off** | inutile ici |
| Taille d'écran | **Off** | inutile ici (l'app ne l'envoie de toute façon pas) |
| Langue | **Off** | inutile ici |
| Référent | **Off** | inutile ici (l'app n'en envoie pas) |
| Pages vues individuelles | **Off** (défaut) | sinon une ligne par visite en base |
| Compteur de visiteurs public | **Off** | inutile |
| Rétention des données | **≤ 25 mois** | condition de l'exemption « mesure d'audience » de la CNIL |

Le tableau de bord reste privé. Les chiffres se lisent dans **Événements** (chemins `/actif/…`) : le total d'une semaine est la somme de `/actif/standalone/AAAA-Wnn` et `/actif/navigateur/AAAA-Wnn`.

## 3. Brancher le déploiement

Dans le dépôt GitHub officiel (variables **de dépôt**, pas celles d'un « environment »), **Settings → Secrets and variables → Actions → Variables** (des variables, pas des secrets : elles finissent dans le bundle public) :

| Variable | Valeur |
|---|---|
| `AUDIENCE_URL` | `https://ouch.goatcounter.com/count` |
| `AUDIENCE_HOST` | `maxauvy.github.io` |

`.github/workflows/deploy.yml` les passe au build sous les noms `VITE_AUDIENCE_URL` et `VITE_AUDIENCE_HOST`, **uniquement** quand le dépôt est `maxauvy/OUCH`. La politique de sécurité du contenu (`connect-src`) ajoute alors l'origine de GoatCounter ; sans ces variables, elle n'y figure pas.

## 4. Quand l'app n'envoie rien

Une seule condition manquante suffit, sans requête réseau ni drapeau écrit :

- la case « Mesure d'audience anonyme » est décochée dans Réglages ;
- le navigateur envoie Do Not Track ou Global Privacy Control ;
- `VITE_AUDIENCE_URL` ou `VITE_AUDIENCE_HOST` est vide (build local, fork, démo, tests) ;
- le nom d'hôte n'est pas `AUDIENCE_HOST` (fork qui garderait la variable), ou est `localhost` / une adresse locale ;
- mode démo, ou app affichée dans une iframe, ou hors ligne.

Un échec réseau n'écrit pas le drapeau : l'app réessaie au lancement suivant, sans rien afficher.

## 5. Vérifier

```bash
npm i --no-save playwright && npx playwright install chromium   # une fois
VITE_AUDIENCE_URL=https://ouch-test.goatcounter.com/count VITE_AUDIENCE_HOST=ouch.example npm run build
node scripts/check-audience.mjs
```

Le script intercepte le réseau (rien ne sort de la machine) et contrôle : une seule requête par semaine, uniquement le chemin d'événement (`p`, `e`, `ns`), ni cookie ni référent, aucune requête quand la case est décochée, sous DNT, sur un autre hôte, et une nouvelle tentative après un échec.

## Limites des chiffres

Vider les données, réinstaller ou changer d'appareil compte comme une nouvelle installation ; sur iOS, le stockage d'un site non installé peut être effacé après 7 jours sans visite, ce qui gonfle les usages en onglet. C'est un ordre de grandeur, pas un décompte exact.
