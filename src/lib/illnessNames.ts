import type { Language } from '../i18n/language'
import type { Illness, IllnessDetails } from '../db/types'

interface IllnessName {
  /** Bare name, for chip/button lists ("Fibromyalgie", "Migraine"...). */
  label: string
  /** Capitalized, with its article, for use as a sentence subject — French
   * needs this (a bare disease name can't head a sentence: "Fibromyalgie,
   * c'est quoi ?" is wrong, "La fibromyalgie, c'est quoi ?" is right), so
   * this is the one place per illness where that article is decided. */
  titleWithArticle: string
}

const NAMES: Record<Language, Record<Illness, IllnessName>> = {
  fr: {
    fibromyalgie: { label: 'Fibromyalgie', titleWithArticle: 'La fibromyalgie' },
    arthrite: { label: 'Polyarthrite rhumatoïde', titleWithArticle: 'La polyarthrite rhumatoïde' },
    spondylarthrite: { label: 'Spondyloarthrite', titleWithArticle: 'La spondyloarthrite' },
    'rhumatisme-psoriasique': { label: 'Rhumatisme psoriasique', titleWithArticle: 'Le rhumatisme psoriasique' },
    endometriose: { label: 'Endométriose', titleWithArticle: "L'endométriose" },
    migraine: { label: 'Migraine', titleWithArticle: 'La migraine' },
    lombalgie: { label: 'Mal de dos', titleWithArticle: 'Le mal de dos' },
    sep: { label: 'Sclérose en plaques', titleWithArticle: 'La sclérose en plaques' },
    myofasciale: { label: 'Douleur myofasciale', titleWithArticle: 'La douleur myofasciale' },
    autre: { label: 'Autre', titleWithArticle: 'Cette maladie' },
  },
  en: {
    fibromyalgie: { label: 'Fibromyalgia', titleWithArticle: 'Fibromyalgia' },
    arthrite: { label: 'Rheumatoid arthritis', titleWithArticle: 'Rheumatoid arthritis' },
    spondylarthrite: { label: 'Spondyloarthritis', titleWithArticle: 'Spondyloarthritis' },
    'rhumatisme-psoriasique': { label: 'Psoriatic arthritis', titleWithArticle: 'Psoriatic arthritis' },
    endometriose: { label: 'Endometriosis', titleWithArticle: 'Endometriosis' },
    migraine: { label: 'Migraine', titleWithArticle: 'Migraine' },
    lombalgie: { label: 'Back pain', titleWithArticle: 'Back pain' },
    sep: { label: 'Multiple sclerosis', titleWithArticle: 'Multiple sclerosis' },
    myofasciale: { label: 'Myofascial pain', titleWithArticle: 'Myofascial pain' },
    autre: { label: 'Other', titleWithArticle: 'This illness' },
  },
}

export function getIllnessLabel(language: Language, illness: Illness): string {
  return NAMES[language][illness].label
}

/** "Other" means nothing inside a sentence; this is what lists say instead. */
const OTHER_IN_LIST: Record<Language, string> = { fr: 'autre maladie chronique', en: 'other chronic illness' }

const STATUS_WORDS: Record<Language, Record<'diagnosed' | 'suspected', string>> = {
  fr: { diagnosed: 'diagnostiquée', suspected: 'suspectée' },
  en: { diagnosed: 'diagnosed', suspected: 'suspected' },
}
const IN_YEAR: Record<Language, string> = { fr: 'en', en: 'in' }

/** "Fibromyalgie (diagnostiquée), endométriose et migraine": one
 * sentence-case list, in the given language (the report's may differ from the
 * app's). With `details`, a declared status follows each illness (with the
 * year of the diagnosis, when given) and the name typed for "autre" replaces
 * its generic wording, as typed (it can be an
 * acronym or a proper noun, so it is never lowercased). */
export function formatIllnessList(language: Language, illnesses: Illness[], details: IllnessDetails = {}): string {
  const names = illnesses.map((illness, i) => {
    const typed = illness === 'autre' ? details.otherName?.trim() : undefined
    const label = typed || (illness === 'autre' ? OTHER_IN_LIST[language] : getIllnessLabel(language, illness))
    const cased = typed ? label : i === 0 ? label.charAt(0).toUpperCase() + label.slice(1) : label.toLocaleLowerCase(language)
    const status = details.status?.[illness]
    const year = status === 'diagnosed' ? details.year?.[illness] : undefined
    return status ? `${cased} (${STATUS_WORDS[language][status]}${year ? ` ${IN_YEAR[language]} ${year}` : ''})` : cased
  })
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(names)
}

/** The illness name as a sentence subject, with its article in French
 * ("La fibromyalgie", "La polyarthrite rhumatoïde"...) — use this instead of `getIllnessLabel`
 * anywhere the name opens a sentence. */
export function getIllnessTitle(language: Language, illness: Illness): string {
  return NAMES[language][illness].titleWithArticle
}
