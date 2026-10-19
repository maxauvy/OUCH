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

/** The regions of the Widespread Pain Index not drawn in it: head, hands and feet. */
const OUTSIDE_WPI: readonly BodyRegion[] = ['head', 'hand', 'foot']

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
  { id: 'trunk', regions: ['chest', 'stomach', 'upperBack', 'lowerBack'] },
  { id: 'legs', regions: ['hip', 'upperLeg', 'lowerLeg', 'foot'] },
]
export type BodyGroupId = (typeof BODY_GROUPS)[number]['id']

export function groupOfRegion(region: BodyRegion): BodyGroupId {
  return BODY_GROUPS.find((g) => g.regions.includes(region))!.id
}

/** Which region and side a zone identifier is: 'leftShoulder' is the shoulder, left. */
export function parseZone(zone: BodyZone): { region: BodyRegion; side?: BodySide } | null {
  if ((MIDLINE_ZONES as readonly string[]).includes(zone)) return { region: zone as MidlineZone }
  for (const region of SIDED_REGIONS) {
    if (zone === sidedZone('left', region)) return { region, side: 'left' }
    if (zone === sidedZone('right', region)) return { region, side: 'right' }
  }
  return null // coarse zones and 'generalized'
}
