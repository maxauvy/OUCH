import { useEffect, useState } from 'react'
import { useAllEntries, useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { computePainWeather } from '../lib/painWeather'
import { CHILD_TONES, getChildViewClosing, getChildViewCopy, getIllnessExplanation, getIllnessTitle, type ChildTone } from '../lib/childView'
import { WeatherIcon } from '../components/ui/WeatherIcon'
import { HealthChildView } from '../components/kids/HealthChildView'
import { useDesign } from '../hooks/useDesign'
import { format, useLanguage, useTranslation } from '../i18n'
import { radioGroupProps, radioProps, splitLeadingEmoji } from '../lib/a11y'

function ToggleRow({ label, options }: { label: string; options: { text: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-wide uppercase px-0.5" style={{ color: 'var(--color-kid-ink-muted)' }} aria-hidden>
        {label}
      </span>
      <div className="flex gap-1.5 rounded-full p-1" style={{ background: 'var(--color-kid-accent-soft)' }} {...radioGroupProps(label)}>
        {options.map((opt) => (
          <button
            key={opt.text}
            {...radioProps(opt.active)}
            onClick={opt.onClick}
            className="flex-1 rounded-full py-2.5 text-[14px] font-bold"
            style={{
              background: opt.active ? 'var(--color-kid-accent)' : 'transparent',
              color: opt.active ? 'var(--color-kid-on-accent)' : 'var(--color-kid-accent-text)',
            }}
          >
            {opt.text}
          </button>
        ))}
      </div>
    </div>
  )
}

function ClosingText({ text }: { text: string }) {
  const { emoji, label } = splitLeadingEmoji(text)
  return (
    <>
      {emoji && <span aria-hidden>{emoji} </span>}
      {label}
    </>
  )
}

export function ChildViewPage() {
  const t = useTranslation()
  const language = useLanguage()
  const settings = useSettings()
  const health = useDesign() === 'health'
  const todayEntry = useTodayEntry()
  const allEntries = useAllEntries()
  const entry = todayEntry ?? allEntries?.[0]

  const [tone, setTone] = useState<ChildTone>('young')
  const [illnessOpen, setIllnessOpen] = useState(true)

  const weather = entry ? computePainWeather(entry) : null
  const copy = weather ? getChildViewCopy(language, weather.level, tone, settings.parentGender) : null
  const illnessTitle = getIllnessTitle(language, settings.childIllness)
  const illnessText = getIllnessExplanation(language, settings.childIllness, tone, settings.parentGender)

  // The page's warm palette should reach the screen edges (and the overscroll
  // area) even on wide screens, where #root is only a centered column. The
  // health design keeps the app's own background.
  useEffect(() => {
    if (health) return
    const previous = document.body.style.background
    document.body.style.background = 'var(--color-kid-bg)'
    return () => {
      document.body.style.background = previous
    }
  }, [health])

  if (health) {
    return (
      <HealthChildView
        tone={tone}
        onToneChange={setTone}
        weather={entry ? weather : null}
        copy={copy}
        illnessQuestion={format(t.childView.aboutIllness, { illness: illnessTitle })}
        illnessText={illnessText}
        closing={getChildViewClosing(language, tone, settings.parentGender)}
      />
    )
  }

  return (
    <div
      className="min-h-[100svh] flex flex-col"
      style={{
        background:
          'radial-gradient(circle at 12% 0%, var(--color-kid-accent-soft) 0%, transparent 40%), radial-gradient(circle at 95% 18%, var(--color-kid-accent-soft) 0%, transparent 35%), var(--color-kid-bg)',
      }}
    >
      <div
        className="sticky top-0 z-10 flex-shrink-0 h-14 flex items-center px-4"
        style={{ background: 'var(--color-kid-accent-soft)', borderBottom: '1px solid var(--color-kid-hairline)' }}
      >
        <h1 className="text-[17px] font-bold" style={{ color: 'var(--color-kid-ink)' }}>
          <span aria-hidden>🧡 </span>
          {t.childView.pageTitle}
        </h1>
      </div>

      <div className="flex-1 px-4 pt-5 pb-28 flex flex-col gap-3.5">
        {!entry || !weather || !copy ? (
          <p className="text-[14px] text-center mt-10 leading-relaxed" style={{ color: 'var(--color-kid-ink-muted)' }}>
            {t.childView.noEntry}
          </p>
        ) : (
          <>
            <ToggleRow
              label={t.childView.ageToggleLabel}
              options={CHILD_TONES.map((value) => ({
                text: t.childView.ages[value],
                active: tone === value,
                onClick: () => setTone(value),
              }))}
            />

            <div
              className="rounded-[28px] p-6 flex flex-col items-center text-center gap-3.5 mt-1"
              style={{ background: 'var(--color-kid-surface)', border: '1px solid var(--color-kid-hairline)' }}
            >
              <div
                className="w-[96px] h-[96px] rounded-full flex items-center justify-center"
                style={{ background: weather.soft, color: weather.ink }}
              >
                <WeatherIcon name={weather.icon as never} size={48} />
              </div>
              <div>
                <div className="text-[22px] font-bold leading-tight" style={{ color: weather.text }}>
                  {copy.headline}
                </div>
                <div className="text-[15px] mt-2 leading-relaxed" style={{ color: 'var(--color-kid-ink-muted)' }}>
                  {copy.body}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] p-5" style={{ background: 'var(--color-kid-surface)', border: '1px solid var(--color-kid-hairline)' }}>
              <div className="text-[17px] font-bold mb-3" style={{ color: 'var(--color-kid-ink)' }}>
                {t.childView.howToHelp}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {copy.help.map((text) => {
                  const { emoji, label } = splitLeadingEmoji(text)
                  return (
                    <div
                      key={text}
                      className="rounded-2xl px-2.5 py-3 text-[13px] leading-snug font-medium"
                      style={{ background: 'var(--color-kid-accent-soft)', color: 'var(--color-kid-ink)' }}
                    >
                      {emoji && <span aria-hidden>{emoji} </span>}
                      {label}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-[28px] p-5" style={{ background: 'var(--color-kid-surface)', border: '1px solid var(--color-kid-hairline)' }}>
              <button
                onClick={() => setIllnessOpen((v) => !v)}
                aria-expanded={illnessOpen}
                className="w-full flex items-center justify-between gap-2.5 text-left"
              >
                <span className="text-[17px] font-bold" style={{ color: 'var(--color-kid-ink)' }}>
                  {format(t.childView.aboutIllness, { illness: illnessTitle })}
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-kid-accent-text)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ transform: illnessOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  aria-hidden
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {illnessOpen && (
                <div className="text-[14px] mt-3 leading-relaxed" style={{ color: 'var(--color-kid-ink-muted)' }}>
                  {illnessText}
                </div>
              )}
            </div>

            <p className="text-[14px] text-center leading-relaxed px-3 mt-1" style={{ color: 'var(--color-kid-ink)' }}>
              <ClosingText text={getChildViewClosing(language, tone, settings.parentGender)} />
            </p>
          </>
        )}
      </div>
    </div>
  )
}
