// The example image of the "Understand" tab: a weather image made by OUCH's
// demo (made-up data), in French and in English, and where each of its parts
// lies. Duo only ever receives an image, never the numbers behind it, so the
// explanations point at this example rather than at the day's image.
//
// The images are 630 px wide captures of the weather card (420 CSS px, the
// "Météo" look) with three gauges and no message for relatives, saved as WebP
// (quality 80: a third of the JPEG, the same to the eye; every browser Duo
// runs in reads it). If the card's
// layout changes (src/components/weather/WeatherCard.tsx), capture them again
// from the demo and measure the parts anew.

import exampleFr from './assets/example-fr.webp'
import exampleEn from './assets/example-en.webp'

export const EXAMPLE_IMAGE = { fr: exampleFr, en: exampleEn } as const

/** The card's size, in its own CSS pixels. */
export const EXAMPLE_SIZE = { width: 420, height: 854 }

/** Each part's top and bottom on the card, in the same pixels: the weather, the pain, the gauges, the 14 days. */
export const EXAMPLE_PARTS: readonly (readonly [number, number])[] = [
  [52, 162],
  [164, 279],
  [283, 481],
  [485, 805],
]

/** Where each part's thumbnail is centred, on the card (y), and how far it is moved left (x): the gauges' first line, the curve rather than the tiles. */
export const EXAMPLE_FOCUS: readonly (readonly [number, number])[] = [
  [107, 0],
  [221, 0],
  [330, 0],
  [590, 75],
]
