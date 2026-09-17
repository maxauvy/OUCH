import type { Language } from '../i18n/language'
import type { ChildIllness, ParentGender, PainWeatherLevel } from '../db/types'

export type ChildTone = 'young' | 'older'

interface ParentInfo {
  noun: string
  Noun: string
  subj: string
  Subj: string
  obj: string
  Obj: string
  poss: string
  Poss: string
  /** Disjunctive pronoun ("pour elle" / "for her") — differs from `subj` in French. */
  disj: string
  fem: boolean
}

/** French feminine agreement: our whole adjective vocabulary here (fatigué,
 * épuisé…) simply takes a trailing -e, so one helper covers every case. */
function agree(base: string, fem: boolean): string {
  return fem ? base + 'e' : base
}

const PARENTS_FR: Record<ParentGender, ParentInfo> = {
  maman: { noun: 'maman', Noun: 'Maman', subj: 'elle', Subj: 'Elle', obj: 'la', Obj: 'La', poss: 'son', Poss: 'Son', disj: 'elle', fem: true },
  papa: { noun: 'papa', Noun: 'Papa', subj: 'il', Subj: 'Il', obj: 'le', Obj: 'Le', poss: 'son', Poss: 'Son', disj: 'lui', fem: false },
}

const PARENTS_EN: Record<ParentGender, ParentInfo> = {
  maman: { noun: 'mom', Noun: 'Mom', subj: 'she', Subj: 'She', obj: 'her', Obj: 'Her', poss: 'her', Poss: 'Her', disj: 'her', fem: true },
  papa: { noun: 'dad', Noun: 'Dad', subj: 'he', Subj: 'He', obj: 'him', Obj: 'Him', poss: 'his', Poss: 'His', disj: 'him', fem: false },
}

interface LevelCopy {
  headline: (p: ParentInfo) => string
  body: (p: ParentInfo) => string
  help: (p: ParentInfo) => string[]
}

type LevelTones = { young: LevelCopy; older: LevelCopy }

const FR_LEVELS: Record<PainWeatherLevel, LevelTones> = {
  1: {
    young: {
      headline: (P) => `Aujourd'hui, ${P.noun} a un grand ciel bleu`,
      body: (P) => `${P.Subj} se sent plutôt bien aujourd'hui !`,
      help: () => [`😄 Profiter d'un moment ensemble`, '🎲 Un jeu tous les deux', '🚶 Une petite sortie', '🎉 Rien de spécial à faire !'],
    },
    older: {
      headline: () => `Aujourd'hui, c'est une journée « ensoleillée »`,
      body: (P) => `${P.Noun} se sent plutôt bien — c'est un bon jour pour ${P.disj}.`,
      help: (P) => [`😄 Profiter d'un moment ensemble`, '🎲 Proposer un jeu', `🚶 Une balade si ${P.subj} en a envie`, `💬 Lui demander comment ${P.subj} va`],
    },
  },
  2: {
    young: {
      headline: (P) => `Aujourd'hui, le ciel de ${P.noun} est un peu voilé`,
      body: (P) => `${P.Subj} va bien, mais ${P.subj} est un peu ${agree('fatigué', P.fem)}.`,
      help: (P) => ['🤗 Un câlin', '🧸 Jouer tranquillement', `💤 ${P.Obj} laisser se reposer un peu`, '😊 Un sourire suffit'],
    },
    older: {
      headline: () => `Aujourd'hui, c'est une journée « voilée »`,
      body: (P) => `${P.Noun} va globalement bien, mais ${P.subj} est un peu plus ${agree('fatigué', P.fem)} que d'habitude.`,
      help: (P) => ['🤗 Un câlin', '🧸 Un moment calme ensemble', `💤 Ne pas s'inquiéter si ${P.subj} se repose`, '💬 Discuter doucement'],
    },
  },
  3: {
    young: {
      headline: (P) => `Aujourd'hui, le ciel de ${P.noun} est un peu nuageux`,
      body: (P) => `${P.Subj} est ${agree('fatigué', P.fem)} et ${P.subj} a un peu mal dans le corps. Ce n'est pas de ta faute, et ça va passer.`,
      help: () => ['🤗 Un câlin tout doux', '🤫 Parler moins fort', '🎨 Jouer calmement à côté', '💤 Lui laisser du calme'],
    },
    older: {
      headline: () => `Aujourd'hui, c'est une journée « nuageuse »`,
      body: (P) => `${P.Subj} est plus ${agree('fatigué', P.fem)} que d'habitude et ${P.poss} corps lui fait un peu mal. Rien de grave, mais ${P.subj} a besoin d'un peu plus de calme — et ce n'est jamais de ta faute.`,
      help: () => ['🤗 Un câlin (pas trop fort)', '🔉 Baisser un peu le bruit', '📖 Un moment calme ensemble', '✏️ Lui faire un dessin'],
    },
  },
  4: {
    young: {
      headline: (P) => `Aujourd'hui, il pleut un peu sur ${P.noun}`,
      body: (P) => `${P.Subj} a mal et ${P.subj} est très ${agree('fatigué', P.fem)}. ${P.Subj} a besoin de beaucoup de calme.`,
      help: (P) => [`🤗 Un câlin tout doux, sans trop bouger`, '🤫 Chuchoter', `🖍️ Dessiner à côté ${P.fem ? "d'elle" : 'de lui'} en silence`, `💤 ${P.Obj} laisser se reposer`],
    },
    older: {
      headline: () => `Aujourd'hui, c'est une journée « pluvieuse »`,
      body: (P) => `${P.Subj} a mal et ${P.subj} est ${agree('épuisé', P.fem)}. C'est un jour difficile : ${P.subj} a besoin de beaucoup de calme et de repos.`,
      help: () => ['🤗 Un câlin doux', '🤫 Parler bas, faire moins de bruit', `📖 T'occuper calmement de ton côté`, `💬 Lui dire que tu es là si besoin`],
    },
  },
  5: {
    young: {
      headline: (P) => `Aujourd'hui, c'est un peu orageux pour ${P.noun}`,
      body: (P) => `${P.Subj} a très mal. Ce n'est pas de la colère contre toi, ${P.poss} corps est juste très ${agree('fatigué', P.fem)} aujourd'hui.`,
      help: (P) => [`🤗 Un câlin si ${P.subj} en a envie`, '🤫 Faire très peu de bruit', '🧩 Jouer tout seul un moment', '💌 Lui laisser un petit mot doux'],
    },
    older: {
      headline: () => `Aujourd'hui, c'est une journée « orageuse »`,
      body: (P) => `C'est l'un des jours les plus difficiles pour ${P.disj}. Si ${P.subj} semble à cran ou ${agree('fatigué', P.fem)}, ce n'est pas contre toi — c'est la douleur qui prend toute la place. ${P.Subj} a besoin de beaucoup de repos.`,
      help: (P) => [`🤗 Un câlin, si ${P.subj} en a envie`, '🤫 Faire le moins de bruit possible', `🧩 T'occuper seul·e un moment`, `💌 Un petit mot pour lui montrer que tu penses à ${P.disj}`],
    },
  },
}

