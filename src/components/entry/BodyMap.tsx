import { useState, type KeyboardEvent } from 'react'
import { COARSE_ZONES, type BodyZone } from '../../db/types'
import { DRAW_ORDER, pieces, type View } from '../../lib/bodyOutlines'
import { format, useTranslation } from '../../i18n'
import {
  BODY_GROUPS,
  isSidedRegion,
  parseZone,
  zonesOfRegion,
  type BodyGroupId,
} from '../../lib/bodyZones'
import { Chip } from '../ui/Chip'

/**
 * "Where does it hurt?": touch a region of the silhouette (four big ones, easy
 * with painful hands), then say precisely which part and which side. The
 * marked zones glow softly on the silhouette, front and back alike.
 */
export function BodyMap({ value, onChange }: { value: BodyZone[]; onChange: (zones: BodyZone[]) => void }) {
  const t = useTranslation()
  const [view, setView] = useState<View>('front')
  const [open, setOpen] = useState<BodyGroupId | null>(null)
  const chosen = new Set<BodyZone>(value)
  const legacy = value.filter((z) => (COARSE_ZONES as readonly string[]).includes(z))

  const toggle = (zone: BodyZone) => onChange(chosen.has(zone) ? value.filter((z) => z !== zone) : [...value, zone])
  const label = (zone: BodyZone) => t.bodyZones[zone]
  const group = BODY_GROUPS.find((g) => g.id === open)

  function onKey(e: KeyboardEvent, id: BodyGroupId) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(open === id ? null : id)
    }
  }

  const named = value.filter((z) => parseZone(z) || z === 'generalized' || (COARSE_ZONES as readonly string[]).includes(z)).map(label)

  return (
    <div>
      <div className="flex gap-2 mb-3" role="group" aria-label={t.bodyMap.mapLabel}>
        <div className="flex-1 [&>button]:w-full">
          <Chip label={t.bodyMap.front} selected={view === 'front'} onClick={() => setView('front')} tone="fog" />
        </div>
        <div className="flex-1 [&>button]:w-full">
          <Chip label={t.bodyMap.back} selected={view === 'back'} onClick={() => setView('back')} tone="fog" />
        </div>
      </div>

      <svg viewBox="0 0 200 392" role="group" aria-label={view === 'front' ? t.bodyMap.viewFront : t.bodyMap.viewBack} className="mx-auto block h-auto w-full max-w-[250px]">
        {BODY_GROUPS.map((g) => (
          <g
            key={g.id}
            role="button"
            tabIndex={0}
            aria-label={t.bodyMap.groups[g.id]}
            aria-expanded={open === g.id}
            onClick={() => setOpen(open === g.id ? null : g.id)}
            onKeyDown={(e) => onKey(e, g.id)}
            className="cursor-pointer outline-none"
          >
            {DRAW_ORDER.filter((r) => g.regions.includes(r)).flatMap((region) =>
              pieces(region, view).map(({ zone, mirror, d }) => {
                const pain = chosen.has(zone)
                return (
                  <path
                    key={zone}
                    d={d}
                    transform={mirror ? 'translate(200 0) scale(-1 1)' : undefined}
                    strokeLinejoin="round"
                    style={{
                      fill: pain ? 'var(--zone-pain)' : 'color-mix(in srgb, var(--color-ink) 9%, var(--color-surface))',
                      stroke: pain ? 'var(--zone-pain-line)' : open === g.id ? 'var(--color-brand)' : 'color-mix(in srgb, var(--color-ink) 22%, var(--color-surface))',
                      strokeWidth: open === g.id && !pain ? 2.5 : 1.5,
                      filter: pain ? 'drop-shadow(0 0 6px var(--zone-pain-glow))' : undefined,
                    }}
                  />
                )
              })
            )}
          </g>
        ))}
        {/* Front or back cues, never touchable. */}
        <g fill="none" strokeLinecap="round" pointerEvents="none" style={{ stroke: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', strokeWidth: 1.5 }}>
          {view === 'front' ? (
            <>
              <circle cx="94" cy="26" r="1.8" style={{ fill: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', stroke: 'none' }} />
              <circle cx="106" cy="26" r="1.8" style={{ fill: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', stroke: 'none' }} />
              <path d="M96,36 Q100,39 104,36" />
              <circle cx="100" cy="148" r="1.6" style={{ fill: 'color-mix(in srgb, var(--color-ink) 28%, var(--color-surface))', stroke: 'none' }} />
            </>
          ) : (
            <path d="M100,70 L100,160" strokeDasharray="2 4" />
          )}
        </g>
      </svg>
      <div className="mx-auto mt-1 flex max-w-[250px] items-center justify-between text-caption" style={{ color: 'var(--color-ink-muted)' }}>
        <span>← {view === 'front' ? t.bodyMap.yourRight : t.bodyMap.yourLeft}</span>
        <b className="font-semibold" style={{ color: 'var(--color-ink)' }}>
          {view === 'front' ? t.bodyMap.viewFront : t.bodyMap.viewBack}
        </b>
        <span>{view === 'front' ? t.bodyMap.yourLeft : t.bodyMap.yourRight} →</span>
      </div>

      {group ? (
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--color-hairline)' }}>
          <p className="text-control font-semibold mb-1">{t.bodyMap.groups[group.id]}</p>
          {group.regions.map((region) => (
            <div key={region} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-body">{t.bodyMap.regions[region]}</span>
              <span className="flex gap-1.5">
                {isSidedRegion(region) ? (
                  <>
                    <Chip label={t.bodyMap.left} selected={chosen.has(zonesOfRegion(region)[0])} onClick={() => toggle(zonesOfRegion(region)[0])} tone="fog" />
                    <Chip label={t.bodyMap.right} selected={chosen.has(zonesOfRegion(region)[1])} onClick={() => toggle(zonesOfRegion(region)[1])} tone="fog" />
                  </>
                ) : (
                  <Chip label={t.bodyMap.yes} selected={chosen.has(region as BodyZone)} onClick={() => toggle(region as BodyZone)} tone="fog" />
                )}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Chip label={t.bodyMap.everywhere} selected={chosen.has('generalized')} onClick={() => toggle('generalized')} tone="fog" />
      </div>

      {legacy.length > 0 ? (
        <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--color-hairline)' }}>
          <p className="text-control font-semibold">{t.bodyMap.legacyTitle}</p>
          <p className="text-caption mb-1.5" style={{ color: 'var(--color-ink-muted)' }}>
            {t.bodyMap.legacyHint}
          </p>
          <div className="flex flex-wrap gap-2">
            {legacy.map((z) => (
              <Chip key={z} label={label(z)} selected onClick={() => toggle(z)} actionLabel={`${t.bodyMap.removeLegacy} : ${label(z)}`} tone="fog" />
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-3 text-control" style={{ color: 'var(--color-ink-muted)' }} aria-live="polite">
        {named.length ? format(t.bodyMap.chosen, { list: named.join(', ') }) : t.bodyMap.none}
      </p>
    </div>
  )
}
