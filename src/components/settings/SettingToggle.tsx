import type { ReactNode } from 'react'
import type { Icon } from '@tabler/icons-react'
import { Card } from '../ui/Card'
import { RoundIcon } from '../ui/RoundIcon'
import { Toggle } from '../ui/Toggle'

/** A setting that is one switch: its round icon, its title and sentence, the switch on the right. What it opens (a time, a delay, a detail) goes below. */
export function SettingToggle({
  icon,
  title,
  helper,
  checked,
  onChange,
  children,
}: {
  icon: Icon
  title: string
  helper: string
  checked: boolean
  onChange: (on: boolean) => void
  children?: ReactNode
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <RoundIcon icon={icon} className="self-start mt-0.5" />
        <div className="flex-1 min-w-0">
          <h2 className="text-body font-semibold">{title}</h2>
          <p className="text-caption mt-0.5" style={{ color: 'var(--color-ink-muted)' }}>
            {helper}
          </p>
        </div>
        <Toggle checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </Card>
  )
}
