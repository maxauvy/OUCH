import { useRichLook } from '../../lib/look'
import { useEffect, useRef, useState } from 'react'
import { IconMinus, IconPlus, IconStar, IconStarFilled } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { ReliefGesture } from '../../db/types'
import { useAllEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { format } from '../../i18n/format'
import { useLanguage, useTranslation } from '../../i18n'
import { MAX_GESTURES, MAX_MINUTES, MAX_NAME, MIN_MINUTES, gestureRows, isKept, notedActions, stepMinutes, timerState, toggleGesture } from '../../lib/gestures'
import { todayISO } from '../../lib/dates'
import { VIBRATION } from '../../lib/relief'
import { BUTTON, PRIMARY, SECONDARY } from '../today/cardStyles'
import { Card, SectionTitle } from '../ui/Card'
import { clock, useScreenOn } from './helpers'
import { ExerciseEnd } from './ExerciseEnd'
import { gestureIcon } from './gestureIcon'

const save = (kept: ReliefGesture[]) => updateSettings({ reliefGestures: kept.length ? kept : undefined })

/** The card of the tab's home: the gestures kept, a tap starts one. */
export function GesturesCard({ onStart, onChoose }: { onStart: (g: ReliefGesture) => void; onChoose: () => void }) {
  const t = useTranslation().gestures
  const language = useLanguage()
  const kept = useSettings().reliefGestures ?? []
  // The weather look: the gestures on a soft grey fill, the way to choose them as a plain link.
  const rich = useRichLook()
  return (
    <Card>
      <SectionTitle icon={IconStarFilled}>{t.title}</SectionTitle>
      {kept.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {kept.map((g) => {
            const I = gestureIcon(g.name)
            return (
              <li key={g.name}>
                <button type="button" onClick={() => onStart(g)} className={`w-full h-full ${rich ? 'rounded-[18px]' : 'rounded-[var(--radius-card)]'} p-2.5 flex flex-col items-center text-center gap-1 min-h-11`} style={{ background: rich ? 'var(--chip-bg, var(--color-brand-soft))' : 'var(--color-brand-soft)' }}>
                  <span className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }} aria-hidden>
                    <I size={20} stroke={1.8} />
                  </span>
                  <span className="text-caption font-semibold leading-tight">{g.name}</span>
                  <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {format(t.minutes, { n: g.minutes }, language)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
          {t.none}
        </p>
      )}
      <button type="button" onClick={onChoose} className={`text-control font-semibold mt-3 min-h-11 ${rich ? '' : 'underline underline-offset-2'}`} style={{ color: 'var(--color-brand)' }}>
        {kept.length > 0 ? t.choose : t.chooseFirst}
      </button>
    </Card>
  )
}

/** Choosing the three to five that help, and the time of each. The list comes from what was noted; a gesture can be added by hand. */
export function GesturesPage() {
  const t = useTranslation().gestures
  const language = useLanguage()
  const settings = useSettings()
  const entries = useAllEntries()
  const kept = settings.reliefGestures ?? []
  const [name, setName] = useState('')
  const rows = gestureRows(kept, entries ? notedActions(entries, todayISO()) : [])
  const full = kept.length >= MAX_GESTURES

  return (
    <>
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {format(t.intro, { n: MAX_GESTURES }, language)}
      </p>
      <Card>
        {rows.length === 0 && (
          <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
            {t.empty}
          </p>
        )}
        <ul className="flex flex-col">
          {rows.map((r) => {
            const I = gestureIcon(r.name)
            const on = isKept(kept, r.name)
            return (
              <li key={r.name} className="py-2.5 border-t first:border-t-0" style={{ borderColor: 'var(--color-hairline)' }}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
                    <I size={20} stroke={1.8} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-body font-semibold">{r.name}</span>
                    <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                      {[r.days ? format(t.noted, { n: r.days }, language) : '', r.minutes ? format(t.minutes, { n: r.minutes }, language) : ''].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={format(on ? t.unkeep : t.keep, { name: r.name }, language)}
                    disabled={!on && full}
                    onClick={() => void save(toggleGesture(kept, r.name))}
                    className="min-h-11 min-w-11 flex items-center justify-center disabled:opacity-40"
                    style={{ color: on ? 'var(--color-brand)' : 'var(--color-ink-muted)' }}
                  >
                    {on ? <IconStarFilled size={22} aria-hidden /> : <IconStar size={22} aria-hidden />}
                  </button>
                </div>
                {on && r.minutes !== undefined && (
                  <div className="flex items-center gap-2 mt-1 ml-12">
                    <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                      {t.length}
                    </span>
                    <button type="button" aria-label={format(t.shorter, { name: r.name }, language)} disabled={r.minutes <= MIN_MINUTES} onClick={() => void save(stepMinutes(kept, r.name, -1))} className="min-h-11 min-w-11 flex items-center justify-center rounded-full disabled:opacity-40" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                      <IconMinus size={18} aria-hidden />
                    </button>
                    <span className="text-control font-semibold tabular-nums min-w-14 text-center" aria-live="polite">
                      {format(t.minutes, { n: r.minutes }, language)}
                    </span>
                    <button type="button" aria-label={format(t.longer, { name: r.name }, language)} disabled={r.minutes >= MAX_MINUTES} onClick={() => void save(stepMinutes(kept, r.name, 1))} className="min-h-11 min-w-11 flex items-center justify-center rounded-full disabled:opacity-40" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
                      <IconPlus size={18} aria-hidden />
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
        <form
          className="flex gap-2 mt-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim() && !full) void save(toggleGesture(kept, name)).then(() => setName(''))
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME}
            placeholder={t.addPlaceholder}
            aria-label={t.add}
            disabled={full}
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none disabled:opacity-40"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
          <button type="submit" disabled={!name.trim() || full} className="min-h-11 px-3 text-control font-semibold underline underline-offset-2 shrink-0 disabled:opacity-40" style={{ color: 'var(--color-brand)' }}>
            {t.add}
          </button>
        </form>
        {full && (
          <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
            {format(t.full, { n: MAX_GESTURES }, language)}
          </p>
        )}
      </Card>
      <p className="text-caption px-1" style={{ color: 'var(--color-ink-muted)' }}>
        {t.note}
      </p>
    </>
  )
}

/** One gesture, one timer: it waits for a tap to start, counts the time left, and at the end offers to add the gesture to what helped today. The screen stays on while it runs. */
export function GestureTimer({ gesture, onBack, backLabel }: { gesture: ReliefGesture; onBack: () => void; backLabel: string }) {
  const t = useTranslation().gestures
  const tr = useTranslation().relief
  const language = useLanguage()
  const settings = useSettings()
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [done, setDone] = useState(false)
  const running = startedAt !== null
  const buzzed = useRef(false)
  useScreenOn(running)

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => {
      const n = Date.now()
      setNow(n)
      if (timerState(startedAt, n, gesture.minutes).done) {
        window.clearInterval(id)
        setStartedAt(null)
        setDone(true)
        // One gentle signal at the end, only for those who asked for the vibration.
        if (settings.reliefVibrate && 'vibrate' in navigator && !buzzed.current) {
          buzzed.current = true
          navigator.vibrate(VIBRATION.out)
        }
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt, gesture.minutes, settings.reliefVibrate])

  const state = startedAt !== null ? timerState(startedAt, now || startedAt, gesture.minutes) : null
  const left = state ? state.leftMs : gesture.minutes * 60_000
  const fraction = state?.fraction ?? 0
  // The sun crosses an arc of sky, from the left at the start to the right at the end.
  const angle = Math.PI * fraction
  const sunX = 110 - 80 * Math.cos(angle)
  const sunY = 118 - 80 * Math.sin(angle)

  // The time is up: the timer gives way to a word, a line saying what was done, and the ways out.
  if (done) {
    return (
      <Card>
        <ExerciseEnd info={format(tr.end.gestureInfo, { name: gesture.name, n: gesture.minutes }, language)} action={gesture.name} onAgain={() => setDone(false)} onBack={onBack} backLabel={backLabel} />
      </Card>
    )
  }

  return (
    <>
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {t.calm}
      </p>
      <Card>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-full max-w-[280px] flex flex-col items-center" aria-hidden>
            <svg viewBox="0 0 220 128" className="w-full h-auto">
              <defs>
                <linearGradient id="gesture-sky" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--cat-gentle-soft)" />
                  <stop offset="1" stopColor="var(--cat-gentle-soft)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M30 118 A80 80 0 0 1 190 118 Z" fill="url(#gesture-sky)" />
              <path d="M30 118 A80 80 0 0 1 190 118" fill="none" stroke="var(--color-hairline)" strokeWidth="6" strokeLinecap="round" />
              <path d="M30 118 A80 80 0 0 1 190 118" pathLength={1} strokeDasharray={`${fraction} 1`} fill="none" stroke="var(--friend-ray)" strokeWidth="6" strokeLinecap="round" style={{ transition: 'stroke-dasharray .25s linear' }} />
              <circle cx={sunX} cy={sunY} r="20" fill="var(--friend-sun)" opacity={0.3} />
              <circle cx={sunX} cy={sunY} r="12" fill="var(--friend-sun)" />
              <path d="M14 118 H30 M190 118 H206" stroke="var(--color-hairline)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-display font-bold tabular-nums leading-none -mt-12">{clock(left)}</p>
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {format(t.outOf, { n: gesture.minutes }, language)}
            </p>
          </div>
          <p role="status" className="sr-only">
            {running ? format(t.started, { name: gesture.name, n: gesture.minutes }, language) : ''}
          </p>
          {!running && (
            <button
              type="button"
              onClick={() => {
                buzzed.current = false
                setNow(Date.now())
                setStartedAt(Date.now())
              }}
              className={BUTTON}
              style={PRIMARY}
            >
              {t.start}
            </button>
          )}
          {running && (
            <button type="button" onClick={() => setStartedAt(null)} className={BUTTON} style={SECONDARY}>
              {t.stop}
            </button>
          )}
          <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {t.screenOn}
          </p>
        </div>
      </Card>
    </>
  )
}

