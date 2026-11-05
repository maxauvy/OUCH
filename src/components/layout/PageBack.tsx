import type { PropsWithChildren } from 'react'
import { IconChevronLeft } from '@tabler/icons-react'
import { useTranslation } from '../../i18n'

/** A page opened from the day's page (the settings, the kids' page): a way back above it. The tab bar stays, with Today lit. */
export function PageBack({ onBack, label, children }: PropsWithChildren<{ onBack: () => void; /** Where it goes back to; Today by default. */ label?: string }>) {
  const t = useTranslation()
  return (
    <>
      <div className="px-4 pt-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-11 -ml-2 pr-3 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
          <IconChevronLeft size={20} aria-hidden />
          {label ?? t.today.backToToday}
        </button>
      </div>
      {children}
    </>
  )
}
