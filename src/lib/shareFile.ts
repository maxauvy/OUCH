// Handing a file to the person: on a phone through the share sheet (where
// "Save to Files" and iCloud Drive are), elsewhere by a plain download. The
// environment is passed in so the choices can be tested without a browser.

export type ShareResult = 'shared' | 'cancelled' | 'downloaded'

export interface ShareEnv {
  /** A touch device, where the share sheet is the way to keep a file. */
  phone: boolean
  canShare: (data: { files: File[] }) => boolean
  share: (data: { files: File[]; title?: string }) => Promise<void>
  download: (blob: Blob, filename: string) => void
}

/** Whether the share sheet takes files here. Sniffed with a probe file of the same kind as the real one. */
export function canShareFiles(env: ShareEnv, probe: File): boolean {
  return env.phone && env.canShare({ files: [probe] })
}

/**
 * Shares the file when the share sheet takes it, otherwise downloads it.
 * "cancelled" is the person closing the sheet: nothing was kept, nothing is
 * said. A sheet that fails for another reason (the browser can stop counting
 * the tap as the reason to share when making the file took long) falls back
 * to a download.
 */
export async function shareOrDownload(blob: Blob, filename: string, title: string, env: ShareEnv): Promise<ShareResult> {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' })
  if (canShareFiles(env, file)) {
    try {
      await env.share({ files: [file], title })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    }
  }
  env.download(blob, filename)
  return 'downloaded'
}