const EN_LEVELS: Record<PainWeatherLevel, LevelTones> = {
  1: {
    young: {
      headline: (P) => `Today, ${P.poss} sky is big and blue`,
      body: (P) => `${P.Subj} feels pretty good today!`,
      help: () => ['😄 Enjoy a moment together', '🎲 Play a game together', '🚶 A little outing', "🎉 Nothing special needed!"],
    },
    older: {
      headline: (P) => `Today is a "sunny" day for ${P.noun}`,
      body: (P) => `${P.Noun} feels pretty good — it's a good day for ${P.obj}.`,
      help: (P) => ['😄 Enjoy a moment together', '🎲 Suggest a game', `🚶 A walk, if ${P.subj} feels like it`, `💬 Ask ${P.obj} how ${P.subj} is doing`],
    },
  },
  2: {
    young: {
      headline: (P) => `Today, ${P.poss} sky is a bit hazy`,
      body: (P) => `${P.Subj} is doing fine, but a little tired.`,
      help: (P) => ['🤗 A hug', '🧸 Play quietly', `💤 Let ${P.obj} rest a bit`, '😊 A smile is enough'],
    },
    older: {
      headline: () => `Today is a "hazy" day`,
      body: (P) => `${P.Noun} is doing okay overall, but a bit more tired than usual.`,
      help: (P) => ['🤗 A hug', '🧸 A calm moment together', `💤 Don't worry if ${P.subj} rests`, '💬 Talk quietly'],
    },
  },
  3: {
    young: {
      headline: (P) => `Today, ${P.poss} sky is a bit cloudy`,
      body: (P) => `${P.Subj} is tired and has a bit of pain in ${P.poss} body. It's not your fault, and it will pass.`,
      help: () => ['🤗 A soft, gentle hug', '🤫 Speak more quietly', '🎨 Play calmly nearby', '💤 Give them some quiet time'],
    },
    older: {
      headline: () => `Today is a "cloudy" day`,
      body: (P) => `${P.Subj} is more tired than usual and ${P.poss} body aches a little. It's nothing serious, but ${P.subj} needs a bit more calm today — and it's never your fault.`,
      help: () => ['🤗 A hug (not too tight)', '🔉 Turn the noise down a bit', '📖 A calm moment together', '✏️ Draw them a picture'],
    },
  },
  4: {
    young: {
      headline: (P) => `Today, it's a bit rainy for ${P.noun}`,
      body: (P) => `${P.Subj} is in pain and very tired. ${P.Subj} needs a lot of calm.`,
      help: (P) => ['🤗 A very gentle hug, without too much moving around', '🤫 Whisper', `🖍️ Draw quietly next to ${P.obj}`, `💤 Let ${P.obj} rest`],
    },
    older: {
      headline: () => `Today is a "rainy" day`,
      body: (P) => `${P.Subj} is in pain and exhausted. It's a hard day: ${P.subj} needs a lot of calm and rest.`,
      help: () => ['🤗 A gentle hug', '🤫 Speak softly, keep the noise down', '📖 Keep yourself busy quietly', "💬 Let them know you're there if needed"],
    },
  },
  5: {
    young: {
      headline: (P) => `Today it's a bit stormy for ${P.noun}`,
      body: (P) => `${P.Subj} is in a lot of pain. It's not anger at you — ${P.poss} body is just very tired today.`,
      help: (P) => [`🤗 A hug, if ${P.subj} feels like it`, '🤫 Keep the noise very low', '🧩 Play by yourself for a bit', '💌 Leave them a sweet little note'],
    },
    older: {
      headline: () => `Today is a "stormy" day`,
      body: (P) => `This is one of ${P.poss} hardest days. If ${P.subj} seems on edge or tired, it's not about you — the pain is just taking up all the space. ${P.Subj} needs a lot of rest.`,
      help: (P) => [`🤗 A hug, if ${P.subj} feels like it`, '🤫 Keep noise to a minimum', '🧩 Keep yourself busy for a while', `💌 A little note to show ${P.obj} you're thinking of ${P.obj}`],
    },
  },
}

