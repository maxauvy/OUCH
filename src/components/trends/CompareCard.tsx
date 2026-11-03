import { useState } from 'react'
import { format as formatDate } from 'date-fns'
import type { LoggedEntry } from '../../db/types'
import { shiftISO } from '../../lib/dates'
import { comparePeriods, presetSpans, validSpans, type PresetKind, type Span } from '../../lib/periodComparison'
import { format, useLanguage, useLocale, useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

type Choice = PresetKind | 'free'

const field = { background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }
const fieldClass = 'rounded-xl px-2.5 py-2 text-control outline-none min-w-0 flex-1'

/** Two stretches of the diary side by side: the same measures on each, the days logged, and the gap in mean pain read against how much two stretches of that length usually differ for the person. A description, never a verdict. */
export function CompareCard({
  entries,
  today,
  lastVisit,
  flareDays,
  stiffnessTracked,
}: {
  entries: LoggedEntry[]
  today: string
  /** The day of the last appointment, when one was noted. */
  lastVisit?: string
  /** Days inside a detected flare, or null when flares cannot be told. */
  flareDays: ReadonlySet<string> | null
  stiffnessTracked: boolean
}) {
  const i18n = useTranslation()
  const t = i18n.compare
  const language = useLanguage()
  const { dateFnsLocale, intlLocale } = useLocale()
  const [choice, setChoice] = useState<Choice>('days30')
  const [freeA, setFreeA] = useState<Span>({ from: shiftISO(today, -59), to: shiftISO(today, -30) })
  const [freeB, setFreeB] = useState<Span>({ from: shiftISO(today, -29), to: today })
  const nf = new Intl.NumberFormat(intlLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const day = (iso: string) => formatDate(new Date(iso + 'T00:00:00'), 'd MMM', { locale: dateFnsLocale })

  const spans = choice === 'free' ? { a: freeA, b: freeB } : presetSpans(choice, today, lastVisit)
  const valid = spans ? validSpans(spans.a, spans.b, today) : false
  const result = spans && valid ? comparePeriods(entries, spans.a, spans.b, flareDays, today) : null

  const presets: [Choice, string][] = [['days30', t.presetDays30], ...(lastVisit ? ([['sinceVisit', t.presetSinceVisit]] as [Choice, string][]) : []), ['free', t.presetFree]]
  const range = (s: Span) => format(t.range, { from: day(s.from), to: day(s.to) }, language)
  const pain = (v: number | null) => (v === null ? '—' : nf.format(v))
  const stiff = (b: string | null) => (b ? i18n.entryForm.morningStiffnessBands[b as keyof typeof i18n.entryForm.morningStiffnessBands] : '—')
  const dateInput = (label: string, value: string, set: (v: string) => void) => (
    <input type="date" aria-label={label} value={value} max={today} onChange={(e) => e.target.value && set(e.target.value)} className={fieldClass} style={{ ...field, minWidth: '9.5rem' }} />
  )

  return (
    <Card>
      <SectionTitle>{t.title}</SectionTitle>
      <p className="text-caption mb-2" style={{ color: 'var(--color-ink-muted)' }}>
        {t.helper}
      </p>
      <div role="group" aria-label={t.title} className="flex flex-wrap gap-2 mb-3">
        {presets.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={choice === key}
            onClick={() => setChoice(key)}
            className="rounded-[var(--radius-control)] px-3.5 py-1.5 text-caption font-semibold"
            style={{ background: choice === key ? 'var(--color-brand)' : 'var(--color-brand-soft)', color: choice === key ? 'var(--color-on-brand)' : 'var(--color-brand)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {choice === 'free' && (
        <div className="flex flex-col gap-2 mb-3">
          {([[t.periodA, freeA, setFreeA], [t.periodB, freeB, setFreeB]] as const).map(([label, span, set]) => (
            <div key={label} className="flex items-center gap-2 flex-wrap">
              <span className="text-caption font-semibold w-full">{label}</span>
              <span className="text-caption">{t.from}</span>
              {dateInput(`${label} ${t.from}`, span.from, (v) => set({ ...span, from: v }))}
              <span className="text-caption">{t.to}</span>
              {dateInput(`${label} ${t.to}`, span.to, (v) => set({ ...span, to: v }))}
            </div>
          ))}
        </div>
      )}

      {/* The reading changes when a choice changes: said to a screen reader without moving focus. */}
      <div aria-live="polite">
        {spans && !valid && <p className="text-control">{t.overlap}</p>}
        {result && !result.enough && <p className="text-control">{format(t.tooFew, { a: result.a.logged, b: result.b.logged }, language)}</p>}
        {spans && result?.enough && (
          <>
            <table className="w-full text-control">
              <thead>
                <tr style={{ color: 'var(--color-ink-muted)' }}>
                  <td className="py-1" />
                  <th scope="col" className="text-right font-normal py-1">{range(spans.a)}</th>
                  <th scope="col" className="text-right font-normal py-1">{range(spans.b)}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t.colPain, pain(result.a.pain), pain(result.b.pain)],
                  [t.colSevere, String(result.a.severe), String(result.b.severe)],
                  ...(result.a.flareDays !== null && result.b.flareDays !== null ? [[t.colFlares, String(result.a.flareDays), String(result.b.flareDays)]] : []),
                  ...(stiffnessTracked ? [[t.colStiffness, stiff(result.a.stiffness), stiff(result.b.stiffness)]] : []),
                  [t.colLogged, `${result.a.logged} / ${result.a.days}`, `${result.b.logged} / ${result.b.days}`],
                ].map(([label, a, b]) => (
                  <tr key={label} className="border-t" style={{ borderColor: 'var(--color-hairline)' }}>
                    <th scope="row" className="text-left font-normal py-1.5 pr-2">{label}</th>
                    <td className="text-right tabular-nums py-1.5">{a}</td>
                    <td className="text-right tabular-nums py-1.5 font-semibold">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-body mt-3">
              {result.diff === null || Math.abs(result.diff) < 0.05
                ? t.same
                : format(result.diff < 0 ? t.lower : t.higher, { diff: nf.format(Math.abs(result.diff)) }, language)}{' '}
              {result.gap === null ? t.noUsual : format(result.within ? t.within : t.outside, { gap: nf.format(result.gap) }, language)}
            </p>
            <p className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
              {t.note}
            </p>
          </>
        )}
      </div>
    </Card>
  )
}
