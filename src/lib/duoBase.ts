// Where OUCH Duo lives, for the code and the link OUCH gives a relative:
// next to OUCH (/OUCH/duo/ on GitHub Pages). In dev, Duo runs on its own
// server (`npm run dev:duo`, port 5174), on the same host so a phone on the
// same network can open it too.
export function duoBase(): string {
  if (import.meta.env.DEV) return `${location.protocol}//${location.hostname}:5174/duo/`
  return new URL('duo/', `${location.origin}${import.meta.env.BASE_URL}`).toString()
}
