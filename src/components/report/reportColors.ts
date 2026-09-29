/** Sequential blue ramp, light to dark, for pain 0–10 in the calendar. */
export const PAIN_RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b']
export const rampColor = (pain: number) => PAIN_RAMP[Math.round(pain * 1.2)]
/** Relief none → strong, ordinal steps of the same blue. */
export const RELIEF_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b']

/** The chart colors of report.css's --r-* tokens, as literals. SVG attributes
 * can't rely on those variables: the PDF export captures each page on its
 * own, outside the .report element that defines them. Keep both in sync. */
export const R = {
  ink: '#1b2430',
  muted: '#56606b',
  faint: '#6b7480',
  hair: '#d7dde2',
  axis: '#c3cbd2',
  band: '#f3f6f8',
  blue350: '#5b93c7',
  blue: '#2f74b0',
  blue550: '#0d5c8c',
  orange: '#eb6834',
  severe: '#9a5b00',
  prev: '#8a939c',
} as const

/** The days-by-intensity bar: mild, moderate, severe. Light to dark, so the
 * order survives a greyscale print; each share is also written out. */
export const MIX_COLORS = ['#c9def0', '#5b93c7', '#123f66'] as const
