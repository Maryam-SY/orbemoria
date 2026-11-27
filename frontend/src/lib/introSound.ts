/**
 * The intro's soundtrack (US-5.13, reworked 2026-11-27 at the team's request: "better, and
 * adapted to the users' ears"). Soft tones in a long echo follow the edited NASA footage — a
 * warm swell for the Saturn V, an open chord for the Moon — and on Mars two real NASA
 * recordings take over, very quietly: the Martian wind heard by Perseverance's microphone, then
 * the hum of Ingenuity's rotors in flight (public/media, NASA/JPL-Caltech, public domain).
 *
 * Gentle by design: no sub-bass, no high shimmer above 1 kHz, no sharp attack, the same
 * loudness as the rest of the site, and a limiter before the speakers (createSafeOutput).
 * Browsers only play sound after a click, a tap or a key: `start()` reports when it is refused,
 * and the intro then offers a button, picking the score up where the video is.
 */
import { audioContextClass, createSafeOutput, createSpaceEcho, loadSample, spaceTone } from './spaceAudio'

export interface IntroScore {
  /** Tries to play from this second of the video. Resolves false if the browser blocks sound. */
  start: (videoSeconds: number) => Promise<boolean>
  /** The closing title: a wide, soft bloom. */
  finale: () => void
  /** Fades everything out and releases the audio device. */
  stop: (fadeSeconds?: number) => void
  playing: () => boolean
}

/** Moments of the edited footage (public/media/intro-nasa.mp4, 18 s), in seconds. */
export const INTRO_MOMENTS = {
  /** Saturn V: engines ignite, then lift-off. */
  launch: [0, 6.2],
  /** Apollo 12: the Moon through the lunar module's window, then an astronaut on the surface. */
  moon: [5.8, 11.9],
  /** Perseverance: the ground of Mars rushing up. */
  mars: [11.5, 14.5],
  /** Ingenuity: its shadow flying over the dunes. */
  flight: [14.15, 18],
} as const

/** Real NASA recordings from Mars (see the About page credits). */
const MARS_WIND = '/media/mars-wind.m4a'
const INGENUITY_HUM = '/media/ingenuity-hum.m4a'

/** Overall loudness: matched to the site's ambient sound (lib/ambientSound). */
const MASTER = 0.55

