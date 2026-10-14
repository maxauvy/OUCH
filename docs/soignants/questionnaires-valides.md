# Note sur les questionnaires validés

*Version 0.1, brouillon pour relecture. Établi le 14 octobre 2026, pour OUCH v0.5.0. **Ce document n'est pas un avis juridique** : les informations sur les droits viennent de pages publiques, souvent secondaires, **qu'aucune démarche auprès des détenteurs n'a confirmées**. Elles sont à vérifier par écrit avant tout usage.*

Cette note répond à une question qu'un soignant pose vite : *« pourquoi OUCH n'utilise-t-il pas un questionnaire validé, le BASDAI, le FIQR… ? »* Elle dit ce qu'OUCH utilise aujourd'hui, pourquoi il n'intègre pas de questionnaire complet, ce qu'il faudrait pour en intégrer un, et ce qu'OUCH fait en attendant. Pour le reste de l'état des vérifications, voir le [statut de validation](statut-de-validation.md). Une version de deux pages, à lire avec des soignants, existe aussi : la [note de cadrage](https://github.com/maxauvy/OUCH/releases/download/v0.5.0/OUCH-note-scores-valides-v0.5.0.pdf) ([English](https://github.com/maxauvy/OUCH/releases/download/v0.5.0/OUCH-validated-scores-note-v0.5.0.pdf), [source](../note-scores-valides/)).

## 1. Ce qu'OUCH utilise aujourd'hui

- **Un seul instrument validé, repris tel quel : l'échelle numérique de 0 à 10 pour l'intensité de la douleur.** Elle est recommandée (IMMPACT, HAS) et largement validée ; le rappel porte sur la journée (références 1, 3, 6 et 10 du rapport).
- **Des échelles simples, non validées,** pour la fatigue, le sommeil, le brouillard mental, l'humeur, le stress et l'activité : de 0 à 10, présentées comme telles dans l'application, le rapport et la note méthodologique.
- **Aucun questionnaire complet** n'est intégré, et OUCH ne calcule aucun score d'un questionnaire validé.

## 2. Pourquoi ne pas simplement intégrer un questionnaire validé

1. **Un questionnaire raccourci ou adapté n'est plus validé.** Les propriétés d'un instrument tiennent à ses items, à leur formulation, à sa période de rappel (souvent 7 jours, parfois 1 mois) et à son mode de calcul. Garder quelques items, reformuler, ou poser la question tous les jours au lieu d'une fois par semaine, c'est créer un autre instrument, qui n'a pas la validation du premier.
2. **Le rythme n'est pas le même.** OUCH est un journal quotidien de moins d'une minute, et les jours difficiles la douleur seule suffit. La plupart des questionnaires de suivi sont hebdomadaires ou espacés, et longs : les poser dans le journal en ferait un fardeau pour les patients qui en ont le moins besoin.
3. **Les droits.** Beaucoup de questionnaires cliniques appartiennent à un détenteur qui accorde l'usage clinique ou académique, mais pas l'usage dans une application sans licence (voir le tableau). Aucune démarche n'a été faite.
4. **La traduction.** Un instrument traduit sans validation linguistique n'est pas validé dans cette langue. Pour plusieurs instruments, la traduction exige l'accord écrit du détenteur.
5. **Le rôle de l'application.** Un score d'un questionnaire validé invite à une interprétation (seuils d'activité, de sévérité). Cela rapproche OUCH d'un outil d'aide à la décision, que sa position « carnet descriptif » veut éviter (voir le [cadre réglementaire](cadre-reglementaire.md)).
6. **Les risques propres à certains instruments.** Un questionnaire d'humeur comme le PHQ-9 contient une question sur les idées suicidaires : l'intégrer sans prévoir ce qu'on fait d'une réponse positive serait une faute. OUCH n'a pas de dispositif pour cela, et ne doit pas faire semblant d'en avoir un.

## 3. Instruments qui pourraient entrer en ligne de compte

Pour chacun : à quoi il sert, et ce que disent les sources consultées sur ses droits. **Ces colonnes ne sont pas un avis : elles disent ce qui reste à vérifier.**

| Instrument | Pour quoi | Droits, d'après les sources consultées | À vérifier avant tout usage |
|---|---|---|---|
| **Échelle numérique de douleur 0–10** | Intensité de la douleur | Utilisée telle quelle, libre d'usage | Rien |
| **BASDAI** | Activité de la spondyloarthrite (6 items, 0–10, rappel sur 1 semaine) | Signaux contradictoires : classé « domaine public » par certaines pages, mais ses conditions d'usage interdisent de le modifier, le copier ou le traduire sans autorisation écrite, et l'usage gratuit semble réservé au milieu académique, l'industrie devant payer | Contacter le détenteur (Mapi Research Trust / ePROVIDE) pour un usage dans une application |
| **FIQR** | Impact de la fibromyalgie (21 items, rappel sur 7 jours) | Gratuit en usage clinique et académique ; une licence est exigée pour l'usage commercial | Licence, et version française validée disponible |
| **HAQ / HAQ-DI** | Capacité fonctionnelle (polyarthrite rhumatoïde) | Une page de Stanford Patient Education le dit libre d'usage sans autorisation ; le détenteur de traductions le soumet à un accord pour les usages commerciaux et les applications | Confirmation écrite d'un usage dans une application |
| **Oswestry (ODI)** | Incapacité due à la lombalgie | Gratuit pour les cliniciens et la mise en œuvre clinique ; les usages commerciaux et des éditeurs de logiciels demandent une licence payante | Licence de l'éditeur de logiciel |
| **BPI (inventaire bref de la douleur)** | Intensité et retentissement de la douleur | Protégé ; l'usage est souvent accordé gratuitement sur demande, mais le guide indique que des frais peuvent s'appliquer, et qu'une traduction ou une modification demande un accord écrit | Autorisation écrite pour l'usage dans une application, et pour toute traduction |
| **PHQ-9** | Humeur (symptômes dépressifs) | Le formulaire officiel indique qu'aucune autorisation n'est nécessaire pour le reproduire, le traduire ou le diffuser (des sources secondaires nomment encore un détenteur) | Lire les conditions actuelles ; **prévoir la réponse à la question sur les idées suicidaires avant toute intégration** |
| **PROMIS** (douleur, fatigue, sommeil…) | Mesures standardisées avec banques d'items | Gratuit en papier ou en recherche électronique non commerciale ; l'usage dans une application qui calcule les scores (interface de programmation) demande une licence ; les versions françaises passent par une demande au détenteur | Licence, et disponibilité du français pour chaque banque |

## 4. Ce que fait OUCH en attendant

- **Des items inspirés, jamais appelés par le nom d'un questionnaire.** Le journal peut demander des choses proches de ce que mesurent ces instruments (par exemple une raideur matinale, qui est un item du BASDAI et de la polyarthrite rhumatoïde, voir le backlog), mais comme des échelles simples, **dites non validées**, jamais comme « le BASDAI » ou « le FIQR » ni comme leur score.
- **Aucun score calculé** à partir d'items inspirés, et aucun seuil d'activité de maladie.
- **Dans le rapport,** ces items sont décrits (évolution, moyenne) comme les autres, avec la mention que les échelles autres que la douleur ne sont pas validées.

## 5. Ce qu'il faudrait pour intégrer un questionnaire un jour

1. **Droits écrits** du détenteur, pour un usage dans une application gratuite et libre, et pour la langue concernée.
2. **Version française validée** (ou un processus de traduction et de validation linguistique accepté par le détenteur).
3. **Mode d'administration respecté** : la période de rappel et la cadence de l'instrument (par exemple une fois par semaine pour un rappel sur 7 jours), indépendamment du journal quotidien, sans raccourcir ni reformuler.
4. **Un calcul fidèle,** vérifié contre le manuel de l'instrument, et testé sur les exemples de ce manuel.
5. **Pas d'interprétation automatique** : un score est décrit, pas qualifié (« maladie active »), sauf si un clinicien le fait.
6. **Un avis clinique** sur l'intérêt pour la consultation, et sur le fardeau pour le patient.
7. **Le cas des réponses à risque** (idées suicidaires, détresse) traité avant la première mise en ligne, avec un texte d'orientation relu par un professionnel, pour les instruments qui en contiennent.
8. **Une étude de convergence** : comparer les échelles simples d'OUCH aux instruments validés passés aux mêmes patients (voir l'étude minimale du [statut de validation](statut-de-validation.md)).

## 6. Ce qu'on peut dire, et ne pas dire

| On peut dire | On ne dit pas |
|---|---|
| « OUCH reprend l'échelle numérique de 0 à 10 pour la douleur » | « OUCH utilise des échelles validées » (pour la fatigue, le sommeil, l'humeur : non) |
| « La fatigue, le sommeil, l'humeur sont suivis avec des échelles simples non validées » | « OUCH mesure l'activité de la maladie » |
| « Aucun questionnaire complet n'est intégré, faute de droits et d'un cadre adapté » | « OUCH remplace le BASDAI, le FIQR… » |

