/** Sequential blue ramp, light to dark, for pain 0–10 in the calendar. */
export const PAIN_RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b']
export const rampColor = (pain: number) => PAIN_RAMP[Math.round(pain * 1.2)]
/** Relief none → strong, ordinal steps of the same blue. */
export const RELIEF_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b']

/** The chart colors of report.css's --r-* tokens, as literals. SVG attributes
 * can't rely on those variables: the PDF export captures each page on its
 * own, outside the .report element that defines them. Keep both in sync. */
export const R = {
  ink: '#1f1d24',
  muted: '#5d5866',
  faint: '#767180',
  hair: '#e6e3de',
  axis: '#c9c5bd',
  band: '#f5f3ef',
  blue350: '#3987e5',
  blue: '#2a78d6',
  blue550: '#1c5cab',
  orange: '#eb6834',
  prev: '#908c83',
} as const
