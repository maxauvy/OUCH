import { IconCloud, IconDeviceMobile, IconLock } from '@tabler/icons-react'
import { format, useLanguage, useTranslation } from '../../i18n'

/** Where the journal goes, in three short lines: it stays on the device, it is
 * encrypted there, and the provider only keeps a file nobody can read. */
export function TrustLines({ provider }: { provider: string }) {
  const t = useTranslation().autoBackup
  const language = useLanguage()
  const lines = [
    { Icon: IconDeviceMobile, text: t.trust[0] },
    { Icon: IconLock, text: t.trust[1] },
    { Icon: IconCloud, text: format(t.trust[2], { provider }, language) },
  ]
  return (
    <ul className="flex flex-col">
      {lines.map(({ Icon, text }, i) => (
        <li
          key={i}
          className="flex items-center gap-2.5 py-2 text-caption"
          style={{ borderTop: i === 0 ? undefined : '1px solid var(--color-hairline)', color: 'var(--color-ink)' }}
        >
          <Icon size={18} aria-hidden className="shrink-0" style={{ color: 'var(--color-brand)' }} />
          {text}
        </li>
      ))}
    </ul>
  )
}
