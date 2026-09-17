import type { Translations } from '../types'

const en: Translations = {
  meta: {
    appName: 'OUCH',
    htmlTitle: 'OUCH — Pain journal',
    metaDescription:
      'A simple pain journal: track your symptoms, understand what influences them, share your daily weather.',
  },

  tabs: {
    today: 'Today',
    journal: 'Journal',
    trends: 'Trends',
    settings: 'Settings',
  },

  welcome: {
    title: 'Welcome to OUCH',
    body: "Log your pain and what surrounds it in a few seconds a day, spot what influences it, and share your daily weather with your loved ones whenever you want. Everything stays on this device.",
    start: 'Get started',
  },

  today: {
    share: "Share today's weather",
  },

  journal: {
    title: 'Journal',
    empty: 'No entries yet. Your first daily weather will appear here.',
    share: 'Share this day',
    deleteConfirm: 'Delete this entry?',
    delete: 'Delete',
  },

  trends: {
    title: 'Trends',
    range7: '7 d',
    range30: '30 d',
    range90: '90 d',
    rangeAll: 'All',
    noData: 'No data yet for this period.',
    notEnoughData: 'A few more days of tracking and your curve will appear here.',
    daysTrackedOne: '{{n}} day tracked',
    daysTrackedOther: '{{n}} days tracked',
    avgPain: 'average pain',
    painEvolution: 'Pain over time',
    weekdayInsight: '🙂 Your days are on average better on {{best}}, and tougher on {{worst}}.',
    whatAffectsPain: 'What seems to affect your pain',
    averagesObserved: 'Averages observed over the period — an association, not a proof.',
    bucketLow: 'Low',
    bucketMid: 'Medium',
    bucketHigh: 'High',
    insightHigher: 'When {{label}} is high, your average pain is {{diff}} {{points}} higher.',
    insightLower: 'When {{label}} is high, your average pain is {{diff}} {{points}} lower.',
    pointSingular: 'point',
    pointPlural: 'points',
  },

  weekdaysFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],

  factors: {
    fatigue: { label: 'Fatigue', helper: 'Overall fatigue level' },
    sleep: { label: 'Sleep', helper: 'Quality and duration of the previous night' },
    stress: { label: 'Stress', helper: 'Mental load / tension felt' },
    brainFog: { label: 'Brain fog', helper: 'Concentration, memory, clarity of mind' },
    mood: { label: 'Mood', helper: 'Overall emotional state' },
    activity: { label: 'Physical activity', helper: "Today's effort level" },
    weather: { label: 'Outdoor weather', helper: 'Conditions and atmospheric pressure' },
    medications: { label: 'Medications', helper: 'Treatments taken during the day' },
    painLocations: { label: 'Pain location', helper: 'Areas of the body affected' },
    cycle: { label: 'Menstrual cycle', helper: 'Cycle tracking, if relevant' },
    notes: { label: 'Free notes', helper: "Anything that doesn't fit the boxes" },
  },

  bodyZones: {
    head: 'Head',
    neck: 'Neck',
    shoulders: 'Shoulders',
    arms: 'Arms',
    hands: 'Hands',
    upperBack: 'Upper back',
    lowerBack: 'Lower back',
    chest: 'Chest',
    stomach: 'Stomach',
    hips: 'Hips',
    legs: 'Legs',
    feet: 'Feet',
    generalized: 'Widespread',
  },

  weatherConditions: {
    ensoleille: 'Sunny',
    variable: 'Variable',
    nuageux: 'Cloudy',
    pluvieux: 'Rainy',
    orageux: 'Stormy',
    neige: 'Snowy',
  },

  painWeatherLevels: {
    1: 'Clear sky',
    2: 'A few clouds',
    3: 'Cloudy',
    4: 'Rain',
    5: 'Storm',
  },

  entryForm: {
    saving: 'Saving…',
    saved: 'Saved',
    weatherOfDay: "Today's weather",
    pain: 'Pain',
    painHelper: "Overall pain intensity today",
    painEndNone: 'None',
    painEndExtreme: 'Unbearable',
    whereHurts: 'Where does it hurt?',
    generalFeeling: 'General feeling',
    fatigueEndFine: 'Fine',
    fatigueEndExhausted: 'Exhausted',
    sleepQuality: 'Sleep quality',
    sleepEndBad: 'Very poor',
    sleepEndExcellent: 'Excellent',
    sleepDuration: 'Sleep duration',
    stressEndCalm: 'Relaxed',
    stressEndTense: 'Very tense',
    brainFogEndClear: 'Clear mind',
    brainFogEndConfused: 'Very confused',
    moodEndHard: 'Difficult',
    moodEndGreat: 'Very good',
    activityEndRest: 'Total rest',
    activityEndIntense: 'Intense',
    medicationsTaken: 'Medications taken',
    addMedicationPlaceholder: 'Add a medication…',
    periodToday: 'Period today',
    periodHelper: 'To cross-reference pain and cycle',
    notes: 'Notes',
    notesPlaceholder: 'A particular event, an observation…',
  },

  weatherField: {
    label: 'Outdoor weather',
    autoFill: '📍 Fill in automatically',
    fetching: 'Fetching…',
    unknownError: 'Unknown error',
  },

  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    weekdaysShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  },

  backup: {
    exportTitle: 'Export a backup',
    exportHelper:
      'An encrypted file with a password you choose. Keep it wherever you like (personal cloud, an email to yourself) to get your data back on another device.',
    passwordPlaceholder: 'Backup password',
    exportButton: 'Download backup',
    exporting: 'Exporting…',
    exportPasswordTooShort: 'Choose a password of at least 6 characters.',
    exportSuccess:
      'Backup downloaded. Keep the password somewhere safe: without it, this file is unreadable.',
    exportError: 'Something went wrong during the export.',
    importTitle: 'Import a backup',
    importHelper:
      'Imported days are added to those already present (in case of a conflict, the backup wins).',
    importMissingPassword: 'Enter the backup password.',
    importSuccessOne: '{{n}} day imported.',
    importSuccessOther: '{{n}} days imported.',
    importGenericError: 'Import failed.',
    invalidFile: "This file doesn't look like an OUCH backup.",
    invalidBackup: 'Invalid backup.',
  },

  shareSheet: {
    title: "Share my weather",
    close: 'Close',
    messageLabel: 'A note for your loved ones (optional)',
    messagePlaceholder: 'E.g.: quiet day, thanks for being there',
    download: 'Download',
    send: 'Send',
    sending: '…',
    footer: "Nothing is sent automatically: you choose who to send it to and when.",
    nativeShareTitle: "Today's weather",
    cardNotFound: 'Card not found',
  },

  weatherCard: {
    weatherOfName: "{{name}}'s weather",
    weatherOfDay: "Today's weather",
    painLabel: 'Pain:',
    outside: 'Outside',
  },

  settings: {
    title: 'Settings',
    firstNameTitle: 'Your first name',
    firstNameHelper: 'Used on the weather card you share ("{{name}}\'s weather")',
    firstNamePlaceholder: 'Your first name',
    factorsTitle: 'Tracked factors',
    factorsHelper: "Choose what appears in your daily entry. You can change your mind anytime.",
    cycleTracking: 'Menstrual cycle tracking',
    cycleTrackingHelper: 'Adds a "period" toggle to the daily entry',
    weatherLocationTitle: 'Weather location',
    weatherLocationSet: 'Saved location: {{label}}. Used to fill in the weather automatically.',
    weatherLocationUnset:
      'No location saved yet — you can always set it from the button in the daily entry.',
    locating: 'Locating…',
    updateLocation: 'Update my location',
    reminderTitle: 'Daily reminder',
    reminderHelper: "A notification if you haven't filled in your weather yet",
    reminderNote:
      "This reminder works while the app is open or recently used. Without a server (by choice, to stay 100% local), it can't trigger while the app is fully closed.",
    appearanceTitle: 'Appearance',
    themeAuto: 'Auto',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageTitle: 'Language',
    languageHelper: "Choose the app's language.",
    parentGenderTitle: 'How to refer to you with your child',
    parentGenderHelper: 'Used in the sentences on the "Explain to my child" page.',
    parentGenderMaman: 'Mom',
    parentGenderPapa: 'Dad',
    childIllnessTitle: 'Illness to explain',
    childIllnessHelper: 'The illness described on the "Explain to my child" page.',
    backupTitle: 'Backup & sync',
    privacyNote:
      "OUCH keeps all your data on this device, in local storage. Nothing is sent to a server — sharing your weather and making backups is always something you choose to do.",
    childViewEntryTitle: 'Explain to my child',
    childViewEntryHelper: 'A simple page to help them understand',
    childViewEntryButton: 'Open',
  },

  childView: {
    pageTitle: 'Explain to my child',
    back: 'Back',
    ageToggleLabel: "CHILD'S AGE",
    ageYoung: '4–7 years',
    ageOlder: '8–12 years',
    howToHelp: 'How you can help',
    aboutIllness: 'What is {{illness}}?',
    privacyNote: 'This page stays private. It will only be shown if an adult opens it with you.',
    noEntry: "No day logged yet — come back here once today's weather has been noted.",
  },

  reminder: {
    title: "Today's weather is waiting for you",
    body: 'Two minutes are enough to note how you feel today.',
  },

  errors: {
    geolocationUnavailable: "Geolocation isn't available on this device.",
    weatherFetchFailed: 'Could not fetch the weather right now.',
  },

  footer: {
    credit: 'Made by Maxime Auvy',
    sourceCode: 'Source code',
  },
}

export default en
