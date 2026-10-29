import { useState } from 'react'
import { updateSettings } from '../../db'
import { todayISO } from '../../lib/dates'
import { ILLNESSES, ILLNESS_STATUSES, type Illness, type IllnessStatus } from '../../db/types'
import { useSettings } from '../../hooks/useSettings'
import { getIllnessLabel } from '../../lib/childView'
import { cleanOtherName, OTHER_ILLNESS_NAME_MAX, parseDiagnosisYear, setIllnessStatus, setIllnessYear, toggleIllness } from '../../lib/illnessStatus'
import { format, useLanguage, useTranslation } from '../../i18n'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { isIllnessOffered } from '../../lib/indicatorCatalog'
import { Chip } from '../ui/Chip'

/** Illnesses being tracked, several allowed, and for each one whether it is
 * diagnosed or only suspected. Used by Settings and the setup. The status is
 * optional and nothing is preselected; "autre" also takes a name, repeated as
 * typed on the report. */
export function IllnessPicker() {
  const t = useTranslation()
  const language = useLanguage()
  const settings = useSettings()
  const earlyAccess = useEarlyAccess()
  const { illnesses, illnessStatus, otherIllnessName, illnessYear } = settings
  const state = { illnesses, illnessStatus, otherIllnessName, illnessYear }
  const chosen = ILLNESSES.filter((illness) => illnesses.includes(illness))
  const statusLabel: Record<IllnessStatus, string> = {
    diagnosed: t.settings.illnessStatusDiagnosed,
    suspected: t.settings.illnessStatusSuspected,
  }

  return (
    <>
      <div role="group" aria-label={t.settings.illnessesTitle} className="flex flex-wrap gap-2">
        {ILLNESSES.filter((illness) => isIllnessOffered(illness, earlyAccess, illnesses)).map((illness) => (
          <Chip
            key={illness}
            label={getIllnessLabel(language, illness)}
            selected={illnesses.includes(illness)}
            onClick={() => updateSettings(toggleIllness(state, illness))}
          />
        ))}
      </div>

      {chosen.length > 0 && (
        <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
          <p className="text-control font-medium">{t.settings.illnessStatusTitle}</p>
          <p className="text-caption mt-0.5 mb-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.illnessStatusHelper}
          </p>
          {chosen.map((illness) => (
            <StatusRow
              key={illness}
              illness={illness}
              name={illness === 'autre' ? otherIllnessName : undefined}
              status={illnessStatus?.[illness]}
              year={illnessYear?.[illness]}
              labels={statusLabel}
              onStatus={(status) => updateSettings(setIllnessStatus(state, illness, status))}
              onYear={(year) => updateSettings(setIllnessYear(state, illness, year))}
            />
          ))}
        </div>
      )}
    </>
  )
}

function StatusRow({
  illness,
  name,
  status,
  year,
  labels,
  onStatus,
  onYear,
}: {
  illness: Illness
  name: string | undefined
  status: IllnessStatus | undefined
  year: number | undefined
  labels: Record<IllnessStatus, string>
  onStatus: (status: IllnessStatus) => void
  onYear: (year: number | null) => void
}) {
  const t = useTranslation()
  const language = useLanguage()
  const label = getIllnessLabel(language, illness)
  const thisYear = Number(todayISO().slice(0, 4))
  const [yearInvalid, setYearInvalid] = useState(false)
  return (
    <div className="py-2.5" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <p className="text-control font-semibold mb-1.5">{label}</p>
      {illness === 'autre' && (
        <div className="mb-2">
          <label className="block text-caption font-medium mb-1" htmlFor="other-illness-name">
            {t.settings.otherNameLabel}
          </label>
          <input
            id="other-illness-name"
            defaultValue={name ?? ''}
            key={name ?? ''}
            maxLength={OTHER_ILLNESS_NAME_MAX}
            onBlur={(e) => updateSettings({ otherIllnessName: cleanOtherName(e.target.value) })}
            placeholder={t.settings.otherNamePlaceholder}
            aria-describedby="other-illness-help"
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
          <p id="other-illness-help" className="text-caption mt-1" style={{ color: 'var(--color-ink-muted)' }}>
            {t.settings.otherNameHelper}
          </p>
        </div>
      )}
      <div role="group" aria-label={format(t.settings.illnessStatusFor, { illness: name || label })} className="flex gap-2">
        {ILLNESS_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            onClick={() => onStatus(s)}
            className="flex flex-1 min-h-11 items-center justify-center rounded-[var(--radius-control)] px-2 py-2 text-center text-control font-semibold"
            style={{
              background: status === s ? 'var(--color-brand)' : 'var(--color-brand-soft)',
              color: status === s ? 'var(--color-on-brand)' : 'var(--color-brand)',
            }}
          >
            {labels[s]}
          </button>
        ))}
      </div>
      {status === 'diagnosed' && (
        <div className="mt-2">
          <label className="block text-caption font-medium mb-1" htmlFor={`illness-year-${illness}`}>
            {t.settings.illnessYearLabel}
          </label>
          <input
            id={`illness-year-${illness}`}
            defaultValue={year ?? ''}
            key={year ?? ''}
            inputMode="numeric"
            maxLength={4}
            onBlur={(e) => {
              const parsed = parseDiagnosisYear(e.target.value, thisYear)
              setYearInvalid(parsed === undefined)
              if (parsed !== undefined) onYear(parsed)
            }}
            placeholder={t.settings.illnessYearPlaceholder}
            aria-invalid={yearInvalid || undefined}
            aria-describedby={yearInvalid ? `illness-year-error-${illness}` : undefined}
            className="w-40 rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
          {yearInvalid && (
            <p id={`illness-year-error-${illness}`} role="alert" className="text-caption mt-1" style={{ color: 'var(--color-ink)' }}>
              {format(t.settings.illnessYearError, { year: thisYear })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
