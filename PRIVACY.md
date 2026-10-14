# Vie privée

*English summary at the [end](#english-summary).*

OUCH tient un carnet de douleur, donc des données de santé. Ce document dit, de façon vérifiable, ce qui est enregistré, où, ce qui quitte l'appareil, et ce que le développeur peut voir. Chaque affirmation correspond au code de la version publiée ; la politique de sécurité de contenu (CSP) du build de production interdit les autres appels sortants.

## En une phrase

Le journal reste sur l'appareil de la personne, sans compte et sans serveur. Seules trois fonctions facultatives contactent un service extérieur (la météo, le nom de la ville et, en accès anticipé, la sauvegarde automatique chez Dropbox), et tout partage ou export est un geste de la personne.

## Ce qui est enregistré, et où

Dans le navigateur de l'appareil (base IndexedDB du site, plus une clé de `localStorage` pour le rappel) :

- le journal : douleur, zones, fatigue, sommeil, brouillard mental, stress, humeur, activité, actions qui ont aidé, notes, jour de règles si la personne l'active ;
- les traitements : nom, type, doses, périodes, prises, soulagement, effets indésirables ;
- les réglages : prénom, langue, maladies déclarées, heure du rappel, et, si la météo automatique est activée, la **position exacte** de l'appareil ;
- si le verrou par code est activé : l'empreinte salée du code (jamais le code), le délai choisi, le nombre d'erreurs de suite et le moment où l'app a quitté l'écran pour la dernière fois, dans une clé de `localStorage` (voir plus bas) ;
- si la sauvegarde automatique est activée : l'état de la dernière copie (date, taille, empreinte, ce qu'a répondu Dropbox en cas d'échec), dans les réglages, ainsi que la clé de chiffrement et les jetons Dropbox dans deux bases à part (voir plus bas).

Ces données sont stockées **en clair** : quiconque a accès à l'appareil déverrouillé ou au profil du navigateur peut les lire. Le verrou par code (voir plus bas) cache l'écran, il ne les chiffre pas. Seules les sauvegardes exportées sont chiffrées (voir plus bas).

Le nom et la date de naissance saisis pour générer un rapport ne sont **pas** enregistrés : ils servent à fabriquer le PDF, puis disparaissent.

## Ce qui quitte l'appareil

| Quoi | Vers qui | Quand | Ce que le service reçoit |
|---|---|---|---|
| Météo du jour | [Open-Meteo](https://open-meteo.com/) | Si la météo automatique est activée, à chaque récupération | La latitude et la longitude de l'appareil, la date, et son adresse IP |
| Nom de la ville | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) | Seulement quand la personne met à jour sa position | Une position **arrondie à environ 1 km**, la langue, et l'adresse IP |
| Pages et fichiers de l'app | GitHub Pages (l'hébergeur) | À chaque ouverture ou mise à jour de l'app | Ce que reçoit tout hébergeur web : adresse IP, navigateur, page demandée. Aucun contenu du journal |
| Page de dons | Ko-fi | Seulement si la personne touche le lien « m'offrir un café » | Ce qu'un clic sur un lien envoie ; rien n'est chargé avant |
| Copies de la sauvegarde automatique (accès anticipé) | [Dropbox](https://www.dropbox.com/), dans le dossier réservé à OUCH | Seulement si la personne l'a activée : après une modification du journal, au plus toutes les 15 minutes, et au retour de l'app au premier plan | Un fichier **déjà chiffré** (voir plus bas), son nom (une date et une heure), sa taille, et ce que voit tout service : adresse IP, compte Dropbox de la personne |
| Sauvegarde, export CSV, PDF du rapport, image de la météo du jour | Où la personne les envoie | Quand elle exporte, imprime ou partage | Ce que la personne choisit d'envoyer, par le canal de son choix |

Rien d'autre : pas de compte, pas de serveur d'OUCH, pas d'outil de mesure d'audience, pas de cookie de suivi, pas de publicité, pas de service tiers chargé dans la page. Les polices sont servies par le site lui-même.

Le **développeur n'a accès à aucune donnée de journal** : elles n'arrivent jamais chez lui, puisqu'il n'y a pas de serveur pour les recevoir.

## Sauvegardes et export CSV

L'export produit un fichier chiffré dans le navigateur (WebCrypto) : AES-256-GCM, clé dérivée du mot de passe de la personne par PBKDF2-SHA-256 (600 000 itérations, sel aléatoire de 16 octets). Le mot de passe n'est enregistré nulle part : **perdu, il rend la sauvegarde irrécupérable**, par conception. Le fichier contient tout le journal, les traitements et les réglages, donc aussi la position exacte si elle a été enregistrée. Il ne contient que des données d'OUCH, et l'import vérifie sa forme avant de déchiffrer. Le détail des champs est dans le [dictionnaire des données](docs/soignants/dictionnaire-des-donnees.md).

L'export CSV (Réglages, zone sensible) est différent : il produit deux fichiers **en clair**, non chiffrés, qui ne servent pas à restaurer OUCH. Il n'est produit que sur demande et dans le navigateur ; les notes libres peuvent en être exclues. Ce qui est fait du fichier ensuite, par exemple le partager par e-mail, relève de la personne.

## Verrou par code

Facultatif, désactivé par défaut, réglé dans Réglages (Rappel et affichage). C'est un **verrou d'affichage** : il cache le journal à quelqu'un qui regarde un appareil déverrouillé (un proche, un collègue, un appareil prêté). Il **ne chiffre rien** : les données restent en clair dans le navigateur, et quiconque sait ouvrir les outils du navigateur ou lire le stockage du site peut les lire. Il ne remplace donc ni le verrouillage de l'appareil, ni un chiffrement de disque.

- **Le code :** quatre chiffres. L'app n'en garde qu'une **empreinte salée** (PBKDF2-SHA-256, 100 000 itérations, volontairement légères puisque ce n'est pas du chiffrement). Le code lui-même n'est enregistré nulle part : **il ne peut pas être réaffiché**, seulement changé ou retiré, en donnant le code actuel.
- **Où :** une clé de `localStorage` de l'appareil (lue avant d'afficher quoi que ce soit, pour que le journal n'apparaisse pas un instant). Elle ne fait partie d'aucune sauvegarde, d'aucun export ni d'aucune copie automatique : un nouvel appareil démarre sans code.
- **Quand l'app se verrouille :** à l'ouverture, puis quand elle revient à l'écran après le délai choisi (aussitôt, 1, 5 ou 15 minutes ; 1 minute par défaut), ou à la demande (« Verrouiller maintenant »). Dès que l'app quitte l'écran, son contenu est masqué avant que le système prenne l'aperçu du sélecteur d'applications.
- **Erreurs :** après quatre codes faux, le suivant est limité par une pause de 30 secondes, qui double à chaque nouvel échec jusqu'à 15 minutes. Pendant une pause, même le bon code est refusé. **Rien n'est jamais effacé** après des erreurs.
- **Code oublié :** il n'existe aucun moyen de le retrouver. La seule issue est d'effacer les données de cet appareil (après avoir tapé le mot de confirmation), puis de restaurer une sauvegarde. Sans sauvegarde, le journal de l'appareil est perdu : c'est pourquoi l'activation du verrou affiche la date de la dernière sauvegarde et propose d'en faire une d'abord.
- **Effacer ses données** retire aussi le verrou. La **sauvegarde automatique** continue pendant que l'app est verrouillée. Le mode démo n'a pas de verrou.
- **Le développeur** n'a accès à rien de tout cela : rien n'est envoyé.

