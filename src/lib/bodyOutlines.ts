import type { BodyZone } from '../db/types'
import { isSidedRegion, zonesOfRegion, type BodyRegion } from './bodyZones'

export type View = 'front' | 'back'

// Each region is drawn once for the midline, or twice for a side (the right
// twin is the mirror image). Outlines are in a 200 x 392 box, the left half
// as seen on screen. Regions the back shows differ from the ones the front shows.
export const OUTLINES: Record<BodyRegion, { d: string; views: View[] }> = {
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

export const DRAW_ORDER: BodyRegion[] = [
  'head', 'neck', 'chest', 'stomach', 'upperBack', 'lowerBack', 'hip', 'upperLeg', 'lowerLeg', 'foot',
  'upperArm', 'lowerArm', 'hand', 'shoulder', 'jaw',
]

/** The pieces to draw for a region in a view: [zone, mirrored]. Seen from the front the left of the screen is the person's right; from the back it is their left. */
export function pieces(region: BodyRegion, view: View): { zone: BodyZone; mirror: boolean }[] {
  if (!OUTLINES[region].views.includes(view)) return []
  if (!isSidedRegion(region)) return [{ zone: region, mirror: false }]
  const [onScreenLeft, onScreenRight] = view === 'front' ? (['right', 'left'] as const) : (['left', 'right'] as const)
  return [
    { zone: zonesOfRegion(region)[onScreenLeft === 'left' ? 0 : 1], mirror: false },
    { zone: zonesOfRegion(region)[onScreenRight === 'left' ? 0 : 1], mirror: true },
  ]
}
