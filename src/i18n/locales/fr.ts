import type { Translations } from '../types'

// French — the app's original language. `Translations` (../types.ts) is the
// contract: every other locale file must fill in exactly these keys.
const fr: Translations = {
  meta: {
    appName: 'OUCH',
    htmlTitle: 'OUCH — Journal de douleur',
    metaDescription:
      'Un journal de douleur simple : suivez vos symptômes, comprenez ce qui les influence, partagez votre météo du jour.',
  },

  tabs: {
    today: 'Aujourd’hui',
    journal: 'Journal',
    trends: 'Tendances',
    settings: 'Réglages',
  },

  welcome: {
    title: 'Bienvenue sur OUCH',
    body: "Note ta douleur et ce qui l'entoure en quelques secondes par jour, repère ce qui l'influence, et partage ta météo du jour avec tes proches quand tu le souhaites. Tout reste sur cet appareil.",
    start: 'Commencer',
  },

  today: {
    share: 'Partager ma météo du jour',
  },

  journal: {
    title: 'Journal',
    empty: "Aucune entrée pour l'instant. Ta première météo du jour apparaîtra ici.",
    share: 'Partager ce jour',
    deleteConfirm: "Supprimer l'entrée de ce jour ?",
    delete: 'Supprimer',
  },

  trends: {
    title: 'Tendances',
    range7: '7 j',
    range30: '30 j',
    range90: '90 j',
    rangeAll: 'Tout',
    noData: 'Pas encore de données sur cette période.',
    notEnoughData: 'Encore quelques jours de suivi et ta courbe apparaîtra ici.',
    daysTrackedOne: '{{n}} jour suivi',
    daysTrackedOther: '{{n}} jours suivis',
    avgPain: 'douleur moyenne',
    painEvolution: 'Évolution de la douleur',
    weekdayInsight:
      '🙂 Tes journées sont en moyenne meilleures le {{best}}, et plus difficiles le {{worst}}.',
    whatAffectsPain: 'Ce qui semble jouer sur ta douleur',
    averagesObserved: 'Moyennes observées sur la période — une association, pas une preuve.',
    bucketLow: 'Faible',
    bucketMid: 'Moyen',
    bucketHigh: 'Élevé',
    insightHigher: 'Quand {{label}} est élevé, ta douleur moyenne est {{diff}} {{points}} plus haute.',
    insightLower: 'Quand {{label}} est élevé, ta douleur moyenne est {{diff}} {{points}} plus basse.',
    pointSingular: 'point',
    pointPlural: 'points',
    temperatureLabel: 'Température extérieure',
  },

  weekdaysFull: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],

  factors: {
    fatigue: { label: 'Fatigue', helper: 'Niveau de fatigue générale' },
    sleep: { label: 'Sommeil', helper: 'Qualité et durée de la nuit précédente' },
    stress: { label: 'Stress', helper: 'Charge mentale / tension ressentie' },
    brainFog: { label: 'Brouillard mental', helper: 'Concentration, mémoire, clarté d’esprit' },
    mood: { label: 'Humeur', helper: 'Ressenti émotionnel global' },
    activity: { label: 'Activité physique', helper: 'Niveau d’effort du jour' },
    weather: { label: 'Météo extérieure', helper: 'Conditions et pression atmosphérique' },
    medications: { label: 'Médicaments', helper: 'Traitements pris dans la journée' },
    painLocations: { label: 'Localisation de la douleur', helper: 'Zones du corps touchées' },
    cycle: { label: 'Cycle menstruel', helper: 'Suivi du cycle, si pertinent' },
    notes: { label: 'Notes libres', helper: 'Tout ce qui ne rentre pas dans les cases' },
  },

  bodyZones: {
    head: 'Tête',
    neck: 'Cou',
    shoulders: 'Épaules',
    arms: 'Bras',
    hands: 'Mains',
    upperBack: 'Dos haut',
    lowerBack: 'Dos bas',
    chest: 'Poitrine',
    stomach: 'Ventre',
    hips: 'Hanches',
    legs: 'Jambes',
    feet: 'Pieds',
    generalized: 'Généralisée',
  },

  weatherConditions: {
    ensoleille: 'Ensoleillé',
    variable: 'Variable',
    nuageux: 'Nuageux',
    pluvieux: 'Pluvieux',
    orageux: 'Orageux',
    neige: 'Neige',
  },

  painWeatherLevels: {
    1: 'Ciel dégagé',
    2: 'Quelques nuages',
    3: 'Nuageux',
    4: 'Pluie',
    5: 'Orage',
  },

  entryForm: {
    saving: 'Enregistrement…',
    saved: 'Enregistré',
    weatherOfDay: 'Météo du jour',
    pain: 'Douleur',
    painHelper: "Intensité globale de la douleur aujourd'hui",
    painEndNone: 'Aucune',
    painEndExtreme: 'Insupportable',
    whereHurts: 'Où as-tu mal ?',
    generalFeeling: 'Ressenti général',
    fatigueEndFine: 'En forme',
    fatigueEndExhausted: 'Épuisée',
    sleepQuality: 'Qualité du sommeil',
    sleepEndBad: 'Très mauvaise',
    sleepEndExcellent: 'Excellente',
    sleepDuration: 'Durée de sommeil',
    stressEndCalm: 'Détendue',
    stressEndTense: 'Très tendue',
    brainFogEndClear: 'Esprit clair',
    brainFogEndConfused: 'Très confus',
    moodEndHard: 'Difficile',
    moodEndGreat: 'Très bonne',
    activityEndRest: 'Repos total',
    activityEndIntense: 'Intense',
    medicationsTaken: 'Médicaments pris',
    addMedicationPlaceholder: 'Ajouter un médicament…',
    periodToday: "Règles aujourd'hui",
    periodHelper: 'Pour croiser douleur et cycle',
    notes: 'Notes',
    notesPlaceholder: 'Un événement particulier, une observation…',
  },

  weatherField: {
    label: 'Météo extérieure',
    autoFill: '📍 Remplir automatiquement',
    fetching: 'Récupération…',
    unknownError: 'Erreur inconnue',
    temperatureLabel: 'Température (°C)',
    temperaturePlaceholder: 'ex. 18',
  },

  calendar: {
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    weekdaysShort: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  },

  backup: {
    exportTitle: 'Exporter une sauvegarde',
    exportHelper:
      'Un fichier chiffré avec un mot de passe que tu choisis. Garde-le où tu veux (cloud perso, e-mail à toi-même) pour retrouver tes données sur un autre appareil.',
    passwordPlaceholder: 'Mot de passe de la sauvegarde',
    exportButton: 'Télécharger la sauvegarde',
    exporting: 'Export…',
    exportPasswordTooShort: 'Choisis un mot de passe d’au moins 6 caractères.',
    exportSuccess:
      'Sauvegarde téléchargée. Garde le mot de passe en lieu sûr : sans lui, ce fichier est illisible.',
    exportError: 'Une erreur est survenue pendant l’export.',
    importTitle: 'Importer une sauvegarde',
    importHelper:
      "Les jours importés s'ajoutent à ceux déjà présents (en cas de doublon, la sauvegarde l'emporte).",
    importButton: 'Importer',
    importing: 'Import…',
    importSuccessOne: '{{n}} jour importé.',
    importSuccessOther: '{{n}} jours importés.',
    importGenericError: 'Import impossible.',
    invalidFile: 'Ce fichier ne ressemble pas à une sauvegarde OUCH.',
    invalidBackup: 'Sauvegarde invalide.',
  },

  shareSheet: {
    title: 'Partager ma météo',
    close: 'Fermer',
    messageLabel: 'Un mot pour tes proches (optionnel)',
    messagePlaceholder: "Ex : journée calme, merci d'être là",
    download: 'Télécharger',
    send: 'Envoyer',
    sending: '…',
    footer: "Rien n'est envoyé automatiquement : tu choisis toi-même à qui et quand l'envoyer.",
    nativeShareTitle: 'Météo du jour',
    cardNotFound: 'Carte introuvable',
  },

  weatherCard: {
    weatherOfName: 'Météo de {{name}}',
    weatherOfDay: 'Météo du jour',
    painLabel: 'Douleur :',
    outside: 'Dehors',
  },

  settings: {
    title: 'Réglages',
    firstNameTitle: 'Ton prénom',
    firstNameHelper: 'Utilisé sur la carte météo que tu partages ("Météo de {{name}}")',
    firstNamePlaceholder: 'Ton prénom',
    factorsTitle: 'Facteurs suivis',
    factorsHelper: "Choisis ce qui apparaît dans ta saisie quotidienne. Tu peux changer d'avis à tout moment.",
    cycleTracking: 'Suivi du cycle menstruel',
    cycleTrackingHelper: 'Ajoute une case "règles" à la saisie du jour',
    weatherLocationTitle: 'Localisation météo',
    weatherLocationSet: 'Position enregistrée : {{label}}. Utilisée pour remplir la météo automatiquement.',
    weatherLocationUnset:
      "Pas encore de position enregistrée — tu peux toujours la définir depuis le bouton dans la saisie du jour.",
    locating: 'Localisation…',
    updateLocation: 'Mettre à jour ma position',
    reminderTitle: 'Rappel quotidien',
    reminderHelper: "Une notification si tu n'as pas encore rempli ta météo",
    reminderNote:
      "Ce rappel fonctionne quand l'app est ouverte ou récemment utilisée. Sans serveur (par choix, pour rester 100% local), il ne peut pas se déclencher app totalement fermée.",
    appearanceTitle: 'Apparence',
    themeAuto: 'Auto',
    themeLight: 'Clair',
    themeDark: 'Sombre',
    languageTitle: 'Langue',
    languageHelper: "Choisis la langue de l'application.",
    parentGenderTitle: 'Comment te désigner auprès de ton enfant',
    parentGenderHelper: 'Utilisé dans les phrases de la page « Expliquer à mon enfant ».',
    parentGenderMaman: 'Maman',
    parentGenderPapa: 'Papa',
    childIllnessTitle: 'Maladie à expliquer',
    childIllnessHelper: 'La maladie décrite sur la page « Expliquer à mon enfant ».',
    backupTitle: 'Sauvegarde & synchro',
    privacyNote:
      "OUCH garde toutes tes données sur cet appareil, dans son stockage local. Rien n'est envoyé à un serveur — le partage de ta météo et les sauvegardes sont toujours une action volontaire de ta part.",
    childViewEntryTitle: 'Expliquer à mon enfant',
    childViewEntryHelper: "Une page simple pour l'aider à comprendre",
    childViewEntryButton: 'Ouvrir',
  },

  childView: {
    pageTitle: 'Expliquer à mon enfant',
    back: 'Retour',
    ageToggleLabel: "ÂGE DE L'ENFANT",
    ageYoung: '4–7 ans',
    ageOlder: '8–12 ans',
    howToHelp: 'Comment tu peux aider',
    aboutIllness: '{{illness}}, c’est quoi ?',
    privacyNote: "Cette page reste privée. Elle ne sera montrée que si un adulte l'ouvre avec toi.",
    noEntry: "Pas encore de journée enregistrée — reviens ici une fois qu'une météo du jour aura été notée.",
  },

  reminder: {
    title: 'Ta météo du jour t’attend',
    body: 'Deux minutes suffisent pour noter comment tu te sens aujourd’hui.',
  },

  errors: {
    geolocationUnavailable: "La géolocalisation n'est pas disponible sur cet appareil.",
    weatherFetchFailed: 'Impossible de récupérer la météo pour le moment.',
  },

  footer: {
    credit: 'Créé par Maxime Auvy',
    sourceCode: 'Code source',
  },
}

export default fr
