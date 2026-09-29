import { useState } from 'react'
import { useStorageProtection } from '../../hooks/useStorageProtection'
import { canProtectStorage } from '../../lib/storage'
import { useTranslation } from '../../i18n'

export function StorageProtection() {
  const t = useTranslation()
  const { protection, request } = useStorageProtection()
  const [refused, setRefused] = useState(false)

  // Not answered yet: better nothing than a wrong "not protected" flash.
  if (protection === undefined) return null

  const message =
    protection === true
      ? t.storage.protected
      : !canProtectStorage()
        ? t.storage.unsupported
        : refused
          ? t.storage.refused
          : t.storage.notProtected

  return (
    <div>
      <p className="font-medium text-body mb-1">{t.storage.title}</p>
      <p role="status" className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {message}
      </p>
      {protection !== true && canProtectStorage() && (
        <button
          type="button"
          onClick={async () => setRefused((await request()) !== true)}
          className="w-full rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
          style={{ background: 'var(--color-brand)' }}
        >
          {t.storage.request}
        </button>
      )}
    </div>
  )
}
