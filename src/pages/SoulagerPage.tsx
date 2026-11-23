import { useEffect, useRef, useState } from 'react'
import { useAllEntries } from '../hooks/useEntries'
import { useLanguage, useTranslation } from '../i18n'
import { updateSettings } from '../db'
import { canPlayAmbient, startAmbient, type Ambient } from '../lib/ambient'
import { useSettings } from '../hooks/useSettings'
import { Segmented } from '../components/ui/Segmented'
import { Toggle } from '../components/ui/Toggle'
import { format } from '../i18n/format'
import { todayISO } from '../lib/dates'
import { usualHelpers } from '../lib/careSheet'
import { DURATIONS, IN_SECONDS, OUT_SECONDS, VIBRATION, breathAt, durationOf, type Duration } from '../lib/relief'
import { ReliefIllustration } from '../components/relief/ReliefIllustration'
import { Card, SectionTitle } from '../components/ui/Card'
import { PageBack } from '../components/layout/PageBack'
import { clock, useScreenOn } from '../components/relief/helpers'
import { ExerciseEnd } from '../components/relief/ExerciseEnd'
import { GestureTimer, GesturesCard, GesturesPage } from '../components/relief/GesturesScreens'
import { Footer } from '../components/layout/Footer'
import { PlanForm, PlanView } from '../components/relief/PlanScreens'
import type { ReliefGesture } from '../db/types'
import { BUTTON, MARKER, PRIMARY, SECONDARY } from '../components/today/cardStyles'
import { hasPlan, planGlimpse } from '../lib/hardDaysPlan'
import { IconCheck, IconChevronLeft, IconChevronRight, IconLeaf, IconMessageHeart, IconPlayerPause, IconPlayerPlay, IconWind, IconX, IconYoga } from '@tabler/icons-react'
import { useRichLook } from '../lib/look'
import { NavTile, NavTiles } from '../components/ui/NavTile'
import { PageSky } from '../components/entry/TodaySky'

export type SoulagerView = 'home' | 'breath' | 'relax' | 'gentle' | 'plan' | 'planedit' | 'gestes' | 'timer'

