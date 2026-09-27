import type { Language } from '../i18n/language'
import type { ChildIllness, ParentGender, PainWeatherLevel } from '../db/types'

export type ChildTone = 'young' | 'older' | 'teen'

export const CHILD_TONES: ChildTone[] = ['young', 'older', 'teen']

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
 * épuisé, distant…) simply takes a trailing -e, so one helper covers every case. */
function agree(base: string, fem: boolean): string {
  return fem ? base + 'e' : base
}

const PARENTS_FR: Record<ParentGender, ParentInfo> = {
  maman: { noun: 'maman', Noun: 'Maman', subj: 'elle', Subj: 'Elle', obj: 'la', Obj: 'La', poss: 'son', Poss: 'Son', disj: 'elle', fem: true },
  papa: { noun: 'papa', Noun: 'Papa', subj: 'il', Subj: 'Il', obj: 'le', Obj: 'Le', poss: 'son', Poss: 'Son', disj: 'lui', fem: false },
}

// "Mom"/"Dad" are used as names here, so they're capitalized mid-sentence too.
const PARENTS_EN: Record<ParentGender, ParentInfo> = {
  maman: { noun: 'Mom', Noun: 'Mom', subj: 'she', Subj: 'She', obj: 'her', Obj: 'Her', poss: 'her', Poss: 'Her', disj: 'her', fem: true },
  papa: { noun: 'Dad', Noun: 'Dad', subj: 'he', Subj: 'He', obj: 'him', Obj: 'Him', poss: 'his', Poss: 'His', disj: 'him', fem: false },
}

// Writing rule for everything below: each text is read on its own (help items
// are separate chips), so the parent is always named ("papa", "maman") before
// any pronoun refers to them — never a bare "il est fatigué".

interface LevelCopy {
  headline: (p: ParentInfo) => string
  body: (p: ParentInfo) => string
  help: (p: ParentInfo) => string[]
}

type LevelTones = Record<ChildTone, LevelCopy>

