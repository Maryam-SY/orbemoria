import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SkipForward, Volume2 } from 'lucide-react'
import { useTranslation, type MessageKey } from '@/i18n'
import { createIntroScore, type IntroScore } from '@/lib/introSound'
import { liteGraphics } from '@/lib/device'
import { audioContextClass } from '@/lib/spaceAudio'
import { FADE_MS, markIntroSeen } from './introSession'

/**
 * US-2.4 / US-5.12: the intro, full screen, when the visitor arrives on the site — real NASA
 * footage only (public domain; new edit 2026-11-27, team request): the Saturn V engines igniting
 * and the lift-off, the Moon coming closer through Apollo 12's lunar module window and an
 * Apollo 12 astronaut on the surface, the ground of Mars rushing up under Perseverance, then
 * Ingenuity's shadow flying over the dunes, filmed by its own camera. Short sentences appear
 * over the pictures (written, so they work without sound and are translated). US-5.13: it
 * ends on the title "The Next Frontier" in close-up, then fades into the home page; a soft
 * soundtrack with two real recordings from Mars follows the pictures, without any voice
 * (lib/introSound). Browsers refuse sound until the visitor clicks, taps or presses a key: a "turn
 * sound on" button is then shown, and any click, tap or key also turns it on. The video
 * itself is muted (browsers only autoplay silent videos);
 * skippable at any time (button or Escape), skipped entirely if the browser refuses to play it.
 */
interface IntroVideoProps {
  /** The fade-out starts: the home page can light up underneath (true cross-fade). */
  onReveal: () => void
  /** The overlay is gone and can be removed. */
  onDone: () => void
}

/** Sentences shown over the footage, in seconds of the edited video (public/media/intro-nasa.mp4). */
const CUES: ReadonlyArray<{ from: number; to: number; key: MessageKey }> = [
  { from: 0.4, to: 5.4, key: 'intro.cue1' },
  { from: 6.2, to: 11.2, key: 'intro.cue2' },
  { from: 11.8, to: 14.0, key: 'intro.cue3' },
  { from: 14.5, to: 16.3, key: 'intro.cueFly' },
  { from: 16.6, to: 99, key: 'intro.cue4' },
]

/** How long the closing title stays in close-up before the site appears. */
const FINALE_MS = 3800