/** The Soulager tab: what to do to feel a little better, a tap away. The home lists the exercises; each one opens on its own screen, with a way back. `request` is a screen asked for from elsewhere (the soft word of a hard day): going back from it leaves for where it came from. Nothing here is noted or counted, and it works offline. */
export function SoulagerPage({ request, onExit }: { request?: SoulagerView; onExit: () => void }) {
  const t = useTranslation().relief
  const s = useTranslation().soulager
  const p = useTranslation().plan
  const g = useTranslation().gestures
  const settings = useSettings()
  const today = useTranslation().today
  const entries = useAllEntries()
  const headingRef = useRef<HTMLHeadingElement>(null)
  // The weather look: a sky behind the title (and the exercises), the plan as a soft card, breathing as one big tile and the two others side by side.
  const rich = useRichLook()
  const [view, setView] = useState<SoulagerView>(request ?? 'home')
  // The gesture whose timer is open, and where it was opened from (the way back).
  const [gesture, setGesture] = useState<{ g: ReliefGesture; from: 'home' | 'gestes' } | null>(null)
  // While the water moves, nothing else is on the screen.
  const [breathing, setBreathing] = useState(false)
  const language = useLanguage()
  // What the gentle neck exercise adds to "what helped", if the person taps: the app's own "gentle stretching" suggestion, in their language.
  const gentleAction = useTranslation().entryForm.positiveActionsSuggestions[3] ?? ''
  const helped = entries ? usualHelpers(entries, todayISO(), 3, language) : []

  useEffect(() => {
    window.scrollTo(0, 0)
    headingRef.current?.focus()
  }, [view])

  // Back goes to the home of the tab, or, from the screen that was asked for, to where the request came from.
  const leaves = request !== undefined && view === request
  const back = () => (leaves ? onExit() : setView(view === 'planedit' ? 'plan' : view === 'timer' ? gesture?.from ?? 'home' : 'home'))

  const backLabel = leaves ? today.backToToday : view === 'timer' && gesture?.from === 'gestes' ? g.title : s.title

  const heading = view === 'home' ? s.title : view === 'breath' ? t.title : view === 'relax' ? t.relax.title : view === 'gentle' ? t.gentle.title : view === 'plan' ? p.title : view === 'planedit' ? p.formTitle : view === 'gestes' ? g.title : gesture?.g.name ?? g.title

  return (
    <>
      {view !== 'home' && (
        <PageBack onBack={back} label={view === 'planedit' ? p.shortTitle : backLabel} />
      )}
      <div className={`relative isolate flex flex-col gap-4 px-4 ${view === 'home' ? 'pt-4' : 'pt-2'} pb-28`}>
        {/* The sky stays over the exercises too; not over the forms (the plan), which keep the plain page. */}
        {view !== 'planedit' && <PageSky />}
        <div className="px-1">
          {view === 'home' && (
            <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {s.kicker}
            </p>
          )}
          <h1 ref={headingRef} tabIndex={-1} className={`${view === 'home' ? 'page-title dawn-title ' : ''}text-title font-bold leading-tight outline-none`}>
            {heading}
          </h1>
          {view === 'breath' && !breathing && (
            <p className="text-body mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.intro}
            </p>
          )}
        </div>

        {view === 'home' && (
          <section aria-label={p.title} className={`flex gap-3 rounded-[var(--radius-card)] ${rich ? 'p-[18px]' : 'py-3.5 px-3.5'}`} style={{ background: 'var(--color-brand-soft)', boxShadow: rich ? undefined : 'var(--tint-edge, none)' }}>
            {!rich && (
              <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center" style={{ background: 'var(--color-surface)', color: 'var(--color-brand)' }} aria-hidden>
                <IconMessageHeart size={20} stroke={1.8} />
              </span>
            )}
            <div className="min-w-0">
              <p className={rich ? 'section-title text-heading font-bold mb-0.5' : 'text-body font-semibold'}>{p.title}</p>
              <p className="text-body" style={{ color: 'var(--color-ink-muted)' }}>
                {hasPlan(settings.hardDaysPlan) ? planGlimpse(settings.hardDaysPlan) : p.cardEmpty}
              </p>
              <button
                type="button"
                onClick={() => setView(hasPlan(settings.hardDaysPlan) ? 'plan' : 'planedit')}
                className={rich ? 'mt-3 inline-flex items-center gap-2 min-h-11 px-4 rounded-[14px] text-control font-bold' : `${BUTTON} mt-2`}
                style={rich ? { background: 'var(--color-surface)', color: 'var(--color-ink)' } : SECONDARY}
              >
                {rich && <IconMessageHeart size={18} stroke={1.8} aria-hidden style={{ color: 'var(--color-brand)' }} />}
                {hasPlan(settings.hardDaysPlan) ? p.open : p.write}
              </button>
            </div>
          </section>
        )}

        {view === 'home' && rich && (
          <section aria-labelledby="relief-group" className="flex flex-col gap-2.5">
            <h2 id="relief-group" className="section-title text-heading font-bold px-1 mt-1">
              {s.group}
            </h2>
            <button
              type="button"
              onClick={() => setView('breath')}
              className="flex items-center gap-4 text-left rounded-[var(--radius-card)] p-[18px] min-h-[104px]"
              style={{ background: 'linear-gradient(135deg, var(--cat-gentle-soft), var(--color-brand-soft))' }}
            >
              {/* The sun that rises in the exercise, over a soft hill. */}
              <svg width="60" height="60" viewBox="0 0 64 64" aria-hidden className="shrink-0">
                <circle cx="32" cy="32" r="30" fill="var(--color-surface)" />
                <path d="M32 17v5M20 23l3 3M44 23l-3 3" stroke="var(--friend-ray)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="32" cy="36" r="10" fill="var(--friend-sun)" />
                <path d="M6 41c8-5 14-3 26 0s18 4 26-1v6a26 26 0 0 1-52 0z" fill="color-mix(in srgb, var(--color-brand) 22%, var(--color-surface))" />
              </svg>
              <span className="min-w-0">
                <span className="section-title block text-heading font-bold">{t.breathTitle}</span>
                <span className="block text-control mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
                  {s.breathHint}
                </span>
              </span>
            </button>
            <NavTiles>
              <NavTile icon={IconLeaf} tone="relax" title={t.relax.title} hint={t.relax.hint} onClick={() => setView('relax')} />
              <NavTile icon={IconYoga} tone="gentle" title={t.gentle.title} hint={t.gentle.hint} onClick={() => setView('gentle')} />
            </NavTiles>
          </section>
        )}

        {view === 'home' && !rich && (
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
            <Breathing onRunning={setBreathing} onBack={back} backLabel={backLabel} />
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

        {view === 'home' && (
          <GesturesCard
            onStart={(gs) => {
              setGesture({ g: gs, from: 'home' })
              setView('timer')
            }}
            onChoose={() => setView('gestes')}
          />
        )}
        {/* Only on the home: not in the way of an exercise or a form. */}
        {view === 'home' && <Footer />}

        {view === 'gestes' && <GesturesPage />}
        {view === 'timer' && gesture && <GestureTimer key={gesture.g.name} gesture={gesture.g} onBack={back} backLabel={backLabel} />}

        {view === 'plan' && <PlanView plan={settings.hardDaysPlan} onEdit={() => setView('planedit')} onBreathe={() => setView('breath')} />}
        {view === 'planedit' && <PlanForm plan={settings.hardDaysPlan} onDone={() => setView('plan')} />}

        {(view === 'relax' || view === 'gentle') && (
          <Steps steps={view === 'relax' ? t.relax.steps : t.gentle.steps} title={view === 'relax' ? t.relax.title : t.gentle.title} action={view === 'relax' ? t.action : gentleAction} illustrated set={view} onDone={() => setView('home')} onBack={back} backLabel={backLabel} />
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

/** The outline of the vessel: a soft pebble, no corner and no symmetry. */
const PEBBLE = 'M104 16 C158 12 190 62 180 112 C172 156 138 188 92 184 C44 180 14 140 20 96 C26 50 58 20 104 16Z'

/** A sun rises in the pebble while breathing in and goes down while breathing out; the sky lights up with it. The word changes quietly (not announced at each breath); only the start and the end are said to a screen reader. The phone vibrates at each change, when it can and the person asked. */
function Breathing({ onRunning, onBack, backLabel }: { onRunning: (running: boolean) => void; onBack: () => void; backLabel: string }) {
  const t = useTranslation().relief
  const language = useLanguage()
  const settings = useSettings()
  // The length chosen last time comes back (per device); a new choice is kept at once.
  const [picked, setPicked] = useState<Duration | null>(null)
  const seconds = picked ?? durationOf(settings.reliefSeconds)
  const chooseSeconds = (d: Duration) => {
    setPicked(d)
    void updateSettings({ reliefSeconds: d })
  }
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [finished, setFinished] = useState(false)
  const [said, setSaid] = useState('')
  const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator
  const vibrate = !!settings.reliefVibrate && canVibrate
  const lastPhase = useRef<'in' | 'out' | null>(null)
  const ambient = useRef<Ambient | null>(null)
  const canPlay = canPlayAmbient()

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
        setSaid('')
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [startedAt, seconds])

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
      {finished ? (
        <ExerciseEnd
          info={format(t.end.breathInfo, { n: seconds / 60 }, language)}
          action={t.action}
          onAgain={() => {
            setFinished(false)
            setNow(0)
          }}
          onBack={onBack}
          backLabel={backLabel}
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div aria-hidden className="relative w-64 max-w-full aspect-square">
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
              <defs>
                <clipPath id="breath-pebble">
                  <path d={PEBBLE} />
                </clipPath>
                <linearGradient id="breath-night" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--color-brand-soft)" />
                  <stop offset="1" stopColor="var(--color-surface-raised)" />
                </linearGradient>
                <linearGradient id="breath-day" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="var(--cat-gentle-soft)" />
                  <stop offset="1" stopColor="var(--color-surface)" />
                </linearGradient>
                <radialGradient id="breath-halo">
                  <stop offset="0" stopColor="var(--friend-sun)" stopOpacity="0.6" />
                  <stop offset="1" stopColor="var(--friend-sun)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <g clipPath="url(#breath-pebble)">
                <rect width="200" height="200" fill="url(#breath-night)" />
                <rect className="breath-glow" width="200" height="200" fill="url(#breath-day)" style={{ opacity: inn ? 1 : 0.12, transition: `opacity ${inn ? IN_SECONDS : OUT_SECONDS}s ease-in-out` }} />
                <g className="breath-sun" style={{ transform: `translateY(${inn ? -12 : 66}px)`, transition: `transform ${inn ? IN_SECONDS : OUT_SECONDS}s ease-in-out` }}>
                  <circle cx="100" cy="104" r="46" fill="url(#breath-halo)" />
                  <circle cx="100" cy="104" r="19" fill="var(--friend-sun)" />
                </g>
                <path d="M0 166 C40 148 70 156 100 162 C130 168 160 150 200 158 V200 H0Z" fill="color-mix(in srgb, var(--color-brand) 18%, var(--color-surface))" />
              </g>
              <path d={PEBBLE} fill="none" stroke="var(--color-hairline)" strokeWidth="1.5" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center pt-11 px-10 text-center" style={{ color: 'var(--color-ink)' }}>
              {/* At rest the time is the thing (how long it will last) and the word a murmur under it; once it runs, the word is the thing. */}
              <span className={running ? 'text-control font-semibold tabular-nums' : 'text-display font-bold tabular-nums'}>
                <span className="sr-only">{t.timeLeft} </span>
                {clock(running ? Math.max(0, seconds * 1000 - now) : seconds * 1000)}
              </span>
              <span className={running ? 'section-title text-display font-bold leading-tight' : 'text-body'}>{label}</span>
              {running && <span className="text-body tabular-nums">{b.left}</span>}
            </div>
          </div>
          {!running && (
            <div className="w-full flex flex-col gap-2">
              <Segmented
                label={t.durationLabel}
                value={seconds}
                onChange={chooseSeconds}
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
                if (settings.reliefMusic && canPlay) ambient.current = startAmbient()
              }
            }}
            className={`${BUTTON} w-full`}
            style={running ? SECONDARY : PRIMARY}
          >
            {running ? t.stop : t.start}
          </button>
          <p role="status" className="sr-only">
            {said}
          </p>
        </div>
      )}
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

/** One step at a time, read at the person's pace, in full screen: the friend of the day, one sentence, two rounds to move on. With "Pause auto" on (the chip at the top), the next step comes by itself every 20 seconds; the pause button or a tap on the picture holds it, the rounds still work, and after the last step the exercise ends. */
function Steps({ steps, title, action, illustrated, set, onDone, onBack, backLabel }: { steps: StepLine[]; title: string; action: string; illustrated: boolean; set: 'relax' | 'gentle'; onDone: () => void; onBack: () => void; backLabel: string }) {
  const language = useLanguage()
  const t = useTranslation().relief
  const settings = useSettings()
  // The step and the time spent on it move together, so that the end of a step is one change, not two.
  const [pos, setPos] = useState({ i: 0, elapsed: 0, ended: false })
  const { i, elapsed } = pos
  // The end is the last step done, by the button or by the clock: it closes with a word, not with a jump back to the home.
  const [closed, setClosed] = useState(false)
  const ended = pos.ended || closed
  const [paused, setPaused] = useState(false)
  const auto = !!settings.reliefAuto
  const last = i === steps.length - 1
  const step = steps[i]!
  useScreenOn(auto && !paused && !ended)

  useEffect(() => {
    if (!auto || paused || ended) return
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
  }, [auto, paused, ended, steps.length])

  const go = (n: number) => setPos({ i: n, elapsed: 0, ended: false })

  if (ended) {
    return (
      <Card>
        <ExerciseEnd
          info={format(t.end.stepsInfo, { title, n: steps.length }, language)}
          action={action}
          onAgain={() => {
            setClosed(false)
            go(0)
          }}
          onBack={onBack}
          backLabel={backLabel}
        />
      </Card>
    )
  }

  const secondsLeft = Math.max(1, Math.ceil((STEP_MS - elapsed) / 1000))
  const round = 'w-12 h-12 shrink-0 rounded-full flex items-center justify-center'

  // Full screen and calm: no card, the friend on the page's sky, one sentence, two rounds to move on.
  return (
    <div className="flex flex-col items-center gap-3 text-center min-h-[calc(100dvh-16rem)]">
      <div className="self-end flex items-center gap-1.5 -mt-1">
        <button
          type="button"
          aria-pressed={auto}
          aria-describedby="steps-auto-help"
          onClick={() => void updateSettings({ reliefAuto: !auto })}
          className="inline-flex items-center gap-2 min-h-11 px-3.5 rounded-full text-caption font-semibold"
          style={{ background: auto ? 'var(--color-brand-soft)' : 'var(--chip-bg, var(--color-surface-raised))', color: auto ? 'var(--color-brand)' : 'var(--color-ink)' }}
        >
          <span aria-hidden className="w-2 h-2 rounded-full" style={{ background: auto && !paused ? 'var(--friend-move)' : 'var(--color-ink-muted)', opacity: auto ? 1 : 0.5 }} />
          {auto ? format(t.autoLeft, { n: secondsLeft }) : t.autoLabel}
        </button>
        {auto && (
          <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? t.autoResume : t.autoPause} className="min-h-11 min-w-11 flex items-center justify-center rounded-full" style={{ color: 'var(--color-brand)' }}>
            {paused ? <IconPlayerPlay size={18} aria-hidden /> : <IconPlayerPause size={18} aria-hidden />}
          </button>
        )}
        <span id="steps-auto-help" className="sr-only">
          {t.autoHelper}
        </span>
      </div>
      {illustrated && (
        <div className="w-full" onClick={() => auto && setPaused(!paused)}>
          <ReliefIllustration step={i} set={set} />
        </div>
      )}
      {step.title && <h2 className="section-title text-title font-bold leading-tight">{step.title}</h2>}
      <p className="text-heading leading-relaxed max-w-[34ch]" aria-live="polite">
        {step.text}
      </p>
      {step.cue && (
        <p className="text-control font-semibold">
          <mark className="px-0.5" style={{ color: 'inherit', background: MARKER }}>
            {step.cue}
          </mark>
        </p>
      )}
      <div className="w-full mt-auto pt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (i === 0 ? onDone() : go(i - 1))}
          aria-label={i === 0 ? t.close : t.previous}
          className={round}
          style={{ background: 'var(--color-surface)', color: 'var(--color-ink)', boxShadow: 'var(--card-shadow, none)', border: 'var(--card-border, 1px solid var(--color-hairline))' }}
        >
          {i === 0 ? <IconX size={20} aria-hidden /> : <IconChevronLeft size={22} aria-hidden />}
        </button>
        <div role="img" aria-label={format(t.step, { n: i + 1, total: steps.length })} className="flex items-center gap-1.5">
          {steps.map((_, n) => (
            <span key={n} className={`block h-1.5 rounded-full ${n === i ? 'w-4' : 'w-1.5'}`} style={{ background: n === i ? 'var(--color-brand)' : n < i ? 'color-mix(in srgb, var(--color-brand) 45%, transparent)' : 'var(--color-hairline)' }} />
          ))}
        </div>
        <button type="button" onClick={() => (last ? setClosed(true) : go(i + 1))} aria-label={last ? t.close : t.next} className={round} style={PRIMARY}>
          {last ? <IconCheck size={22} aria-hidden /> : <IconChevronRight size={22} aria-hidden />}
        </button>
      </div>
    </div>
  )
}
