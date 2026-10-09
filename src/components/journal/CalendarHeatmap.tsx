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
import { computePainWeather, painWeatherByLevel } from '../../lib/painWeather'
import { WeatherIcon } from '../ui/WeatherIcon'
import { usePalette } from '../../hooks/usePalette'
import { useLocale, useTranslation } from '../../i18n'

export function CalendarHeatmap({
  entries,
  onSelectDate,
  selectedDate,
  flareDays,
}: {
  entries: DailyEntry[]
  onSelectDate: (date: string) => void
  selectedDate?: string
  /** Days inside a flare, marked by a short bar under the number */
  flareDays?: Set<string>
}) {
  const [cursor, setCursor] = useState(new Date())
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

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCursor((c) => addMonths(c, -1))}
          className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center text-[16px]"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-label={i18n.calendar.prevMonth}
        >
          ‹
        </button>
        <span className="font-semibold text-body capitalize">
          {format(cursor, 'MMMM yyyy', { locale: dateFnsLocale })}
        </span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center text-[16px]"
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
          const selected = key === selectedDate
          const today = isToday(day)
          const dayLabel = format(day, 'd MMMM yyyy', { locale: dateFnsLocale })
          const inFlare = !!flareDays?.has(key)
          const label = [dayLabel, weather ? i18n.painWeatherLevels[weather.level] : null, inFlare ? i18n.calendar.flareDay : null]
            .filter(Boolean)
            .join(', ')

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              aria-label={label}
              aria-current={today ? 'date' : undefined}
              aria-pressed={selected}
              className={`aspect-square rounded-xl flex flex-col items-center justify-center relative text-caption ${inMonth ? 'font-medium' : 'font-normal'}`}
              style={{
                background: tinted ? tinted.soft : 'transparent',
                // The weather color stays on the background and the dot; the
                // number takes the weather's own dark shade (4.6:1 or more on
                // its tint). The tints stay light in dark mode, so the app's
                // ink, light there, can't be used on them.
                color: tinted ? tinted.ink : 'var(--color-ink-muted)',
                // Inset rings rather than outlines, so the keyboard focus
                // outline stays free.
                boxShadow: selected ? `inset 0 0 0 2px ${t.brand}` : today ? `inset 0 0 0 1.5px ${tinted ? tinted.ink : t.inkMuted}` : undefined,
              }}
            >
              {format(day, 'd')}
              {weather && (
                <span
                  className="w-1.5 h-1.5 rounded-full mt-0.5"
                  style={{ background: weather.color }}
                  aria-hidden
                />
              )}
              {inFlare && <FlareBar color={tinted ? tinted.ink : 'var(--color-ink-muted)'} className="absolute bottom-1.5" />}
            </button>
          )
        })}
      </div>

      <WeatherLegend withFlare={!!flareDays?.size} />
    </div>
  )
}

/** A flare day's mark: shape and position, not colour, carry it; it takes the
 * day's own ink, which already contrasts with the tint. */
function FlareBar({ color, className = '' }: { color: string; className?: string }) {
  return <span className={`block w-4 h-[2.5px] rounded-full ${className}`} style={{ background: color }} aria-hidden />
}

const LEVELS: PainWeatherLevel[] = [1, 2, 3, 4, 5]

/** The five weathers, easiest day first, so the calendar's colors can be read. */
function WeatherLegend({ withFlare }: { withFlare: boolean }) {
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
          return (
            <li key={level} className="flex items-center gap-1.5">
              <span
                className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center"
                style={{ background: w.soft, color: w.ink }}
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
