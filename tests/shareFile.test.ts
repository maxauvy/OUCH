// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { canShareFiles, shareOrDownload, type ShareEnv } from '../src/lib/shareFile.ts'

const blob = new Blob(['{}'], { type: 'application/json' })
const env = (over: Partial<ShareEnv> = {}): ShareEnv & { downloads: string[]; shared: string[] } => {
  const downloads: string[] = []
  const shared: string[] = []
  return {
    phone: true,
    canShare: () => true,
    share: async (d) => {
      shared.push(d.files[0]!.name)
    },
    download: (_b, name) => downloads.push(name),
    downloads,
    shared,
    ...over,
  }
}

test('a phone whose share sheet takes files shares, and nothing is downloaded', async () => {
  const e = env()
  assert.equal(await shareOrDownload(blob, 'copie.json', 'Copie', e), 'shared')
  assert.deepEqual([e.shared, e.downloads], [['copie.json'], []])
})

test('a computer downloads', async () => {
  const e = env({ phone: false })
  assert.equal(await shareOrDownload(blob, 'copie.json', 'Copie', e), 'downloaded')
  assert.deepEqual([e.shared, e.downloads], [[], ['copie.json']])
})

test('a phone that cannot share files downloads', async () => {
  const e = env({ canShare: () => false })
  assert.equal(await shareOrDownload(blob, 'copie.json', 'Copie', e), 'downloaded')
  assert.equal(canShareFiles(e, new File([blob], 'x.json')), false)
})

test('closing the sheet is a cancel: nothing is downloaded behind the person\'s back', async () => {
  const e = env({
    share: async () => {
      throw new DOMException('closed', 'AbortError')
    },
  })
  assert.equal(await shareOrDownload(blob, 'copie.json', 'Copie', e), 'cancelled')
  assert.deepEqual(e.downloads, [])
})

test('a sheet that fails for another reason falls back to a download', async () => {
  const e = env({
    share: async () => {
      throw new DOMException('not allowed', 'NotAllowedError')
    },
  })
  assert.equal(await shareOrDownload(blob, 'copie.json', 'Copie', e), 'downloaded')
  assert.deepEqual(e.downloads, ['copie.json'])
})