const FR_LEVELS: Record<PainWeatherLevel, LevelTones> = {
  1: {
    young: {
      headline: (P) => `Aujourd'hui, ${P.noun} a un grand ciel bleu`,
      body: (P) => `${P.Noun} se sent plutôt bien aujourd'hui !`,
      help: () => [`😄 Profiter d'un moment ensemble`, '🎲 Un jeu tous les deux', '🚶 Une petite sortie', '🎉 Rien de spécial à faire !'],
    },
    older: {
      headline: (P) => `Aujourd'hui, c'est une journée « ensoleillée » pour ${P.noun}`,
      body: (P) => `${P.Noun} se sent plutôt bien — c'est un bon jour pour ${P.disj}.`,
      help: (P) => [`😄 Profiter d'un moment ensemble`, '🎲 Proposer un jeu', `🚶 Une balade si ${P.noun} en a envie`, `💬 Demander à ${P.noun} comment ${P.subj} va`],
    },
    teen: {
      headline: (P) => `Météo du jour de ${P.noun} : grand soleil`,
      body: (P) => `Plutôt une bonne journée pour ${P.noun} : la douleur laisse un peu de répit. Profitez-en, sans pression.`,
      help: (P) => ['🍕 Un moment ensemble, à ta façon', '🎧 Partager un truc que tu aimes', `🚶 Sortir avec ${P.noun} si ${P.subj} en a envie`, '🙌 Vivre ta journée normalement'],
    },
  },
  2: {
    young: {
      headline: (P) => `Aujourd'hui, le ciel de ${P.noun} est un peu voilé`,
      body: (P) => `${P.Noun} va bien, mais ${P.subj} est un peu ${agree('fatigué', P.fem)}.`,
      help: (P) => ['🤗 Un câlin', '🧸 Jouer tranquillement', `💤 Laisser ${P.noun} se reposer un peu`, '😊 Un sourire suffit'],
    },
    older: {
      headline: (P) => `Aujourd'hui, c'est une journée « voilée » pour ${P.noun}`,
      body: (P) => `${P.Noun} va globalement bien, mais ${P.subj} est un peu plus ${agree('fatigué', P.fem)} que d'habitude.`,
      help: (P) => ['🤗 Un câlin', '🧸 Un moment calme ensemble', `💤 Ne pas s'inquiéter si ${P.noun} se repose`, '💬 Discuter doucement'],
    },
    teen: {
      headline: (P) => `Météo du jour de ${P.noun} : ciel voilé`,
      body: (P) => `${P.Noun} va plutôt bien, avec juste un peu plus de fatigue que d'habitude. Rien d'inquiétant : ${P.subj} aura peut-être moins d'énergie ce soir.`,
      help: (P) => ['🙂 Rien de spécial, juste être là', '🍽️ Un petit coup de main (table, courses…)', `💤 Ne pas t'inquiéter si ${P.noun} fait une pause`, '💬 Un mot ou un message sympa'],
    },
  },
  3: {
    young: {
      headline: (P) => `Aujourd'hui, le ciel de ${P.noun} est un peu nuageux`,
      body: (P) => `${P.Noun} est ${agree('fatigué', P.fem)} et ${P.subj} a un peu mal dans le corps. Ce n'est pas de ta faute, et ça va passer.`,
      help: (P) => ['🤗 Un câlin tout doux', '🤫 Parler moins fort', '🎨 Jouer calmement à côté', `💤 Laisser ${P.noun} au calme`],
    },
    older: {
      headline: (P) => `Aujourd'hui, c'est une journée « nuageuse » pour ${P.noun}`,
      body: (P) => `${P.Noun} est plus ${agree('fatigué', P.fem)} que d'habitude et ${P.poss} corps lui fait un peu mal. Rien de grave, mais ${P.subj} a besoin d'un peu plus de calme — et ce n'est jamais de ta faute.`,
      help: (P) => ['🤗 Un câlin (pas trop fort)', '🔉 Baisser un peu le bruit', '📖 Un moment calme ensemble', `✏️ Faire un dessin pour ${P.noun}`],
    },
    teen: {
      headline: (P) => `Météo du jour de ${P.noun} : nuageux`,
      body: (P) => `La douleur est bien là aujourd'hui, et ${P.noun} est plus ${agree('fatigué', P.fem)} que d'habitude. ${P.Subj} peut être moins disponible ou un peu à cran : ce n'est pas contre toi, c'est la maladie.`,
      help: (P) => ['🔉 Baisser un peu le son', '🧺 Donner un coup de main sur une tâche', `💬 Demander à ${P.noun} ce qui l'aiderait`, '🙌 Garder tes projets du jour'],
    },
  },
  4: {
    young: {
      headline: (P) => `Aujourd'hui, il pleut un peu sur ${P.noun}`,
      body: (P) => `${P.Noun} a mal et ${P.subj} est très ${agree('fatigué', P.fem)}. ${P.Subj} a besoin de beaucoup de calme.`,
      help: (P) => [`🤗 Un câlin tout doux, sans trop bouger`, '🤫 Chuchoter', `🖍️ Dessiner à côté de ${P.noun} en silence`, `💤 Laisser ${P.noun} se reposer`],
    },
    older: {
      headline: (P) => `Aujourd'hui, c'est une journée « pluvieuse » pour ${P.noun}`,
      body: (P) => `${P.Noun} a mal et ${P.subj} est ${agree('épuisé', P.fem)}. C'est un jour difficile : ${P.subj} a besoin de beaucoup de calme et de repos.`,
      help: (P) => ['🤗 Un câlin doux', '🤫 Parler bas, faire moins de bruit', `📖 T'occuper calmement de ton côté`, `💬 Dire à ${P.noun} que tu es là si besoin`],
    },
    teen: {
      headline: (P) => `Météo du jour de ${P.noun} : pluie`,
      body: (P) => `Journée difficile pour ${P.noun} : la douleur est forte, la fatigue aussi. ${P.Subj} a besoin de repos et de calme — ça ne veut pas dire que tu dois tout gérer à sa place.`,
      help: (P) => ['🤫 Garder la maison calme', '🍝 Aider pour le repas ou une tâche', `🎧 Le casque plutôt que l'enceinte`, `💬 Dire à ${P.noun} que tu es là si besoin`],
    },
  },
  5: {
    young: {
      headline: (P) => `Aujourd'hui, c'est un peu orageux pour ${P.noun}`,
      body: (P) => `${P.Noun} a très mal. Ce n'est pas de la colère contre toi, ${P.poss} corps est juste très ${agree('fatigué', P.fem)} aujourd'hui.`,
      help: (P) => [`🤗 Un câlin si ${P.noun} en a envie`, '🤫 Faire très peu de bruit', '🧩 Jouer de ton côté un moment', `💌 Laisser un petit mot doux à ${P.noun}`],
    },
    older: {
      headline: (P) => `Aujourd'hui, c'est une journée « orageuse » pour ${P.noun}`,
      body: (P) => `C'est l'un des jours les plus difficiles pour ${P.noun}. Si ${P.subj} semble à cran ou ${agree('fatigué', P.fem)}, ce n'est pas contre toi — c'est la douleur qui prend toute la place. ${P.Subj} a besoin de beaucoup de repos.`,
      help: (P) => [`🤗 Un câlin, si ${P.noun} en a envie`, '🤫 Faire le moins de bruit possible', `🧩 T'occuper de ton côté un moment`, `💌 Un petit mot pour montrer à ${P.noun} que tu penses à ${P.disj}`],
    },
    teen: {
      headline: (P) => `Météo du jour de ${P.noun} : orage`,
      body: (P) => `C'est une des journées les plus dures pour ${P.noun} : la douleur prend toute la place. Si ${P.subj} semble à cran ou ${agree('distant', P.fem)}, ce n'est pas contre toi. Ce que tu ressens (inquiétude, agacement, tristesse) est normal, et tu as le droit d'en parler.`,
      help: (P) => ['🤫 Limiter le bruit au maximum', '🧺 Prendre en charge une petite tâche', `💌 Un message pour montrer à ${P.noun} que tu penses à ${P.disj}`, '🫶 Prendre soin de toi aussi'],
    },
  },
}