interface IllnessCopy {
  label: string
  young: (p: ParentInfo) => string
  older: (p: ParentInfo) => string
}

const FR_ILLNESSES: Record<ChildIllness, IllnessCopy> = {
  fibromyalgie: {
    label: 'Fibromyalgie',
    young: (P) => `${P.Noun} a une maladie qui s'appelle fibromyalgie. ${P.Subj} a souvent mal un peu partout et ${P.subj} est très ${agree('fatigué', P.fem)}, même quand ${P.subj} a bien dormi. On ne l'attrape pas comme un rhume, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique qui s'appelle fibromyalgie. Elle provoque des douleurs et une grande fatigue qui changent d'un jour à l'autre, parfois sans raison précise. C'est une maladie invisible : ${P.subj} peut avoir mal même si ${P.subj} n'en a pas l'air. Ce n'est jamais à cause de toi.`,
  },
  arthrite: {
    label: 'Arthrite',
    young: (P) => `${P.Noun} a une maladie qui s'appelle polyarthrite rhumatoïde. Ça fait gonfler et fait mal aux articulations (genoux, mains...), surtout le matin. Ce n'est pas contagieux, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie inflammatoire chronique, la polyarthrite rhumatoïde : le corps attaque un peu ses propres articulations, ce qui cause douleurs, gonflements et raideur, surtout le matin. Les jours changent selon l'inflammation du moment. Ce n'est jamais à cause de toi.`,
  },
  endometriose: {
    label: 'Endométriose',
    young: (P) => `${P.Noun} a une maladie qui s'appelle endométriose. Ça lui donne des douleurs fortes dans le ventre, surtout certains jours. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique appelée endométriose, qui provoque des douleurs parfois très fortes dans le ventre et le bas du dos, surtout à certaines périodes. La douleur va et vient, et n'est pas toujours visible de l'extérieur. Ce n'est jamais à cause de toi.`,
  },
  migraine: {
    label: 'Migraine',
    young: (P) => `${P.Noun} a des migraines : de très fortes douleurs de tête qui reviennent souvent. Quand ça arrive, ${P.subj} a besoin de calme, de silence et parfois d'obscurité. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} souffre de migraine chronique : des maux de tête intenses, parfois avec nausées ou sensibilité à la lumière, qui reviennent plusieurs fois par mois. Le calme et le repos aident à passer la crise. Ce n'est jamais à cause de toi.`,
  },
  lombalgie: {
    label: 'Mal de dos',
    young: (P) => `${P.Noun} a mal au dos très souvent. Rester assis·e ou debout longtemps peut lui faire mal. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} vit avec des douleurs de dos chroniques : une douleur installée depuis longtemps, plus ou moins forte selon les jours, la fatigue ou la position. Ce n'est jamais à cause de toi.`,
  },
  sep: {
    label: 'Sclérose en plaques',
    young: (P) => `${P.Noun} a une maladie qui s'appelle sclérose en plaques. Elle peut donner beaucoup de fatigue, des picotements ou du mal à bouger certains jours. Ce n'est pas contagieux, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique du système nerveux appelée sclérose en plaques. Elle peut provoquer fatigue intense, troubles de l'équilibre ou de la sensibilité, qui varient beaucoup d'un jour à l'autre. Ce n'est jamais à cause de toi.`,
  },
  autre: {
    label: 'Autre',
    young: (P) => `${P.Noun} a une maladie qui dure longtemps et qui lui donne mal ou rend très ${agree('fatigué', P.fem)}, selon les jours. Ce n'est pas quelque chose qu'on attrape, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} vit avec une maladie chronique : elle dure dans le temps et son intensité varie d'un jour à l'autre, parfois sans raison visible. Ce n'est jamais à cause de toi.`,
  },
}

