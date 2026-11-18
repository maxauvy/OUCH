// The weather card as a PNG, for the share sheet and for the image kept at
// Dropbox. The card is captured from the page, so it has to be rendered
// (on screen or off it) at its export size.

let titleFont: Promise<unknown> | null = null

/** The card's title face, fetched once something needs it. Call early so the preview has it too. */
export function loadCardTitleFont(): Promise<unknown> {
  titleFont ??= document.fonts.load('800 30px "Bricolage Grotesque Variable"').catch(() => undefined)
  return titleFont
}

export async function cardToPng(node: HTMLElement): Promise<Blob> {
  const { toPng } = await import('html-to-image')
  await loadCardTitleFont()
  const dataUrl = await toPng(node, { pixelRatio: 2, cacheBust: true })
  const res = await fetch(dataUrl)
  return res.blob()
}
