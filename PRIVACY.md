# Vie privée

*English summary at the [end](#english-summary).*

OUCH tient un carnet de douleur, donc des données de santé. Ce document dit, de façon vérifiable, ce qui est enregistré, où, ce qui quitte l'appareil, et ce que le développeur peut voir. Chaque affirmation correspond au code de la version publiée ; la politique de sécurité de contenu (CSP) du build de production interdit les autres appels sortants.

## En une phrase

Le journal reste sur l'appareil de la personne, sans compte et sans serveur. Seules trois fonctions facultatives contactent un service extérieur (la météo, le nom de la ville et, en accès anticipé, la sauvegarde automatique chez Dropbox), à quoi s'ajoute un signal anonyme « actif cette semaine », une fois par semaine, que la personne peut couper ; tout partage ou export est un geste de la personne.

## Ce qui est enregistré, et où

Dans le navigateur de l'appareil (base IndexedDB du site, plus quelques clés de `localStorage`, dont celle du rappel et celle de la mesure d'audience) :

- le journal : douleur, zones, fatigue, sommeil, brouillard mental, stress, humeur, activité, actions qui ont aidé, notes, jour de règles si la personne l'active, et, pour celles qui suivent les indicateurs proposés selon les maladies, des données plus intimes (abondance des règles et saignements hors règles, douleur à la selle, troubles urinaires, fièvre ou infection, mal de tête, symptômes du jour, raideur, réveils…). Elles sont facultatives, décochables d'un tap, et ne quittent pas l'appareil : elles sont dans la sauvegarde chiffrée et dans l'export CSV (non chiffré) ;
- les traitements : nom, type, doses, périodes, prises, soulagement, effets indésirables ;
- les réglages : prénom, langue, maladies déclarées, heure du rappel (et l'heure pour laquelle le fichier d'agenda a été proposé), et, si la météo automatique est activée, la **position exacte** de l'appareil ;
- le dernier numéro de semaine pour lequel le signal de mesure d'audience a été envoyé (`ouch.audience.lastWeek`, dans `localStorage`) : un repère par installation, sans identifiant, qui n'est ni dans la sauvegarde ni dans l'export CSV et que la case de Réglages efface ;
- ce que la personne a répondu aux pistes de Tendances (« à noter pour ma consultation », « pas vraiment »), les essais d'une semaine qu'elle a lancés (l'action, les dates) et ce que les cartes de pistes ont déjà montré sur l'appareil : tout se calcule sur l'appareil, rien n'est envoyé, et les deux premiers font partie d'une sauvegarde ;
- si le verrou par code est activé : l'empreinte salée du code (jamais le code), le délai choisi, le nombre d'erreurs de suite et le moment où l'app a quitté l'écran pour la dernière fois, dans une clé de `localStorage` (voir plus bas) ;
- si la sauvegarde automatique est activée : l'état de la dernière copie (date, taille, empreinte, ce qu'a répondu Dropbox en cas d'échec), dans les réglages, ainsi que la clé de chiffrement et les jetons Dropbox dans deux bases à part (voir plus bas).

Ces données sont stockées **en clair** : quiconque a accès à l'appareil déverrouillé ou au profil du navigateur peut les lire. Le verrou par code (voir plus bas) cache l'écran, il ne les chiffre pas. Seules les sauvegardes exportées sont chiffrées (voir plus bas).

Le nom saisi pour générer un rapport n'est **pas** enregistré : il sert à fabriquer le PDF, puis disparaît. La date de naissance et la date de la dernière consultation, elles, restent sur l'appareil (dans les réglages, donc aussi dans une sauvegarde), pour ne pas être retapées à chaque rapport. Les rendez-vous notés dans l'application (date, type — médecin traitant ou centre douleur —, nom du soignant si la personne l'écrit, questions, note) sont du texte libre de la personne, gardé de la même façon.

## Ce qui quitte l'appareil

