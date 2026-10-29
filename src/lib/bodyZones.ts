import {
  BODY_ZONES,
  COARSE_ZONES,
  MIDLINE_ZONES,
  SIDED_REGIONS,
  sidedZone,
  type BodySide,
  type BodyZone,
  type MidlineZone,
  type SidedRegion,
} from '../db/types.ts'

/** A body region as the person sees it: one midline zone, or a left and a right zone. */
export type BodyRegion = MidlineZone | SidedRegion

export function isSidedRegion(region: BodyRegion): region is SidedRegion {
  return (SIDED_REGIONS as readonly string[]).includes(region)
}

/** The zone identifiers a region stands for: itself, or its left and right sides. */
export function zonesOfRegion(region: BodyRegion): BodyZone[] {
  return isSidedRegion(region) ? [sidedZone('left', region), sidedZone('right', region)] : [region]
}

/** The regions of the Widespread Pain Index not drawn in it: head, hands and feet, and the pelvis, which the index has no area for. */
const OUTSIDE_WPI: readonly BodyRegion[] = ['head', 'hand', 'foot', 'pelvis']

/**
 * The 19 areas of the Widespread Pain Index (WPI, ACR 2010/2016 fibromyalgia
 * criteria): jaw, shoulder, upper arm, lower arm, hip or buttock, upper leg and
 * lower leg on each side, then neck, chest, abdomen, upper back and lower back.
 */
export const WPI_ZONES: readonly BodyZone[] = [...MIDLINE_ZONES, ...SIDED_REGIONS]
  .filter((r) => !OUTSIDE_WPI.includes(r))
  .flatMap(zonesOfRegion)

const WPI_SET = new Set<string>(WPI_ZONES)
export const isWpiZone = (zone: string) => WPI_SET.has(zone)

/** How many of the 19 WPI areas are marked: a count of what was declared, not a WPI score. */
export function wpiCount(zones: readonly string[] | undefined): number {
  return new Set((zones ?? []).filter(isWpiZone)).size
}

/** A zone of the first versions ("Arms"), which does not say which side or part. */
export function isCoarseZone(zone: string): boolean {
  return (COARSE_ZONES as readonly string[]).includes(zone)
}

const ZONE_SET = new Set<string>(BODY_ZONES)

/** Keeps only the known zones, once each, in the order they were given. */
export function cleanZones(zones: readonly string[]): BodyZone[] {
  return [...new Set(zones)].filter((z): z is BodyZone => ZONE_SET.has(z))
}

/** The body parts the input shows, by group, in reading order. */
export const BODY_GROUPS: readonly { id: 'head' | 'arms' | 'trunk' | 'legs'; regions: readonly BodyRegion[] }[] = [
  { id: 'head', regions: ['head', 'jaw', 'neck'] },
  { id: 'arms', regions: ['shoulder', 'upperArm', 'lowerArm', 'hand'] },
  { id: 'trunk', regions: ['chest', 'stomach', 'pelvis', 'upperBack', 'lowerBack'] },
  { id: 'legs', regions: ['hip', 'upperLeg', 'lowerLeg', 'foot'] },
]
export type BodyGroupId = (typeof BODY_GROUPS)[number]['id']

/** Which region and side a zone identifier is: 'leftShoulder' is the shoulder, left. */
export function parseZone(zone: BodyZone): { region: BodyRegion; side?: BodySide } | null {
  if ((MIDLINE_ZONES as readonly string[]).includes(zone)) return { region: zone as MidlineZone }
  for (const region of SIDED_REGIONS) {
    if (zone === sidedZone('left', region)) return { region, side: 'left' }
    if (zone === sidedZone('right', region)) return { region, side: 'right' }
  }
  return null // coarse zones and 'generalized'
}

export interface ZoneSummary {
  /** Logged days of the period. */
  days: number
  /** Share of logged days on which each zone is reported, most frequent first. */
  shares: [BodyZone, number][]
  /** How many of the 19 WPI areas are reported on at least one day. */
  areasReported: number
  /** Average number of WPI areas on the days that have some: null when no day has any. */
  meanAreasPerDay: number | null
  /** Days with at least one WPI area: the days the average rests on. */
  daysWithAreas: number
  /** Days on which the person said it hurts everywhere. */
  widespreadDays: number
  /** Days with a zone of the first versions ("Arms"), which say no side and are not counted as WPI areas. */
  daysWithOldZones: number
}

/** What the report says about where it hurt: counts of what was declared, no WPI score. */
export function zoneSummary(entries: readonly { painLocations?: readonly string[] }[]): ZoneSummary {
  const counts = new Map<BodyZone, number>()
  const ever = new Set<string>()
  let daysWithAreas = 0
  let areaTotal = 0
  let widespreadDays = 0
  let daysWithOldZones = 0
  for (const e of entries) {
    const zones = cleanZones(e.painLocations ?? [])
    for (const z of zones) counts.set(z, (counts.get(z) ?? 0) + 1)
    const areas = wpiCount(zones)
    for (const z of zones) if (isWpiZone(z)) ever.add(z)
    if (areas) {
      daysWithAreas++
      areaTotal += areas
    }
    if (zones.includes('generalized')) widespreadDays++
    if (zones.some(isCoarseZone)) daysWithOldZones++
  }
  return {
    days: entries.length,
    shares: [...counts].map(([z, n]) => [z, n / entries.length] as [BodyZone, number]).sort((a, b) => b[1] - a[1] || BODY_ZONES.indexOf(a[0]) - BODY_ZONES.indexOf(b[0])),
    areasReported: ever.size,
    meanAreasPerDay: daysWithAreas ? areaTotal / daysWithAreas : null,
    daysWithAreas,
    widespreadDays,
    daysWithOldZones,
  }
}

/** The zones of the first versions that a journal still holds, in the order of the list: who has some is told about the new zones, once. */
export function oldZonesUsed(entries: readonly { painLocations?: readonly string[] }[]): BodyZone[] {
  const used = new Set<string>()
  for (const e of entries) for (const z of e.painLocations ?? []) if (isCoarseZone(z)) used.add(z)
  return COARSE_ZONES.filter((z) => used.has(z))
}
