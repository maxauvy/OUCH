// The day's weather image for a relative: one file in OUCH's Dropbox folder,
// always under the same name, replaced in place, and one shared link to it
// that does not change. The file is the image encrypted with a key Dropbox
// never sees (lib/weatherImageCrypto.ts): the link alone shows nothing, OUCH
// Duo opens it with the key from its address. The link needs the
// `sharing.write` permission, asked only of the people who turn this on.

import { ProviderError, type ProviderFailure } from './provider.ts'

const API = 'https://api.dropboxapi.com/2'
const CONTENT = 'https://content.dropboxapi.com/2'

/** In the app folder's root, next to the backup copies (which are named by date, so the backup never touches it). */
export const WEATHER_IMAGE_PATH = '/meteo-du-jour.ouch'
/** Where the image was kept, in the clear, before it was encrypted: removed when a share moves to the encrypted file, and when it stops. */
export const LEGACY_WEATHER_IMAGE_PATH = '/meteo-du-jour.png'
/** What has to be asked of Dropbox on top of the backup's permissions. */
export const WEATHER_SHARE_SCOPE = 'sharing.write'

/** `permission`: Dropbox was not asked for `sharing.write` yet, the person has to agree to it there. */
export type WeatherShareFailure = ProviderFailure | 'permission'

export class WeatherShareError extends Error {
  readonly kind: WeatherShareFailure
  constructor(kind: WeatherShareFailure, message?: string) {
    super(message ?? kind)
    this.name = 'WeatherShareError'
    this.kind = kind
  }
}

export function weatherShareFailureOf(error: unknown): WeatherShareFailure {
  if (error instanceof WeatherShareError || error instanceof ProviderError) return error.kind
  return 'other'
}

type Fetch = typeof fetch

/** The same link, serving the image itself rather than Dropbox's page around it. */
export function imageOnlyLink(url: string): string {
  const u = new URL(url)
  u.searchParams.delete('dl')
  u.searchParams.set('raw', '1')
  return u.toString()
}

interface DropboxError {
  error_summary?: string
  error?: { '.tag'?: string; shared_link_already_exists?: { metadata?: { url?: string } } }
}

async function failureFrom(res: Response, op: string, body: DropboxError | null): Promise<WeatherShareError> {
  const summary = body?.error_summary ?? ''
  const detail = `${op} ${res.status}${summary ? ` ${summary.slice(0, 200)}` : ''}`
  if (body?.error?.['.tag'] === 'missing_scope' || summary.startsWith('missing_scope')) return new WeatherShareError('permission', detail)
  if (res.status === 401) return new WeatherShareError('auth', detail)
  if (res.status === 409 && summary.includes('insufficient_space')) return new WeatherShareError('quota', detail)
  if (res.status === 429 || res.status >= 500) return new WeatherShareError('network', detail)
  return new WeatherShareError('other', detail)
}

async function readJson(res: Response): Promise<DropboxError | null> {
  try {
    return (await res.json()) as DropboxError
  } catch {
    return null
  }
}

/** `getToken` gives a valid access token, or throws `ProviderError('auth')`. */
export function dropboxWeatherImage(getToken: () => Promise<string>, fetchFn: Fetch = fetch) {
  async function post(op: string, url: string, headers: Record<string, string>, body: BodyInit): Promise<Response> {
    const token = await getToken()
    try {
      return await fetchFn(url, { method: 'POST', headers: { ...headers, Authorization: `Bearer ${token}` }, body })
    } catch (e) {
      throw new WeatherShareError('network', `${op} ${e instanceof Error ? e.message : 'no answer'}`)
    }
  }
  const json = (op: string, url: string, body: unknown) => post(op, url, { 'Content-Type': 'application/json' }, JSON.stringify(body))

  return {
    /** Replaces the image in place: the file keeps its identity, so its link keeps working and shows the new one. */
    async upload(file: Blob): Promise<void> {
      const res = await post(
        'upload',
        `${CONTENT}/files/upload`,
        {
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({ path: WEATHER_IMAGE_PATH, mode: 'overwrite', autorename: false, mute: true }),
        },
        file
      )
      if (!res.ok) throw await failureFrom(res, 'upload', await readJson(res))
    },

    /** The image's link (image only), made once and found again afterwards. The image must be there.
     * No settings are asked for: a personal account's links are public, and
     * Dropbox only gives back a link that already exists when none are asked. */
    async link(): Promise<string> {
      const res = await json('link', `${API}/sharing/create_shared_link_with_settings`, { path: WEATHER_IMAGE_PATH })
      if (res.ok) {
        const made = (await readJson(res)) as { url?: unknown } | null
        if (typeof made?.url === 'string') return imageOnlyLink(made.url)
        throw new WeatherShareError('other', 'link: no url')
      }
      const body = await readJson(res)
      if (res.status !== 409 || body?.error?.['.tag'] !== 'shared_link_already_exists') throw await failureFrom(res, 'link', body)
      const existing = body.error.shared_link_already_exists?.metadata?.url
      if (typeof existing === 'string') return imageOnlyLink(existing)
      // Said to exist, but not given: asked for by name.
      const listed = await json('link', `${API}/sharing/list_shared_links`, { path: WEATHER_IMAGE_PATH, direct_only: true })
      const links = listed.ok ? ((await readJson(listed)) as { links?: { url?: unknown }[] } | null)?.links : undefined
      const found = links?.find((l) => typeof l.url === 'string')?.url
      if (typeof found === 'string') return imageOnlyLink(found)
      throw listed.ok ? new WeatherShareError('other', 'link: exists but not found') : await failureFrom(listed, 'link', await readJson(listed))
    },

    /** Removes the image (or, with `LEGACY_WEATHER_IMAGE_PATH`, the old one in the clear), which ends its link. Already gone is fine. */
    async remove(path: string = WEATHER_IMAGE_PATH): Promise<void> {
      const res = await json('remove', `${API}/files/delete_v2`, { path })
      if (res.ok) return
      const body = await readJson(res)
      if (res.status === 409 && (body?.error_summary ?? '').includes('not_found')) return
      throw await failureFrom(res, 'remove', body)
    },
  }
}