const EN_ILLNESSES: Record<ChildIllness, IllnessCopy> = {
  fibromyalgie: {
    label: 'Fibromyalgia',
    young: (P) => `${P.Noun} has an illness called fibromyalgia. ${P.Subj} often hurts all over and gets very tired, even after a good night's sleep. You can't catch it like a cold, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness called fibromyalgia. It causes pain and deep fatigue that change from day to day, sometimes for no clear reason. It's an invisible illness: ${P.subj} can be in pain even when ${P.subj} doesn't look like it. It's never your fault.`,
  },
  arthrite: {
    label: 'Arthritis',
    young: (P) => `${P.Noun} has an illness called rheumatoid arthritis. It makes ${P.poss} joints (like knees and hands) swell and hurt, especially in the morning. It's not contagious, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic inflammatory illness called rheumatoid arthritis: the body attacks its own joints a little, causing pain, swelling and stiffness, especially in the morning. Some days are worse than others depending on the inflammation. It's never your fault.`,
  },
  endometriose: {
    label: 'Endometriosis',
    young: (P) => `${P.Noun} has an illness called endometriosis. It gives ${P.obj} strong pain in ${P.poss} belly, especially on certain days. It's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness called endometriosis, which causes pain — sometimes very intense — in the belly and lower back, especially at certain times. The pain comes and goes, and isn't always visible from the outside. It's never your fault.`,
  },
  migraine: {
    label: 'Migraine',
    young: (P) => `${P.Noun} gets migraines: very strong headaches that come back often. When it happens, ${P.subj} needs calm, quiet, and sometimes darkness. It's never your fault.`,
    older: (P) => `${P.Noun} has chronic migraine: intense headaches, sometimes with nausea or sensitivity to light, that come back several times a month. Calm and rest help the attack pass. It's never your fault.`,
  },
  lombalgie: {
    label: 'Back pain',
    young: (P) => `${P.Poss} back hurts very often. Sitting or standing for a long time can make it worse. It's never your fault.`,
    older: (P) => `${P.Noun} lives with chronic back pain: pain that has lasted a long time, more or less intense depending on the day, tiredness, or posture. It's never your fault.`,
  },
  sep: {
    label: 'Multiple sclerosis',
    young: (P) => `${P.Noun} has an illness called multiple sclerosis. It can cause a lot of tiredness, tingling, or trouble moving on some days. It's not contagious, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness of the nervous system called multiple sclerosis. It can cause intense fatigue, balance issues, or changes in sensation, which vary a lot from day to day. It's never your fault.`,
  },
  autre: {
    label: 'Other',
    young: (P) => `${P.Noun} has an illness that lasts a long time and makes ${P.obj} hurt or feel very tired, depending on the day. It's not something you catch, and it's never your fault.`,
    older: (P) => `${P.Noun} lives with a chronic illness: it lasts over time and its intensity changes from day to day, sometimes for no visible reason. It's never your fault.`,
  },
}

function parentInfo(language: Language, gender: ParentGender): ParentInfo {
  return (language === 'en' ? PARENTS_EN : PARENTS_FR)[gender]
}

export function getChildViewCopy(
  language: Language,
  level: PainWeatherLevel,
  tone: ChildTone,
  gender: ParentGender
): { headline: string; body: string; help: string[] } {
  const P = parentInfo(language, gender)
  const entry = (language === 'en' ? EN_LEVELS : FR_LEVELS)[level][tone]
  return { headline: entry.headline(P), body: entry.body(P), help: entry.help(P) }
}

export function getIllnessLabel(language: Language, illness: ChildIllness): string {
  return (language === 'en' ? EN_ILLNESSES : FR_ILLNESSES)[illness].label
}

export function getIllnessExplanation(
  language: Language,
  illness: ChildIllness,
  tone: ChildTone,
  gender: ParentGender
): string {
  const P = parentInfo(language, gender)
  return (language === 'en' ? EN_ILLNESSES : FR_ILLNESSES)[illness][tone](P)
}