const EN_LEVELS: Record<PainWeatherLevel, LevelTones> = {
  1: {
    young: {
      headline: (P) => `Today, ${P.noun}'s sky is big and blue`,
      body: (P) => `${P.Noun} feels pretty good today!`,
      help: () => ['😄 Enjoy a moment together', '🎲 Play a game together', '🚶 A little outing', "🎉 Nothing special needed!"],
    },
    older: {
      headline: (P) => `Today is a "sunny" day for ${P.noun}`,
      body: (P) => `${P.Noun} feels pretty good — it's a good day for ${P.obj}.`,
      help: (P) => ['😄 Enjoy a moment together', '🎲 Suggest a game', `🚶 A walk, if ${P.noun} feels like it`, `💬 Ask ${P.noun} how ${P.subj}'s doing`],
    },
    teen: {
      headline: (P) => `${P.Noun}'s forecast today: sunny`,
      body: (P) => `A pretty good day for ${P.noun}: the pain is giving ${P.obj} a break. Make the most of it — no pressure.`,
      help: (P) => ['🍕 Time together, your way', '🎧 Share something you like', `🚶 Go out with ${P.noun} if ${P.subj} feels up to it`, '🙌 Just enjoy your day'],
    },
  },
  2: {
    young: {
      headline: (P) => `Today, ${P.noun}'s sky is a bit hazy`,
      body: (P) => `${P.Noun} is doing fine, but a little tired.`,
      help: (P) => ['🤗 A hug', '🧸 Play quietly', `💤 Let ${P.noun} rest a bit`, '😊 A smile is enough'],
    },
    older: {
      headline: (P) => `Today is a "hazy" day for ${P.noun}`,
      body: (P) => `${P.Noun} is doing okay overall, but a bit more tired than usual.`,
      help: (P) => ['🤗 A hug', '🧸 A calm moment together', `💤 Don't worry if ${P.noun} rests`, '💬 Talk quietly'],
    },
    teen: {
      headline: (P) => `${P.Noun}'s forecast today: hazy`,
      body: (P) => `${P.Noun} is doing okay, just more tired than usual. Nothing to worry about — ${P.subj} may simply have less energy tonight.`,
      help: (P) => ['🙂 Nothing special, just be around', '🍽️ A small hand (table, groceries…)', `💤 Don't worry if ${P.noun} takes a break`, '💬 A kind word or text'],
    },
  },
  3: {
    young: {
      headline: (P) => `Today, ${P.noun}'s sky is a bit cloudy`,
      body: (P) => `${P.Noun} is tired and has a bit of pain in ${P.poss} body. It's not your fault, and it will pass.`,
      help: (P) => ['🤗 A soft, gentle hug', '🤫 Speak more quietly', '🎨 Play calmly nearby', `💤 Give ${P.noun} some quiet time`],
    },
    older: {
      headline: (P) => `Today is a "cloudy" day for ${P.noun}`,
      body: (P) => `${P.Noun} is more tired than usual and ${P.poss} body aches a little. It's nothing serious, but ${P.subj} needs a bit more calm today — and it's never your fault.`,
      help: (P) => ['🤗 A hug (not too tight)', '🔉 Turn the noise down a bit', '📖 A calm moment together', `✏️ Draw ${P.noun} a picture`],
    },
    teen: {
      headline: (P) => `${P.Noun}'s forecast today: cloudy`,
      body: (P) => `The pain is really there today, and ${P.noun} is more tired than usual. ${P.Subj} may be less available or a bit short-tempered: it's not about you, it's the illness.`,
      help: (P) => ['🔉 Turn the volume down a bit', '🧺 Help out with a chore', `💬 Ask ${P.noun} what would help`, '🙌 Keep your own plans'],
    },
  },
  4: {
    young: {
      headline: (P) => `Today, it's a bit rainy for ${P.noun}`,
      body: (P) => `${P.Noun} is in pain and very tired. ${P.Subj} needs a lot of calm.`,
      help: (P) => ['🤗 A very gentle hug, without too much moving around', '🤫 Whisper', `🖍️ Draw quietly next to ${P.noun}`, `💤 Let ${P.noun} rest`],
    },
    older: {
      headline: (P) => `Today is a "rainy" day for ${P.noun}`,
      body: (P) => `${P.Noun} is in pain and exhausted. It's a hard day: ${P.subj} needs a lot of calm and rest.`,
      help: (P) => ['🤗 A gentle hug', '🤫 Speak softly, keep the noise down', '📖 Keep yourself busy quietly', `💬 Let ${P.noun} know you're there if needed`],
    },
    teen: {
      headline: (P) => `${P.Noun}'s forecast today: rain`,
      body: (P) => `A hard day for ${P.noun}: the pain is strong, and so is the fatigue. ${P.Subj} needs rest and quiet — that doesn't mean you have to handle everything.`,
      help: (P) => ['🤫 Keep the house calm', '🍝 Help with dinner or a chore', '🎧 Headphones rather than speakers', `💬 Let ${P.noun} know you're there if needed`],
    },
  },
  5: {
    young: {
      headline: (P) => `Today it's a bit stormy for ${P.noun}`,
      body: (P) => `${P.Noun} is in a lot of pain. It's not anger at you — ${P.poss} body is just very tired today.`,
      help: (P) => [`🤗 A hug, if ${P.noun} feels like it`, '🤫 Keep the noise very low', '🧩 Play by yourself for a bit', `💌 Leave ${P.noun} a sweet little note`],
    },
    older: {
      headline: (P) => `Today is a "stormy" day for ${P.noun}`,
      body: (P) => `This is one of ${P.noun}'s hardest days. If ${P.subj} seems on edge or tired, it's not about you — the pain is just taking up all the space. ${P.Subj} needs a lot of rest.`,
      help: (P) => [`🤗 A hug, if ${P.noun} feels like it`, '🤫 Keep noise to a minimum', '🧩 Keep yourself busy for a while', `💌 A little note to show ${P.noun} you're thinking of ${P.obj}`],
    },
    teen: {
      headline: (P) => `${P.Noun}'s forecast today: stormy`,
      body: (P) => `One of the toughest days for ${P.noun}: the pain is taking up all the space. If ${P.subj} seems on edge or distant, it's not about you. Whatever you feel (worry, frustration, sadness) is normal, and it's okay to talk about it.`,
      help: (P) => ['🤫 Keep noise to a minimum', '🧺 Take care of a small chore', `💌 A text to show ${P.noun} you're thinking of ${P.obj}`, '🫶 Look after yourself too'],
    },
  },
}

