import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { format as formatDate } from 'date-fns'
import { IconX } from '@tabler/icons-react'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { helperIn } from '../../lib/careSheet'
import { theme } from '../../lib/theme'
import { trialCount, type YearReview } from '../../lib/yearReview'
import { YearCard } from './YearCard'
import { APRICOT, CORAL, DAWN, INK, MUTED, confettiFlecks } from './yearStyle'


/** A few flecks in the dawn colours, set once in a corner, never moving: festive without stirring. */
export function Confetti({ n, seed, x = [0, 100], y = [0, 30], fall = false }: { n: number; seed: number; x?: [number, number]; y?: [number, number]; fall?: boolean }) {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden">
      {confettiFlecks(n, seed, x, y).map((c, i) => (
        <span key={i} className={fall ? 'absolute ys-fall' : 'absolute'} style={{ left: `${c.left}%`, top: `${c.top}%`, width: c.size, height: c.size, borderRadius: c.round ? '50%' : 2, background: c.colour, opacity: 0.75, transform: `rotate(${c.turn}deg)`, animationDelay: fall ? `${i * 50}ms` : undefined }} />
      ))}
    </div>
  )
}

/** One square per day noted, in the colour of its weather; the gentlest days glow a little. */
export function YearSky({ days, size, animate = false }: { days: YearReview['days']; size?: number; animate?: boolean }) {
  const n = days.length
  const s = size ?? (n <= 100 ? 18 : n <= 200 ? 13 : 10)
  const cols = n <= 100 ? 12 : n <= 200 ? 16 : 22
  return (
    <div aria-hidden className="grid justify-center" style={{ gridTemplateColumns: `repeat(${cols}, ${s}px)`, gap: Math.max(2, Math.round(s / 5)) }}>
      {days.map((d, k) => (
        <span
          key={d.date}
          className={animate ? 'ys-pop' : undefined}
          style={{
            width: s,
            height: s,
            borderRadius: s / 3.5,
            background: theme.weather[d.level].color,
            boxShadow: d.level === 1 ? '0 0 6px 1px rgba(227,167,59,.7)' : undefined,
            // Row by row, a little after the title: the sky fills in about a second and a half, then holds still.
            animationDelay: animate ? `${300 + Math.floor(k / cols) * Math.min(110, 1200 / Math.ceil(n / cols)) + (k % cols) * 12}ms` : undefined,
          }}
        />
      ))}
    </div>
  )
}

/** A figure that climbs from 0 to `to` in under a second when `run` turns on; straight to `to` for those who asked for less motion. */
function useCountUp(to: number, run: boolean): number {
  const [n, setN] = useState(0)
  const still = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  useEffect(() => {
    if (!run || still) return
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900)
      setN(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => {
      cancelAnimationFrame(raf)
      setN(0)
    }
  }, [to, run, still])
  return run && !still ? n : to
}

const marked = { background: `linear-gradient(transparent 58%, ${APRICOT} 58%, ${APRICOT} 92%, transparent 92%)` }

/**
 * « Mon année »: the story, one thing per screen, then the card of the year
 * to keep. A tap on the right half goes on, on the left third goes back; the
 * arrow keys too, and Escape closes. Opening it puts the card of the day's
 * page away for that year.
 */
