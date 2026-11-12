import { useEffect, useRef, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useLanguage, useTranslation } from '../i18n'
import { db, updateSettings } from '../db'
import { upsertEntry, useTodayEntry } from '../hooks/useEntries'
import { canPlayAmbient, startAmbient, type Ambient } from '../lib/ambient'
import { useSettings } from '../hooks/useSettings'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { format } from '../i18n/format'
import { todayISO } from '../lib/dates'
import { usualHelpers } from '../lib/careSheet'
import { DURATIONS, IN_SECONDS, OUT_SECONDS, SESSION_SECONDS, VIBRATION, breathAt, type Duration } from '../lib/relief'
import { ReliefIllustration } from '../components/relief/ReliefIllustration'
import { Card, SectionTitle } from '../components/ui/Card'
import { PageBack } from '../components/layout/PageBack'
import { IconLeaf, IconWind, IconYoga } from '@tabler/icons-react'

export type SoulagerView = 'home' | 'breath' | 'relax' | 'gentle'

/** The Soulager tab: what to do to feel a little better, a tap away. The home lists the exercises; each one opens on its own screen, with a way back. `request` is a screen asked for from elsewhere (the soft word of a hard day): going back from it leaves for where it came from. Nothing here is noted or counted, and it works offline. */
export function SoulagerPage({ request, onExit }: { request?: SoulagerView; onExit: () => void }) {
  const t = useTranslation().relief
  const s = useTranslation().soulager
  const today = useTranslation().today
  const entries = useAllEntries()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [view, setView] = useState<SoulagerView>(request ?? 'home')
  // While the water moves, nothing else is on the screen.
  const [breathing, setBreathing] = useState(false)
  const helped = entries ? usualHelpers(entries, todayISO()) : []

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [view])

  // Back goes to the home of the tab, or, from the screen that was asked for, to where the request came from.
  const leaves = request !== undefined && view === request
  const back = () => (leaves ? onExit() : setView('home'))

  const heading = view === 'home' ? s.title : view === 'breath' ? t.title : view === 'relax' ? t.relax.title : t.gentle.title

  return (
    <>
      {view !== 'home' && (
        <PageBack onBack={back} label={leaves ? today.backToToday : s.title} />
      )}
      <div className={`flex flex-col gap-4 px-4 ${view === 'home' ? 'pt-4' : 'pt-2'} pb-28`}>
        <div className="px-1">
          {view === 'home' && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {s.kicker}
            </p>
          )}
          <h1 ref={headingRef} tabIndex={-1} className="text-title font-bold leading-tight outline-none">
            {heading}
          </h1>
          {view === 'breath' && !breathing && (
            <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.intro}
            </p>
          )}
        </div>

        {view === 'home' && (
          <Card>
            <SectionTitle icon={IconWind}>{s.group}</SectionTitle>
            <div className="flex flex-col gap-2">
              <Pick icon={<IconWind size={20} stroke={1.8} aria-hidden />} title={t.breathTitle} hint={s.breathHint} onClick={() => setView('breath')} />
              <Pick icon={<IconLeaf size={20} stroke={1.8} aria-hidden />} title={t.relax.title} hint={t.relax.hint} onClick={() => setView('relax')} />
              <Pick icon={<IconYoga size={20} stroke={1.8} aria-hidden />} title={t.gentle.title} hint={t.gentle.hint} onClick={() => setView('gentle')} />
            </div>
          </Card>
        )}

        {view === 'breath' && (
          <>
            <Breathing onRunning={setBreathing} />
            {!breathing && helped.length > 0 && (
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
        )}

        {(view === 'relax' || view === 'gentle') && (
          <Steps steps={view === 'relax' ? t.relax.steps : t.gentle.steps} illustrated set={view} onDone={() => setView('home')} />
        )}
      </div>
    </>
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

/** minutes:seconds, for the clock. */
const clock = (ms: number) => {
  const total = Math.ceil(ms / 1000)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

/** Adds the action to what helped today: one tap from the person, never on its own. */
async function addHelped(action: string) {
  const date = todayISO()
  const existing = await db.entries.where('date').equals(date).first()
  const current = existing?.positiveActions ?? []
  if (current.some((a) => a.trim().toLocaleLowerCase() === action.toLocaleLowerCase())) return
  await upsertEntry(date, { positiveActions: [...current, action] })
}

/** Keeps the screen on while the exercise runs, where the phone allows it; gives it back when it stops. */
function useScreenOn(on: boolean) {
  useEffect(() => {
    if (!on || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    let live = true
    const take = () => navigator.wakeLock.request('screen').then((l) => (live ? (lock = l) : void l.release()), () => {})
    void take()
    // The phone takes the lock back when the page is hidden; ask again when it is seen again.
    const again = () => document.visibilityState === 'visible' && void take()
    document.addEventListener('visibilitychange', again)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', again)
      void lock?.release().catch(() => {})
    }
  }, [on])
}

/** The level: the water rises while breathing in and falls while breathing out. The word changes quietly (not announced at each breath); only the start and the end are said to a screen reader. The phone vibrates at each change, when it can and the person asked. */
function Breathing({ onRunning }: { onRunning: (running: boolean) => void }) {
  const t = useTranslation().relief
  const language = useLanguage()
  const settings = useSettings()
  const [seconds, setSeconds] = useState<Duration>(SESSION_SECONDS)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [finished, setFinished] = useState(false)
  const [said, setSaid] = useState('')
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
  const vibrate = !!settings.reliefVibrate && canVibrate
  const lastPhase = useRef<'in' | 'out' | null>(null)
  const ambient = useRef<Ambient | null>(null)
  const canPlay = canPlayAmbient()
  const today = useTodayEntry()
  const alreadyHelped = (today?.positiveActions ?? []).some((a) => a.trim().toLocaleLowerCase() === t.action.toLocaleLowerCase())
  const [added, setAdded] = useState(false)

  const running = startedAt !== null
  useScreenOn(running)
  useEffect(() => onRunning(running), [running, onRunning])
  // The sound belongs to the exercise: it stops with it, and with the page.
  useEffect(() => {
    if (!running) {
      ambient.current?.stop()
      ambient.current = null
    }
  }, [running])
  useEffect(() => () => ambient.current?.stop(), [])

  useEffect(() => {
    if (startedAt === null) return
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt
      setNow(ms)
      if (breathAt(ms, seconds).done) {
        window.clearInterval(id)
        setStartedAt(null)
        setFinished(true)
        setSaid(t.finished)
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt, seconds, t.finished])

  const b = breathAt(running ? now : 0, seconds)
  const inn = running && b.phase === 'in'
  const label = !running ? t.ready : inn ? t.breatheIn : t.breatheOut

  // One pulse to breathe in, two to breathe out, at each change.
  useEffect(() => {
    if (!running) {
      lastPhase.current = null
      return
    }
    if (lastPhase.current !== b.phase) {
      lastPhase.current = b.phase
      if (vibrate) navigator.vibrate(VIBRATION[b.phase])
      ambient.current?.phase(b.phase)
    }
  }, [running, b.phase, vibrate])

  return (
    <Card>
      <SectionTitle>{t.breathTitle}</SectionTitle>
      <div className="flex flex-col items-center gap-3">
        <div
          aria-hidden
          className="relative w-full h-64 rounded-[var(--radius-card)] overflow-hidden flex flex-col items-center justify-center"
          style={{ background: 'var(--color-brand-soft)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}
        >
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: inn ? '100%' : '0%',
              background: 'color-mix(in srgb, var(--color-brand) 38%, var(--color-surface))',
              transition: `height ${inn ? IN_SECONDS : OUT_SECONDS}s ease-in-out`,
            }}
          />
          <span className="absolute top-3 text-heading font-semibold tabular-nums" style={{ color: 'var(--color-ink)' }}>
            <span className="sr-only">{t.timeLeft} </span>
            {clock(running ? Math.max(0, seconds * 1000 - now) : seconds * 1000)}
          </span>
          <span className="relative text-display font-bold" style={{ color: 'var(--color-ink)' }}>
            {label}
          </span>
          <span className="relative text-body" style={{ color: 'var(--color-ink)' }}>
            {running ? b.left : ' '}
          </span>
          <span className="relative text-caption mt-1" style={{ color: 'var(--color-ink)' }}>
            {running ? (inn ? t.levelUp : t.levelDown) : ' '}
          </span>
        </div>
        {!running && (
          <div className="w-full flex flex-col gap-2">
            <Segmented
              label={t.durationLabel}
              value={seconds}
              onChange={setSeconds}
              options={DURATIONS.map((d) => ({ value: d, label: format(t.minutes, { n: d / 60 }, language) }))}
            />
            {canPlay && (
              <div className="flex items-center justify-between gap-3 min-h-11">
                <span>
                  <span className="block text-body font-medium">{t.music}</span>
                  <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {t.musicHelper}
                  </span>
                </span>
                <Toggle checked={!!settings.reliefMusic} onChange={(v) => void updateSettings({ reliefMusic: v })} label={t.music} />
              </div>
            )}
            {canVibrate && (
              <div className="flex items-center justify-between gap-3 min-h-11">
                <span>
                  <span className="block text-body font-medium">{t.vibrate}</span>
                  <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                    {t.vibrateHelper}
                  </span>
                </span>
                <Toggle checked={!!settings.reliefVibrate} onChange={(v) => void updateSettings({ reliefVibrate: v })} label={t.vibrate} />
              </div>
            )}
          </div>
        )}
        <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
          {t.breathHint}
          {'wakeLock' in navigator ? ` ${t.screenOn}` : ''}
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
              setAdded(false)
              if (settings.reliefMusic && canPlay) ambient.current = startAmbient()
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
        {finished && !alreadyHelped && !added && (
          <button
            type="button"
            onClick={() => void addHelped(t.action).then(() => setAdded(true))}
            className="rounded-[var(--radius-control)] px-4 min-h-11 text-control font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          >
            {t.addHelped}
          </button>
        )}
        {finished && (added || alreadyHelped) && (
          <p className="text-caption text-center" style={{ color: 'var(--color-ink-muted)' }}>
            {t.added}
          </p>
        )}
      </div>
    </Card>
  )
}

const STEP_MS = 20_000

interface StepLine {
  title?: string
  text: string
  /** A word on the breath, for the steps that have one. */
  cue?: string
}

/** One step at a time, read at the person's pace. With "Pause auto" on, the next step comes by itself every 20 seconds; a tap on the picture holds it, the buttons still work, and after the last step the exercise ends. */
function Steps({ steps, illustrated, set, onDone }: { steps: StepLine[]; illustrated: boolean; set: 'relax' | 'gentle'; onDone: () => void }) {
  const t = useTranslation().relief
  const settings = useSettings()
  // The step and the time spent on it move together, so that the end of a step is one change, not two.
  const [pos, setPos] = useState({ i: 0, elapsed: 0, ended: false })
  const { i, elapsed } = pos
  const [paused, setPaused] = useState(false)
  const auto = !!settings.reliefAuto
  const last = i === steps.length - 1
  const step = steps[i]!
  useScreenOn(auto && !paused)

  useEffect(() => {
    if (!auto || paused) return
    const id = window.setInterval(
      () =>
        setPos((p) => {
          const elapsed = p.elapsed + 250
          if (elapsed < STEP_MS) return { ...p, elapsed }
          // The time is up for this step: on to the next one, or the end.
          return p.i === steps.length - 1 ? { ...p, elapsed: STEP_MS, ended: true } : { i: p.i + 1, elapsed: 0, ended: false }
        }),
      250
    )
    return () => window.clearInterval(id)
  }, [auto, paused, steps.length])

  useEffect(() => {
    if (pos.ended) onDone()
  }, [pos.ended, onDone])

  const go = (n: number) => setPos({ i: n, elapsed: 0, ended: false })

  return (
    <Card>
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {format(t.step, { n: i + 1, total: steps.length })}
      </p>
      <div className="flex items-center justify-between gap-3 min-h-11 mb-1">
        <span className="min-w-0">
          <span className="block text-control font-semibold">{t.autoLabel}</span>
          <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {auto ? '' : t.autoHelper}
            {auto && (
              <button type="button" onClick={() => setPaused(!paused)} className="font-semibold underline underline-offset-2" style={{ color: 'var(--color-brand)' }}>
                {paused ? t.autoResume : t.autoPause}
              </button>
            )}
          </span>
        </span>
        <Toggle checked={auto} onChange={(v) => void updateSettings({ reliefAuto: v })} label={t.autoLabel} />
      </div>
      {illustrated && (
        <div onClick={() => auto && setPaused(!paused)}>
          <ReliefIllustration step={i} set={set} />
        </div>
      )}
      {auto && (
        <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: 'var(--color-brand-soft)' }} aria-hidden>
          <div className="h-full" style={{ width: `${Math.min(100, (elapsed / STEP_MS) * 100)}%`, background: 'var(--color-brand)', transition: 'width .25s linear' }} />
        </div>
      )}
      {step.title && <h2 className="text-heading font-bold mt-3">{step.title}</h2>}
      <p className="text-heading leading-relaxed my-2" aria-live="polite">
        {step.text}
      </p>
      {step.cue && (
        <p className="text-control font-semibold rounded-[var(--radius-control)] px-3 py-2 mb-3 flex items-center gap-2" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
          <IconWind size={18} stroke={1.8} aria-hidden />
          {step.cue}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => (i === 0 ? onDone() : go(i - 1))}
          className="flex-1 rounded-[var(--radius-control)] min-h-11 text-control font-semibold"
          style={{ background: 'var(--color-surface)', color: 'var(--color-brand)', border: '1px solid var(--color-brand)' }}
        >
          {i === 0 ? t.close : t.previous}
        </button>
        <button
          type="button"
          onClick={() => (last ? onDone() : go(i + 1))}
          className="flex-1 rounded-[var(--radius-control)] min-h-11 text-control font-semibold"
          style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
        >
          {last ? t.close : t.next}
        </button>
      </div>
    </Card>
  )
}
