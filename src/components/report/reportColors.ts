/** Sequential blue ramp, light to dark, for pain 0–10 in the calendar. */
export const PAIN_RAMP = ['#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5', '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b']
export const rampColor = (pain: number) => PAIN_RAMP[Math.round(pain * 1.2)]
/** Relief none → strong, ordinal steps of the same blue. */
export const RELIEF_COLORS = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b']
