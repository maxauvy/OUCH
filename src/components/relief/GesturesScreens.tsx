import { useEffect, useRef, useState } from 'react'
import { IconMinus, IconPlus, IconStar, IconStarFilled } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import type { ReliefGesture } from '../../db/types'
import { useTodayEntry } from '../../hooks/useEntries'
import { useAllEntries } from '../../hooks/useEntries'
import { useSettings } from '../../hooks/useSettings'
import { format } from '../../i18n/format'
import { useLanguage, useTranslation } from '../../i18n'
import { MAX_GESTURES, MAX_MINUTES, MAX_NAME, MIN_MINUTES, gestureRows, isKept, notedActions, stepMinutes, timerState, toggleGesture } from '../../lib/gestures'
import { todayISO } from '../../lib/dates'
import { VIBRATION } from '../../lib/relief'
import { BUTTON, PRIMARY, SECONDARY } from '../today/cardStyles'
import { Card, SectionTitle } from '../ui/Card'
import { addHelped, clock, useScreenOn } from './helpers'
import { gestureIcon } from './gestureIcon'

const save = (kept: ReliefGesture[]) => updateSettings({ reliefGestures: kept.length ? kept : undefined })

/** The card of the tab's home: the gestures kept, a tap starts one. */
export function GesturesCard({ onStart, onChoose }: { onStart: (g: ReliefGesture) => void; onChoose: () => void }) {
  const t = useTranslation().gestures
  const language = useLanguage()
  const kept = useSettings().reliefGestures ?? []
  return (
    <Card>
      <SectionTitle icon={IconStarFilled}>{t.title}</SectionTitle>
      {kept.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {kept.map((g) => {
            const I = gestureIcon(g.name)
            return (
              <li key={g.name}>
                <button type="button" onClick={() => onStart(g)} className="w-full h-full rounded-[var(--radius-card)] p-2.5 flex flex-col items-center text-center gap-1 min-h-11" style={{ background: 'var(--color-brand-soft)' }}>
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
      <button type="button" onClick={onChoose} className="text-control font-semibold underline underline-offset-2 mt-3 min-h-11" style={{ color: 'var(--color-brand)' }}>
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
export function GestureTimer({ gesture }: { gesture: ReliefGesture }) {
  const t = useTranslation().gestures
  const language = useLanguage()
  const settings = useSettings()
  const today = useTodayEntry()
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [done, setDone] = useState(false)
  const [added, setAdded] = useState(false)
  const alreadyHelped = (today?.positiveActions ?? []).some((a) => a.trim().toLocaleLowerCase() === gesture.name.toLocaleLowerCase())
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
  const r = 84
  const c = 2 * Math.PI * r
  const left = done ? 0 : state ? state.leftMs : gesture.minutes * 60_000
  const fraction = done ? 1 : state?.fraction ?? 0

  return (
    <>
      <p className="text-body px-1 -mt-2" style={{ color: 'var(--color-ink-muted)' }}>
        {done ? t.finished : t.calm}
      </p>
      <Card>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="absolute inset-0" aria-hidden>
              <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-brand-soft)" strokeWidth="10" />
              <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - fraction)} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset .25s linear' }} />
            </svg>
            <div className="text-center" aria-hidden>
              <p className="text-display font-bold tabular-nums">{clock(left)}</p>
              <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                {done ? t.over : format(t.outOf, { n: gesture.minutes }, language)}
              </p>
            </div>
          </div>
          <p role="status" className="sr-only">
            {done ? t.finished : running ? format(t.started, { name: gesture.name, n: gesture.minutes }, language) : ''}
          </p>
          {!running && !done && (
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
          {done && (
            <>
              {!alreadyHelped && !added && (
                <button type="button" onClick={() => void addHelped(gesture.name).then(() => setAdded(true))} className={`${BUTTON} inline-flex items-center gap-2`} style={PRIMARY}>
                  <IconPlus size={18} aria-hidden />
                  {t.addHelped}
                </button>
              )}
              {(added || alreadyHelped) && (
                <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                  {t.added}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  setDone(false)
                  setAdded(false)
                }}
                className={BUTTON}
                style={SECONDARY}
              >
                {t.again}
              </button>
            </>
          )}
          <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {done ? t.nothingAdded : t.screenOn}
          </p>
        </div>
      </Card>
    </>
  )
}

