// Run with `npm test`.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decryptWeatherImage, encryptWeatherImage, isWeatherImageKey, newWeatherImageKey, WeatherImageKeyError } from '../src/lib/weatherImageCrypto.ts'

const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5])], { type: 'image/png' })

test('a new key is 256 random bits in 43 base64url characters, never twice the same', () => {
  const a = newWeatherImageKey()
  assert.ok(isWeatherImageKey(a))
  assert.notEqual(a, newWeatherImageKey())
  assert.equal(isWeatherImageKey('trop-court'), false)
  assert.equal(isWeatherImageKey(`${a}=`), false)
})

test('the image comes back as it went, and the file shows none of it', async () => {
  const key = newWeatherImageKey()
  const sealed = await encryptWeatherImage(png, key)
  const bytes = new Uint8Array(await sealed.arrayBuffer())
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'OWI1')
  assert.ok(!Buffer.from(bytes).includes(Buffer.from([0x89, 0x50, 0x4e, 0x47])))
  const back = await decryptWeatherImage(await sealed.arrayBuffer(), key)
  assert.equal(back.type, 'image/png')
  assert.deepEqual(new Uint8Array(await back.arrayBuffer()), new Uint8Array(await png.arrayBuffer()))
})

test('two uploads of the same image do not look alike (a new IV each time)', async () => {
  const key = newWeatherImageKey()
  const a = new Uint8Array(await (await encryptWeatherImage(png, key)).arrayBuffer())
  const b = new Uint8Array(await (await encryptWeatherImage(png, key)).arrayBuffer())
  assert.notDeepEqual(a, b)
})

test('a wrong key, a changed byte or a plain PNG are refused', async () => {
  const key = newWeatherImageKey()
  const sealed = new Uint8Array(await (await encryptWeatherImage(png, key)).arrayBuffer())
  await assert.rejects(decryptWeatherImage(sealed.buffer, newWeatherImageKey()), WeatherImageKeyError)
  const changed = sealed.slice()
  changed[changed.length - 1] ^= 1
  await assert.rejects(decryptWeatherImage(changed.buffer, key), WeatherImageKeyError)
  await assert.rejects(decryptWeatherImage(await png.arrayBuffer(), key), WeatherImageKeyError)
  await assert.rejects(decryptWeatherImage(sealed.buffer, 'pas une clé'), WeatherImageKeyError)
})