interface IllnessCopy {
  /** Bare name, for chip/button lists ("Fibromyalgie", "Migraine"...). */
  label: string
  /** Capitalized, with its article, for use as a sentence subject — French
   * needs this (a bare disease name can't head a sentence: "Fibromyalgie,
   * c'est quoi ?" is wrong, "La fibromyalgie, c'est quoi ?" is right), so
   * this is the one place per illness where that article is decided. */
  titleWithArticle: string
  young: (p: ParentInfo) => string
  older: (p: ParentInfo) => string
  /** Without the closing reassurance, which `TEEN_OUTRO` adds for every illness. */
  teen: (p: ParentInfo) => string
}

// French note: the illnesses are feminine nouns, so a bare "Elle provoque…"
// would read as "maman". Refer to the illness as "cette maladie" instead.
const FR_ILLNESSES: Record<ChildIllness, IllnessCopy> = {
  fibromyalgie: {
    label: 'Fibromyalgie',
    titleWithArticle: 'La fibromyalgie',
    young: (P) => `${P.Noun} a une maladie qui s'appelle fibromyalgie. ${P.Subj} a souvent mal un peu partout et ${P.subj} est très ${agree('fatigué', P.fem)}, même quand ${P.subj} a bien dormi. On ne l'attrape pas comme un rhume, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique qui s'appelle fibromyalgie. Cette maladie provoque des douleurs et une grande fatigue qui changent d'un jour à l'autre, parfois sans raison précise. C'est une maladie invisible : ${P.noun} peut avoir mal même si ça ne se voit pas. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une fibromyalgie, une maladie chronique qui touche la façon dont le système nerveux gère la douleur : le corps envoie des signaux de douleur plus forts que la normale. Résultat : des douleurs diffuses, une grosse fatigue, parfois des troubles du sommeil ou de la concentration, qui varient beaucoup d'un jour à l'autre. Ça ne se voit pas de l'extérieur, mais c'est bien réel.`,
  },
  arthrite: {
    label: 'Arthrite',
    titleWithArticle: "L'arthrite",
    young: (P) => `${P.Noun} a une maladie qui s'appelle polyarthrite rhumatoïde. Ça fait gonfler et fait mal aux articulations (genoux, mains...), surtout le matin. Ce n'est pas contagieux, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie inflammatoire chronique, la polyarthrite rhumatoïde : le corps attaque un peu ses propres articulations, ce qui cause douleurs, gonflements et raideur, surtout le matin. Les jours changent selon l'inflammation du moment. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une polyarthrite rhumatoïde, une maladie auto-immune : le système immunitaire, censé protéger le corps, attaque par erreur les articulations. Ça provoque inflammation, douleurs, gonflements et raideur, surtout le matin. Des traitements aident à la calmer, mais il y a des périodes plus difficiles, qu'on appelle des poussées. Ce n'est pas contagieux.`,
  },
  spondylarthrite: {
    label: 'Spondylarthrite',
    titleWithArticle: 'La spondylarthrite',
    young: (P) => `${P.Noun} a une maladie qui s'appelle spondylarthrite. Ça fait mal au dos et ça raidit le corps, surtout la nuit et le matin au réveil. Bouger doucement aide ${P.noun} à aller mieux. Ce n'est pas contagieux, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie inflammatoire chronique, la spondylarthrite, qui touche surtout le dos et le bassin et provoque douleurs et raideur, surtout la nuit et le matin. Bouger aide souvent à se sentir mieux, alors que rester longtemps immobile aggrave la raideur. Les jours changent selon l'inflammation du moment. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une spondylarthrite, une maladie inflammatoire chronique qui touche surtout la colonne vertébrale et le bassin. Cette maladie provoque douleurs et raideur, surtout la nuit et le matin ; bouger aide, alors que rester immobile longtemps aggrave les choses. Il y a des périodes plus calmes et des poussées. Ce n'est pas contagieux.`,
  },
  endometriose: {
    label: 'Endométriose',
    titleWithArticle: "L'endométriose",
    young: (P) => `${P.Noun} a une maladie qui s'appelle endométriose. Ça lui donne des douleurs fortes dans le ventre, surtout certains jours. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique appelée endométriose, qui provoque des douleurs parfois très fortes dans le ventre et le bas du dos, surtout à certaines périodes. La douleur va et vient, et n'est pas toujours visible de l'extérieur. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une endométriose : un tissu qui ressemble à celui qui tapisse l'intérieur de l'utérus se développe ailleurs dans le ventre, ce qui provoque inflammation et douleurs parfois très fortes, notamment pendant les règles. Ça peut aussi entraîner une grande fatigue. Ça ne se voit pas, mais c'est bien réel.`,
  },
  migraine: {
    label: 'Migraine',
    titleWithArticle: 'La migraine',
    young: (P) => `${P.Noun} a des migraines : de très fortes douleurs de tête qui reviennent souvent. Quand ça arrive, ${P.subj} a besoin de calme, de silence et parfois d'obscurité. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} souffre de migraine chronique : des maux de tête intenses, parfois avec nausées ou sensibilité à la lumière, qui reviennent plusieurs fois par mois. Le calme et le repos aident à passer la crise. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une migraine chronique : pas de simples maux de tête, mais des crises neurologiques qui peuvent durer plusieurs heures, voire plusieurs jours, avec parfois des nausées et une forte sensibilité à la lumière et au bruit. Pendant une crise, le calme et l'obscurité aident.`,
  },
  lombalgie: {
    label: 'Mal de dos',
    titleWithArticle: 'Le mal de dos',
    young: (P) => `${P.Noun} a mal au dos très souvent. Rester ${agree('assis', P.fem)} ou debout longtemps peut lui faire mal. Ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} vit avec des douleurs de dos chroniques : une douleur installée depuis longtemps, plus ou moins forte selon les jours, la fatigue ou la position. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une lombalgie chronique : une douleur du bas du dos présente depuis plus de trois mois. Son intensité varie selon la fatigue, les efforts ou la position, ce qui peut limiter certaines activités. Ça ne se voit pas, mais c'est bien réel.`,
  },
  sep: {
    label: 'Sclérose en plaques',
    titleWithArticle: 'La sclérose en plaques',
    young: (P) => `${P.Noun} a une maladie qui s'appelle sclérose en plaques. Cette maladie peut donner beaucoup de fatigue, des picotements ou du mal à bouger certains jours. Ce n'est pas contagieux, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} a une maladie chronique du système nerveux appelée sclérose en plaques. Cette maladie peut provoquer fatigue intense, troubles de l'équilibre ou de la sensibilité, qui varient beaucoup d'un jour à l'autre. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} a une sclérose en plaques, une maladie auto-immune du système nerveux : les défenses du corps abîment la gaine qui protège les nerfs, ce qui perturbe les messages entre le cerveau et le reste du corps. Ça peut provoquer une fatigue intense, des troubles de l'équilibre, de la vue ou de la sensibilité, qui varient beaucoup. Des traitements existent pour limiter les poussées. Ce n'est pas contagieux.`,
  },
  autre: {
    label: 'Autre',
    titleWithArticle: 'Cette maladie',
    young: (P) => `${P.Noun} a une maladie qui dure longtemps et qui lui donne mal ou rend très ${agree('fatigué', P.fem)}, selon les jours. Ce n'est pas quelque chose qu'on attrape, et ce n'est jamais à cause de toi.`,
    older: (P) => `${P.Noun} vit avec une maladie chronique : cette maladie dure dans le temps et son intensité varie d'un jour à l'autre, parfois sans raison visible. Ce n'est jamais à cause de toi.`,
    teen: (P) => `${P.Noun} vit avec une maladie chronique, c'est-à-dire qui dure dans le temps. Son intensité varie d'un jour à l'autre, parfois sans raison visible, et ça ne se voit pas toujours de l'extérieur.`,
  },
}

