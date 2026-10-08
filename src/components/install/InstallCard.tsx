import { useId, useState, type ReactNode } from 'react'
import { IconChevronDown, IconDeviceMobile } from '@tabler/icons-react'
import { promptInstall, useInstallKind } from '../../hooks/useInstall'
import type { InstallKind } from '../../lib/installKind'
import { useTranslation } from '../../i18n'
import { Card, SectionTitle } from '../ui/Card'

// Asking to install is a suggestion, never a nag: it is shown where the
// person is already looking at their set-up (the last step of the assistant,
// folded; Settings, open), nothing is stored about it, and it disappears by
// itself once the app is installed.

/** Settings: the card, with the steps in view. */
export function InstallCard() {
  const kind = useInstallKind()
  const t = useTranslation()
  if (kind === 'installed') return null
  return (
    <Card>
      <SectionTitle>{t.install.title}</SectionTitle>
      <InstallBody kind={kind} />
    </Card>
  )
}

/** The assistant's last step: one line that unfolds into the same steps. */
export function InstallFold() {
  const kind = useInstallKind()
  const t = useTranslation()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  if (kind === 'installed') return null
  return (
    <div
      className="rounded-[var(--radius-card)] overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', boxShadow: 'var(--card-shadow)' }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
          aria-hidden
        >
          <IconDeviceMobile size={20} stroke={1.75} />
        </span>
        <span className="flex-1">
          <span className="block text-control font-medium">{t.install.title}</span>
          <span className="block text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.install.teaser}
          </span>
        </span>
        <IconChevronDown
          size={20}
          aria-hidden
          style={{ color: 'var(--color-ink-muted)', transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          <InstallBody kind={kind} />
        </div>
      )}
    </div>
  )
}

function InstallBody({ kind }: { kind: InstallKind }) {
  const t = useTranslation()
  const ios = kind === 'ios-safari' || kind === 'ios-other'
  return (
    <>
      <p className="text-caption mb-3" style={{ color: 'var(--color-ink-muted)' }}>
        {ios ? t.install.reasonSafari : t.install.reason}
      </p>
      {kind === 'prompt' && (
        <button
          type="button"
          onClick={() => void promptInstall()}
          className="w-full rounded-[var(--radius-control)] py-3 text-body font-semibold text-[var(--color-on-brand)]"
          style={{ background: 'var(--color-brand)' }}
        >
          {t.install.button}
        </button>
      )}
      {kind === 'ios-safari' && <IosSteps />}
      {kind === 'ios-other' && <p className="text-control">{t.install.iosOther}</p>}
      {kind === 'other' && <p className="text-control">{t.install.other}</p>}
    </>
  )
}

/** Safari on iPhone: each step beside a small drawing of what is on screen.
 * The drawings repeat the words and are hidden from screen readers. */
function IosSteps() {
  const t = useTranslation()
  const { steps, pictures } = t.install
  const rows: { text: string; picture: ReactNode }[] = [
    {
      text: steps.menu,
      picture: (
        <>
          <Dot>▤</Dot>
          <span className="rounded-full px-2 py-0.5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink-muted)' }}>
            {pictures.address}
          </span>
          <Dot>⋯</Dot>
        </>
      ),
    },
    { text: steps.share, picture: <span>{pictures.share} ⬆</span> },
    { text: steps.more, picture: <span>{pictures.more}</span> },
    {
      text: steps.home,
      picture: (
        <>
          <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>＋</span>
          <span>{pictures.home}</span>
        </>
      ),
    },
    {
      text: steps.add,
      picture: (
        <>
          <span className="relative inline-block h-3.5 w-6 rounded-full" style={{ background: 'var(--color-brand)' }}>
            <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span style={{ color: 'var(--color-brand)', fontWeight: 700 }}>{pictures.add}</span>
        </>
      ),
    },
  ]
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => (
        <li
          key={row.text}
          className="flex items-center gap-3 py-2.5"
          style={i > 0 ? { borderTop: '1px solid var(--color-hairline)' } : undefined}
        >
          <span
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-semibold"
            style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}
            aria-hidden
          >
            {i + 1}
          </span>
          <span className="flex-1 text-caption" style={{ color: 'var(--color-ink)' }}>
            {row.text}
          </span>
          <span
            aria-hidden
            className="flex min-h-9 w-28 shrink-0 items-center justify-center gap-1 rounded-[10px] px-1.5 py-1 text-center text-[11px] leading-tight"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-hairline)', color: 'var(--color-ink)' }}
          >
            {row.picture}
          </span>
        </li>
      ))}
    </ol>
  )
}

function Dot({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[11px] leading-none"
      style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
    >
      {children}
    </span>
  )
}