export function YearStory({ review, onClose }: { review: YearReview; onClose: () => void }) {
  const t = useTranslation().year
  const language = useLanguage()
  const { dateFnsLocale } = useLocale()
  const settings = useSettings()
  const closeRef = useRef<HTMLButtonElement>(null)
  const [i, setI] = useState(0)
  // The sky is always the second screen: its count of days climbs when it opens.
  const skyCount = useCountUp(review.logged, i === 1)
  const next = review.year + 1
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMMM', { locale: dateFnsLocale })
  const f = (template: string, vars: Record<string, string | number>) => format(template, vars, language)
  const list = (items: string[]) => new Intl.ListFormat(language, { type: 'conjunction' }).format(items)

  useEffect(() => {
    if (settings.yearReviewSeen !== review.year) void updateSettings({ yearReviewSeen: review.year })
  }, [review.year, settings.yearReviewSeen])

  const kicker = (text: string) => (
    <p className="m-0 mb-1.5 text-[13px] font-bold tracking-[0.1em] uppercase" style={{ color: CORAL }}>
      {text}
    </p>
  )
  const title = (text: string, size = 32) => (
    <h2 className="m-0 mb-4 font-extrabold leading-[1.12] text-balance" style={{ fontFamily: 'var(--font-display)', fontSize: size }}>
      {text}
    </h2>
  )
  const body = (children: ReactNode) => <p className="m-0 text-[18px] leading-[1.5]">{children}</p>

  const screens = (() => {
    const out: { key: string; confetti?: ReactNode; sun?: boolean; content: ReactNode }[] = []
    const sinceStart = review.first > `${review.year}-01-01`
    out.push({
      key: 'cover',
      confetti: <Confetti n={30} seed={11} x={[4, 96]} y={[6, 26]} fall />,
      sun: true,
      content: (
        <>
          {settings.displayName.trim() && kicker(settings.displayName.trim())}
          <h1 className="dawn-title m-0 mb-3 font-extrabold leading-none" style={{ fontSize: 52 }}>
            {f(t.tileTitle, { year: review.year })}
          </h1>
          {body(sinceStart ? f(t.coverBodySince, { date: day(review.first) }) : t.coverBody)}
        </>
      ),
    })
    out.push({
      key: 'sky',
      content: (
        <>
          {kicker(t.skyKicker)}
          <h2 className="m-0 mb-4 font-extrabold leading-[1.12] text-balance" style={{ fontFamily: 'var(--font-display)', fontSize: 30 }}>
            <span className="sr-only">{f(t.skyTitle, { n: review.logged })}</span>
            {/* The final sentence, with only its figures climbing in a box as wide as the final one: the title never changes shape. */}
            <span aria-hidden>
              {f(t.skyTitle, { n: review.logged })
                .split(String(review.logged))
                .flatMap((part, k) =>
                  k === 0
                    ? [part]
                    : [
                        <span key={k} className="inline-block text-right tabular-nums" style={{ minWidth: `${String(review.logged).length}ch` }}>
                          {skyCount}
                        </span>,
                        part,
                      ]
                )}
            </span>
          </h2>
          <YearSky days={review.days} animate />
          <div className="mt-5">
            {body(
              review.gentle > 0 ? (
                <>
                  {t.skyGentleBefore}
                  <b className="ys-sweep" style={marked}>
                    {f(t.skyGentleMarked, { n: review.gentle })}
                  </b>
                  {t.skyGentleAfter}
                </>
              ) : (
                t.skyNoGentle
              )
            )}
          </div>
        </>
      ),
    })
    if (review.flares.length > 0) {
      const longest = Math.max(...review.flares)
      out.push({
        key: 'flares',
        confetti: <Confetti n={14} seed={5} x={[55, 96]} y={[5, 20]} />,
        content: (
          <>
            {kicker(t.flaresKicker)}
            {title(f(t.flaresTitle, { n: review.flares.length }), 34)}
            <div aria-hidden className="flex flex-col gap-2 mb-5">
              {review.flares.slice(-8).map((d, k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="h-2 rounded ys-grow" style={{ width: `${Math.max(6, (d / longest) * 60)}%`, background: 'rgba(87,74,122,.45)', animationDelay: `${300 + k * 120}ms` }} />
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: APRICOT, boxShadow: `0 0 8px ${APRICOT}` }} />
                  <span className="text-[14px]" style={{ color: MUTED }}>
                    {f(t.days, { n: d })}
                  </span>
                </div>
              ))}
            </div>
            {review.calm && body(f(t.calm, { n: review.calm.days, from: day(review.calm.start), to: day(review.calm.end) }))}
          </>
        ),
      })
    } else if (review.calm) {
      out.push({
        key: 'calm',
        confetti: <Confetti n={14} seed={5} x={[55, 96]} y={[5, 20]} />,
        content: (
          <>
            {kicker(t.calmKicker)}
            {title(f(t.calmTitle, { n: review.calm.days }), 34)}
            {body(f(t.calmDates, { from: day(review.calm.start), to: day(review.calm.end) }))}
          </>
        ),
      })
    }
    if (review.helped.length > 0) {
      out.push({
        key: 'helped',
        content: (
          <>
            {kicker(t.helpedKicker)}
            {title(t.helpedTitle, 32)}
            <ul className="m-0 p-0 list-none flex flex-col gap-3 mb-5">
              {review.helped.map((h) => (
                <li key={h.label} className="flex items-baseline justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,.7)' }}>
                  <span className="text-[20px] font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                    {helperIn(h.label, language)}
                  </span>
                  <span className="text-[14px] shrink-0" style={{ color: MUTED }}>
                    {f(t.helpedRow, { n: h.days })}
                  </span>
                </li>
              ))}
            </ul>
            {body(t.helpedNote)}
          </>
        ),
      })
    }
    // One line per action: « chaleur (3 fois) et marche courte », never « chaleur, chaleur, chaleur ».
    function trialLines(): string[] {
      const total = trialCount(review.trials)
      const named = (a: string) => a.toLocaleLowerCase(language)
      if (total === 0) return []
      if (total === 1) return [f(t.didTrial, { list: named(review.trials[0]!.action) })]
      if (review.trials.length === 1) return [f(t.didTrialsSame, { n: total, action: named(review.trials[0]!.action) })]
      return [f(t.didTrials, { n: total, list: list(review.trials.map((x) => (x.times > 1 ? f(t.trialTimes, { action: named(x.action), n: x.times }) : named(x.action)))) })]
    }
    const did = [
      f(t.didDays, { n: review.logged }),
      ...trialLines(),
      ...(review.wroteNote ? [t.didNote] : []),
      ...(review.appointments > 0 ? [f(t.didAppointments, { n: review.appointments })] : []),
    ]
    out.push({
      key: 'did',
      content: (
        <>
          {kicker(t.didKicker)}
          {title(t.didTitle, 34)}
          <ul className="m-0 p-0 list-none flex flex-col gap-3">
            {did.map((line) => (
              <li key={line} className="flex gap-3 items-start text-[18px] leading-[1.45]">
                <span aria-hidden className="w-3 h-3 mt-2 rounded-full shrink-0" style={{ background: '#c9b6ee', boxShadow: '0 0 0 4px rgba(201,182,238,.3)' }} />
                {line}
              </li>
            ))}
          </ul>
        </>
      ),
    })
    out.push({
      key: 'end',
      confetti: <Confetti n={36} seed={23} x={[4, 96]} y={[5, 24]} fall />,
      sun: true,
      content: (
        <div className="text-center">
          {title(t.endTitle, 36)}
          <p className="m-0 mb-7 text-[18px] leading-[1.5]">{f(t.endBody, { next })}</p>
          <button type="button" data-story-action onClick={() => setI(out.length)} className="min-h-12 px-5 rounded-full text-control font-semibold" style={{ background: '#2c2860', color: '#fff' }}>
            {t.keep}
          </button>
        </div>
      ),
    })
    return out
  })()

  const count = screens.length + 1
  const go = (k: number) => setI(Math.max(0, Math.min(count - 1, k)))

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      opener?.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.target instanceof Element && e.target.closest('input, textarea')) return
      else if (e.key === 'ArrowRight') setI((k) => Math.min(count - 1, k + 1))
      else if (e.key === 'ArrowLeft') setI((k) => Math.max(0, k - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [count, onClose])

  const onCard = i === screens.length
  const screen = screens[i]

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={f(t.tileTitle, { year: review.year })}
      className="fixed inset-0 z-[200] overflow-hidden"
      style={{ background: DAWN, color: INK }}
      onClick={(e) => {
        if (onCard || (e.target as HTMLElement).closest('button, a, input, [data-story-action]')) return
        go(e.clientX < window.innerWidth / 3 ? i - 1 : i + 1)
      }}
    >
      {/* Keyed by screen, so each one plays its arrival once when it opens. */}
      <Fragment key={`confetti-${screen?.key}`}>{screen?.confetti}</Fragment>
      {screen?.sun && (
        <div key={`sun-${screen.key}`} aria-hidden className="ys-sun absolute left-1/2 -bottom-[170px] w-[380px] h-[380px] -ml-[190px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle,#ffd27a 0%,#f6c79a 38%,rgba(246,199,154,.35) 58%,transparent 72%)' }} />
      )}
      <div className="absolute left-4 right-4 flex gap-1" style={{ top: 'calc(var(--root-pad-top, 0px) + 14px)' }} role="img" aria-label={f(t.progress, { i: i + 1, n: count })}>
        {Array.from({ length: count }, (_, k) => (
          <span key={k} className="flex-1 h-[3px] rounded overflow-hidden" style={{ background: k < i ? '#2c2860' : 'rgba(44,40,96,.18)' }}>
            {k === i && <span key={i} className="ys-fill block h-full" style={{ background: '#2c2860' }} />}
          </span>
        ))}
      </div>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t.close}
        className="absolute right-3 w-11 h-11 rounded-full flex items-center justify-center"
        style={{ top: 'calc(var(--root-pad-top, 0px) + 26px)', background: 'rgba(255,255,255,.65)', color: '#2c2860' }}
      >
        <IconX size={20} aria-hidden />
      </button>

      {onCard ? (
        <YearCard review={review} onBack={() => go(0)} />
      ) : (
        <div key={`screen-${screen?.key}`} className="ys-rise absolute inset-x-0 mx-auto max-w-[440px] px-6" style={{ top: screen?.key === 'cover' ? '28%' : screen?.key === 'end' ? '30%' : '14%' }} aria-live="polite">
          {screen?.content}
        </div>
      )}

      {!onCard && (
        <>
          {i > 0 && (
            <button type="button" onClick={() => go(i - 1)} className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:bottom-4 focus:px-4 focus:min-h-11 focus:rounded-full focus:bg-white">
              {t.previous}
            </button>
          )}
          <button type="button" onClick={() => go(i + 1)} className="sr-only focus:not-sr-only focus:absolute focus:right-3 focus:bottom-4 focus:px-4 focus:min-h-11 focus:rounded-full focus:bg-white">
            {t.next}
          </button>
          {i === 0 && (
            <p aria-hidden className="absolute inset-x-0 text-center text-[14px] m-0" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 34px)', color: MUTED }}>
              {t.tapHint}
            </p>
          )}
        </>
      )}
    </div>,
    document.body
  )
}
