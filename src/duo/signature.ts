/**
 * What tells one sent image from another without opening it: OUCH seals each
 * image with a fresh random IV (the 12 bytes after "OWI1"), so the same file
 * gives the same signature and a new sending a new one.
 */
export function signature(file: ArrayBuffer): string {
  return Array.from(new Uint8Array(file).slice(4, 16), (b) => b.toString(16).padStart(2, '0')).join('')
}
