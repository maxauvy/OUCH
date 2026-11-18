import type { Icon } from '@tabler/icons-react'
import { useRichLook } from '../../lib/look'

/** The small tinted icon that opens a section or a row. A disc in the lighter look; in the weather look, a rounded square, like the icons of the tiles. */
export function RoundIcon({ icon: I, className = '' }: { icon: Icon; className?: string }) {
  const rich = useRichLook()
  return (
    <span className={`w-9 h-9 shrink-0 ${rich ? 'rounded-xl' : 'rounded-full'} flex items-center justify-center ${className}`} style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
      <I size={20} stroke={1.8} />
    </span>
  )
}
