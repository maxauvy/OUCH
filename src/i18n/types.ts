// The shape every locale file in ./locales must implement. Adding a string
// here means adding it to *every* locale file — TypeScript will point at
// each one that's missing it.

export interface FactorText {
  label: string
  helper: string
}

/** A tuple type keeps `weekdaysFull`/`weekdaysShort` exactly 7 entries long. */
export type Week<T> = [T, T, T, T, T, T, T]

export interface Translations {
  meta: {
    appName: string
    htmlTitle: string
    metaDescription: string
  }

  tabs: {
    today: string
    journal: string
    trends: string
    settings: string
  }

  welcome: {
    title: string
    start: string
  }

  about: {
    title: string
    intro: string
    points: Record<'track' | 'share' | 'kids' | 'private', { title: string; body: string }>
    note: string
  }

  today: {
    share: string
  }

  journal: {
    title: string
    empty: string
    share: string
    deleteConfirm: string
    delete: string
  }

  trends: {
    title: string
    range7: string
    range30: string
    range90: string
    rangeAll: string
    noData: string
    notEnoughData: string
    daysTrackedOne: string
    daysTrackedOther: string
    avgPain: string
    painEvolution: string
    weekdayInsight: string
    whatAffectsPain: string
    averagesObserved: string
    bucketLow: string
    bucketMid: string
    bucketHigh: string
    insightHigher: string
    insightLower: string
    pointSingular: string
    pointPlural: string
    temperatureLabel: string
    whatHelps: string
    bucketWith: string
    bucketWithout: string
    insightTagHigher: string
    insightTagLower: string
  }

  /** Sunday-first, matching Date#getDay(). */
  weekdaysFull: Week<string>

  factors: {
    fatigue: FactorText
    sleep: FactorText
    stress: FactorText
    brainFog: FactorText
    mood: FactorText
    activity: FactorText
    weather: FactorText
    medications: FactorText
    positiveActions: FactorText
    painLocations: FactorText
    cycle: FactorText
    notes: FactorText
  }

  bodyZones: {
    head: string
    neck: string
    shoulders: string
    arms: string
    hands: string
    upperBack: string
    lowerBack: string
    chest: string
    stomach: string
    hips: string
    legs: string
    feet: string
    generalized: string
  }

  weatherConditions: {
    ensoleille: string
    variable: string
    nuageux: string
    pluvieux: string
    orageux: string
    neige: string
  }

  painWeatherLevels: Record<1 | 2 | 3 | 4 | 5, string>

  /** Four words for a 0–10 factor score, low to high (e.g. brainFog: ['Low', 'Moderate', 'High', 'Very high']). */
  factorIntensity: {
    fatigue: [string, string, string, string]
    stress: [string, string, string, string]
    brainFog: [string, string, string, string]
  }

  entryForm: {
    saving: string
    saved: string
    weatherOfDay: string
    pain: string
    painHelper: string
    painEndNone: string
    painEndExtreme: string
    whereHurts: string
    generalFeeling: string
    fatigueEndFine: string
    fatigueEndExhausted: string
    sleepQuality: string
    sleepEndBad: string
    sleepEndExcellent: string
    sleepDuration: string
    stressEndCalm: string
    stressEndTense: string
    brainFogEndClear: string
    brainFogEndConfused: string
    moodEndHard: string
    moodEndGreat: string
    activityEndRest: string
    activityEndIntense: string
    medicationsTaken: string
    addMedicationPlaceholder: string
    positiveActionsTitle: string
    addPositiveActionPlaceholder: string
    positiveActionsSuggestions: string[]
    periodToday: string
    periodHelper: string
    notes: string
    notesPlaceholder: string
  }

  weatherField: {
    label: string
    autoFill: string
    fetching: string
    unknownError: string
    temperatureLabel: string
    temperaturePlaceholder: string
  }

  calendar: {
    prevMonth: string
    nextMonth: string
    weekdaysShort: Week<string>
  }

  backup: {
    exportTitle: string
    exportHelper: string
    passwordPlaceholder: string
    exportButton: string
    exporting: string
    exportPasswordTooShort: string
    exportSuccess: string
    exportError: string
    importTitle: string
    importHelper: string
    importMissingPassword: string
    importSuccessOne: string
    importSuccessOther: string
    importGenericError: string
    invalidFile: string
    invalidBackup: string
  }

  shareSheet: {
    title: string
    close: string
    messageLabel: string
    messagePlaceholder: string
    download: string
    send: string
    sending: string
    footer: string
    nativeShareTitle: string
    cardNotFound: string
  }

  weatherCard: {
    weatherOfName: string
    weatherOfDay: string
    painLabel: string
    painCaption: string
    outside: string
  }

  settings: {
    title: string
    firstNameTitle: string
    firstNameHelper: string
    firstNamePlaceholder: string
    factorsTitle: string
    factorsHelper: string
    cycleTracking: string
    cycleTrackingHelper: string
    weatherLocationTitle: string
    weatherLocationSet: string
    weatherLocationUnset: string
    locating: string
    updateLocation: string
    reminderTitle: string
    reminderHelper: string
    reminderNote: string
    appearanceTitle: string
    themeAuto: string
    themeLight: string
    themeDark: string
    languageTitle: string
    languageHelper: string
    parentGenderTitle: string
    parentGenderHelper: string
    parentGenderMaman: string
    parentGenderPapa: string
    childIllnessTitle: string
    childIllnessHelper: string
    backupTitle: string
    privacyNote: string
    childViewEntryTitle: string
    childViewEntryHelper: string
    childViewEntryButton: string
  }

  childView: {
    pageTitle: string
    back: string
    ageToggleLabel: string
    ageYoung: string
    ageOlder: string
    howToHelp: string
    aboutIllness: string
    privacyNote: string
    noEntry: string
  }

  reminder: {
    title: string
    body: string
  }

  errors: {
    geolocationUnavailable: string
    weatherFetchFailed: string
  }

  footer: {
    credit: string
    sourceCode: string
  }
}