const EN_ILLNESSES: Record<ChildIllness, IllnessCopy> = {
  fibromyalgie: {
    label: 'Fibromyalgia',
    titleWithArticle: 'Fibromyalgia',
    young: (P) => `${P.Noun} has an illness called fibromyalgia. ${P.Subj} often hurts all over and gets very tired, even after a good night's sleep. You can't catch it like a cold, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness called fibromyalgia. It causes pain and deep fatigue that change from day to day, sometimes for no clear reason. It's an invisible illness: ${P.noun} can be in pain even when it doesn't show. It's never your fault.`,
    teen: (P) => `${P.Noun} has fibromyalgia, a chronic condition that affects how the nervous system handles pain: the body sends stronger pain signals than normal. The result is widespread pain, deep fatigue, and sometimes trouble sleeping or concentrating — all of which vary a lot from day to day. You can't see it from the outside, but it's very real.`,
  },
  arthrite: {
    label: 'Arthritis',
    titleWithArticle: 'Arthritis',
    young: (P) => `${P.Noun} has an illness called rheumatoid arthritis. It makes ${P.poss} joints (like knees and hands) swell and hurt, especially in the morning. It's not contagious, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic inflammatory illness called rheumatoid arthritis: the body attacks its own joints a little, causing pain, swelling and stiffness, especially in the morning. Some days are worse than others depending on the inflammation. It's never your fault.`,
    teen: (P) => `${P.Noun} has rheumatoid arthritis, an autoimmune disease: the immune system, which is supposed to protect the body, attacks the joints by mistake. That causes inflammation, pain, swelling and stiffness, especially in the morning. Treatments help keep it under control, but there are harder periods called flares. It's not contagious.`,
  },
  spondylarthrite: {
    label: 'Spondyloarthritis',
    titleWithArticle: 'Spondyloarthritis',
    young: (P) => `${P.Noun} has an illness called spondyloarthritis. It makes ${P.poss} back hurt and ${P.poss} body feel stiff, especially at night and when ${P.subj} wakes up. Moving gently helps ${P.obj} feel better. It's not contagious, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic inflammatory illness called spondyloarthritis: it mainly affects the spine and pelvis, causing pain and stiffness, especially at night and in the morning. Moving often helps ${P.obj} feel better, while staying still for a long time makes the stiffness worse. Some days are worse than others depending on the inflammation. It's never your fault.`,
    teen: (P) => `${P.Noun} has spondyloarthritis, a chronic inflammatory disease that mainly affects the spine and pelvis. It causes pain and stiffness, especially at night and in the morning; moving helps, while staying still for a long time makes it worse. There are calmer periods and flares. It's not contagious.`,
  },
  endometriose: {
    label: 'Endometriosis',
    titleWithArticle: 'Endometriosis',
    young: (P) => `${P.Noun} has an illness called endometriosis. It gives ${P.obj} strong pain in ${P.poss} belly, especially on certain days. It's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness called endometriosis, which causes pain — sometimes very intense — in the belly and lower back, especially at certain times. The pain comes and goes, and isn't always visible from the outside. It's never your fault.`,
    teen: (P) => `${P.Noun} has endometriosis: tissue similar to the lining of the uterus grows elsewhere in the belly, causing inflammation and pain that can be very intense, especially during periods. It can also bring a lot of fatigue. You can't see it, but it's very real.`,
  },
  migraine: {
    label: 'Migraine',
    titleWithArticle: 'Migraine',
    young: (P) => `${P.Noun} gets migraines: very strong headaches that come back often. When it happens, ${P.subj} needs calm, quiet, and sometimes darkness. It's never your fault.`,
    older: (P) => `${P.Noun} has chronic migraine: intense headaches, sometimes with nausea or sensitivity to light, that come back several times a month. Calm and rest help the attack pass. It's never your fault.`,
    teen: (P) => `${P.Noun} has chronic migraine: not just headaches, but neurological attacks that can last hours or even days, sometimes with nausea and strong sensitivity to light and noise. During an attack, calm and darkness help.`,
  },
  lombalgie: {
    label: 'Back pain',
    titleWithArticle: 'Back pain',
    young: (P) => `${P.Noun}'s back hurts very often. Sitting or standing for a long time can make it worse. It's never your fault.`,
    older: (P) => `${P.Noun} lives with chronic back pain: pain that has lasted a long time, more or less intense depending on the day, tiredness, or posture. It's never your fault.`,
    teen: (P) => `${P.Noun} has chronic low back pain: pain in the lower back that has lasted more than three months. How strong it is depends on fatigue, effort or posture, and it can limit some activities. You can't see it, but it's very real.`,
  },
  sep: {
    label: 'Multiple sclerosis',
    titleWithArticle: 'Multiple sclerosis',
    young: (P) => `${P.Noun} has an illness called multiple sclerosis. It can cause a lot of tiredness, tingling, or trouble moving on some days. It's not contagious, and it's never your fault.`,
    older: (P) => `${P.Noun} has a chronic illness of the nervous system called multiple sclerosis. It can cause intense fatigue, balance issues, or changes in sensation, which vary a lot from day to day. It's never your fault.`,
    teen: (P) => `${P.Noun} has multiple sclerosis, an autoimmune disease of the nervous system: the body's defenses damage the coating that protects the nerves, which disrupts messages between the brain and the rest of the body. It can cause intense fatigue and problems with balance, vision or sensation, which vary a lot. Treatments exist to limit relapses. It's not contagious.`,
  },
  autre: {
    label: 'Other',
    titleWithArticle: 'This illness',
    young: (P) => `${P.Noun} has an illness that lasts a long time and makes ${P.obj} hurt or feel very tired, depending on the day. It's not something you catch, and it's never your fault.`,
    older: (P) => `${P.Noun} lives with a chronic illness: it lasts over time and its intensity changes from day to day, sometimes for no visible reason. It's never your fault.`,
    teen: (P) => `${P.Noun} lives with a chronic illness — one that lasts over time. Its intensity changes from day to day, sometimes for no visible reason, and it doesn't always show from the outside.`,
  },
}