export function createIntroScore(): IntroScore | null {
  const Context = audioContextClass()
  if (!Context) return null
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let echo: AudioNode | null = null
  let started = false
  const sources: AudioScheduledSourceNode[] = []
  type Recordings = { wind: AudioBuffer | null; hum: AudioBuffer | null }
  const NONE: Recordings = { wind: null, hum: null }
  let samples: Promise<Recordings> = Promise.resolve(NONE)

  const ensure = () => {
    if (!context) {
      const ctx = new Context()
      const out = ctx.createGain()
      out.gain.value = MASTER
      out.connect(createSafeOutput(ctx, ctx.destination))
      echo = createSpaceEcho(ctx, out, 5, 0.6)
      // Assigned only once the whole graph exists: a half-built engine is never reused.
      master = out
      context = ctx
      samples = Promise.all([loadSample(ctx, MARS_WIND), loadSample(ctx, INGENUITY_HUM)]).then(
        ([wind, hum]) => ({ wind, hum }),
        () => NONE,
      )
    }
    return { context, master: master!, echo: echo! }
  }

  /** A tone `from`…`to` seconds from now (optionally gliding to another pitch). */
  const tone = (frequency: number, from: number, to: number, level: number, options: { attack?: number; release?: number; glideTo?: number; type?: OscillatorType; echo?: number } = {}) => {
    const { context: ctx, master: dry, echo: wet } = ensure()
    const now = ctx.currentTime
    const attack = options.attack ?? 1.2
    sources.push(
      spaceTone(ctx, { dry, echo: wet }, {
        frequency,
        to: options.glideTo,
        type: options.type,
        start: now + Math.max(0, from),
        end: now + Math.max(from + attack + 0.1, to),
        level,
        attack,
        release: options.release,
        echo: options.echo,
      }),
    )
  }

  /** A NASA recording from `from` seconds from now, faded in and out, at a quiet `level`. */
  const sample = (buffer: AudioBuffer | null, from: number, to: number, level: number) => {
    if (!buffer || !context || !master) return
    const ctx = context
    const now = ctx.currentTime
    const start = now + Math.max(0, from)
    // Joining late: start inside the recording rather than from its beginning.
    const offset = Math.min(Math.max(0, -from), buffer.duration - 0.5)
    const end = Math.min(now + to, start + buffer.duration - offset)
    if (end - start < 0.5) return
    const source = ctx.createBufferSource()
    source.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(level, start + Math.min(1.2, (end - start) / 3))
    gain.gain.setValueAtTime(level, Math.max(start, end - 1.2))
    gain.gain.linearRampToValueAtTime(0, end)
    source.connect(gain).connect(master)
    source.start(start, offset)
    source.stop(end + 0.05)
    sources.push(source)
  }

  /** Schedules the parts of the score still ahead of `at` (seconds of video). */
  const schedule = (at: number, recordings: Recordings) => {
    const { launch, moon, mars, flight } = INTRO_MOMENTS
    const ahead = (range: readonly [number, number]) => range[1] > at
    const rel = (seconds: number) => seconds - at
    if (ahead(launch)) {
      // Saturn V: a warm swell rising a fifth, felt rather than heard as a rumble.
      tone(55, rel(launch[0]), rel(launch[1]), 0.2, { attack: 2, release: 1.6, glideTo: 82.4, echo: 0.35 })
      tone(110, rel(launch[0] + 0.8), rel(launch[1]), 0.09, { attack: 1.8, release: 1.6, glideTo: 164.8, echo: 0.5 })
      tone(220, rel(launch[0] + 2.2), rel(launch[1]), 0.04, { attack: 1.6, release: 1.4, echo: 0.7 })
    }
    if (ahead(moon)) {
      // The Moon: an open, airy chord, far away in the echo.
      for (const [f, l] of [[220, 0.06], [277.2, 0.045], [329.6, 0.045], [440, 0.03], [659.3, 0.014]] as const) {
        tone(f, rel(moon[0]), rel(moon[1]), l, { attack: 1.8, release: 1.8, echo: 0.75 })
      }
    }
    if (ahead(mars)) {
      // Mars: the real wind, under a low chord that settles as the ground comes closer.
      sample(recordings.wind, rel(mars[0] - 0.3), rel(flight[1]), 0.6)
      for (const [f, l] of [[146.8, 0.05], [220, 0.04], [293.7, 0.03]] as const) {
        tone(f, rel(mars[0]), rel(mars[1] + 0.6), l, { attack: 1.2, release: 1.4, glideTo: f * 0.94, echo: 0.65 })
      }
    }
    if (ahead(flight)) {
      // Ingenuity flies: the real hum of its rotors, and a chord lifting gently.
      sample(recordings.hum, rel(flight[0]), rel(flight[1] + 0.8), 0.5)
      tone(73.4, rel(flight[0]), rel(flight[1]), 0.08, { attack: 1.4, release: 1.6, echo: 0.4 })
      for (const [f, l] of [[293.7, 0.035], [440, 0.028], [587.3, 0.018]] as const) {
        tone(f, rel(flight[0] + 0.4), rel(flight[1]), l, { attack: 1.4, release: 1.4, glideTo: f * 1.06, echo: 0.7 })
      }
    }
  }

  return {
    async start(videoSeconds) {
      const { context: ctx } = ensure()
      try {
        // resume() is called at once (inside the click or key handler, as browsers require).
        if (ctx.state === 'suspended') await Promise.race([ctx.resume(), new Promise((resolve) => setTimeout(resolve, 1200))])
      } catch {
        return false
      }
      if (ctx.state !== 'running') return false
      if (!started) {
        started = true
        // The two short recordings (about 140 KB) are usually there already; never wait long.
        // The video keeps playing meanwhile: the score joins it where it has got to.
        const waitedFrom = ctx.currentTime
        const recordings = await Promise.race([samples, new Promise<Recordings>((resolve) => setTimeout(() => resolve(NONE), 1500))])
        if (context === ctx) schedule(videoSeconds + (ctx.currentTime - waitedFrom), recordings)
      }
      return true
    },
    finale() {
      if (!started || !context) return
      // The closing title: a soft bloom (no sudden hit), a wide chord opening in the echo.
      tone(55, 0, 3.8, 0.16, { attack: 0.8, release: 2.6, echo: 0.5 })
      for (const [f, l] of [[110, 0.06], [164.8, 0.05], [220, 0.05], [277.2, 0.035], [329.6, 0.035], [440, 0.022]] as const) {
        tone(f, 0.2, 4.2, l, { attack: 1.4, release: 1.8, echo: 0.7 })
      }
      for (const [f, l] of [[659.3, 0.012], [880, 0.008]] as const) tone(f, 0.9, 4.2, l, { attack: 1.6, release: 1.6, echo: 0.95 })
    },
    stop(fadeSeconds = 0.9) {
      const ctx = context
      if (!ctx || !master) return
      const now = ctx.currentTime
      master.gain.cancelScheduledValues(now)
      master.gain.setValueAtTime(master.gain.value, now)
      master.gain.linearRampToValueAtTime(0, now + fadeSeconds)
      window.setTimeout(() => {
        sources.forEach((source) => {
          try {
            source.stop()
          } catch {
            // Already stopped.
          }
        })
        void ctx.close().catch(() => undefined)
      }, fadeSeconds * 1000 + 100)
      context = null
      master = null
      echo = null
    },
    playing: () => started && context?.state === 'running',
  }
}
