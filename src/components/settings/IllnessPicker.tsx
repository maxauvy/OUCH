import { updateSettings } from '../../db'
import { ILLNESSES } from '../../db/types'
import { useSettings } from '../../hooks/useSettings'
import { getIllnessLabel } from '../../lib/childView'
import { useLanguage, useTranslation } from '../../i18n'
import { Chip } from '../ui/Chip'

/** Illnesses being tracked, several allowed. Used by Settings and the setup. */
export function IllnessPicker() {
  const t = useTranslation()
  const language = useLanguage()
  const { illnesses } = useSettings()
  return (
    <div role="group" aria-label={t.settings.illnessesTitle} className="flex flex-wrap gap-2">
      {ILLNESSES.map((illness) => {
        const selected = illnesses.includes(illness)
        return (
          <Chip
            key={illness}
            label={getIllnessLabel(language, illness)}
            selected={selected}
            onClick={() => updateSettings({ illnesses: selected ? illnesses.filter((i) => i !== illness) : [...illnesses, illness] })}
          />
        )
      })}
    </div>
  )
}
