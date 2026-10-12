import { useEffect, useState } from 'react'
import type { Tab } from '../layout/TabBar'
import { exitDemo } from '../../lib/demoSession'
import { format, useLanguage, useTranslation } from '../../i18n'

/** What each step points at: a screen, and an element marked `data-tour`. */
const STEPS: { tab: Tab; target: string }[] = [
  { tab: 'today', target: 'pain' },
  { tab: 'trends', target: 'trends-chart' },
  { tab: 'trends', target: 'report' },
]

/**
 * A three-step visit of the demo: the day's entry, what Trends shows, the
 * report. Each step switches to its screen and outlines what it speaks of; the
 * visit can be skipped at any time (the demo pill is then on screen), and the
 * last step can also leave the demo.
 */
export function DemoTour({ setTab, onClose }: { setTab: (tab: Tab) => void; onClose: () => void }) {
  const t = useTranslation().demo
  const language = useLanguage()
  const [index, setIndex] = useState(0)
  const step = STEPS[index]!
  const copy = t.tourSteps[index]!
  const last = index === STEPS.length - 1

  useEffect(() => {
    setTab(step.tab)
    // The screen needs a moment to be there before its element can be found.
    const timer = setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`)
      el?.classList.add('tour-glow')
      el?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }, 200)
    return () => {
      clearTimeout(timer)
      document.querySelectorAll('.tour-glow').forEach((el) => el.classList.remove('tour-glow'))
    }
  }, [index, setTab, step.tab, step.target])

  return (
    <section
      aria-label={copy.title}
      className="fixed inset-x-4 z-40 mx-auto max-w-[520px] rounded-2xl p-4 shadow-xl"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 76px)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-hairline)',
      }}
    >
      <div aria-live="polite">
        <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {format(t.tourStep, { n: index + 1, total: STEPS.length }, language)}
        </p>
        <h2 className="text-body font-semibold mt-0.5">{copy.title}</h2>
        <p className="text-control mt-1" style={{ color: 'var(--color-ink-muted)' }}>
          {copy.text}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          type="button"
          onClick={last ? () => void exitDemo() : onClose}
          className="min-h-11 text-control underline underline-offset-4"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          {last ? t.tourExit : t.tourSkip}
        </button>
        <span className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <i
              key={i}
              className="block h-2 w-2 rounded-full"
              style={{ background: i === index ? 'var(--color-brand)' : 'var(--color-hairline)' }}
            />
          ))}
        </span>
        <button
          type="button"
          onClick={last ? onClose : () => setIndex(index + 1)}
          className="min-h-11 rounded-[var(--radius-control)] px-5 text-control font-semibold"
          style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
        >
          {last ? t.tourDone : t.tourNext}
        </button>
      </div>
    </section>
  )
}
