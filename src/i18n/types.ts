// The shape every locale file in ./locales must implement. Adding a string
// here means adding it to *every* locale file — TypeScript will point at
// each one that's missing it.

import type { ChildTone } from '../lib/childView'

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
    kids: string
    settings: string
  }

  welcome: {
    title: string
  }

  setup: {
    /** "Step {{n}} of {{total}}" */
    progress: string
    skipAll: string
    begin: string
    next: string
    back: string
    finish: string
    finishRerun: string
    welcomeIntro: string
    illnessTitle: string
    illnessIntro: string
    illnessOther: string
    checkIllness: string
    checkNoIllness: string
    profileTitle: string
    profileIntro: string
    profileHelper: string
    trackingTitle: string
    trackingIntro: string
    changeLater: string
    medicationsTitle: string
    medicationsIntro: string
    medicationsLater: string
    reminderTitle: string
    reminderIntro: string
    reminderTime: string
    reminderDenied: string
    doneTitle: string
    doneIntro: string
    checkName: string
    checkNoName: string
    checkParent: string
    checkFactors: string
    checkMedications: string
    checkNoMedications: string
    checkReminder: string
    checkNoReminder: string
    reportTitle: string
    reportBody: string
    backupTitle: string
    backupBody: string
    /** Settings: button that reopens the setup */
    rerunTitle: string
    rerunHelper: string
    rerunButton: string
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
    dailyRating: string
    weeklyMean: string
    weeklyMeanLegend: string
    notLogged: string
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
    medicationsTitle: string
    medicationsCaption: string
    daysOne: string
    daysOther: string
    dosesOne: string
    dosesOther: string
    takenScheduled: string
    takenAsNeeded: string
    takenAsNeededWithDoses: string
    reliefShare: string
    sideEffects: string
    posologyChange: string
    posologyChangeMarker: string
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
    painWeatherOfDay: string
    /** Shown in the weather banner before any pain level is set. */
    painWeatherEmpty: string
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
    removeTag: string
    addTag: string
    positiveActionsTitle: string
    addPositiveActionPlaceholder: string
    positiveActionsSuggestions: string[]
    periodToday: string
    periodHelper: string
    notes: string
    notesPlaceholder: string
    measuresTitle: string
    loggedAt: string
    vsAverageBelow: string
    vsAverageAbove: string
    vsAverageSame: string
  }

  medications: {
    // Daily form
    taken: string
    missedHint: string
    fewerIntakes: string
    moreIntakes: string
    doseCount: string
    reliefFor: string
    sideEffectsFor: string
    editItem: string
    reliefQuestion: string
    relief: [string, string, string, string]
    reportSideEffect: string
    sideEffectsTitle: string
    sideEffectsPlaceholder: string
    sideEffectsSuggestions: string[]
    unspecifiedHint: string
    // Registry (Settings)
    title: string
    helper: string
    empty: string
    add: string
    name: string
    namePlaceholder: string
    nameTaken: string
    regimenTitle: string
    regimens: Record<'scheduled' | 'asNeeded' | 'unspecified', string>
    regimenHelpers: Record<'scheduled' | 'asNeeded' | 'unspecified', string>
    dose: string
    doseAmountPlaceholder: string
    unit: string
    /** Unit picker labels */
    units: Record<'mg' | 'g' | 'µg' | 'ml' | 'drop' | 'puff' | 'patch', string>
    /** Units after an amount: singular, plural */
    unitWords: Record<'mg' | 'g' | 'µg' | 'ml' | 'drop' | 'puff' | 'patch', [string, string]>
    perDayScheduled: string
    perDayAsNeeded: string
    reason: string
    reasonPlaceholder: string
    since: string
    edit: string
    save: string
    cancel: string
    changePosology: string
    changeFrom: string
    stop: string
    stopDate: string
    stopReasonTitle: string
    stopReasons: Record<'ineffective' | 'sideEffects' | 'improved' | 'other', string>
    resume: string
    delete: string
    deleteConfirm: string
    stoppedSection: string
    stoppedOn: string
    perDayShort: string
    maxPerDayShort: string
    history: string
  }

  /** Export page (in the app's language). */
  doctorReport: {
    entryTitle: string
    entryHelper: string
    title: string
    back: string
    recipientTitle: string
    recipients: Record<'gp' | 'painClinic', { label: string; helper: string }>
    consultationTitle: string
    consultationHelper: string
    periodSummary: string
    fewDaysWarning: string
    noData: string
    languageTitle: string
    patientTitle: string
    patientName: string
    patientNamePlaceholder: string
    birthDate: string
    optional: string
    privacyNote: string
    agendaTitle: string
    agendaHelper: string
    agendaPlaceholder: string
    optionsTitle: string
    includeNotes: string
    includeCycle: string
    exportPdf: string
    exporting: string
    exportHelper: string
    exportFailed: string
    fileName: string
    print: string
    preview: string
    previewLabel: string
  }

  /** The report itself (in the language chosen for the report). */
  report: {
    titleGp: string
    titlePainClinic: string
    subtitle: string
    runningGp: string
    runningPainClinic: string
    continued: string
    patient: string
    bornOn: string
    /** Illness(es) as declared by the patient in the app */
    declaredIllness: string
    declaredIllnesses: string
    period: string
    periodDays: string
    comparedTo: string
    logged: string
    loggedPrev: string
    caveat: string
    footer: string
    page: string
    keyPoints: string
    painChange: string
    painChangeAbove: string
    painChangeBelow: string
    painOnly: string
    severeDays: string
    severeDaysNoPrev: string
    flaresNone: string
    flares: string
    flareRange: string
    doseChange: string
    medStarted: string
    medStopped: string
    sideEffectReported: string
    sideEffectReportedOnce: string
    missedDoses: string
    rescueDays: string
    rescueItem: string
    rescueItemNoCount: string
    tileMeanPain: string
    tileSevere: string
    tileMild: string
    tileSleep: string
    tileMedian: string
    tileVariability: string
    dayMix: string
    mixMild: string
    mixModerate: string
    mixSevere: string
    before: string
    range: string
    sleepQuality: string
    hours: string
    painChart: string
    chartHint: string
    previousPeriod: string
    sinceConsultation: string
    severeThreshold: string
    treatments: string
    treatmentsSince: string
    noTreatments: string
    colTreatment: string
    colPosology: string
    colUse: string
    colRelief: string
    colSideEffects: string
    regimens: Record<'scheduled' | 'asNeeded' | 'unspecified', string>
    takenDays: string
    adherence: string
    prnUse: string
    usedDays: string
    maxUsed: string
    aboveMax: string
    withoutCount: string
    notAsked: string
    reliefModStrong: string
    ofIntakes: string
    none: string
    perIntake: string
    maxPrescribed: string
    until: string
    notDescribed: string
    reliefLevels: [string, string, string, string]
    reliefLegend: string
    symptoms: string
    colSymptom: string
    colBefore: string
    colPeriod: string
    colDiff: string
    colTrend: string
    trendStable: string
    trendBetter: string
    trendWorse: string
    symptomsNote: string
    symptomLabels: Record<'fatigueLevel' | 'sleepQuality' | 'sleepHours' | 'brainFog' | 'moodLevel' | 'stressLevel' | 'activityLevel', [string, string]>
    zones: string
    zonesNote: string
    zonesWpi: string
    agenda: string
    notes: string
    notesHintGp: string
    notesHintAll: string
    method: string
    methodGp: string
    methodCollect: string
    methodCalc: string
    methodLimits: string
    references: string
    completeness: string
    intensity: string
    distribution: string
    distPrev: string
    distCur: string
    colMeanSd: string
    colMedianIqr: string
    colMinMax: string
    colFlares: string
    categoriesNote: string
    evolution: string
    timelineScheduled: string
    timelineAsNeeded: string
    weekly: string
    colWeek: string
    colDays: string
    colMeanPain: string
    nonDrug: string
    nonDrugHint: string
    calendar: string
    notLogged: string
    consultation: string
    weekdayInitials: [string, string, string, string, string, string, string]
    associations: string
    colFactor: string
    colStrength: string
    strengths: [string, string, string, string]
    factorLabels: Record<'sleepQuality' | 'sleepHours' | 'stress' | 'activityPrev' | 'positiveActions' | 'pressure' | 'fatigue', string>
    factorNotes: Record<'positiveActions' | 'pressure' | 'fatigue', string>
    contexts: string
    yes: string
    otherwise: string
    contextLabels: Record<'afterActive' | 'actions' | 'period', string>
    associationsNote: string
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
    legend: string
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
    importButton: string
    importing: string
    importSuccessOne: string
    importSuccessOther: string
    importGenericError: string
    invalidFile: string
    invalidBackup: string
    fileTooLarge: string
    lastBackup: string
    neverBackedUp: string
  }

  backupReminder: {
    title: string
    never: string
    stale: string
    backup: string
    later: string
  }

  storage: {
    title: string
    protected: string
    notProtected: string
    unsupported: string
    refused: string
    request: string
  }

  crash: {
    title: string
    body: string
    reload: string
    erase: string
    eraseConfirm: string
  }

  shareSheet: {
    title: string
    close: string
    /** Accessible summary of the card preview. */
    previewLabel: string
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
    /** Under the level name on the health card, e.g. "Level 2 of 5". */
    levelOf: string
    /** Text sent along with the shared image, for people who can't see it. */
    shareSummary: string
    /** Pain in words: none, mild, moderate, severe, very severe. */
    painWords: [string, string, string, string, string]
    /** Mood in words, low to high (a high mood score is a good day). */
    moodWords: [string, string, string, string]
    /** Pain compared with the previous days. */
    trendLower: string
    trendSame: string
    trendHigher: string
    weatherOfName: string
    weatherOfDay: string
    /** Ends of the 5-step weather rule, worded as pain. */
    scaleLow: string
    scaleHigh: string
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
    /** Accessible name of the light/dark choice (no visible title). */
    themeTitle: string
    themeAuto: string
    themeLight: string
    themeDark: string
    languageTitle: string
    languageHelper: string
    parentGenderTitle: string
    parentGenderHelper: string
    parentGenderMaman: string
    parentGenderPapa: string
    illnessesTitle: string
    illnessesHelper: string
    backupTitle: string
    privacyNote: string
  }

  childView: {
    pageTitle: string
    ageToggleLabel: string
    /** Accessible name of the 5-step weather scale, e.g. "Sunny, level 1 of 5". */
    scaleLevel: string
    scaleLow: string
    scaleHigh: string
    ages: Record<ChildTone, string>
    howToHelp: string
    aboutIllness: string
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
    updateAvailable: string
    reload: string
  }
}
