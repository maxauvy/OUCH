import { useEffect, useRef, useState } from 'react'
import { IconChevronLeft } from '@tabler/icons-react'
import { useTodayEntry } from '../../hooks/useEntries'
import { useTranslation } from '../../i18n'
import { ENDINGS, pickEnding } from '../../lib/relief'
import { BUTTON, SECONDARY } from '../today/cardStyles'
import { addHelped } from './helpers'
import { FriendFigure } from '../friend/Friend'
import { useFriendLevel } from '../friend/friendLevel'

// A fill that stands out on the white card (the soft brand tint alone was too pale to see).
const SOFT = 'color-mix(in srgb, var(--color-brand) 16%, var(--color-surface))'
const BRAND = 'var(--color-brand)'

/** A pebble settles and a tick draws itself; rings widen around it. */
function Settle() {
  const ring = (delay: number) => <ellipse className="end-ring" style={{ animationDelay: `${delay}s` }} cx="100" cy="62" rx="62" ry="46" fill="none" stroke={BRAND} strokeWidth="1.5" />
  return (
    <>
      {ring(0)}
      {ring(1.2)}
      <path className="end-pop" d="M104 14 C148 10 176 48 168 84 C162 108 134 118 96 114 C58 110 32 86 38 56 C44 30 68 16 104 14Z" fill={SOFT} stroke="var(--color-hairline)" strokeWidth="1" />
      <path className="end-draw" d="M80 64 L97 80 L128 46" fill="none" stroke={BRAND} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )
}

/** A few bubbles rise slowly around a heart. */
function Bubbles() {
  const bubble = (cx: number, cy: number, r: number, delay: number) => <circle key={cx} className="end-bub" style={{ animationDelay: `${delay}s` }} cx={cx} cy={cy} r={r} fill={SOFT} stroke={BRAND} strokeWidth="1" />
  return (
    <>
      {bubble(50, 108, 7, 0)}
      {bubble(84, 112, 10, 0.7)}
      {bubble(120, 108, 6, 1.5)}
      {bubble(150, 112, 9, 2.2)}
      {bubble(102, 110, 5, 3)}
      <g className="end-pop">
        <circle cx="100" cy="56" r="32" fill={SOFT} />
        <path d="M100 72 C84 62 84 46 94 44 C98 43 100 46 100 48 C100 46 102 43 106 44 C116 46 116 62 100 72Z" fill="none" stroke={BRAND} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
    </>
  )
}

/** Five petals open one after the other. */
function Flower() {
  const petal = (angle: number, delay: number, tall = false) => (
    <path
      key={angle}
      className="end-petal"
      style={{ ['--r' as string]: `${angle}deg`, animationDelay: `${delay}s`, transformOrigin: '100px 112px' }}
      d={tall ? 'M100 112 C84 90 84 56 100 30 C116 56 116 90 100 112Z' : 'M100 112 C86 92 86 62 100 42 C114 62 114 92 100 112Z'}
      fill={SOFT}
      stroke={BRAND}
      strokeWidth={tall ? 2 : 1.5}
    />
  )
  return (
    <>
      {petal(-62, 0.1)}
      {petal(62, 0.25)}
      {petal(-30, 0.4)}
      {petal(30, 0.55)}
      {petal(0, 0.7, true)}
    </>
  )
}

/** The friend of the day, eyes closed, at ease; rings widen around it. */
function Friend() {
  const level = useFriendLevel()
  const ring = (delay: number) => <ellipse className="end-ring" style={{ animationDelay: `${delay}s` }} cx="100" cy="62" rx="62" ry="46" fill="none" stroke={BRAND} strokeWidth="1.5" />
  return (
    <>
      {ring(0)}
      {ring(1.2)}
      <g className="end-pop">
        <g transform="translate(55.2 17.2) scale(0.7)">
          <FriendFigure level={level} eyes="closed" />
        </g>
      </g>
    </>
  )
}

const ART = [Settle, Bubbles, Flower, Friend]

/** The picture shown last, in this session: the next one is another. */
let lastEnding: number | undefined

/**
 * The end of an exercise (breathing, the two read ones, a gesture's timer): one of four soft pictures (the last is the friend of the day), picked at random each time, a word, a line saying what was done, and the ways out. Nothing is counted or scored; adding the exercise to "what helped" is one tap from the person, never made for them.
 * `action` is what would be added to today's "what helped"; `info` says what was done ("3 min of breathing").
 */
export function ExerciseEnd({ info, action, onAgain, onBack, backLabel }: { info: string; action: string; onAgain: () => void; onBack: () => void; backLabel: string }) {
  const t = useTranslation().relief
  const today = useTodayEntry()
  const [variant] = useState(() => pickEnding(Math.random, lastEnding))
  // Remembered once it is on screen (not while rendering, which React may do twice).
  useEffect(() => {
    lastEnding = variant
  }, [variant])
  const [added, setAdded] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const words = t.end.variants[variant % ENDINGS] ?? t.end.variants[0]!
  const Art = ART[variant % ENDINGS]!
  const already = added || (today?.positiveActions ?? []).some((a) => a.trim().toLocaleLowerCase() === action.toLocaleLowerCase())

  // The exercise screen was just replaced: the focus goes to the word, which a screen reader then reads.
  useEffect(() => heading.current?.focus(), [])

  return (
    <div className="flex flex-col items-center gap-2 text-center py-2">
      <svg viewBox="0 0 200 120" className="w-60 max-w-full h-auto" aria-hidden>
        <Art />
      </svg>
      <h2 ref={heading} tabIndex={-1} className="text-heading font-bold leading-snug outline-none">
        {words.title}
      </h2>
      {words.note && <p className="text-body">{words.note}</p>}
      <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        {info}
      </p>
      {already ? (
        <p className="text-caption mt-2" style={{ color: 'var(--color-ink-muted)' }}>
          {t.added}
        </p>
      ) : (
        <>
          <button type="button" onClick={() => void addHelped(action).then(() => setAdded(true))} className={`${BUTTON} mt-2 w-full`} style={SECONDARY}>
            {t.addHelped}
          </button>
          <p className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.end.nothingAdded}
          </p>
        </>
      )}
      <div className="flex flex-col items-center">
        <button type="button" onClick={onAgain} className="min-h-11 px-3 text-control font-semibold underline underline-offset-2" style={{ color: 'var(--color-brand)' }}>
          {t.again}
        </button>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 min-h-11 px-3 text-control font-semibold" style={{ color: 'var(--color-brand)' }}>
          <IconChevronLeft size={18} aria-hidden />
          {backLabel}
        </button>
      </div>
    </div>
  )
}
