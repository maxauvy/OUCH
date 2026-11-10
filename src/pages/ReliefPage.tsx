import { useEffect, useRef, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useTranslation } from '../i18n'
import { format } from '../i18n/format'
import { todayISO } from '../lib/dates'
import { usualHelpers } from '../lib/careSheet'
import { IN_SECONDS, OUT_SECONDS, breathAt } from '../lib/relief'
import { Card, SectionTitle } from '../components/ui/Card'
import { IconLeaf, IconWind } from '@tabler/icons-react'

type Mode = 'home' | 'relax' | 'gentle'

/** "Un moment pour souffler": a breathing circle first, two other short exercises a tap away, and what has helped before. Nothing is noted or counted, and it works offline. */
export function ReliefPage() {
  const t = useTranslation().relief
  const entries = useAllEntries()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [mode, setMode] = useState<Mode>('home')
  const helped = entries ? usualHelpers(entries, todayISO()) : []

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [mode])

  return (
    <div className="flex flex-col gap-4 px-4 pt-2 pb-28">
      <div className="px-1">
        <h1 ref={headingRef} tabIndex={-1} className="text-title font-bold leading-tight outline-none">
          {mode === 'home' ? t.title : mode === 'relax' ? t.relax.title : t.gentle.title}
        </h1>
        {mode === 'home' && (
          <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.intro}
          </p>
        )}
      </div>

      {mode === 'home' ? (
        <>
          <Breathing />
          <Card>
            <SectionTitle>{t.otherTitle}</SectionTitle>
            <div className="flex flex-col gap-2">
              <Pick icon={<IconLeaf size={20} stroke={1.8} aria-hidden />} title={t.relax.title} hint={t.relax.hint} onClick={() => setMode('relax')} />
              <Pick icon={<IconWind size={20} stroke={1.8} aria-hidden />} title={t.gentle.title} hint={t.gentle.hint} onClick={() => setMode('gentle')} />
            </div>
          </Card>
          {helped.length > 0 && (
            <Card>
              <SectionTitle>{t.helpedTitle}</SectionTitle>
              <ul className="flex flex-wrap gap-2">
                {helped.map((h) => (
                  <li key={h} className="rounded-full px-3 py-1 text-body" style={{ background: 'var(--color-brand-soft)' }}>
                    {h}
                  </li>
                ))}
              </ul>
              <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
                {t.helpedNote}
              </p>
            </Card>
          )}
        </>
      ) : (
        <Steps steps={mode === 'relax' ? t.relax.steps : t.gentle.steps} onDone={() => setMode('home')} />
      )}
    </div>
  )
}

function Pick({ icon, title, hint, onClick }: { icon: React.ReactNode; title: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left rounded-[var(--radius-control)] p-3 min-h-11"
      style={{ background: 'var(--color-brand-soft)' }}
    >
      <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }}>
        {icon}
      </span>
      <span>
        <span className="block text-body font-semibold">{title}</span>
        <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
          {hint}
        </span>
      </span>
    </button>
  )
}

/** The circle: it swells while breathing in and sinks while breathing out. The word changes quietly (not announced at each breath); only the start and the end are said to a screen reader. */
function Breathing() {
  const t = useTranslation().relief
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [finished, setFinished] = useState(false)
  const [said, setSaid] = useState('')

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt
      setNow(ms)
      if (breathAt(ms).done) {
        window.clearInterval(id)
        setStartedAt(null)
        setFinished(true)
        setSaid(t.finished)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt, t.finished])

  const running = startedAt !== null
  const b = breathAt(running ? now : 0)
  const inn = running && b.phase === 'in'
  const label = !running ? t.ready : inn ? t.breatheIn : t.breatheOut

  return (
    <Card>
      <SectionTitle>{t.breathTitle}</SectionTitle>
      <div className="flex flex-col items-center gap-3">
        <div aria-hidden className="h-56 w-full flex items-center justify-center">
        <div
          className="w-36 h-36 rounded-full flex flex-col items-center justify-center font-semibold"
          style={{
            background: 'radial-gradient(circle, var(--color-surface) 0, var(--color-brand-soft) 72%)',
            color: 'var(--color-brand)',
            boxShadow: '0 0 0 14px color-mix(in srgb, var(--color-brand) 14%, transparent)',
            transform: `scale(${inn ? 1.25 : 1})`,
            transition: `transform ${inn ? IN_SECONDS : OUT_SECONDS}s ease-in-out`,
          }}
        >
          <span className="text-heading">{label}</span>
          {running && <span className="text-caption">{b.left}</span>}
        </div>
        </div>
        <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
          {t.breathHint}
        </p>
        <button
          type="button"
          onClick={() => {
            if (running) {
              setStartedAt(null)
              setSaid('')
            } else {
              setFinished(false)
              setNow(0)
              setStartedAt(Date.now())
              setSaid(t.startedAnnounce)
            }
          }}
          className="rounded-[var(--radius-control)] px-6 min-h-11 text-control font-semibold"
          style={{ background: running ? 'var(--color-surface)' : 'var(--color-brand)', color: running ? 'var(--color-brand)' : 'var(--color-on-brand)', border: '1px solid var(--color-brand)' }}
        >
          {running ? t.stop : finished ? t.again : t.start}
        </button>
        <p role="status" className="sr-only">
          {said}
        </p>
        {finished && (
          <p className="text-body text-center" aria-hidden>
            {t.finished}
          </p>
        )}
      </div>
    </Card>
  )
}

/** One step at a time, read at the person's pace: no timer, nothing to succeed at. */
function Steps({ steps, onDone }: { steps: string[]; onDone: () => void }) {
  const t = useTranslation().relief
  const [i, setI] = useState(0)
  const last = i === steps.length - 1
  return (
    <Card>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {format(t.step, { n: i + 1, total: steps.length })}
      </p>
      <p className="text-heading leading-relaxed my-3" aria-live="polite">
        {steps[i]}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => (i === 0 ? onDone() : setI(i - 1))}
          className="flex-1 rounded-[var(--radius-control)] min-h-11 text-control font-semibold"
          style={{ background: 'var(--color-surface)', color: 'var(--color-brand)', border: '1px solid var(--color-brand)' }}
        >
          {i === 0 ? t.close : t.previous}
        </button>
        <button
          type="button"
          onClick={() => (last ? onDone() : setI(i + 1))}
          className="flex-1 rounded-[var(--radius-control)] min-h-11 text-control font-semibold"
          style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
        >
          {last ? t.close : t.next}
        </button>
      </div>
    </Card>
  )
}
