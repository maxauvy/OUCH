import { useId, useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { hasPain } from '../../lib/loggedEntries'
import type { DailyEntry, PainWeatherLevel } from '../../db/types'
import { computePainWeather, painWeatherByLevel, painWeatherTile } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { usePalette } from '../../hooks/usePalette'
import { useLocale, useTranslation } from '../../i18n'

export function CalendarHeatmap({
  entries,
  onSelectDate,
  selectedDate,
  flareDays,
  markedDays,
}: {
  entries: DailyEntry[]
  onSelectDate: (date: string) => void
  selectedDate?: string
  /** Days inside a flare, marked by a short bar under the number */
  flareDays?: Set<string>
  /** Days of a period the person marked themselves: a hollow bar, apart from the detected ones */
  markedDays?: Set<string>
}) {
  const [cursor, setCursor] = useState(() => new Date())
  // The month the page was opened in (read once: not while rendering).
  const [openedIn] = useState(() => new Date())
  const t = usePalette()
  const i18n = useTranslation()
  const { dateFnsLocale } = useLocale()
  const WEEKDAYS = i18n.calendar.weekdaysShort
  const byDate = useMemo(() => {
    const m = new Map<string, DailyEntry>()
    for (const e of entries) m.set(e.date, e)
    return m
  }, [entries])

  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const withNoPain = (day: Date) => {
    const e = byDate.get(format(day, 'yyyy-MM-dd'))
    return !!e && !hasPain(e)
  }
  const anyNoPain = days.some((d) => isSameMonth(d, cursor) && withNoPain(d))

  return (
    <div>
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center text-[16px]"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-label={i18n.calendar.prevMonth}
        >
          ‹
        </button>
        <span className="flex flex-col items-center">
          {/* As tall as the arrows, so the month stays level with them. */}
          <span className="flex h-11 items-center font-semibold text-body capitalize">{format(cursor, 'MMMM yyyy', { locale: dateFnsLocale })}</span>
          {/* Only away from the current month: the way back, soft like the arrows. Its place is kept, so the month does not jump when it comes and goes. */}
          <span className="-mt-2 h-[22px]">
            {!isSameMonth(cursor, openedIn) && (
              <button
                type="button"
                onClick={() => setCursor(new Date())}
                aria-label={i18n.calendar.todayLabel}
                className="rounded-full px-3 py-0.5 text-caption font-semibold"
                style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
              >
                {i18n.calendar.today}
              </button>
            )}
          </span>
        </span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="w-11 h-11 rounded-[var(--radius-control)] flex items-center justify-center text-[16px]"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-label={i18n.calendar.nextMonth}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-caption font-medium" style={{ color: 'var(--color-ink-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const entry = byDate.get(key)
          const inMonth = isSameMonth(day, cursor)
          const weather = entry && hasPain(entry) ? computePainWeather(entry) : null
          // Days of the neighbouring months keep only the dot: no tint, and a
          // muted number that still reads (fading the whole cell didn't).
          const tinted = weather && inMonth ? weather : null
          // Its colours follow the mode: pale tints in light, deep ones in dark (see index.css).
          const tone = tinted ? painWeatherTile(tinted.level) : null
          const selected = key === selectedDate
          const today = isToday(day)
          const dayLabel = format(day, 'd MMMM yyyy', { locale: dateFnsLocale })
          const inFlare = !!flareDays?.has(key)
          const inMarked = !!markedDays?.has(key)
          const noPain = !weather && withNoPain(day)
          const label = [dayLabel, weather ? i18n.painWeatherLevels[weather.level] : null, noPain ? i18n.calendar.noPain : null, inFlare ? i18n.calendar.flareDay : null, inMarked ? i18n.markedFlare.dayLabel : null]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              aria-label={label}
              aria-current={today ? 'date' : undefined}
              aria-pressed={selected}
              // With an icon, the number and the icon sit at the top of the cell,
              // so the flare bar under them crosses neither.
              className={`aspect-square rounded-xl flex flex-col items-center relative text-caption leading-none ${weather ? 'justify-start pt-[3px]' : 'justify-center'} ${inMonth ? 'font-medium' : 'font-normal'}`}
              style={{
                background: tone ? tone.tile : 'transparent',
                // The weather color stays on the background; the number takes
                // the weather's own dark shade on the pale tint (4.6:1 or more),
                // and the page's own light ink on the deep tint of dark mode.
                color: tone ? tone.mark : 'var(--color-ink-muted)',
                // Inset rings rather than outlines, so the keyboard focus
                // outline stays free.
                boxShadow: selected ? `inset 0 0 0 2px ${t.brand}` : today ? `inset 0 0 0 1.5px ${tone ? tone.mark : t.inkMuted}` : undefined,
              }}
            >
              {format(day, 'd')}
              {/* The weather's shape, in the day's own ink: the tints of two
                  neighbouring weathers are almost the same (1.00 to 1.04:1)
                  and a dot of the weather colour is under 3:1 on its tint, so
                  colour alone could not tell the five apart. Days of the
                  neighbouring months keep the muted ink of their number. */}
              {weather && (
                <WeatherIcon
                  name={weather.icon as never}
                  size={14}
                  className="mt-[2px]"
                  style={{ color: tone ? tone.glyph : 'var(--color-ink-muted)' }}
                />
              )}
              {noPain && <NoPainRing color={inMonth ? 'var(--color-ink-muted)' : 'var(--color-hairline)'} className="mt-0.5" />}
              {inFlare && <FlareBar color={tone ? tone.mark : 'var(--color-ink-muted)'} className={`absolute ${weather ? 'bottom-[2px]' : 'bottom-1.5'}`} />}
              {inMarked && <MarkedBar color={tone ? tone.mark : 'var(--color-ink-muted)'} className={`absolute ${weather ? 'bottom-[2px]' : 'bottom-1.5'} ${inFlare ? 'translate-y-[-5px]' : ''}`} />}
            </button>
          )
        })}
      </div>

      <WeatherLegend withFlare={!!flareDays?.size} withMarked={!!markedDays?.size} withNoPain={anyNoPain} />
    </div>
  )
}

