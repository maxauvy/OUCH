import { useState } from 'react'
import { useAllEntries, useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { computePainWeather } from '../lib/painWeather'
import { getChildViewCopy, getIllnessExplanation, getIllnessLabel, type ChildTone } from '../lib/childView'
import { WeatherIcon } from '../components/ui/WeatherIcon'
import { format, useLanguage, useTranslation } from '../i18n'

function ToggleRow({ label, options }: { label: string; options: { text: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold px-0.5" style={{ color: 'var(--color-ink-muted)' }}>
        {label}
      </span>
      <div className="flex gap-1.5 rounded-full p-1" style={{ background: 'var(--color-brand-soft)' }}>
        {options.map((opt) => (
          <button
            key={opt.text}
            onClick={opt.onClick}
            className="flex-1 rounded-full py-2 text-[13px] font-semibold"
            style={{
              background: opt.active ? 'var(--color-brand)' : 'transparent',
              color: opt.active ? 'white' : 'var(--color-brand)',
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ChildViewPage({ onClose }: { onClose: () => void }) {
  const t = useTranslation()
  const language = useLanguage()
  const settings = useSettings()
  const todayEntry = useTodayEntry()
  const allEntries = useAllEntries()
  const entry = todayEntry ?? allEntries?.[0]

  const [tone, setTone] = useState<ChildTone>('young')
  const [illnessOpen, setIllnessOpen] = useState(true)

  const weather = entry ? computePainWeather(entry) : null
  const copy = weather ? getChildViewCopy(language, weather.level, tone, settings.parentGender) : null
  const illnessLabel = getIllnessLabel(language, settings.childIllness)
  const illnessText = getIllnessExplanation(language, settings.childIllness, tone, settings.parentGender)

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: 'var(--color-paper)' }}>
      <div
        className="flex-shrink-0 h-14 flex items-center gap-2.5 px-3"
        style={{ borderBottom: '1px solid var(--color-hairline)' }}
      >
        <button onClick={onClose} aria-label={t.childView.back} className="p-1.5 -ml-1">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="text-[16px] font-semibold">{t.childView.pageTitle}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 pb-8 flex flex-col gap-3.5">
        {!entry || !weather || !copy ? (
          <p className="text-[14px] text-center mt-10 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
            {t.childView.noEntry}
          </p>
        ) : (
          <>
            <ToggleRow
              label={t.childView.ageToggleLabel}
              options={[
                { text: t.childView.ageYoung, active: tone === 'young', onClick: () => setTone('young') },
                { text: t.childView.ageOlder, active: tone === 'older', onClick: () => setTone('older') },
              ]}
            />

            <div
              className="rounded-[20px] p-6 flex flex-col items-center text-center gap-3.5 mt-1"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)' }}
            >
              <div
                className="w-[84px] h-[84px] rounded-[22px] flex items-center justify-center"
                style={{ background: weather.soft, color: weather.color }}
              >
                <WeatherIcon name={weather.icon as never} size={44} />
              </div>
              <div>
                <div className="text-[20px] font-bold leading-tight" style={{ color: weather.color }}>
                  {copy.headline}
                </div>
                <div className="text-[15px] mt-2 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {copy.body}
                </div>
              </div>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)' }}>
              <div className="text-[16px] font-semibold mb-3">{t.childView.howToHelp}</div>
              <div className="grid grid-cols-2 gap-2">
                {copy.help.map((text) => (
                  <div
                    key={text}
                    className="rounded-2xl px-2.5 py-3 text-[13px] leading-snug"
                    style={{ background: 'var(--color-brand-soft)' }}
                  >
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] p-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)' }}>
              <button
                onClick={() => setIllnessOpen((v) => !v)}
                className="w-full flex items-center justify-between gap-2.5 text-left"
              >
                <span className="text-[16px] font-semibold">{format(t.childView.aboutIllness, { illness: illnessLabel })}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-ink-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ transform: illnessOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {illnessOpen && (
                <div className="text-[14px] mt-3 leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                  {illnessText}
                </div>
              )}
            </div>

            <p className="text-[12px] text-center leading-relaxed px-2 mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.childView.privacyNote}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