export function IntroVideo({ onReveal, onDone }: IntroVideoProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const [leaving, setLeaving] = useState(false)
  const [cue, setCue] = useState(-1)
  const [finale, setFinale] = useState(false)
  const doneRef = useRef(false)
  const scoreRef = useRef<IntroScore | null>(null)
  const [soundOn, setSoundOn] = useState(false)
  // The browser can make sound at all (Web Audio): the "turn sound on" button is offered.
  const [hasScore] = useState(() => audioContextClass() !== undefined)
  // Phones and tablets: the same footage in 540p (0.8 MB instead of 1.8 MB, 1969 TV quality either way).
  const [videoSrc] = useState(() => (liteGraphics() ? '/media/intro-nasa-mobile.mp4' : '/media/intro-nasa.mp4'))
  const finaleTimer = useRef<number | undefined>(undefined)
  const doneTimer = useRef<number | undefined>(undefined)

  const finish = (fade: boolean) => {
    if (doneRef.current) return
    doneRef.current = true
    window.clearTimeout(finaleTimer.current)
    scoreRef.current?.stop(fade ? FADE_MS / 1000 + 0.4 : 0.2)
    markIntroSeen()
    onReveal()
    if (!fade) {
      onDone()
      return
    }
    setLeaving(true)
    doneTimer.current = window.setTimeout(onDone, FADE_MS)
  }
  const finishRef = useRef(finish)
  useEffect(() => {
    finishRef.current = finish
  })

  /** The footage is over: the closing title in close-up, then the site. */
  const startFinale = () => {
    if (doneRef.current || finale) return
    setFinale(true)
    setCue(-1)
    scoreRef.current?.finale()
    finaleTimer.current = window.setTimeout(() => finishRef.current(true), FINALE_MS)
  }

  /**
   * Turns the soundtrack on. Tried at once; browsers that insist on a gesture first get it
   * at the visitor's first click, tap or key, or from the "turn sound on" button.
   */
  const enableSound = () => {
    const score = scoreRef.current
    if (!score || doneRef.current) return
    void score.start(videoRef.current?.currentTime ?? 0).then((playing) => {
      setSoundOn(playing)
      if (playing && finale) score.finale()
    })
  }
  const enableSoundRef = useRef(enableSound)
  useEffect(() => {
    enableSoundRef.current = enableSound
  })

  useEffect(() => {
    // The soundtrack: tried at once; browsers that need a gesture first get a button.
    const score = createIntroScore()
    scoreRef.current = score
    if (score) void score.start(0).then((playing) => setSoundOn(playing && !doneRef.current))
    const onGesture = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === 'Escape') return
      if (scoreRef.current && !scoreRef.current.playing()) enableSoundRef.current()
    }
    // Only these events count as a gesture that unlocks sound (a touch counts when it ends,
    // not when it starts: touchstart and a finger's pointerdown are refused by browsers).
    const gestures = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'] as const
    for (const type of gestures) window.addEventListener(type, onGesture, { passive: true })
    return () => {
      for (const type of gestures) window.removeEventListener(type, onGesture)
      window.clearTimeout(finaleTimer.current)
      window.clearTimeout(doneTimer.current)
      scoreRef.current?.stop(0.3)
    }
  }, [])

  useEffect(() => {
    skipRef.current?.focus({ preventScroll: true })
    const video = videoRef.current
    try {
      const playing = video?.play()
      if (playing && typeof playing.catch === 'function') playing.catch(() => finishRef.current(false))
      else if (!playing) finishRef.current(false)
    } catch {
      finishRef.current(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finishRef.current(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onTimeUpdate = () => {
    const time = videoRef.current?.currentTime ?? 0
    const index = CUES.findIndex((entry) => time >= entry.from && time < entry.to)
    if (index !== cue) setCue(index)
  }

  return (
    <section
      aria-label={t('intro.label')}
      className="fixed inset-0 z-[2600] bg-black transition-opacity ease-out"
      style={{ opacity: leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms`, pointerEvents: leaving ? 'none' : 'auto' }}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        poster="/media/intro-nasa-poster.jpg"
        muted
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onEnded={startFinale}
        onError={() => finish(false)}
        aria-hidden="true"
        className={`size-full object-cover transition-opacity duration-700 ${finale ? 'opacity-0' : 'opacity-100'}`}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
      <p className="sr-only">{t('intro.description')}</p>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[18%] flex justify-center px-6 text-center">
        {CUES.map((entry, index) => (
          <p
            key={entry.key}
            className={`intro-cue absolute max-w-3xl font-heading text-[clamp(1.6rem,4.5vw,3.6rem)] leading-tight font-bold text-white ${index === cue ? 'is-on' : ''}`}
          >
            {t(entry.key)}
          </p>
        ))}
      </div>
      {finale && (
        <div aria-hidden="true" className="intro-finale pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center">
          <div className="intro-finale-card" style={{ perspective: '800px' }}>
            <p className="intro-finale-eyebrow font-mono text-[0.72rem] tracking-[0.45em] text-cosmic-cyan uppercase sm:text-sm">{t('intro.presents')}</p>
            <p className="mt-4 font-heading text-[clamp(2rem,7vw,6rem)] leading-none font-medium tracking-[0.12em] text-white">
              {Array.from(t('intro.finale')).map((letter, index) => (
                <span key={index} className={`intro-finale-letter${letter === ' ' ? ' is-space' : ''}`} style={{ '--i': index } as CSSProperties}>
                  {letter === ' ' ? '\u00a0' : letter}
                </span>
              ))}
            </p>
            <span className="intro-finale-line" />
          </div>
        </div>
      )}
      {hasScore && !soundOn && !leaving && (
        <button
          type="button"
          onClick={enableSound}
          className="glass-blur absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-starlight transition-colors hover:border-cosmic-cyan hover:text-cosmic-cyan sm:left-6"
        >
          <Volume2 aria-hidden="true" className="size-4" />
          {t('intro.soundOn')}
        </button>
      )}
      <button
        ref={skipRef}
        type="button"
        onClick={() => finish(true)}
        className="glass-blur absolute right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom))] inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-starlight transition-colors hover:border-cosmic-cyan hover:text-cosmic-cyan sm:right-6"
      >
        {t('intro.skip')}
        <SkipForward aria-hidden="true" className="size-4" />
      </button>
    </section>
  )
}
