import { downloadBlob } from './backup'

/** A made PDF: through the share sheet on a phone (Files, mail, print…), downloaded elsewhere, or when sharing is refused for
 * another reason than a cancel (making the file can take long enough for the browser to stop counting the tap). */
export async function sharePdf(blob: Blob, name: string, title: string): Promise<void> {
  const file = new File([blob], name, { type: 'application/pdf' })
  const phone = window.matchMedia('(pointer: coarse)').matches
  if (phone && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  downloadBlob(blob, name)
}
