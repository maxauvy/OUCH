# Protocole de test avec des soignants

*Version 0.1, brouillon pour relecture. Proposé le 9 octobre 2026, pour OUCH v0.3.0.*

Ce document décrit comment tester OUCH avec des professionnels de santé : ce qu'on cherche à apprendre, qui on sollicite, ce qu'on leur demande, ce qui est recueilli (et ce qui ne l'est pas), et comment on décide de changer l'application. C'est un **pilote d'usage**, pas une étude clinique : il ne mesure ni l'efficacité d'un traitement ni un bénéfice pour la santé, et ne prétend à aucune valeur statistique. Les chiffres proposés (nombre de participants, durées, seuils de décision) sont des points de départ à discuter.

## 1. Ce qu'on cherche à apprendre

**Question principale.** Un soignant lit-il le rapport d'OUCH en deux minutes, y trouve-t-il ce dont il a besoin, et sans risque de lui faire dire ce qu'il ne dit pas ?

**Questions secondaires.**
1. Quelles données saisies par le patient sont utiles en consultation, lesquelles sont superflues, lesquelles manquent ?
2. La définition d'une poussée (au moins 3 jours à plus de 2 points ou 30 % au-dessus de la médiane des 28 jours précédents) a-t-elle un sens clinique ? Que faudrait-il à la place ?
3. Les catégories de douleur (≤ 3, 4–6, ≥ 7), la comparaison avant et après un changement de traitement et les corrélations aident-ils ou risquent-ils d'être sur-interprétés ?
4. La différence entre la version « Médecin traitant » (2 pages) et « Centre douleur » (environ 5 pages) est-elle la bonne ?
5. Quel effort le journal demande-t-il aux patients, en particulier les jours difficiles ?

**Ce qu'on ne cherche pas à établir** : que OUCH améliore la douleur, l'observance ou la prise en charge ; que ses seuils sont validés ; que ses poussées correspondent à celles que cliniciens ou patients identifient. Ces questions demanderaient une autre étude, avec un cadre éthique et statistique à part.

## 2. Deux phases

**Phase A : relecture par les soignants, sans patient.** Le soignant lit la plaquette et la note méthodologique, essaie l'application avec les données de démonstration, et répond aux questions de l'annexe B. Environ une heure au total. Elle ne fait intervenir aucune donnée de patient.

**Phase B : usage en consultation, avec des patients volontaires.** Un soignant ayant fait la phase A propose OUCH à quelques patients adultes. Pendant 4 à 6 semaines, les patients tiennent leur journal comme ils l'entendent. À la consultation suivante, un patient qui le souhaite apporte son rapport. Le soignant le lit dans le cadre normal de la consultation, puis remplit une courte grille (annexe A) sans mention d'identité. Un entretien de 20 à 30 minutes clôt la participation du soignant.

Rien n'oblige à passer à la phase B : la phase A est utile seule.

## 3. Participants

**Soignants.** Phase A : 5 à 8 personnes, de profils variés (médecin généraliste, rhumatologue, médecin de la douleur, infirmier ou infirmière, kinésithérapeute, psychologue, pharmacien). Phase B : 3 à 5 d'entre eux, qui suivent des patients douloureux chroniques. L'effectif est celui d'un test qualitatif : il sert à repérer des problèmes, pas à les compter.

**Patients (phase B uniquement), invités par leur soignant.**
- Inclus : adulte, douleur chronique (fibromyalgie ou autre), téléphone personnel, volontaire après avoir lu le texte de l'annexe C. Proposer à 2 à 4 patients par soignant au plus.
- Non invités, à l'appréciation du soignant : un patient en crise aiguë, ou pour qui un suivi quotidien de la douleur serait source d'anxiété ou de fixation. Le soignant n'a pas à justifier son choix.
- Aucune obligation de saisir tous les jours : l'application est conçue pour qu'un jour sans saisie n'ait pas de conséquence, et le rapport le dit.

## 4. Déroulé type

| Semaine | Soignant | Patient |
|---|---|---|
| 0 | Phase A, puis présentation du pilote au patient (annexe C) | Décide de participer ou non, installe OUCH, passe l'assistant de démarrage |
| 1 à 6 | Rien à faire | Tient son journal à son rythme |
| 4 à 6 | Consultation habituelle ; lit le rapport s'il est apporté (visé : moins de 2 minutes) ; remplit la grille (annexe A) | Génère le rapport (version choisie par le soignant), le montre, ou non |
| Après la dernière consultation | Entretien de 20 à 30 minutes et questionnaire (annexe B) | Libre de dire à son soignant ce qui lui a plu ou pesé |

Le soignant peut arrêter à tout moment, sans raison à donner. Un patient aussi : supprimer ses données se fait dans Réglages, et cela n'a aucune conséquence sur sa prise en charge.

## 5. Ce qui est recueilli

**Auprès des soignants.**
- Leur rôle (une catégorie, pas leur lieu d'exercice) et leur adresse de contact, pour l'entretien. Rien d'autre d'identifiant.
- La grille post-consultation : six réponses courtes, **sans nom, sans âge, sans date de naissance ni donnée de santé du patient**.
- Le questionnaire de fin et les notes de l'entretien.

**Auprès des patients : rien n'est recueilli par OUCH ni par le développeur.** Les données du journal restent sur le téléphone, et le rapport appartient au patient. Si un patient veut donner un avis, il le fait à son soignant ou par le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml), sans donnée identifiable.

*Option, à n'activer qu'après avis (voir 7) : un court questionnaire d'usage pour les patients, anonyme, remis par le soignant. Il n'est pas prévu dans la version 0.1 de ce protocole.*

## 6. Comment on décide de changer l'application

Pas de test statistique : des règles de lecture simples, fixées avant de commencer.

| Constat | Ce qu'on en fait |
|---|---|
| La moitié ou plus des soignants ne trouve pas l'information utile en moins de 2 minutes | Revoir la mise en page du rapport avant tout autre ajout |
| La moitié ou plus conteste la définition d'une poussée, ou en propose une autre convergente | Revoir cette définition, la note méthodologique et le tableau des poussées |
| Un élément est signalé comme prêtant à sur-interprétation par au moins deux soignants | Le reformuler ou le retirer de la version « Médecin traitant » |
| Une donnée manquante est demandée par au moins deux soignants de profils différents | L'étudier, en sachant que chaque champ de plus alourdit le patient |
| Un soignant ou un patient décrit un effet négatif (anxiété, fixation sur la douleur) | Priorité absolue : en parler dans l'entretien, puis revoir l'écran concerné |

Les retours sont lus par le mainteneur et par au moins un soignant avant toute décision. Un changement est annoncé dans le [CHANGELOG](../../CHANGELOG.md), et la [note méthodologique](../note-methodologique/) est mise à jour s'il touche un calcul.

## 7. Cadre éthique, juridique et données

**À vérifier avant de commencer la phase B**, avec l'aide d'un délégué à la protection des données (DPO) ou d'un comité compétent. Le protocole ne tranche pas ces points :

- Si une évaluation d'usage auprès de professionnels, sans donnée de santé de patient, relève ou non d'un avis de comité de protection des personnes. L'intention est qu'elle n'en relève pas, parce que rien n'est recueilli sur les patients : cela reste à confirmer.
- Si un questionnaire adressé aux patients (option de la section 5) change la réponse. Dans ce cas, information écrite, consentement et cadre adapté sont à prévoir avant.
- Les données recueillies sur les soignants (adresse de contact, rôle, réponses) sont des données personnelles : minimales, utilisées seulement pour ce pilote, **conservées 12 mois après la fin puis supprimées**, jamais publiées avec un nom sans accord écrit. Chacun peut demander leur effacement à tout moment.
- Si un soignant participe dans le cadre d'un établissement, vérifier l'accord de sa structure.

**Garde-fous.**
- OUCH n'est pas un dispositif médical, et le pilote n'en fait pas un : le rapport est un support de discussion. Aucune décision thérapeutique ne repose sur lui seul, et le soignant garde sa pratique habituelle.
- Aucune donnée de patient ne doit figurer dans un retour, une issue ou un courriel : la case du formulaire le rappelle.
- Un patient en difficulté est pris en charge comme d'habitude ; OUCH ne contacte personne.
- Un défaut de l'application (calcul erroné, texte trompeur) se signale par le formulaire ou par courriel, et passe avant toute autre tâche.

## 8. Calendrier et rôles

| Étape | Durée indicative | Qui |
|---|---|---|
| Relecture de ce protocole, avis éthique et DPO | 2 à 4 semaines | Mainteneur, un soignant référent, DPO |
| Phase A | 4 semaines | Soignants volontaires |
| Analyse et corrections issues de la phase A | 2 à 3 semaines | Mainteneur |
| Phase B | 6 à 8 semaines | Soignants et patients volontaires |
| Entretiens, analyse, retour public d'un résumé | 4 semaines | Mainteneur, soignant référent |

**Contact** : [maxime@open-freax.fr](mailto:maxime@open-freax.fr).

## Annexe A : grille après la consultation

À remplir en moins d'une minute, sans mention du patient. Réponses de 1 (pas du tout d'accord) à 5 (tout à fait d'accord), sauf mention.

1. Version lue : médecin traitant / centre douleur.
2. Temps de lecture : moins de 2 minutes / 2 à 5 minutes / plus de 5 minutes.
3. J'ai trouvé rapidement ce dont j'avais besoin.
4. Le rapport m'a appris quelque chose que l'interrogatoire seul ne m'aurait pas donné.
5. Un élément m'a paru prêter à confusion ou à sur-interprétation. Non / oui, lequel : ……
6. Un élément manquait, ou était de trop : ……
7. Pour la discussion : sans effet / a orienté la discussion / a contribué à une décision (déclaratif, sans lien causal établi).
8. Sur le temps de consultation : plutôt gagné / identique / plutôt perdu.

## Annexe B : questionnaire de fin et entretien

Les sept questions de la [note méthodologique](../note-methodologique/) :

1. La définition des poussées a-t-elle un sens pour vous ? Quel critère préféreriez-vous ?
2. Les catégories ≤ 3, 4–6, ≥ 7 vous servent-elles, ou lisez-vous l'évolution de la personne par rapport à elle-même ?
3. Une moyenne sur 7 jours et une période comparée à la précédente suffisent-elles ?
4. Les corrélations sont-elles utiles en consultation, ou risquent-elles d'être sur-interprétées ? Faut-il les retirer de la version « Médecin traitant » ?
5. Quels indicateurs utilisez-vous vraiment, lesquels feriez-vous disparaître ?
6. Quelles données vous manquent pour décider, qu'un carnet pourrait apporter ?
7. La comparaison avant et après un changement de traitement est-elle un format utile ? Quelle durée choisiriez-vous ?

Puis, ouvertes : ce qui vous a surpris ; ce que vous craignez que l'on fasse dire au rapport ; ce qui vous ferait le recommander, ou non ; si vous continueriez à l'utiliser. Facultatif : une échelle d'utilisabilité de 10 items (type SUS) appliquée au rapport.

## Annexe C : texte à lire au patient

*À adapter par le soignant. Court, doux, sans pression.*

> Je teste un carnet de douleur gratuit qui s'appelle OUCH, et je vous propose de l'essayer, si vous le souhaitez. Vous y notez votre journée en moins d'une minute sur votre téléphone ; les jours difficiles, la douleur seule suffit. Vos notes restent sur votre téléphone : personne d'autre n'y a accès, ni moi, ni le créateur de l'application. Si vous voulez, vous pouvez en tirer un résumé à m'apporter à la prochaine consultation, et c'est vous qui décidez de me le montrer ou non.
>
> Vous n'êtes pas obligé(e) de noter tous les jours, ni d'aller au bout. Vous pouvez arrêter quand vous voulez, supprimer vos notes d'un geste, et cela ne changera rien à votre suivi. L'application n'est pas un avis médical : elle sert seulement à vous aider à me raconter vos journées avec des chiffres. Je ne note rien de ce que vous y écrivez, et je ne vous demanderai que votre impression si vous avez envie de la partager.
