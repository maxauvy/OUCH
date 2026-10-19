import { useState, type KeyboardEvent } from 'react'
import { COARSE_ZONES, type BodyZone } from '../../db/types'
import { format, useTranslation } from '../../i18n'
import {
  BODY_GROUPS,
  isSidedRegion,
  parseZone,
  zonesOfRegion,
  type BodyGroupId,
  type BodyRegion,
} from '../../lib/bodyZones'
import { Chip } from '../ui/Chip'

type View = 'front' | 'back'

// Each region is drawn once for the midline, or twice for a side (the right
// twin is the mirror image). Outlines are in a 200 x 392 box, the left half
// as seen on screen. Regions the back shows differ from the ones the front shows.
const OUTLINES: Record<BodyRegion, { d: string; views: View[] }> = {
  head: { d: 'M100,10 C111,10 117,20 117,31 C117,43 110,51 100,51 C90,51 83,43 83,31 C83,20 89,10 100,10 Z', views: ['front', 'back'] },
  jaw: { d: 'M84,46 C84,42 89,41 93,43 C96,45 96,50 92,52 C88,53 84,50 84,46 Z', views: ['front'] },
  neck: { d: 'M92,52 L108,52 L108,66 Q100,69 92,66 Z', views: ['front', 'back'] },
  shoulder: { d: 'M88,68 C74,64 56,68 50,82 C47,92 56,97 66,95 C70,84 78,79 88,78 Z', views: ['front', 'back'] },
  chest: { d: 'M82,78 C92,74 108,74 118,78 C124,92 124,108 118,122 L82,122 C76,108 76,92 82,78 Z', views: ['front'] },
  stomach: { d: 'M82,124 L118,124 C121,138 121,154 116,168 L84,168 C79,154 79,138 82,124 Z', views: ['front'] },
  upperBack: { d: 'M82,78 C92,74 108,74 118,78 C124,92 124,108 118,122 L82,122 C76,108 76,92 82,78 Z', views: ['back'] },
  lowerBack: { d: 'M82,124 L118,124 C120,138 120,150 118,162 L82,162 C80,150 80,138 82,124 Z', views: ['back'] },
  upperArm: { d: 'M50,98 C56,94 64,95 67,100 C67,116 65,134 62,148 C58,152 51,152 47,148 C46,132 47,114 50,98 Z', views: ['front', 'back'] },
  lowerArm: { d: 'M46,152 C51,150 58,150 62,153 C61,170 58,186 55,200 C51,203 45,203 42,199 C42,182 43,166 46,152 Z', views: ['front', 'back'] },
  hand: { d: 'M42,205 C46,202 54,202 57,206 C58,216 56,226 50,230 C44,228 41,218 42,205 Z', views: ['front', 'back'] },
  hip: { d: 'M82,171 L100,171 L100,198 C90,200 80,198 74,194 C74,184 77,176 82,171 Z', views: ['front', 'back'] },
  upperLeg: { d: 'M75,201 L100,201 L98,277 C92,280 84,280 80,277 C75,250 74,225 75,201 Z', views: ['front', 'back'] },
  lowerLeg: { d: 'M80,282 L98,282 L95,360 C91,363 86,363 83,360 C80,335 79,305 80,282 Z', views: ['front', 'back'] },
  foot: { d: 'M82,364 L95,364 C98,372 97,378 90,380 C82,381 78,378 79,372 Z', views: ['front', 'back'] },
}

const DRAW_ORDER: BodyRegion[] = [
  'head', 'neck', 'chest', 'stomach', 'upperBack', 'lowerBack', 'hip', 'upperLeg', 'lowerLeg', 'foot',
  'upperArm', 'lowerArm', 'hand', 'shoulder', 'jaw',
]

/** The pieces to draw for a region in a view: [zone, mirrored]. Seen from the front the left of the screen is the person's right; from the back it is their left. */
function pieces(region: BodyRegion, view: View): { zone: BodyZone; mirror: boolean }[] {
  if (!OUTLINES[region].views.includes(view)) return []
  if (!isSidedRegion(region)) return [{ zone: region, mirror: false }]
  const [onScreenLeft, onScreenRight] = view === 'front' ? (['right', 'left'] as const) : (['left', 'right'] as const)
  return [
    { zone: zonesOfRegion(region)[onScreenLeft === 'left' ? 0 : 1], mirror: false },
    { zone: zonesOfRegion(region)[onScreenRight === 'left' ? 0 : 1], mirror: true },
  ]
}

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
              pieces(region, view).map(({ zone, mirror }) => {
                const pain = chosen.has(zone)
                return (
                  <path
                    key={zone}
                    d={OUTLINES[region].d}
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
