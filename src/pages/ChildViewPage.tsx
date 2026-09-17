import { useState } from 'react'
import { useAllEntries, useTodayEntry } from '../hooks/useEntries'
import { useSettings } from '../hooks/useSettings'
import { computePainWeather } from '../lib/painWeather'
import { getChildViewCopy, getIllnessExplanation, getIllnessTitle, type ChildTone } from '../lib/childView'
import { WeatherIcon } from '../components/ui/WeatherIcon'
import { format, useLanguage, useTranslation } from '../i18n'

function ToggleRow({ label, options }: { label: string; options: { text: string; active: boolean; onClick: () => void }[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold tracking-wide px-0.5" style={{ color: 'var(--color-kid-ink-muted)' }}>
        {label}
      </span>
      <div className="flex gap-1.5 rounded-full p-1" style={{ background: 'var(--color-kid-accent-soft)' }}>
        {options.map((opt) => (
          <button
            key={opt.text}
            onClick={opt.onClick}
            className="flex-1 rounded-full py-2.5 text-[14px] font-bold"
            style={{
              background: opt.active ? 'var(--color-kid-accent)' : 'transparent',
              color: opt.active ? 'white' : 'var(--color-kid-accent)',
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
  const illnessTitle = getIllnessTitle(language, settings.childIllness)
  const illnessText = getIllnessExplanation(language, settings.childIllness, tone, settings.parentGender)

  return (
    <div className="fixed inset-0 z-40 flex justify-center" style={{ background: 'var(--color-kid-bg)' }}>
      {/* Capped to the app's own column width (see #root in index.css) — this
       * is a full-screen overlay (position: fixed), so it otherwise ignores
       * that centering and spans the whole viewport on wide screens. */}
      <div className="w-full max-w-[560px] h-full flex flex-col">
        <div
          className="flex-shrink-0 h-14 flex items-center gap-2.5 px-3"
          style={{ background: 'var(--color-kid-accent-soft)', borderBottom: '1px solid var(--color-kid-hairline)' }}
        >
          <button onClick={onClose} aria-label={t.childView.back} className="p-1.5 -ml-1">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-kid-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-[17px] font-bold" style={{ color: 'var(--color-kid-ink)' }}>
            🧡 {t.childView.pageTitle}
          </span>
        </div>

        <div
          className="flex-1 overflow-y-auto px-4 pt-5 pb-8 flex flex-col gap-3.5"
          style={{
            background:
              'radial-gradient(circle at 12% 0%, var(--color-kid-accent-soft) 0%, transparent 40%), radial-gradient(circle at 95% 18%, var(--color-kid-accent-soft) 0%, transparent 35%), var(--color-kid-bg)',
          }}
        >
          {!entry || !weather || !copy ? (
            <p className="text-[14px] text-center mt-10 leading-relaxed" style={{ color: 'var(--color-kid-ink-muted)' }}>
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
                className="rounded-[28px] p-6 flex flex-col items-center text-center gap-3.5 mt-1"
                style={{ background: 'var(--color-kid-surface)', border: '1px solid var(--color-kid-hairline)' }}
              >
                <div
                  className="w-[96px] h-[96px] rounded-full flex items-center justify-center"
                  style={{ background: weather.soft, color: weather.color }}
                >
                  <WeatherIcon name={weather.icon as never} size={48} />
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-tight" style={{ color: weather.color }}>
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
                  {copy.help.map((text) => (
                    <div
                      key={text}
                      className="rounded-2xl px-2.5 py-3 text-[13px] leading-snug font-medium"
                      style={{ background: 'var(--color-kid-accent-soft)', color: 'var(--color-kid-ink)' }}
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] p-5" style={{ background: 'var(--color-kid-surface)', border: '1px solid var(--color-kid-hairline)' }}>
                <button
                  onClick={() => setIllnessOpen((v) => !v)}
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
                    stroke="var(--color-kid-accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 transition-transform"
                    style={{ transform: illnessOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
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

              <p className="text-[12px] text-center leading-relaxed px-2 mt-1" style={{ color: 'var(--color-kid-ink-muted)' }}>
                {t.childView.privacyNote}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
