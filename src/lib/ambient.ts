// The soft sound of "Un moment pour souffler": made on the spot with the Web
// Audio API, so there is no file to download, it works offline, and no
// recording is involved. A warm chord of a few sine waves that swells while
// breathing in and settles while breathing out, and, now and then, a note of
// the same scale that rings out slowly. Silent until the person asks for it,
// and it only starts from a tap (phones refuse sound otherwise).

import { IN_SECONDS, OUT_SECONDS } from './relief.ts'

/** D major pentatonic: D E F# A B, in Hz. Nothing in it clashes, whatever the order. */
const CHORD = [146.83, 220.0, 329.63] // D3, A3, E4
const BELLS = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66] // D5 E5 F#5 A5 B5 D6

export interface Ambient {
  /** Tells the sound where the breath is: it swells in, settles out. */
  phase(p: 'in' | 'out'): void
  /** Fades out, then lets the sound go. */
  stop(): void
}

type AudioCtor = typeof AudioContext
const audioCtor = (): AudioCtor | undefined =>
  typeof window === 'undefined' ? undefined : window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext

export const canPlayAmbient = (): boolean => !!audioCtor()

/** A few seconds of decaying noise: the room the sound rings in. */
function room(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 3)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c)
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4)
  }
  return buffer
}

/** Starts the sound, or returns null when the phone cannot play it. */
export function startAmbient(): Ambient | null {
  const Ctor = audioCtor()
  if (!Ctor) return null
  let ctx: AudioContext
  try {
    ctx = new Ctor()
  } catch {
    return null
  }
  void ctx.resume().catch(() => {})

  const master = ctx.createGain()
  master.gain.setValueAtTime(0, ctx.currentTime)
  master.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2)
  master.connect(ctx.destination)

  const reverb = ctx.createConvolver()
  reverb.buffer = room(ctx)
  const wet = ctx.createGain()
  wet.gain.value = 0.55
  reverb.connect(wet).connect(master)

  // The chord: each note is a sine and a second one a few cents away, which is what makes it warm instead of flat.
  const pad = ctx.createGain()
  pad.gain.setValueAtTime(0.25, ctx.currentTime)
  const tone = ctx.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.setValueAtTime(500, ctx.currentTime)
  pad.connect(tone)
  tone.connect(master)
  tone.connect(reverb)
  const oscillators: OscillatorNode[] = []
  for (const f of CHORD) {
    for (const cents of [-5, 5]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      o.detune.value = cents
      const g = ctx.createGain()
      g.gain.value = 0.11
      o.connect(g).connect(pad)
      o.start()
      oscillators.push(o)
    }
  }

  const bell = () => {
    const f = BELLS[Math.floor(Math.random() * BELLS.length)]!
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = f
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0005, t + 5)
    o.connect(g)
    g.connect(master)
    g.connect(reverb)
    o.start(t)
    o.stop(t + 5.2)
  }
  let timer = 0
  const ring = () => {
    bell()
    timer = window.setTimeout(ring, 6000 + Math.random() * 6000)
  }
  timer = window.setTimeout(ring, 3500)

  let closed = false
  return {
    phase(p) {
      if (closed) return
      const t = ctx.currentTime
      const swell = p === 'in'
      const over = (swell ? IN_SECONDS : OUT_SECONDS) / 3
      pad.gain.cancelScheduledValues(t)
      pad.gain.setTargetAtTime(swell ? 1 : 0.25, t, over)
      tone.frequency.cancelScheduledValues(t)
      tone.frequency.setTargetAtTime(swell ? 1400 : 500, t, over)
    },
    stop() {
      if (closed) return
      closed = true
      window.clearTimeout(timer)
      const t = ctx.currentTime
      master.gain.cancelScheduledValues(t)
      master.gain.setValueAtTime(master.gain.value, t)
      master.gain.linearRampToValueAtTime(0, t + 1.5)
      window.setTimeout(() => {
        for (const o of oscillators) {
          try {
            o.stop()
          } catch {
            /* already stopped */
          }
        }
        void ctx.close().catch(() => {})
      }, 1700)
    },
  }
}
