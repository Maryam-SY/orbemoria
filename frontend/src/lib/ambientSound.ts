/**
 * The sound of exploring (US-5.12): a slow, warm space drone with faint distant notes, and a
 * soft rising glide between pages — tones in a long echo, synthesised live with the Web Audio
 * API (lib/spaceAudio). Reworked 2026-11-27 for young ears (team request): the drone sits in
 * the warm low-mid range that phone speakers can play instead of a heavy sub-bass, the distant
 * notes stay below 1 kHz in a consonant chord, nothing starts with a click, and a limiter caps
 * every peak. Browsers only allow sound after a click or a key press, so it starts when the
 * visitor turns it on (sound switch in the header) and fades in gently.
 */
import { audioContextClass, createSafeOutput, createSpaceEcho, spaceTone } from './spaceAudio'

interface Engine {
  context: AudioContext
  master: GainNode
  echo: AudioNode
}

let engine: Engine | null = null
let enabled = false

const MAX_VOLUME = 0.2

/** A tone that never stops, its loudness slowly breathing (one breath every `period` seconds). */
function breathingTone(context: AudioContext, out: AudioNode, frequency: number, type: OscillatorType, level: number, period: number, detune = 0) {
  const oscillator = context.createOscillator()
  oscillator.type = type
  oscillator.frequency.value = frequency
  oscillator.detune.value = detune
  const gain = context.createGain()
  gain.gain.value = level
  const lfo = context.createOscillator()
  lfo.frequency.value = 1 / period
  const depth = context.createGain()
  depth.gain.value = level * 0.9
  lfo.connect(depth).connect(gain.gain)
  oscillator.connect(gain).connect(out)
  oscillator.start()
  lfo.start()
}

function createEngine(): Engine | null {
  const Context = audioContextClass()
  if (!Context) return null
  const context = new Context()
  const master = context.createGain()
  master.gain.value = 0
  master.connect(createSafeOutput(context, context.destination))
  const echo = createSpaceEcho(context, master, 6, 0.65)

  // Drone: low voices, each doubled slightly out of tune so they slowly beat, through a
  // breathing low-pass filter (no resonant peak: Q below 1).
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  filter.Q.value = 0.8
  filter.connect(master)
  filter.connect(echo)
  const lfo = context.createOscillator()
  const lfoDepth = context.createGain()
  lfo.frequency.value = 0.035
  lfoDepth.gain.value = 220
  lfo.connect(lfoDepth).connect(filter.frequency)
  lfo.start()
  // A (55 Hz) to A (220 Hz) with its fifth: the weight moved up from the sub-bass to the warm
  // range a phone can play, so the drone is heard softly instead of felt as a rumble.
  const voices: ReadonlyArray<readonly [number, OscillatorType, number, number]> = [
    [55, 'sine', 0.22, 23],
    [110, 'sine', 0.2, 31],
    [110, 'sine', 0.14, 19],
    [164.8, 'sine', 0.1, 27],
    [220, 'sine', 0.05, 17],
  ]
  voices.forEach(([frequency, type, level, period], index) => breathingTone(context, filter, frequency, type, level, period, index % 2 ? 6 : -4))

  // Distant notes: a soft A major chord below 1 kHz (no piercing highs), fading in and out at
  // their own pace, mostly echo.
  const shimmer = context.createGain()
  shimmer.gain.value = 0.22
  shimmer.connect(echo)
  const stars: ReadonlyArray<readonly [number, number]> = [
    [440, 13],
    [554.4, 17],
    [659.3, 11],
    [880, 19],
  ]
  for (const [frequency, period] of stars) breathingTone(context, shimmer, frequency, 'sine', 0.045, period)

  return { context, master, echo }
}

function fadeTo(volume: number, seconds: number) {
  if (!engine) return
  const { context, master } = engine
  const now = context.currentTime
  master.gain.cancelScheduledValues(now)
  master.gain.setValueAtTime(master.gain.value, now)
  master.gain.linearRampToValueAtTime(volume, now + seconds)
}

export function isSoundAvailable(): boolean {
  return audioContextClass() !== undefined
}

/** Must be called from a click or key handler (browser autoplay rules). */
export async function setSound(on: boolean): Promise<void> {
  enabled = on
  if (on) {
    engine ??= createEngine()
    if (!engine) return
    if (engine.context.state === 'suspended') await engine.context.resume()
    fadeTo(MAX_VOLUME, 2.5)
  } else {
    fadeTo(0, 0.8)
    // Once silent, suspend the whole graph: no oscillator keeps running for nothing.
    const current = engine
    window.setTimeout(() => {
      if (!enabled && current && current.context.state === 'running') void current.context.suspend().catch(() => undefined)
    }, 900)
  }
}

/** Lowers the drone while a voice speaks (narration, videos), then brings it back. */
export function duck(active: boolean): void {
  if (!enabled) return
  fadeTo(active ? MAX_VOLUME * 0.3 : MAX_VOLUME, 0.6)
}

/** A soft rising glide (two tones sliding up an octave), e.g. when the visitor flies to another page. */
export function glide(): void {
  if (!enabled || !engine) return
  const { context, master, echo } = engine
  const now = context.currentTime
  for (const [from, level] of [[220, 0.16], [329.6, 0.1]] as const) {
    spaceTone(context, { dry: master, echo }, { frequency: from, to: from * 2, start: now, end: now + 1.4, level, attack: 0.5, release: 0.8, echo: 0.8 })
  }
}

/** A machine's last signal fades: two soft pings, the second lower and fainter, lost in the echo (US-5.14). */
export function signalFade(): void {
  if (!enabled || !engine) return
  const { context, master, echo } = engine
  const now = context.currentTime
  // Soft onset (60 ms, not a click) and a lower, gentler pair of notes.
  for (const [delay, frequency, level] of [[0, 659.3, 0.14], [0.55, 493.9, 0.09]] as const) {
    spaceTone(context, { dry: master, echo }, { frequency, start: now + delay, end: now + delay + 1.7, level, attack: 0.06, release: 1.6, echo: 0.9 })
  }
}