## 7. Sources consultées

Informations sur les droits et la validation, consultées le 14 octobre 2026 ; à confirmer auprès des détenteurs.

- [BASDAI sur ePROVIDE (Mapi Research Trust)](https://eprovide.mapi-trust.org/instruments/bath-ankylosing-spondylitis-disease-activity-index)
- [FIQR sur ePROVIDE (Mapi Research Trust)](https://eprovide.mapi-trust.org/instruments/revised-fibromyalgia-impact-questionnaire)
- [Le FIQR : validation et propriétés (Bennett et al. 2009, PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2745803/)
- [HAQ sur ePROVIDE](https://eprovide.mapi-trust.org/instruments/health-assessment-questionnaire)
- [Oswestry Disability Index sur ePROVIDE (Mapi Research Trust)](https://eprovide.mapi-trust.org/instruments/oswestry-disability-index)
- [Brief Pain Inventory, MD Anderson](https://www.mdanderson.org/research/departments-labs-institutes/departments-divisions/symptom-research/symptom-assessment-tools/brief-pain-inventory.html)
- [Brief Pain Inventory sur ePROVIDE](https://eprovide.mapi-trust.org/instruments/brief-pain-inventory)
- [PHQ screeners](https://www.phqscreeners.com/select-screener)
- [Traduction et validation linguistique de 24 banques PROMIS en français](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11286690/)

## Mise à jour

Ce document doit changer dès qu'une démarche de droits est faite, qu'un questionnaire est envisagé ou qu'un item inspiré d'un instrument est ajouté. Pour une question ou une correction : [maxime@open-freax.fr](mailto:maxime@open-freax.fr), ou le [formulaire « Retour clinique »](https://github.com/maxauvy/OUCH/issues/new?template=retour-clinique.yml).