## Sauvegarde automatique (accès anticipé)

Facultative, désactivée par défaut, et pas encore proposée à tout le monde : on l'active sur un appareil en touchant cinq fois de suite la ligne « Créé avec soin par… » au bas d'une page (ou en ajoutant `?autobackup` à l'adresse de l'app), et on la désactive de la même façon. La personne choisit un mot de passe, relie son compte Dropbox (l'accord se donne sur le site de Dropbox, OUCH n'en voit jamais le mot de passe) et OUCH y dépose des copies chiffrées de son journal.

- **Ce qui part :** le même fichier que la sauvegarde exportée (AES-256-GCM, même format), fabriqué dans le navigateur avant l'envoi. Dropbox ne reçoit que ce fichier chiffré, son nom (par exemple `ouch-20261013-172542.json`), sa taille et le moment de l'envoi. Il ne peut pas lire le journal.
- **Où :** dans le dossier réservé à OUCH (« App folder » : `Applications/` du Dropbox de la personne). OUCH n'a pas accès au reste du Dropbox. Permissions demandées : lire et écrire des fichiers dans ce dossier, et le lister.
- **Combien :** les trois dernières copies. Les plus anciennes sont supprimées après chaque envoi réussi ; aucun autre fichier n'est touché.
- **Vérification :** après chaque envoi, OUCH relit le fichier, compare son empreinte SHA-256 à celle de l'original et vérifie qu'il s'ouvre avec la clé de l'appareil. Une copie qui ne passe pas ce contrôle est retirée.
- **Ce qui est gardé sur l'appareil :** une clé dérivée du mot de passe, non extractable (la page peut l'utiliser mais pas la lire), et les jetons d'accès à Dropbox, chacun dans sa propre base IndexedDB, à part du journal. Ni l'une ni les autres ne font partie d'une sauvegarde, d'un export ou d'une copie. Le mot de passe, lui, n'est enregistré nulle part : **perdu, il rend les copies irrécupérables**, comme pour la sauvegarde exportée.
- **Arrêter :** « Arrêter la sauvegarde automatique » supprime la clé et les jetons de l'appareil et révoque le lien chez Dropbox. Les copies déjà envoyées restent dans le Dropbox de la personne, qui peut les y supprimer.
- **Le développeur** n'a pas accès à ces copies : elles vont au compte Dropbox de la personne, pas à OUCH. L'application Dropbox d'OUCH n'a qu'une clé d'application publique, pas de secret.