/** A flare day's mark: shape and position, not colour, carry it; it takes the
 * day's own ink, which already contrasts with the tint. */
function FlareBar({ color, className = '' }: { color: string; className?: string }) {
  return <span className={`block w-4 h-[2.5px] rounded-full ${className}`} style={{ background: color }} aria-hidden />
}

/** A day of a period the person marked: the same bar, hollow, so the two are told apart by shape and not by colour. */
function MarkedBar({ color, className = '' }: { color: string; className?: string }) {
  return <span className={`block w-4 h-[6px] rounded-full box-border ${className}`} style={{ border: `2px solid ${color}` }} aria-hidden />
}

/** A day with something noted but no pain level: the weather's dot, left
 * hollow. Shape carries it, so it needs no colour of its own. */
function NoPainRing({ color, className = '' }: { color: string; className?: string }) {
  return <span className={`block w-1.5 h-1.5 rounded-full box-border ${className}`} style={{ border: `1.5px solid ${color}` }} aria-hidden />
}

const LEVELS: PainWeatherLevel[] = [1, 2, 3, 4, 5]

/** The five weathers, easiest day first, so the calendar's colors can be read. */
function WeatherLegend({ withFlare, withMarked, withNoPain }: { withFlare: boolean; withMarked: boolean; withNoPain: boolean }) {
  const i18n = useTranslation()
  const id = useId()
  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <p id={id} className="sr-only">
        {i18n.calendar.legend}
      </p>
      {/* Wraps rather than squeezing five labels into five columns: "Quelques
          nuages" doesn't fit a fifth of a phone, less so with larger text. */}
      <ul aria-labelledby={id} className="flex flex-wrap gap-x-3 gap-y-2">
        {LEVELS.map((level) => {
          const w = painWeatherByLevel(level)
          const tone = painWeatherTile(level)
          return (
            <li key={level} className="flex items-center gap-1.5">
              <span
                className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center"
                style={{ background: tone.tile, color: tone.glyph }}
                aria-hidden
              >
                <WeatherIcon name={w.icon as never} size={18} />
              </span>
              <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
                {i18n.painWeatherLevels[level]}
              </span>
            </li>
          )
        })}
        {withNoPain && (
          <li className="flex items-center gap-1.5">
            <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center" aria-hidden>
              <NoPainRing color="var(--color-ink-muted)" />
            </span>
            <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {i18n.calendar.noPain.charAt(0).toLocaleUpperCase() + i18n.calendar.noPain.slice(1)}
            </span>
          </li>
        )}
        {withMarked && (
          <li className="flex items-center gap-1.5">
            <span className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-brand-soft)' }} aria-hidden>
              <MarkedBar color="var(--color-ink-muted)" />
            </span>
            <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {i18n.markedFlare.legend}
            </span>
          </li>
        )}
        {withFlare && (
          <li className="flex items-center gap-1.5">
            <span
              className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--color-brand-soft)' }}
              aria-hidden
            >
              <FlareBar color="var(--color-ink-muted)" />
            </span>
            <span className="text-caption" style={{ color: 'var(--color-ink-muted)' }}>
              {i18n.calendar.flareDay.charAt(0).toLocaleUpperCase() + i18n.calendar.flareDay.slice(1)}
            </span>
          </li>
        )}
      </ul>
    </div>
  )
}
