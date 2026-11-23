// The friend of the day in the read exercises: one pose per step. Drawn by hand in SVG (light, offline, no file).
// Decorative: the words of the step say everything, so the picture is hidden from screen readers. The friend takes the
// day's weather (a sun on an easy day, a cloud resting on a hard one) and stands on the page's own sky: no background.

import type { PainWeatherLevel } from '../../db/types'
import { FriendFigure } from '../friend/Friend'
import { FRIEND_INK, ON_STAGE, friendBody, useFriendLevel, type FriendEyes, type FriendMouth } from '../friend/friendLevel'

const MOVE = 'var(--friend-move)'
const AIR = 'var(--friend-air)'

function Friend({ level, eyes, mouth }: { level: PainWeatherLevel; eyes: FriendEyes; mouth: FriendMouth }) {
  return (
    <g transform={ON_STAGE}>
      <FriendFigure level={level} eyes={eyes} mouth={mouth} />
    </g>
  )
}

const Shadow = () => <ellipse cx="100" cy="119" rx="30" ry="4" fill="var(--color-brand)" opacity={0.12} />

const Hand = ({ cx, cy, level }: { cx: number; cy: number; level: PainWeatherLevel }) => <circle cx={cx} cy={cy} r="10" fill={friendBody(level)} stroke={FRIEND_INK} strokeWidth="1.6" />

const line = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' } as const

/** The relaxing exercise, step 0 to 4 (settle, jaw, shoulders, hands, belly), or the gentle moves, step 0 to 3 (lift, roll, tilt, hands on the belly). */
export function ReliefIllustration({ step, set = 'relax' }: { step: number; set?: 'relax' | 'gentle' }) {
  const level = useFriendLevel()
  const pose = `${set}-${step}`
  return (
    <svg viewBox="0 0 200 150" width="100%" aria-hidden focusable="false" className="block mx-auto max-w-[320px]">
      {pose === 'relax-0' && (
        <>
          <rect x="46" y="98" width="108" height="24" rx="12" fill="var(--friend-cushion)" />
          <Friend level={level} eyes="closed" mouth="smile" />
          <text x="150" y="36" fontSize="14" fill="var(--color-ink-muted)">
            z z
          </text>
        </>
      )}
      {pose === 'relax-1' && (
        <>
          <Shadow />
          <Friend level={level} eyes="closed" mouth="o" />
          <path d="M150 70 q10 -4 14 4 M154 58 q8 -3 12 3" stroke={AIR} strokeWidth="2.5" {...line} />
        </>
      )}
      {pose === 'relax-2' && (
        <>
          <Shadow />
          <Friend level={level} eyes="closed" mouth="calm" />
          <path d="M68 106 q-7 -8 -2 -19 M132 106 q7 -8 2 -19" stroke="var(--friend-limb)" strokeWidth="3" {...line} />
          <path d="M38 66 v18 m-5 -6 l5 7 l5 -7 M162 66 v18 m-5 -6 l5 7 l5 -7" stroke={MOVE} strokeWidth="2.6" {...line} />
        </>
      )}
      {pose === 'relax-3' && (
        <>
          <Shadow />
          <Friend level={level} eyes="open" mouth="smile" />
          <Hand cx={56} cy={118} level={level} />
          <Hand cx={144} cy={118} level={level} />
          <path d="M50 104 l-4 -6 M56 102 v-8 M62 104 l4 -6 M138 104 l-4 -6 M144 102 v-8 M150 104 l4 -6" stroke={MOVE} strokeWidth="2" {...line} />
        </>
      )}
      {pose === 'relax-4' && (
        <>
          <Shadow />
          <Friend level={level} eyes="closed" mouth="smile" />
          <circle cx="100" cy="99" r="6" fill="var(--friend-cheek)" opacity={0.55} />
          <circle cx="152" cy="64" r="11" stroke={AIR} strokeWidth="2" strokeDasharray="2 5" {...line} />
        </>
      )}
      {pose === 'gentle-0' && (
        <>
          <Shadow />
          <Friend level={level} eyes="open" mouth="smile" />
          <path d="M66 98 q-9 -8 -4 -21 M134 98 q9 -8 4 -21" stroke="var(--friend-limb)" strokeWidth="3" {...line} />
          <path d="M38 86 v-18 m-5 6 l5 -7 l5 7 M162 86 v-18 m-5 6 l5 -7 l5 7" stroke={MOVE} strokeWidth="2.6" {...line} />
        </>
      )}
      {pose === 'gentle-1' && (
        <>
          <Shadow />
          <Friend level={level} eyes="open" mouth="smile" />
          <path d="M34 98 a14 14 0 1 1 6 -12 m-1 -6 l1 7 l7 -3 M166 98 a14 14 0 1 0 -6 -12 m1 -6 l-1 7 l-7 -3" stroke={MOVE} strokeWidth="2.5" {...line} />
        </>
      )}
      {pose === 'gentle-2' && (
        <>
          <Shadow />
          <g transform="rotate(12 100 112)">
            <Friend level={level} eyes="closed" mouth="calm" />
          </g>
          <path d="M152 46 q10 8 6 22" stroke={AIR} strokeWidth="2.5" strokeDasharray="1 6" {...line} />
        </>
      )}
      {pose === 'gentle-3' && (
        <>
          <Shadow />
          <Friend level={level} eyes="closed" mouth="smile" />
          <Hand cx={88} cy={103} level={level} />
          <Hand cx={112} cy={103} level={level} />
        </>
      )}
    </svg>
  )
}
