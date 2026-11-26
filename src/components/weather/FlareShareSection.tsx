import { useId } from 'react'
import { updateSettings } from '../../db'
import { useSettings } from '../../hooks/useSettings'
import { useTranslation } from '../../i18n'
import { useEarlyAccess } from '../../lib/earlyAccess'
import { flaresApply } from '../../lib/flares'
import { FLARE_NOTE_MAX } from '../../lib/sharedFlare'
import { Toggle } from '../ui/Toggle'

const mutedText = { color: 'var(--color-ink-muted)' }

/**
 * In the share sheet (early access): whether the image says when the days are harder, on unless turned off, and the sentence the person
 * wants their relatives to read on those days. It applies to the image shared by hand and to the one sent each day.
 */
export function FlareShareSection() {
  const t = useTranslation().shareSheet.flare
  const settings = useSettings()
  const early = useEarlyAccess()
  const titleId = useId()
  const noteId = useId()
  const hintId = useId()
  if (!early || !flaresApply(settings.illnesses)) return null
  const on = settings.flareOnImage !== false

  return (
    <section className="flex flex-col gap-2.5 pt-3" style={{ borderTop: '1px solid var(--color-hairline)' }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-semibold" id={titleId}>
            {t.title}
          </p>
          <p className="text-caption" style={mutedText}>
            {t.hint}
          </p>
        </div>
        <Toggle checked={on} label={t.title} onChange={(v) => void updateSettings({ flareOnImage: v })} />
      </div>
      {on && (
        <div>
          <label htmlFor={noteId} className="text-caption font-medium block mb-1.5">
            {t.noteLabel}
          </label>
          <input
            id={noteId}
            aria-describedby={hintId}
            value={settings.flareImageNote ?? ''}
            onChange={(e) => void updateSettings({ flareImageNote: e.target.value || undefined })}
            placeholder={t.notePlaceholder}
            maxLength={FLARE_NOTE_MAX}
            className="w-full rounded-xl px-3.5 py-2.5 text-body outline-none"
            style={{ background: 'var(--color-input)', color: 'var(--color-ink)', boxShadow: 'inset 0 0 0 1px var(--color-input-ring)' }}
          />
          <p id={hintId} className="text-caption mt-1.5" style={mutedText}>
            {t.noteHint}
          </p>
        </div>
      )}
    </section>
  )
}