| Quoi | Vers qui | Quand | Ce que le service reçoit |
|---|---|---|---|
| Météo du jour | [Open-Meteo](https://open-meteo.com/) | Si la météo automatique est activée, à chaque récupération | La latitude et la longitude de l'appareil, la date, et son adresse IP |
| Prévision de la pression de demain | [Open-Meteo](https://open-meteo.com/) | Seulement si la personne a activé « Prévoir demain » (éteint par défaut, avec la météo automatique et une position), au plus une fois par jour | La même chose que la météo du jour : latitude et longitude, et l'adresse IP. La prévision reçue reste sur l'appareil, pour la journée |
| Nom de la ville | [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap) | Seulement quand la personne met à jour sa position | Une position **arrondie à environ 1 km**, la langue, et l'adresse IP |
| Pages et fichiers de l'app | GitHub Pages (l'hébergeur) | À chaque ouverture ou mise à jour de l'app | Ce que reçoit tout hébergeur web : adresse IP, navigateur, page demandée. Aucun contenu du journal |
| Mesure d'audience anonyme | [GoatCounter](https://www.goatcounter.com/) (Martin Tournoij, Irlande ; données chez Hetzner, en Finlande et en Allemagne) | Une fois par semaine et par installation, au lancement, sauf si la case de Réglages est décochée, si le navigateur envoie Do Not Track ou Global Privacy Control, ou dans la démo | Un chemin du type `/actif/navigateur/2026-W44` (semaine ISO, application installée ou onglet de navigateur). Ni page, ni titre, ni référent, ni version, ni langue, ni taille d'écran, aucun cookie, aucun identifiant. Comme tout service, il voit l'adresse IP de la requête ; le site GoatCounter est réglé pour ne ni la conserver ni s'en servir (voir [`docs/mesure-audience.md`](docs/mesure-audience.md)) |
| Page de dons | Ko-fi | Seulement si la personne touche le lien « m'offrir un café » | Ce qu'un clic sur un lien envoie ; rien n'est chargé avant |
| Copies de la sauvegarde automatique (accès anticipé) | [Dropbox](https://www.dropbox.com/), dans le dossier réservé à OUCH | Seulement si la personne l'a activée : après une modification du journal, au plus toutes les 15 minutes, et au retour de l'app au premier plan | Un fichier **déjà chiffré** (voir plus bas), son nom (une date et une heure), sa taille, et ce que voit tout service : adresse IP, compte Dropbox de la personne |
| Sauvegarde, export CSV, PDF du rapport, image de la météo du jour | Où la personne les envoie | Quand elle exporte, imprime ou partage | Ce que la personne choisit d'envoyer, par le canal de son choix |

Rien d'autre : pas de compte, pas de serveur d'OUCH, pas de mesure du comportement (aucune page vue, aucun parcours), pas de cookie, pas de publicité, pas de script tiers chargé dans la page. Le signal hebdomadaire est une simple requête émise par l'app elle-même, sans script de GoatCounter. Elle repose sur l'intérêt légitime d'une mesure d'audience anonyme, dispensée de consentement ; elle est activée par défaut et se coupe dans Réglages. Les polices sont servies par le site lui-même.

Le **développeur n'a accès à aucune donnée de journal** : elles n'arrivent jamais chez lui, puisqu'il n'y a pas de serveur pour les recevoir.

## Sauvegardes et export CSV

L'export produit un fichier chiffré dans le navigateur (WebCrypto) : AES-256-GCM, clé dérivée du mot de passe de la personne par PBKDF2-SHA-256 (600 000 itérations, sel aléatoire de 16 octets). Le mot de passe n'est enregistré nulle part : **perdu, il rend la sauvegarde irrécupérable**, par conception. Le fichier contient tout le journal, les traitements et les réglages, donc aussi la position exacte si elle a été enregistrée. Il ne contient que des données d'OUCH, et l'import vérifie sa forme avant de déchiffrer. Le détail des champs est dans le [dictionnaire des données](docs/soignants/dictionnaire-des-donnees.md).

L'export CSV (Réglages, zone sensible) est différent : il produit deux fichiers **en clair**, non chiffrés, qui ne servent pas à restaurer OUCH. Il n'est produit que sur demande et dans le navigateur ; les notes libres peuvent en être exclues. Ce qui est fait du fichier ensuite, par exemple le partager par e-mail, relève de la personne.

## Verrou par code

Facultatif, désactivé par défaut, réglé dans Réglages (Rappel et affichage). C'est un **verrou d'affichage** : il cache le journal à quelqu'un qui regarde un appareil déverrouillé (un proche, un collègue, un appareil prêté). Il **ne chiffre rien** : les données restent en clair dans le navigateur, et quiconque sait ouvrir les outils du navigateur ou lire le stockage du site peut les lire. Il ne remplace donc ni le verrouillage de l'appareil, ni un chiffrement de disque.

- **Le code :** quatre chiffres. L'app n'en garde qu'une **empreinte salée** (PBKDF2-SHA-256, 100 000 itérations, volontairement légères puisque ce n'est pas du chiffrement). Le code lui-même n'est enregistré nulle part : **il ne peut pas être réaffiché**, seulement changé ou retiré, en donnant le code actuel.
- **Où :** une clé de `localStorage` de l'appareil (lue avant d'afficher quoi que ce soit, pour que le journal n'apparaisse pas un instant). Elle ne fait partie d'aucune sauvegarde, d'aucun export ni d'aucune copie automatique : un nouvel appareil démarre sans code.
- **Quand l'app se verrouille :** à chaque lancement (une app fermée puis relancée demande toujours le code, quel que soit le délai, y compris si le système l'a fermée), puis quand elle revient à l'écran après le délai choisi (aussitôt, 1, 5 ou 15 minutes ; 1 minute par défaut), ou à la demande (« Verrouiller maintenant »).
- **Limite connue sur iPhone : l'aperçu du sélecteur d'applications.** Quand on quitte l'app, le système prend une image de son dernier écran pour le sélecteur d'applications, et **cette image peut montrer le journal**. L'app cherche à se couvrir dès qu'elle est masquée, mais ce n'est pas assez tôt : mesuré sur un iPhone (iOS 27.0.1, app installée), le premier signal que reçoit une page web arrive quand elle est déjà masquée, et une page masquée n'est plus redessinée. Il n'existe, à notre connaissance, aucun événement web qui arrive avant. Seule une app native peut poser une couverture avant l'image. Le verrou protège donc **à l'ouverture** de l'app, pas dans l'aperçu : avant de quitter l'app, reviens sur un écran peu sensible (Aujourd'hui, par exemple). Sur d'autres appareils, la couverture peut fonctionner, sans que nous l'ayons vérifié.
- **Les rechargements :** un verrou qui est sur « verrouillé » le reste après un rechargement de la page (tant que le code n'est pas saisi), et une app qui quitte l'écran alors qu'elle est verrouillée ne repart pas le compte du délai. Une seule exception : quand l'app se recharge elle-même après une mise à jour (« Recharger »), depuis un état déverrouillé, elle laisse un laissez-passer qui dure **10 secondes**, utilisé une seule fois, pour ne pas redemander le code juste après qu'on l'a saisi. Il n'est posé que par ce bouton, qui n'est atteignable qu'une fois l'app déverrouillée ; il ne sert à aucun lancement à froid.
- **Erreurs :** les quatre premiers codes faux de suite ne coûtent rien ; dès le cinquième, une pause de 30 secondes s'impose, et elle double à chaque nouvel échec jusqu'à 15 minutes. Pendant une pause, même le bon code est refusé. **Rien n'est jamais effacé** après des erreurs.
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

## Le rappel dans l'agenda

Le bouton « Ajouter à mon agenda » fabrique, **sur l'appareil**, un petit fichier `.ics` : un événement qui revient chaque jour, à l'heure choisie. Il contient un titre neutre (« OUCH · 2 minutes pour toi »), l'adresse de l'application et rien d'autre : aucune donnée de santé, aucun prénom. OUCH ne l'envoie nulle part. Une fois ajouté, l'événement appartient à l'agenda du téléphone : s'il est synchronisé avec un compte (Google, iCloud…), ce service le reçoit comme n'importe quel événement. OUCH ne peut ni voir ni supprimer cet événement ; pour l'arrêter, on le supprime dans l'agenda.

## Mode démo

Le mode démo remplit une base séparée avec un historique fictif, calculé sur l'appareil. Il ne lit ni ne modifie le vrai journal, ne fait aucun appel réseau (la météo automatique y est coupée) et « Quitter » efface la base d'exemple.

## Rapport pour le médecin, image de la météo

Le rapport est fabriqué sur l'appareil. Il reprend, dans la rubrique « Ce que le patient a remarqué », les pistes que la personne a choisi de garder et ses essais d'une semaine terminés. Une fois imprimé ou envoyé, il relève de la personne : OUCH ne sait pas à qui elle le donne. Il porte la mention « données auto-déclarées, non vérifiées par un soignant ». Même chose pour l'image de la météo du jour : rien n'est envoyé automatiquement.

## Effacer ses données

Réglages, puis « Supprimer toutes mes données » : le journal, les traitements et les réglages sont supprimés de l'appareil, après confirmation. Les sauvegardes déjà exportées et les PDF déjà partagés ne sont pas concernés, puisqu'ils sont hors de l'application. Le cache de l'application ne contient que ses propres fichiers, aucune donnée personnelle.

Le navigateur peut aussi effacer de lui-même les données d'un site quand l'appareil manque de place, et Safari le fait après une semaine sans usage pour un site non installé. OUCH demande au navigateur de les conserver, sans pouvoir l'y obliger : seule une sauvegarde exportée les met vraiment à l'abri.

## Pour un professionnel de santé qui recommande OUCH

OUCH est conçu pour un usage individuel : c'est la personne qui tient son journal et qui décide de ce qu'elle montre. Pour un usage institutionnel (service hospitalier, étude, recueil de données pour un établissement), ce document ne remplace ni l'analyse de votre délégué à la protection des données, ni un avis juridique. La licence libre (CeCILL v2.1) permet d'auditer le code et d'héberger sa propre copie.

## Faille, question, correction

Pour une faille de sécurité, voir [`SECURITY.md`](SECURITY.md). Pour une erreur dans ce document ou une question, ouvrir une issue sur le dépôt. L'historique des modifications de ce texte est celui du dépôt Git.

---

## English summary

OUCH keeps a pain diary, so health data. The diary, treatments and settings live in the browser on the person's own device, unencrypted, with no account and no server. Only three optional features contact a third party: automatic weather ([Open-Meteo](https://open-meteo.com/) receives the device's coordinates and IP, and so does the optional, off-by-default look ahead to tomorrow's pressure, at most once a day), the town name ([Nominatim](https://nominatim.openstreetmap.org/) receives a position rounded to about 1 km) and, in early access and off by default, automatic backup to [Dropbox](https://www.dropbox.com/): an already-encrypted file, in OUCH's own app folder, the three latest copies kept, checked after each upload; Dropbox cannot read it. The site itself is hosted on GitHub Pages, which sees what any web host sees. The donation link is a plain link, loaded only if tapped. Once a week an installation also sends an anonymous “active this week” signal to [GoatCounter](https://www.goatcounter.com/) (a path such as `/actif/navigateur/2026-W44`: no page, version, language, cookie or identifier; the server sees the IP address like any service, and is set not to keep or use it). It is sent by the app itself, not by a third-party script; it is on by default, can be turned off in Settings, and is skipped under Do Not Track or Global Privacy Control. There is no behaviour tracking, no tracking cookies and no third-party scripts, and a content security policy blocks any other outgoing call.

An optional code lock (4 digits, only a salted hash of it kept in the device's local storage, never in backups) hides the journal from someone looking at an unlocked device. It is a display lock, not encryption: the data stays readable in the browser's storage, and on iPhone the app switcher's picture can show the last screen (the system takes it before a web page can cover it). From the fifth wrong code in a row the app makes you pause (30 seconds, doubling up to 15 minutes), and it never erases anything; a forgotten code can only be got around by erasing the device and restoring a backup.

Backups are encrypted in the browser (AES-256-GCM, key from the password with PBKDF2-SHA-256, 600,000 iterations); a lost password means a lost backup. The name and birth date typed to produce a report are never stored. Settings has a button to delete all local data. The developer has no access to any diary data. For institutional use, consult your data protection officer. The CSV export (Settings) is different: two plain, unencrypted files that cannot restore OUCH, made only on request in the browser, with the free-text notes optional.
