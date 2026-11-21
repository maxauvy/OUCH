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
  showcaseTitle: 'La météo d’un proche, chaque jour',
  showcaseText: 'Ton proche note sa douleur dans OUCH. Toi, tu vois sa météo ici, chaque fois que tu ouvres l’app.',
  howSteps: ['Ton proche ouvre «\u00a0Partager ma météo\u00a0» dans OUCH', 'Tu scannes son code ici'],
  exampleTag: 'Exemple',
  exampleAlt: 'Un exemple d’image de météo, avec des données fictives',
  understandThis: 'Comprendre cette météo',
  more: 'Plus d’options',
  close: 'Fermer',
  scan: 'Scanner le code',
  paste: 'Coller un lien à la place',
  scanHint: 'Vise le code affiché dans OUCH',
  cameraRefused: 'L’appareil photo n’est pas disponible. Tu peux coller le lien que ton proche t’a envoyé.',
  cancel: 'Annuler',
  pasteLabel: 'Le lien reçu',
  pastePlaceholder: 'https://…',
  pasteOk: 'Valider',
  pasteWrong: 'Ce lien ne vient pas d’OUCH. Il commence par « https://maxauvy.github.io/OUCH/duo/ », et c’est ton proche qui l’envoie depuis OUCH.',
  firstTitle: (name?: string) => (name ? `${name} partage sa météo avec toi` : 'Une météo est partagée avec toi'),
  installTitle: 'Pour la retrouver chaque jour',
  iosStep1: 'Touche Partager en bas de Safari',
  iosStep2: 'Choisis « Sur l’écran d’accueil »',
  iosOther: 'Ouvre cette page dans Safari pour l’ajouter à l’écran d’accueil.',
  install: 'Installer',
  later: 'Plus tard',
  language: 'Langue',
  privacy: 'L’image arrive chiffrée du Dropbox de ton proche et s’ouvre seulement sur ce téléphone, avec la clé du code. Rien n’est envoyé ailleurs.',
  // The "Understand" tab: how to read the image, what it does not say, OUCH, what Duo receives, the sources.
  tabsLabel: 'Affichage',
  tabWeather: 'Sa météo',
  tabUnderstand: 'Comprendre',
  readTitle: (name?: string) => (name ? `Lire la météo de ${name}` : 'Lire la météo'),
  readHint: 'Touche une partie pour la voir sur l’image.',
  parts: [
    {
      title: 'La météo',
      short: 'Le ciel du jour, d’après la douleur notée.',
      text: (who: string) => `${who} note sa douleur de la journée, de 0 à 10. Le chiffre devient un ciel : du ciel dégagé quand la douleur est basse, à l’orage.`,
      more: 'C’est ce qui est ressenti sur toute la journée, pas une mesure.',
    },
    {
      title: 'La douleur',
      short: 'Le chiffre, un mot, et une flèche.',
      text: () => 'Le chiffre de la journée, sur 10, et un mot pour le dire : légère, modérée, forte…',
      more: 'La flèche compare ce jour avec la moyenne des 6 jours d’avant, quand au moins 3 ont été notés. Moins d’un demi-point d’écart compte comme « pareil ».',
    },
    {
      title: 'Les jauges',
      short: 'Fatigue, humeur… quand elles sont notées.',
      text: () => 'D’autres repères de la journée, comme la fatigue, l’humeur ou le brouillard mental, quand ils ont été notés : trois au plus.',
      more: 'Un mot et cinq cases, pas un score précis. Pour l’humeur, plus il y a de cases pleines, meilleure est la journée.',
    },
    {
      title: 'Les 14 jours',
      short: 'La courbe, la semaine, et la comparaison.',
      text: () => 'Chaque point est un jour noté, placé de « plus doux » à « plus dur », sur les bandes de couleur des 5 météos. Un trou dans la ligne : ce jour-là n’a pas été noté, rien de plus.',
      more: 'Dessous, les 7 derniers jours en cases. La phrase compare la douleur moyenne de ces 7 jours avec celle des 7 d’avant, quand chacune a au moins 3 jours notés.',
    },
  ],
  who: (name?: string) => name ?? 'Ton proche',
  scaleTitle: 'Les 5 ciels',
  scaleText: (name?: string) => `La douleur de la journée, de 0 à 10, notée par ${name ?? 'ton proche'} :`,
  levels: ['Ciel dégagé', 'Quelques nuages', 'Nuageux', 'Pluie', 'Orage'],
  notTitle: 'Ce que ça ne dit pas',
  notText:
    'Une douleur chronique monte et descend. Un jour d’orage n’est pas une alerte, et un beau jour ne veut pas dire que c’est fini. Un jour sans note, c’est juste un jour sans note. OUCH ne pose aucun diagnostic.',
  aboutTitle: 'OUCH en bref',
  aboutLine: 'Un carnet de douleur, gratuit et libre',
  aboutText: (name?: string) =>
    `OUCH est un carnet de douleur pour la fibromyalgie et les autres douleurs chroniques. ${name ?? 'Ton proche'} y note sa journée en une minute. Au fil des semaines, les notes montrent ce qui semble aggraver la douleur ou l’apaiser, et aident à préparer les rendez-vous médicaux. OUCH est gratuit et libre, sans compte ni publicité : les notes restent sur le téléphone.`,
  receiveTitle: 'Ce que Duo reçoit',
  receiveLine: 'Une image chiffrée, et rien d’autre',
  receiveText: (name?: string) =>
    `Duo reçoit seulement l’image de la météo du jour. Ni le journal, ni les traitements, ni les notes. L’image est chiffrée sur le téléphone de ${name ?? 'ton proche'} avant de partir vers son Dropbox : Dropbox ne voit qu’un fichier illisible. Elle ne s’ouvre qu’ici, avec la clé du code. Le partage peut être arrêté à tout moment, depuis OUCH.`,
  methodTitle: 'Méthode et sources',
  methodLine: 'Les études sur lesquelles OUCH s’appuie',
  methodText:
    'La douleur notée de 0 à 10 et les mots pour la dire viennent de recommandations reconnues. Les 5 météos, elles, sont un choix d’OUCH pour rendre le chiffre parlant.',
  refs: [
    { title: 'IMMPACT, 2005', source: 'Dworkin et al., Pain', text: 'La douleur notée de 0 à 10, comme dans les essais cliniques sur la douleur chronique.' },
    { title: 'Boonstra et al., 2016', source: 'Frontiers in Psychology', text: 'Des seuils pour les mots « légère, modérée, forte » dans une douleur chronique.' },
    { title: 'Haute Autorité de santé, 2008', source: 'Recommandations professionnelles', text: 'Ce qu’est une douleur chronique, et comment on l’évalue.' },
  ],
  noteLink: 'Toute la note méthodologique',
  codeLine: 'OUCH est libre et gratuit (CeCILL v2.1).',
  codeLink: 'Voir le code',
  opensElsewhere: '(s’ouvre dans le navigateur)',
  tourTitle: 'Lire la météo',
  tourExample: 'Exemple, avec des données fictives',
  stepOf: (i: number, n: number) => `${i} sur ${n}`,
  done: 'Terminé',
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
  showcaseTitle: 'A relative’s weather, every day',
  showcaseText: 'Your relative logs their pain in OUCH. You see their weather here, each time you open the app.',
  howSteps: ['Your relative opens “Share my weather” in OUCH', 'You scan their code here'],
  exampleTag: 'Example',
  exampleAlt: 'An example weather image, with made-up data',
  understandThis: 'Understand this weather',
  more: 'More options',
  close: 'Close',
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
  tabsLabel: 'View',
  tabWeather: 'Their weather',
  tabUnderstand: 'Understand',
  readTitle: (name?: string) => (name ? `Reading ${name}’s weather` : 'Reading the weather'),
  readHint: 'Tap a part to see it on the image.',
  parts: [
    {
      title: 'The weather',
      short: 'The day’s sky, from the pain logged.',
      text: (who: string) => `${who} logs the day’s pain, from 0 to 10. The number becomes a sky: from a clear sky when the pain is low, to a storm.`,
      more: 'It is what was felt over the whole day, not a measurement.',
    },
    {
      title: 'The pain',
      short: 'The number, a word, and an arrow.',
      text: () => 'The day’s number, out of 10, and a word for it: mild, moderate, severe…',
      more: 'The arrow compares the day with the average of the 6 days before, when at least 3 of them were logged. Less than half a point apart counts as “the same”.',
    },
    {
      title: 'The gauges',
      short: 'Fatigue, mood… when they are logged.',
      text: () => 'Other markers of the day, such as fatigue, mood or brain fog, when they were logged: three at most.',
      more: 'A word and five boxes, not a precise score. For mood, the more boxes are filled, the better the day.',
    },
    {
      title: 'The 14 days',
      short: 'The curve, the week, and the comparison.',
      text: () => 'Each dot is a logged day, placed from “easier” to “harder”, over the colour bands of the 5 weathers. A gap in the line: that day was not logged, nothing more.',
      more: 'Below, the last 7 days as tiles. The sentence compares the average pain of these 7 days with the 7 before, when each has at least 3 logged days.',
    },
  ],
  who: (name?: string) => name ?? 'Your relative',
  scaleTitle: 'The 5 skies',
  scaleText: (name?: string) => `The day’s pain, from 0 to 10, as logged by ${name ?? 'your relative'}:`,
  levels: ['Clear sky', 'A few clouds', 'Cloudy', 'Rain', 'Storm'],
  notTitle: 'What it does not say',
  notText:
    'Chronic pain goes up and down. A stormy day is not an alarm, and a fine day does not mean it is over. A day without a note is just a day without a note. OUCH makes no diagnosis.',
  aboutTitle: 'OUCH in short',
  aboutLine: 'A pain journal, free and open source',
  aboutText: (name?: string) =>
    `OUCH is a pain journal for fibromyalgia and other chronic pain. ${name ?? 'Your relative'} logs the day in a minute. Over the weeks, the notes show what seems to make the pain worse or ease it, and help prepare medical appointments. OUCH is free and open source, with no account and no ads: the notes stay on the phone.`,
  receiveTitle: 'What Duo receives',
  receiveLine: 'An encrypted image, and nothing else',
  receiveText: (name?: string) =>
    `Duo only receives the image of the day’s weather. Not the journal, the treatments or the notes. The image is encrypted on ${name ? `${name}’s` : 'your relative’s'} phone before it goes to their Dropbox: Dropbox only sees an unreadable file. It only opens here, with the key in the code. Sharing can be stopped at any time, from OUCH.`,
  methodTitle: 'Method and sources',
  methodLine: 'The studies OUCH builds on',
  methodText:
    'Rating pain from 0 to 10, and the words for it, come from established recommendations. The 5 weathers are OUCH’s own choice, to make the number speak.',
  refs: [
    { title: 'IMMPACT, 2005', source: 'Dworkin et al., Pain', text: 'Pain rated from 0 to 10, as in clinical trials on chronic pain.' },
    { title: 'Boonstra et al., 2016', source: 'Frontiers in Psychology', text: 'Cut-offs for the words “mild, moderate, severe” in chronic pain.' },
    { title: 'Haute Autorité de santé, 2008', source: 'French clinical guidelines', text: 'What chronic pain is, and how it is assessed.' },
  ],
  noteLink: 'The full methodology note',
  codeLine: 'OUCH is free and open source (CeCILL v2.1).',
  codeLink: 'See the code',
  opensElsewhere: '(opens in the browser)',
  tourTitle: 'Reading the weather',
  tourExample: 'Example, with made-up data',
  stepOf: (i: number, n: number) => `${i} of ${n}`,
  done: 'Done',
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
