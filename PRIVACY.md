# Vie privée

*English summary at the [end](#english-summary).*

OUCH tient un carnet de douleur, donc des données de santé. Ce document dit, de façon vérifiable, ce qui est enregistré, où, ce qui quitte l'appareil, et ce que le développeur peut voir. Chaque affirmation correspond au code de la version publiée ; la politique de sécurité de contenu (CSP) du build de production interdit les autres appels sortants.

## En une phrase

Le journal reste sur l'appareil de la personne, sans compte et sans serveur. Seules deux fonctions facultatives contactent un service extérieur (la météo et le nom de la ville), et tout partage ou export est un geste de la personne.

## Ce qui est enregistré, et où

Dans le navigateur de l'appareil (base IndexedDB du site, plus une clé de `localStorage` pour le rappel) :

- le journal : douleur, zones, fatigue, sommeil, brouillard mental, stress, humeur, activité, actions qui ont aidé, notes, jour de règles si la personne l'active ;
- les traitements : nom, type, doses, périodes, prises, soulagement, effets indésirables ;
- les réglages : prénom, langue, maladies déclarées, heure du rappel, et, si la météo automatique est activée, la **position exacte** de l'appareil.

Ces données sont stockées **en clair** : quiconque a accès à l'appareil déverrouillé ou au profil du navigateur peut les lire. Seules les sauvegardes exportées sont chiffrées (voir plus bas).

Le nom et la date de naissance saisis pour générer un rapport ne sont **pas** enregistrés : ils servent à fabriquer le PDF, puis disparaissent.

## Ce qui quitte l'appareil

| Quoi | Vers qui | Quand | Ce que le service reçoit |
|---|---|---|---|
| Météo du jour | [Open-Meteo](https://open-meteo.com/) | Si la météo automatique est activée, à chaque récupération | La latitude et la longitude de l'appareil, la date, et son adresse IP |
| Nom de la ville | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) | Seulement quand la personne met à jour sa position | Une position **arrondie à environ 1 km**, la langue, et l'adresse IP |
| Pages et fichiers de l'app | GitHub Pages (l'hébergeur) | À chaque ouverture ou mise à jour de l'app | Ce que reçoit tout hébergeur web : adresse IP, navigateur, page demandée. Aucun contenu du journal |
| Page de dons | Ko-fi | Seulement si la personne touche le lien « m'offrir un café » | Ce qu'un clic sur un lien envoie ; rien n'est chargé avant |
| Sauvegarde, PDF du rapport, image de la météo du jour | Où la personne les envoie | Quand elle exporte, imprime ou partage | Ce que la personne choisit d'envoyer, par le canal de son choix |

Rien d'autre : pas de compte, pas de serveur d'OUCH, pas d'outil de mesure d'audience, pas de cookie de suivi, pas de publicité, pas de service tiers chargé dans la page. Les polices sont servies par le site lui-même.

Le **développeur n'a accès à aucune donnée de journal** : elles n'arrivent jamais chez lui, puisqu'il n'y a pas de serveur pour les recevoir.

## Sauvegardes

L'export produit un fichier chiffré dans le navigateur (WebCrypto) : AES-256-GCM, clé dérivée du mot de passe de la personne par PBKDF2-SHA-256 (600 000 itérations, sel aléatoire de 16 octets). Le mot de passe n'est enregistré nulle part : **perdu, il rend la sauvegarde irrécupérable**, par conception. Le fichier contient tout le journal, les traitements et les réglages, donc aussi la position exacte si elle a été enregistrée. Il ne contient que des données d'OUCH, et l'import vérifie sa forme avant de déchiffrer. Le détail des champs est dans le [dictionnaire des données](docs/soignants/dictionnaire-des-donnees.md).

## Rapport pour le médecin, image de la météo

Le rapport est fabriqué sur l'appareil. Une fois imprimé ou envoyé, il relève de la personne : OUCH ne sait pas à qui elle le donne. Il porte la mention « données auto-déclarées, non vérifiées par un soignant ». Même chose pour l'image de la météo du jour : rien n'est envoyé automatiquement.

## Effacer ses données

Réglages, puis « Supprimer toutes mes données » : le journal, les traitements et les réglages sont supprimés de l'appareil, après confirmation. Les sauvegardes déjà exportées et les PDF déjà partagés ne sont pas concernés, puisqu'ils sont hors de l'application. Le cache de l'application ne contient que ses propres fichiers, aucune donnée personnelle.

Le navigateur peut aussi effacer de lui-même les données d'un site quand l'appareil manque de place, et Safari le fait après une semaine sans usage pour un site non installé. OUCH demande au navigateur de les conserver, sans pouvoir l'y obliger : seule une sauvegarde exportée les met vraiment à l'abri.

## Pour un professionnel de santé qui recommande OUCH

OUCH est conçu pour un usage individuel : c'est la personne qui tient son journal et qui décide de ce qu'elle montre. Pour un usage institutionnel (service hospitalier, étude, recueil de données pour un établissement), ce document ne remplace ni l'analyse de votre délégué à la protection des données, ni un avis juridique. La licence libre (CeCILL v2.1) permet d'auditer le code et d'héberger sa propre copie.

## Faille, question, correction

Pour une faille de sécurité, voir [`SECURITY.md`](SECURITY.md). Pour une erreur dans ce document ou une question, ouvrir une issue sur le dépôt. L'historique des modifications de ce texte est celui du dépôt Git.

---

## English summary

OUCH keeps a pain diary, so health data. The diary, treatments and settings live in the browser on the person's own device, unencrypted, with no account and no server. Only two optional features contact a third party: automatic weather ([Open-Meteo](https://open-meteo.com/) receives the device's coordinates and IP) and the town name ([Nominatim](https://nominatim.openstreetmap.org/) receives a position rounded to about 1 km). The site itself is hosted on GitHub Pages, which sees what any web host sees. The donation link is a plain link, loaded only if tapped. There are no analytics, no tracking cookies and no third-party scripts, and a content security policy blocks any other outgoing call.

Backups are encrypted in the browser (AES-256-GCM, key from the password with PBKDF2-SHA-256, 600,000 iterations); a lost password means a lost backup. The name and birth date typed to produce a report are never stored. Settings has a button to delete all local data. The developer has no access to any diary data. For institutional use, consult your data protection officer.
