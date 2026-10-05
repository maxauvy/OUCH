# Politique de sécurité

*English summary at the [end](#english-summary).*

OUCH garde des données de santé sur l'appareil des personnes qui l'utilisent. Une faille est donc prise au sérieux, même si le projet est petit et maintenu par une seule personne.

## Signaler une vulnérabilité

**Merci de ne pas ouvrir une issue publique pour une faille.**

Utilise le signalement privé de GitHub : onglet **Security** du dépôt, puis **Report a vulnerability** ([lien direct](https://github.com/maxauvy/OUCH/security/advisories/new)). Le message n'est visible que de toi et du mainteneur.

Explique ce que tu as observé, comment le reproduire (navigateur, étapes, fichier de sauvegarde ou page concernée) et ce que ça permettrait à quelqu'un de faire.

À quoi t'attendre, sans promesse ferme : c'est un projet personnel. Je vise un accusé de réception sous une semaine et une correction rapide pour ce qui touche les données, puis une publication de l'avis une fois le correctif en ligne, avec ton nom si tu le souhaites.

## Ce qui est concerné

Les versions déployées sur <https://maxauvy.github.io/OUCH/> : seule la dernière version est maintenue. OUCH est un site statique sans serveur ni compte, ce qui limite ce qu'une faille peut atteindre. Sont notamment intéressants :

- **Sauvegardes chiffrées** : faiblesse du chiffrement (AES-256-GCM, clé dérivée du mot de passe par PBKDF2), de la dérivation de clé ou du format de fichier.
- **Import d'une sauvegarde** : un fichier fabriqué qui plante l'app, écrit des données inattendues ou exécute du code.
- **Injection de script (XSS)** et contournement de la politique de sécurité de contenu (CSP) du build de production.
- **Fuite de données** : tout appel réseau qui enverrait des données du journal, alors que la météo (Open-Meteo, coordonnées seulement) est censée être le seul.
- **Chaîne de déploiement** : GitHub Actions et dépendances.

## Ce qui n'est pas une faille

Ces points sont connus et documentés dans la section [Vie privée du README](README.md#vie-privée) :

- Les données du journal sont stockées **en clair** dans le navigateur (IndexedDB). Quiconque a accès à l'appareil déverrouillé ou au profil du navigateur peut les lire. Seules les sauvegardes exportées sont chiffrées.
- Une sauvegarde dont le mot de passe est perdu est irrécupérable, par conception.
- Le navigateur peut effacer les données d'un site ; l'app demande un stockage persistant et rappelle de sauvegarder, mais ne peut pas l'empêcher.
- Une mauvaise configuration de l'appareil de la personne (compte partagé, appareil déverrouillé, extension malveillante).

## Merci

Un signalement responsable protège les personnes qui se servent d'OUCH. Merci de prendre ce temps.

---

## English summary

OUCH keeps health data on the user's own device, so vulnerabilities matter even though this is a small, single-maintainer project.

**Please do not open a public issue for a vulnerability.** Report it privately through GitHub: the repository's **Security** tab → **Report a vulnerability** ([direct link](https://github.com/maxauvy/OUCH/security/advisories/new)). Describe what you found, how to reproduce it and what it would allow.

Best effort: acknowledgement within about a week, a quick fix for anything that touches data, then a public advisory once the fix is live (with credit if you want it). Only the latest deployed version is supported.

In scope: the encrypted backup format and crypto, backup import, XSS and CSP bypasses, any unexpected network call that would leak journal data, the deploy pipeline and dependencies. Not vulnerabilities: journal data being stored unencrypted in the browser (documented in the README), a lost backup password, the browser clearing site data, or a compromised or shared device.
