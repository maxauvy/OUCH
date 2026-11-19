// OUCH Duo's words, in French and English, picked from the phone's language.
// Same voice as OUCH: tutoiement, plain and calm, nothing alarming.

const fr = {
  lang: 'fr',
  appName: 'OUCH Duo',
  weatherOf: (name?: string) => (name ? `La météo de ${name}` : 'La météo du jour'),
  imageAlt: (name?: string) => (name ? `Météo santé du jour de ${name}` : 'Météo santé du jour'),
  loading: 'Un instant…',
  lookedAt: (time: string) => `Regardée à ${time}`,
  offline: (date: string) => `Hors connexion : image reçue le ${date}`,
  offlineNothing: 'Pas de connexion pour l’instant. La météo s’affichera dès que le téléphone sera en ligne.',
  refresh: 'Actualiser',
  otherCode: 'Scanner un autre code',
  goneTitle: 'Cette météo n’est plus partagée',
  goneText: (name?: string) =>
    `${name ?? 'Ton proche'} a peut-être arrêté le partage, ou en a commencé un nouveau. S’il y a un nouveau code, tu pourras le scanner ici.`,
  newCodeTitle: 'Ce code ne correspond plus',
  newCodeText: (name?: string) =>
    `${name ?? 'Ton proche'} a sans doute fait un nouveau code en relançant le partage. Quand tu l’as, scanne-le ici.`,
  tryAgain: 'Réessayer',
  scanNew: 'Scanner un nouveau code',
  welcomeTitle: 'Scanne le code de ton proche',
  welcomeText:
    'Ton proche tient son journal de douleur dans OUCH. Le code se trouve dans OUCH, sous « Partager ma météo ». Tu verras ici sa météo du jour, chaque fois que tu ouvres l’app.',
  scan: 'Scanner le code',
  paste: 'Coller un lien à la place',
  scanHint: 'Vise le code affiché dans OUCH',
  cameraRefused: 'L’appareil photo n’est pas disponible. Tu peux coller le lien que ton proche t’a envoyé.',
  cancel: 'Annuler',
  pasteLabel: 'Le lien reçu',
  pastePlaceholder: 'https://…',
  pasteOk: 'Valider',
  pasteWrong: 'Ce lien ne vient pas d’OUCH. Il commence par « https://maxauvy.github.io/OUCH/duo/ », et c’est ton proche qui l’envoie depuis OUCH.',
  firstTitle: (name?: string) => (name ? `${name} partage sa météo avec toi` : 'Une météo est partagée avec toi'),
  installTitle: 'Pour la retrouver chaque jour',
  iosStep1: 'Touche Partager en bas de Safari',
  iosStep2: 'Choisis « Sur l’écran d’accueil »',
  iosOther: 'Ouvre cette page dans Safari pour l’ajouter à l’écran d’accueil.',
  install: 'Installer',
  later: 'Plus tard',
  language: 'Langue',
  privacy: 'L’image arrive chiffrée du Dropbox de ton proche et s’ouvre seulement sur ce téléphone, avec la clé du code. Rien n’est envoyé ailleurs.',
}

export type DuoStrings = typeof fr

const en: DuoStrings = {
  lang: 'en',
  appName: 'OUCH Duo',
  weatherOf: (name?: string) => (name ? `${name}’s weather` : 'Today’s weather'),
  imageAlt: (name?: string) => (name ? `${name}’s health weather for today` : 'Health weather for today'),
  loading: 'One moment…',
  lookedAt: (time: string) => `Checked at ${time}`,
  offline: (date: string) => `Offline: image received on ${date}`,
  offlineNothing: 'No connection right now. The weather will show as soon as the phone is online.',
  refresh: 'Refresh',
  otherCode: 'Scan another code',
  goneTitle: 'This weather is no longer shared',
  goneText: (name?: string) =>
    `${name ?? 'Your relative'} may have stopped sharing, or started a new share. If there is a new code, you can scan it here.`,
  newCodeTitle: 'This code no longer matches',
  newCodeText: (name?: string) =>
    `${name ?? 'Your relative'} probably made a new code by restarting the share. When you have it, scan it here.`,
  tryAgain: 'Try again',
  scanNew: 'Scan a new code',
  welcomeTitle: 'Scan your relative’s code',
  welcomeText:
    'Your relative keeps their pain journal in OUCH. The code is in OUCH, under “Share my weather”. You will see their weather of the day here each time you open the app.',
  scan: 'Scan the code',
  paste: 'Paste a link instead',
  scanHint: 'Point at the code shown in OUCH',
  cameraRefused: 'The camera is not available. You can paste the link your relative sent you.',
  cancel: 'Cancel',
  pasteLabel: 'The link you received',
  pastePlaceholder: 'https://…',
  pasteOk: 'OK',
  pasteWrong: 'This link does not come from OUCH. It starts with “https://maxauvy.github.io/OUCH/duo/”, and your relative sends it from OUCH.',
  firstTitle: (name?: string) => (name ? `${name} is sharing their weather with you` : 'Someone is sharing their weather with you'),
  installTitle: 'To find it every day',
  iosStep1: 'Tap Share at the bottom of Safari',
  iosStep2: 'Choose “Add to Home Screen”',
  iosOther: 'Open this page in Safari to add it to your Home Screen.',
  install: 'Install',
  later: 'Later',
  language: 'Language',
  privacy: 'The image arrives encrypted from your relative’s Dropbox and only opens on this phone, with the key in the code. Nothing is sent anywhere else.',
}

const LANG_KEY = 'ouch-duo:lang'

function chosenLanguage(): 'fr' | 'en' | null {
  try {
    const v = localStorage.getItem(LANG_KEY)
    return v === 'fr' || v === 'en' ? v : null
  } catch {
    return null
  }
}

/** The language chosen in Duo, else the phone's. */
export const strings: DuoStrings = (chosenLanguage() ?? (/^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en')) === 'fr' ? fr : en
export const intlLocale = strings.lang === 'fr' ? 'fr-FR' : 'en-GB'

/** Keeps the language chosen and shows Duo again in it. */
export function chooseLanguage(lang: 'fr' | 'en'): void {
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    // Not kept: it holds for this visit only.
  }
  location.reload()
}
