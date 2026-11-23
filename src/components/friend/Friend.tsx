import type { PainWeatherLevel } from '../../db/types'
import { FRIEND_INK, friendBody, isResting, isSunny, type FriendEyes, type FriendMouth } from './friendLevel'

/**
 * The friend of the day: one character for the whole app, the child view's and the exercises'. It takes the day's
 * weather: a sun when the day is easy (levels 1 and 2), a soft cloud in between (3), a cloud resting, eyes closed,
 * on the hard days (4 and 5). Never upset, never a storm: it is there to reassure.
 *
 * Drawn here once, on a 128 x 128 frame, with the colours of index.css (`--friend-*`), which stay the same in both
 * themes: the friend is a light character on any sky.
 */

/**
 * The friend itself, on the 128 frame: its rays or its cloud, its cheeks, its eyes and mouth. `eyes` and `mouth`
 * follow the day unless a pose asks otherwise; a resting friend keeps its eyes closed. `moving` adds the slow turn
 * of the rays and the blink of the child view (both stopped for those who asked for less motion).
 */
export function FriendFigure({ level, eyes, mouth = 'smile', moving = false }: { level: PainWeatherLevel; eyes?: FriendEyes; mouth?: FriendMouth; moving?: boolean }) {
  const sunny = isSunny(level)
  const resting = isResting(level)
  const closed = resting || eyes === 'closed'
  const smile = level === 3 ? 'M54 82 q10 8 20 0' : resting ? 'M56 82 q8 5 16 0' : 'M50 80 q14 14 28 0'
  return (
    <g>
      {sunny && (
        <g className={moving ? 'wf-rays' : undefined} stroke="var(--friend-ray)" strokeWidth="5" strokeLinecap="round">
          <path d="M64 8v12M64 108v12M8 64h12M108 64h12M24 24l8 8M96 96l8 8M104 24l-8 8M32 96l-8 8" />
        </g>
      )}
      {sunny ? (
        <circle cx="64" cy="64" r="34" fill={friendBody(level)} />
      ) : (
        <g style={{ fill: friendBody(level) }}>
          <circle cx="42" cy="70" r="24" />
          <circle cx="68" cy="56" r="28" />
          <circle cx="90" cy="72" r="22" />
          <rect x="30" y="68" width="74" height="28" rx="14" />
        </g>
      )}
      <g fill={FRIEND_INK} stroke={FRIEND_INK} strokeLinecap="round">
        {closed ? (
          <path d="M46 68q6 5 12 0M70 68q6 5 12 0" fill="none" strokeWidth="3.5" />
        ) : (
          <g className={moving ? 'wf-blink' : undefined}>
            <circle cx="52" cy="66" r="4" stroke="none" />
            <circle cx="76" cy="66" r="4" stroke="none" />
          </g>
        )}
        {mouth === 'smile' && <path d={smile} fill="none" strokeWidth="4" />}
        {mouth === 'o' && <ellipse cx="64" cy="83" rx="5" ry="6" stroke="none" opacity="0.85" />}
        {mouth === 'calm' && <path d="M58 83h12" fill="none" strokeWidth="4" />}
      </g>
      <g fill="var(--friend-cheek)" opacity=".55">
        <circle cx="42" cy="78" r="5" />
        <circle cx="86" cy="78" r="5" />
      </g>
    </g>
  )
}