## Mode démo

Le mode démo remplit une base séparée avec un historique fictif, calculé sur l'appareil. Il ne lit ni ne modifie le vrai journal, ne fait aucun appel réseau (la météo automatique y est coupée) et « Quitter » efface la base d'exemple.

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

OUCH keeps a pain diary, so health data. The diary, treatments and settings live in the browser on the person's own device, unencrypted, with no account and no server. Only three optional features contact a third party: automatic weather ([Open-Meteo](https://open-meteo.com/) receives the device's coordinates and IP), the town name ([Nominatim](https://nominatim.openstreetmap.org/) receives a position rounded to about 1 km) and, in early access and off by default, automatic backup to [Dropbox](https://www.dropbox.com/): an already-encrypted file, in OUCH's own app folder, the three latest copies kept, checked after each upload; Dropbox cannot read it. The site itself is hosted on GitHub Pages, which sees what any web host sees. The donation link is a plain link, loaded only if tapped. There are no analytics, no tracking cookies and no third-party scripts, and a content security policy blocks any other outgoing call.

An optional code lock (4 digits, only a salted hash of it kept in the device's local storage, never in backups) hides the journal from someone looking at an unlocked device. It is a display lock, not encryption: the data stays readable in the browser's storage. After four wrong codes the app makes you pause (30 seconds, doubling up to 15 minutes), and it never erases anything; a forgotten code can only be got around by erasing the device and restoring a backup.

Backups are encrypted in the browser (AES-256-GCM, key from the password with PBKDF2-SHA-256, 600,000 iterations); a lost password means a lost backup. The name and birth date typed to produce a report are never stored. Settings has a button to delete all local data. The developer has no access to any diary data. For institutional use, consult your data protection officer. The CSV export (Settings) is different: two plain, unencrypted files that cannot restore OUCH, made only on request in the browser, with the free-text notes optional.
