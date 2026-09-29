// A minimal PDF writer: one JPEG image per A4 page, nothing else. Enough to
// turn the report's pages, captured as images, into a file that phones can
// share or save, where the print dialog isn't available (an installed app
// on iPhone has none). Printing from a computer still gives a text PDF.

/** A4 in PDF points (1/72 inch). */
const A4 = { width: 595.28, height: 841.89 }

export interface PdfImage {
  jpeg: Uint8Array
  /** Pixel size of the image */
  width: number
  height: number
}

/** Each image fills the page's width; a page taller than A4 is shrunk to fit. */
export function buildImagePdf(pages: PdfImage[], title: string): Blob {
  const encoder = new TextEncoder()
  const parts: Uint8Array[] = []
  const offsets: number[] = []
  let length = 0
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    length += bytes.length
  }
  // Objects are numbered in writing order, starting at 1.
  const object = (body: () => void) => {
    offsets.push(length)
    push(`${offsets.length} 0 obj\n`)
    body()
    push('\nendobj\n')
  }

  // 1 catalog, 2 page tree, 3 info, then three objects per page.
  const pageIds = pages.map((_, i) => 4 + i * 3)

  // The binary comment tells tools the file holds binary data.
  push('%PDF-1.4\n%âãÏÓ\n')
  object(() => push('<< /Type /Catalog /Pages 2 0 R >>'))
  object(() => push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`))
  object(() => push(`<< /Title ${pdfText(title)} /Producer (OUCH) >>`))

  pages.forEach((image, i) => {
    const pageId = pageIds[i]!
    const scale = Math.min(A4.width / image.width, A4.height / image.height)
    const w = image.width * scale
    const h = image.height * scale
    // PDF's origin is the bottom-left corner: the image hangs from the top.
    const x = (A4.width - w) / 2
    const y = A4.height - h
    const content = `q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /Im0 Do Q`

    object(() =>
      push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] ` +
          `/Resources << /XObject << /Im0 ${pageId + 2} 0 R >> >> /Contents ${pageId + 1} 0 R >>`
      )
    )
    object(() => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`))
    object(() => {
      push(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`
      )
      push(image.jpeg)
      push('\nendstream')
    })
  })

  const xref = length
  push(`xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`)
  for (const offset of offsets) push(`${String(offset).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  return new Blob(parts as BlobPart[], { type: 'application/pdf' })
}

function num(n: number): string {
  return n.toFixed(2)
}

/** A PDF text string in UTF-16BE, so accents survive in the title. */
function pdfText(text: string): string {
  let hex = 'FEFF'
  for (let i = 0; i < text.length; i++) hex += text.charCodeAt(i).toString(16).padStart(4, '0')
  return `<${hex}>`
}
