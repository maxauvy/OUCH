import { useState } from 'react'
import { useLoggedEntries, useTodayEntry } from '../hooks/useEntries'
import { hasPain } from '../lib/loggedEntries'
import { useSettings } from '../hooks/useSettings'
import { computePainWeather } from '../lib/painWeather'
import { getChildViewClosing, getChildViewCopy, getIllnessExplanation, getIllnessTitle, type ChildTone } from '../lib/childView'
import { HealthChildView } from '../components/kids/HealthChildView'
import { format, useLanguage, useTranslation } from '../i18n'

export function ChildViewPage() {
  const t = useTranslation()
  const language = useLanguage()
  const settings = useSettings()
  const todayEntry = useTodayEntry()
  const allEntries = useLoggedEntries()
  const entry = todayEntry && hasPain(todayEntry) ? todayEntry : allEntries?.[0]

  const [tone, setTone] = useState<ChildTone>('young')

  const weather = entry ? computePainWeather(entry) : null
  const copy = weather ? getChildViewCopy(language, weather.level, tone, settings.parentGender) : null
  // Nothing picked yet: explain a chronic illness in general rather than guess one.
  const illnesses = (settings.illnesses.length ? settings.illnesses : (['autre'] as const)).map((illness) => ({
    id: illness,
    question: format(t.childView.aboutIllness, { illness: getIllnessTitle(language, illness) }),
    text: getIllnessExplanation(language, illness, tone, settings.parentGender),
  }))

  return (
    <HealthChildView
      tone={tone}
      onToneChange={setTone}
      weather={entry ? weather : null}
      copy={copy}
      illnesses={illnesses}
      closing={getChildViewClosing(language, tone, settings.parentGender)}
    />
  )
}
