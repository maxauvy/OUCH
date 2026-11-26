import { useId } from 'react'
import { IconPhoto } from '@tabler/icons-react'
import type { Settings } from '../../db/types'
import { updateSettings } from '../../db'
import { useTranslation } from '../../i18n'
import { FLARE_NOTE_MAX } from '../../lib/sharedFlare'
import { SettingToggle } from './SettingToggle'

/**
 * In Réglages › Ce que l'app te dit (early access): whether the shared weather image says when the days are harder, on unless turned
 * off, and the sentence the person wants their relatives to read on those days. It applies to the image shared by hand and to the one
 * sent each day.
 */
export function FlareImageSetting({ settings }: { settings: Settings }) {
  const t = useTranslation().settings.flareImage
  const noteId = useId()
  const hintId = useId()
  const on = settings.flareOnImage !== false

  return (
    <SettingToggle icon={IconPhoto} title={t.title} helper={t.helper} checked={on} onChange={(v) => void updateSettings({ flareOnImage: v })}>
      {on && (
        <div className="mt-3">
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
          <p id={hintId} className="text-caption mt-1.5" style={{ color: 'var(--color-ink-muted)' }}>
            {t.noteHint}
          </p>
        </div>
      )}
    </SettingToggle>
  )
}
