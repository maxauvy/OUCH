import type { PdfImage } from './pdf'

/** The pages of a preview as JPEGs, at twice the A4 size in CSS pixels (about
 * 190 dpi once printed). `skip` leaves out what belongs to the screen only
 * (a prompt to fill something in), so it is not part of the file. */
export async function capturePages(container: HTMLElement, skip?: (node: HTMLElement) => boolean): Promise<PdfImage[]> {
  const { toCanvas } = await import('html-to-image')
  const images: PdfImage[] = []
  for (const page of Array.from(container.querySelectorAll<HTMLElement>('.report-page'))) {
    const canvas = await toCanvas(page, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      // The preview's page shadow and spacing aren't part of the page.
      style: { boxShadow: 'none', margin: '0' },
      filter: skip ? (node) => !(node instanceof HTMLElement && skip(node)) : undefined,
    })
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encoding failed'))), 'image/jpeg', 0.9)
    )
    images.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height })
  }
  return images
}
