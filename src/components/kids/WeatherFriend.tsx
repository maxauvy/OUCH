import type { PainWeatherLevel } from '../../db/types'
import { FriendFigure } from '../friend/Friend'

/** The day's weather as the friend of the day (see `FriendFigure`), a little alive: it floats, blinks, and on the harder days a few drops or a soft flash pass under it. On the hardest days it is resting, never upset: the page is meant to reassure a child. Decorative: the words next to it say the same. */
export function WeatherFriend({ level, size = 132 }: { level: PainWeatherLevel; size?: number }) {
  return (
    <svg viewBox="0 0 128 128" width={size} height={size} aria-hidden className="mx-auto block -mb-4">
      <g className="wf-bob">
        <FriendFigure level={level} moving />
        {level === 2 && (
          <g fill="var(--friend-white)" opacity=".95">
            <circle cx="86" cy="94" r="14" />
            <circle cx="102" cy="98" r="11" />
            <rect x="74" y="94" width="40" height="15" rx="7.5" />
          </g>
        )}
        {level === 4 && (
          <g stroke="var(--friend-air)" strokeWidth="4" strokeLinecap="round">
            <path className="wf-drop" d="M44 108l-3 8" />
            <path className="wf-drop wf-drop-2" d="M64 108l-3 8" />
            <path className="wf-drop wf-drop-3" d="M84 108l-3 8" />
          </g>
        )}
        {level === 5 && <path className="wf-flash" d="M70 100l-8 12h8l-6 12 14-16h-8l6-8z" fill="var(--friend-ray)" />}
      </g>
    </svg>
  )
}
