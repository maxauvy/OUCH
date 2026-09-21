import { Card } from '../ui/Card'
import { AppLogo } from '../ui/AppLogo'
import { useTranslation } from '../../i18n'
import { Acronym } from './Acronym'

const POINT_ICONS = { track: '🔍', share: '🌤️', kids: '🧒', private: '🔒' } as const

/**
 * What OUCH is and why it exists. Shown on the welcome screen (without the
 * header, where the logo and title already sit above it) and as the first
 * block of the settings page (with the header).
 */
export function AboutCard({ withHeader = false }: { withHeader?: boolean }) {
  const t = useTranslation()
  return (
    <Card className="text-left">
      {withHeader && (
        <div className="flex items-center gap-3 mb-3">
          <AppLogo size={48} className="shrink-0" />
          <div>
            <h2 className="text-[17px] font-semibold leading-tight">{t.about.title}</h2>
            <Acronym className="text-[12px]" />
          </div>
        </div>
      )}
      <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
        {t.about.intro}
      </p>
      <ul className="flex flex-col gap-3 mt-4">
        {(Object.keys(POINT_ICONS) as (keyof typeof POINT_ICONS)[]).map((key) => (
          <li key={key} className="flex gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px]"
              style={{ background: 'var(--color-brand-soft)' }}
              aria-hidden="true"
            >
              {POINT_ICONS[key]}
            </span>
            <div>
              <p className="text-[14px] font-semibold">{t.about.points[key].title}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {t.about.points[key].body}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[12px] leading-relaxed mt-4" style={{ color: 'var(--color-ink-muted)' }}>
        {t.about.note}
      </p>
    </Card>
  )
}
