import { IconArrowRight, IconCheck, IconStethoscope } from '@tabler/icons-react'
import type { BodyZone } from '../../db/types'
import { COARSE_ZONES } from '../../db/types'
import { DRAW_ORDER, OUTLINES, pieces } from '../../lib/bodyOutlines'
import { format, useLanguage, useTranslation } from '../../i18n'
import { ModalSheet } from '../ui/ModalSheet'

const SHOWN = new Set<BodyZone>(['leftShoulder', 'rightHip', 'rightUpperLeg'])

/** The new input in miniature: a silhouette with a few precise areas marked. */
function MiniSilhouette({ label }: { label: string }) {
  return (
    <svg viewBox="30 0 140 392" role="img" aria-label={label} className="mx-auto block h-auto w-16">
      {DRAW_ORDER.flatMap((region) =>
        pieces(region, 'front').map(({ zone, mirror }) => {
          const marked = SHOWN.has(zone)
          return (
            <path
              key={zone}
              d={OUTLINES[region].d}
              transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}
              strokeLinejoin="round"
              style={{
                fill: marked ? 'var(--zone-pain)' : 'color-mix(in srgb, var(--color-ink) 9%, var(--color-surface))',
                stroke: marked ? 'var(--zone-pain-line)' : 'color-mix(in srgb, var(--color-ink) 22%, var(--color-surface))',
                strokeWidth: 1.5,
                filter: marked ? 'drop-shadow(0 0 5px var(--zone-pain-glow))' : undefined,
              }}
            />
          )
        })
      )}
    </svg>
  )
}

/**
 * Said once to a journal that holds zones of the first versions, and read
 * again from Settings: what changed in "Where does it hurt?", why, and that
 * nothing was converted. Nothing to decide: closing it is enough.
 */
export function ZonesNotice({ oldZones, onClose, onTry }: { oldZones: BodyZone[]; onClose: () => void; onTry?: () => void }) {
  const t = useTranslation().zonesNotice
  const language = useLanguage()
  const names = COARSE_ZONES.filter((z) => oldZones.includes(z)).map((z) => t.names[z])
  const points = [
    { icon: IconStethoscope, title: t.doctorTitle, body: t.doctorBody },
    { icon: IconCheck, title: t.keptTitle, body: t.keptBody },
  ]
  return (
    <ModalSheet title={t.title} closeLabel={t.close} onClose={onClose}>
      <p className="text-control leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
        {t.intro}
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-h-[150px] rounded-2xl p-3" style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
          <p className="mb-1.5 text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.before}
          </p>
          <div className="flex flex-wrap gap-1.5" aria-hidden>
            {[...t.chips, '…'].map((c) => (
              <span key={c} className="rounded-full px-2.5 py-1 text-caption" style={{ boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <IconArrowRight size={18} aria-hidden style={{ color: 'var(--color-ink-muted)' }} />
        <div className="min-h-[150px] rounded-2xl p-3" style={{ background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)' }}>
          <p className="mb-1.5 text-caption" style={{ color: 'var(--color-ink-muted)' }}>
            {t.now}
          </p>
          <MiniSilhouette label={t.silhouetteAlt} />
        </div>
      </div>

      <ul className="flex flex-col" role="list">
        {points.map(({ icon: Icon, title, body }, i) => (
          <li key={title} className="flex items-start gap-3 py-2.5" style={i > 0 ? { borderTop: '1px solid var(--color-hairline)' } : undefined}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }} aria-hidden>
              <Icon size={20} />
            </span>
            <div>
              <p className="text-control font-semibold">{title}</p>
              <p className="text-caption leading-relaxed" style={{ color: 'var(--color-ink-muted)' }}>
                {body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <p className="rounded-xl px-3 py-2.5 text-control" style={{ background: 'var(--color-brand-soft)' }}>
        {names.length ? format(t.mine, { list: names.join(', ') }, language) : t.minePlain}
      </p>

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onClose}
          className="min-h-12 rounded-[var(--radius-control)] px-4 text-control font-semibold"
          style={{ background: 'var(--color-brand)', color: 'var(--color-on-brand)' }}
        >
          {t.gotIt}
        </button>
        {onTry && (
          <button type="button" onClick={onTry} className="min-h-11 rounded-[var(--radius-control)] px-4 text-control font-medium" style={{ color: 'var(--color-brand)' }}>
            {t.tryIt}
          </button>
        )}
      </div>
    </ModalSheet>
  )
}