/** Shared closing for the teen explanations. */
const TEEN_OUTRO: Record<Language, string> = {
  fr: "Ce n'est la faute de personne, et surtout pas la tienne.",
  en: "It's nobody's fault — least of all yours.",
}

/** Last words at the bottom of the page: an open invitation to ask questions,
 * which children (teens especially) often won't do unprompted. */
const CLOSINGS: Record<Language, Record<ChildTone, (p: ParentInfo) => string>> = {
  fr: {
    young: (P) => `💬 Tu peux poser toutes tes questions à ${P.noun}, quand tu veux.`,
    older: (P) => `💬 Tu as le droit de poser toutes tes questions à ${P.noun}, même celles qui te semblent bizarres. Il n'y a pas de question bête.`,
    teen: (P) => `💬 Si tu as des questions ou besoin d'en parler, ${P.noun} est là. Et si c'est plus simple, tu peux aussi en parler à un autre adulte de confiance.`,
  },
  en: {
    young: (P) => `💬 You can ask ${P.noun} all your questions, whenever you want.`,
    older: (P) => `💬 You can ask ${P.noun} any question, even the ones that feel weird. There's no silly question.`,
    teen: (P) => `💬 If you have questions or need to talk, ${P.noun} is here. And if it feels easier, you can also talk to another adult you trust.`,
  },
}

export function getChildViewClosing(language: Language, tone: ChildTone, gender: ParentGender): string {
  return CLOSINGS[language][tone](parentInfo(language, gender))
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

/** The illness name as a sentence subject, with its article in French
 * ("La fibromyalgie", "L'arthrite"...) — use this instead of `getIllnessLabel`
 * anywhere the name opens a sentence. */
export function getIllnessTitle(language: Language, illness: ChildIllness): string {
  return (language === 'en' ? EN_ILLNESSES : FR_ILLNESSES)[illness].titleWithArticle
}

export function getIllnessExplanation(
  language: Language,
  illness: ChildIllness,
  tone: ChildTone,
  gender: ParentGender
): string {
  const P = parentInfo(language, gender)
  const text = (language === 'en' ? EN_ILLNESSES : FR_ILLNESSES)[illness][tone](P)
  return tone === 'teen' ? `${text} ${TEEN_OUTRO[language]}` : text
}
