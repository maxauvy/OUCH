import { useMemo, useState } from 'react'
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
import type { DailyEntry } from '../../db/types'
import { computePainWeather } from '../../lib/painWeather'
import { themeFor } from '../../lib/theme'
import { useSettings } from '../../hooks/useSettings'
import { useIsDark } from '../../hooks/useIsDark'
import { useLocale, useTranslation } from '../../i18n'

export function CalendarHeatmap({
  entries,
  onSelectDate,
  selectedDate,
}: {
  entries: DailyEntry[]
  onSelectDate: (date: string) => void
  selectedDate?: string
}) {
  const [cursor, setCursor] = useState(new Date())
  const settings = useSettings()
  const t = themeFor(useIsDark(settings.theme))
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
          className="w-9 h-9 rounded-full flex items-center justify-center text-[16px]"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-label={i18n.calendar.prevMonth}
        >
          ‹
        </button>
        <span className="font-semibold text-[15px] capitalize">
          {format(cursor, 'MMMM yyyy', { locale: dateFnsLocale })}
        </span>
        <button
          onClick={() => setCursor((c) => addMonths(c, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[16px]"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-label={i18n.calendar.nextMonth}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium" style={{ color: 'var(--color-ink-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          const entry = byDate.get(key)
          const inMonth = isSameMonth(day, cursor)
          const weather = entry ? computePainWeather(entry) : null
          const selected = key === selectedDate

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              className="aspect-square rounded-xl flex flex-col items-center justify-center relative text-[13px] font-medium"
              style={{
                background: weather ? weather.soft : 'transparent',
                color: weather ? weather.color : 'var(--color-ink-muted)',
                opacity: inMonth ? 1 : 0.35,
                outline: selected ? `2px solid ${t.brand}` : isToday(day) ? `1.5px solid ${t.inkMuted}` : 'none',
                outlineOffset: -2,
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
            </button>
          )
        })}
      </div>
    </div>
  )
}
