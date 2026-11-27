import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Gamepad2, MapPin } from 'lucide-react'
import { ArFallback } from '@/components/ar/ArFallback'
import { VoiceTag } from '@/components/sources/VoiceTag'
import { Link, useLocation, useParams } from 'react-router'
import { ApiError, api } from '@/api/client'
import type { DestinationDetail, MachineDetail, MachinePart, Media, MissionDetail, StoryDetail } from '@/api/types'
import { paths } from '@/app/paths'
import { NarrationButton } from '@/components/audio/NarrationButton'
import { SpaceBackdrop } from '@/components/celestial/SpaceBackdrop'
import { LoadState } from '@/components/common/LoadState'
import { MACHINE_TRANSITION_NAME } from '@/components/hangar/MachinePortal'
import { ModelViewer3D } from '@/components/journey/ModelViewer3D'
import { placedParts } from '@/lib/parts'
import { PhotoFlight } from '@/components/journey/PhotoFlight'
import { ActCard } from '@/components/machine/ActCard'
import { LifeLine } from '@/components/machine/LifeLine'
import { MachineQuiz } from '@/components/machine/MachineQuiz'
import { MachinePortrait } from '@/components/machine/MachinePortrait'
import { TelemetryBar } from '@/components/machine/TelemetryBar'
import { DepictionBadge } from '@/components/media/DepictionBadge'
import { VideoReel } from '@/components/media/VideoReel'
import { DecodeText } from '@/components/motion/DecodeText'
import { Reveal } from '@/components/motion/Reveal'
import { JourneyRail } from '@/components/navigation/JourneyRail'
import { RelationEnds } from '@/components/relations/RelationEnds'
import { WordsToKnow } from '@/components/story/StoryPedagogy'
import { useApi } from '@/hooks/useApi'
import { useInView } from '@/hooks/useInView'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useTranslation } from '@/i18n'
import { contentLang } from '@/i18n/translate'
import { buildActs, type Act } from '@/lib/acts'
import { wordsIn } from '@/lib/glossary'
import { signalFade } from '@/lib/ambientSound'
import { keepHyphens } from '@/lib/keepHyphens'
import { record } from '@/lib/explorerLog'
import { formatPartialDate } from '@/lib/formatDate'
import { bestStill, biographyChapters, machineChapters, machineCover, modelOf, type LifeChapter } from '@/lib/journey'
import { daysBetween, lastSignal } from '@/lib/lifespan'
import { eyebrow } from '@/lib/styles'
import { cardSrc, sceneSrc } from '@/lib/mediaSrc'
import { sameText } from '@/lib/sameText'
import { cn } from '@/lib/utils'
import { isDestinationId, type DestinationId } from '@/types/content'
import { NotFoundPage } from './NotFoundPage'

export function MachinePage() {
  const { destinationId, machineId = '' } = useParams()
  if (!isDestinationId(destinationId)) return <NotFoundPage />
  return <MachineView key={machineId} destinationId={destinationId} machineId={machineId} />
}

/** NASA video files the reel can play (YouTube pages are not embedded). */
const isPlayableVideo = (media: Media) => media.type === 'video' && /\.mp4($|\?)/i.test(media.url)

/**
 * One machine, its whole life (US-5.12): it arrives, works, falls silent, and leaves
 * something behind. Nothing of any other machine is told here — the page ends by handing over
 * to the next machine of the same world.
 */
function MachineView({ destinationId, machineId }: { destinationId: DestinationId; machineId: string }) {
  const { t } = useTranslation()
  const machine = useApi(`machine:${machineId}`, (lang, signal) => api.machine(machineId, lang, signal))
  const missionId = machine.status === 'success' ? machine.data.missionId : null
  const mission = useApi(`mission:${missionId}`, (lang, signal) => api.mission(missionId ?? '', lang, signal), {
    enabled: missionId !== null,
  })
  const destination = useApi(`destination:${destinationId}`, (lang, signal) => api.destination(destinationId, lang, signal))
  // US-5.13: its story is told on this page (no separate "6 steps" page from here).
  const storyId = machine.status === 'success' ? (machine.data.storyTarget?.id ?? null) : null
  const story = useApi(`story:${storyId}`, (lang, signal) => api.story(storyId ?? '', lang, signal), { enabled: storyId !== null })
  useDocumentTitle(
    machine.status === 'success' ? machine.data.name : t('machine.title'),
    machine.status === 'success' ? (machine.data.biography?.description.value ?? machine.data.scienceSummary?.value ?? null) : null,
  )
  useEffect(() => record('machines', machineId), [machineId])

  if (machine.status === 'error' && machine.error instanceof ApiError && machine.error.status === 404) return <NotFoundPage />
  if (machine.status !== 'success') {
    return (
      <div className="relative mx-auto flex min-h-[70dvh] max-w-3xl flex-col justify-center px-5 py-16">
        <LoadState status={machine.status} onRetry={machine.retry} />
      </div>
    )
  }
  if (machine.data.destinationId !== destinationId) return <NotFoundPage />

  return (
    <MachineLife
      machine={{ ...machine.data, name: keepHyphens(machine.data.name) }}
      mission={mission.status === 'success' ? mission.data : null}
      destination={destination.status === 'success' ? destination.data : null}
      story={story.status === 'success' ? story.data : null}
    />
  )
}

interface MachineLifeProps {
  machine: MachineDetail
  mission: MissionDetail | null
  destination: DestinationDetail | null
  story: StoryDetail | null
}

function MachineLife({ machine, mission, destination, story }: MachineLifeProps) {
  const { t, locale } = useTranslation()
  // Words to know (US-5.15, reuses the glossary of US-5.7): optional, the page stays complete without it.
  const glossary = useApi('glossary', (lang, signal) => api.glossary(lang, signal))
  const glossaryEntries = glossary.status === 'success' ? glossary.data : []
  const destinationId = machine.destinationId as DestinationId
  const cover = (mission ? machineCover(mission, machine.id) : undefined) ?? bestStill(machine.media.filter((m) => m.depiction === 'photo')) ?? bestStill(machine.media)
  // US-5.13: the machine's own chapters when the content tells them; otherwise the steps of its
  // mission that show it.
  const biography = machine.biography ?? null
  // Its portrait next to its presentation: a photo of it alone, other than the opening one.
  const ownPhotos = machine.media.filter((m) => m.type === 'image' && m.depiction === 'photo' && m.machineIds.length === 1)
  // US-5.13: parts are shown only for machines that have a real 3D model (team decision: on a
  // photo alone, parts cannot be told apart reliably). Their placed photo is then the portrait.
  const parts = machine.parts?.modelMediaId ? machine.parts : null
  const partsPhoto = parts?.photoMediaId ? machine.media.find((m) => m.id === parts.photoMediaId) : undefined
  const portrait = partsPhoto ?? ownPhotos.find((m) => m.id !== cover?.id) ?? ownPhotos[0] ?? cover
  const portraitParts = partsPhoto
    ? (parts?.items ?? []).flatMap((part) => (part.photo ? [{ id: part.id, name: part.name, description: part.description, x: part.photo.x, y: part.photo.y }] : []))
    : []
  // Pictures already on the page (opening photo, portrait) are not flown past again.
  const shownPictures = new Set<string>([cover?.id, portrait?.id].filter((id): id is string => Boolean(id)))
  const chapters: LifeChapter[] = biography ? biographyChapters(machine, shownPictures) : mission ? machineChapters(machine, mission, cover, 10) : []
  const forEarth = biography?.forEarth ?? []
  const mediaById = new Map(machine.media.map((m) => [m.id, m]))
  const videos = machine.media.filter(isPlayableVideo)
  const model = mission ? modelOf(mission, machine.id) : undefined
  const signal = lastSignal(machine.lifespan)
  const epilogue = machine.status.note ?? null
  // US-5.14: the story's structure comes out of the machine's own dates — its acts.
  const acts = buildActs(machine, chapters)
  const actTitle = (act: Act) => (act.key === 'alive' ? t('acts.alive.title', { name: machine.name }) : t(`acts.${act.key}.title`))
  const alive = machine.lifespan?.stillWorking?.value ?? false
  const coldOpen = alive && machine.date ? t('cold.alive', { year: machine.date.value.slice(0, 4) }) : signal ? t('cold.last', { date: formatPartialDate(signal.value, locale) }) : null
  // The closing "your turn" invitation of the story, kept only when the story is this machine's own.
  const yourTurn =
    story && (story.kind === 'machine' || (mission?.machines.length ?? 0) <= 1)
      ? (story.steps.find((step) => step.key === 'your-turn')?.blocks ?? []).filter((block) => block.voice === 'imagination')
      : []

  // Next machine of the same world, so the visitor goes on from one life to the next.
  const all = destination ? destination.missions.flatMap((m) => m.machines.map((x) => ({ machine: x, mission: m }))) : []
  const here = all.findIndex((entry) => entry.machine.id === machine.id)
  const next = all.length > 1 && here >= 0 ? all[(here + 1) % all.length] : undefined

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const goTo = (id: string) => sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // US-5.16: the parts hunt sends the visitor to "#quiz"; the router does not scroll to anchors.
  const { hash } = useLocation()
  useEffect(() => {
    const id = hash.slice(1)
    if (!id) return
    const timer = window.setTimeout(() => sectionRefs.current[id]?.scrollIntoView({ block: 'start' }), 300)
    return () => window.clearTimeout(timer)
  }, [hash])

  const rail = [
    { id: 'arrival', label: t('machine.arrival') },
    ...(biography ? [{ id: 'who', label: t('machine.whoEyebrow') }] : []),
    { id: 'life', label: t('machine.lifeEyebrow') },
    ...acts.map((act) => ({ id: `act-${act.key}`, label: actTitle(act) })),
    ...(forEarth.length > 0 ? [{ id: 'earth', label: t('machine.earthEyebrow') }] : []),
    ...(videos.length > 0 ? [{ id: 'videos', label: t('machine.videosEyebrow') }] : []),
    ...(model ? [{ id: 'model', label: t('machine.modelEyebrow') }] : []),
    ...(machine.relations.length > 0 ? [{ id: 'legacy', label: t('machine.legacyEyebrow') }] : []),
    { id: 'end', label: t('machine.endEyebrow') },
    { id: 'quiz', label: t('quiz.eyebrow') },
    ...(next ? [{ id: 'next', label: t('machine.next') }] : []),
  ]

  // US-5.13: "Day 1 234 of its mission" — plain arithmetic on two sourced full dates.
  const missionClock = (date: string | undefined) => {
    const born = machine.date?.value
    if (!date || !born || date.length < 10 || born.length < 10) return undefined
    const day = daysBetween(born, date)
    if (day !== null) return t('machine.clockDay', { day: (day + 1).toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR') })
    const before = daysBetween(date, born)
    return before !== null ? t('machine.clockBefore', { days: before.toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR') }) : undefined
  }

  const register = (id: string) => (element: HTMLElement | null) => {
    sectionRefs.current[id] = element
  }

  // Last signal: its sequence (trace, flatline, the date typing itself) plays when reached.
  const endRef = useRef<HTMLElement | null>(null)
  const endLive = useInView(endRef, '0px 0px -35% 0px')
  useEffect(() => {
    if (endLive && !alive) signalFade()
  }, [endLive, alive])

  const flightItems = (list: LifeChapter[]) =>
    list.map((chapter) => ({
      id: chapter.id,
      media: chapter.media,
      withStory: !sameText(chapter.text, chapter.media?.description),
      hud: missionClock(chapter.date?.value),
      // The moment's text already is the picture's caption: no second copy under it.
      hideCaption: chapter.fromPicture || sameText(chapter.text, chapter.media?.alt),
      content: (
        <>
          <p className="font-mono text-xs tracking-widest text-world uppercase">
            {chapter.date ? <time dateTime={chapter.date.value}>{formatPartialDate(chapter.date.value, locale)}</time> : t('journey.anotherLook')}
          </p>
          {chapter.title && <h3 data-narrate className="mt-1 font-heading text-2xl leading-tight font-bold sm:text-4xl">{chapter.title}</h3>}
          <p data-narrate className="mt-2 text-[0.95rem] leading-relaxed text-starlight sm:text-lg">{chapter.text}</p>
        </>
      ),
    }))

  return (
    <div data-world={destinationId} data-narration-root lang={contentLang(locale)} className="relative overflow-x-clip">
      <SpaceBackdrop />
      <JourneyRail items={rail} label={t('machine.journeyLabel', { name: machine.name })} />

      <div className="relative z-10 md:pr-16 lg:pr-20">
        {/* Arrival: the machine, full screen. */}
        <section
          id="arrival"
          ref={register('arrival')}
          aria-labelledby="machine-title"
          className="relative isolate flex min-h-[100dvh] flex-col justify-end overflow-hidden"
        >
          {cover && (
            <div className="absolute inset-0 -z-10" style={{ viewTransitionName: MACHINE_TRANSITION_NAME }}>
              {/* The photo whole (never cropped), over a dimmed copy that fills the screen. */}
              <img src={sceneSrc(cover)} alt="" aria-hidden="true" decoding="async" className="machine-hero-ambient absolute inset-0 size-full object-cover" />
              <img src={sceneSrc(cover)} alt={cover.alt} decoding="async" fetchPriority="high" className="machine-hero-photo relative size-full object-contain max-lg:hidden" />
              <span aria-hidden="true" className="hero-scan" />
              <span className="absolute top-20 left-5 sm:left-8">
                <DepictionBadge depiction={cover.depiction} />
              </span>
            </div>
          )}
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-void via-void/70 to-void/10" />
          {/* Phones and tablets: the photo whole in the space above the text, never under it. */}
          {cover && (
            <div className="relative min-h-[30dvh] flex-1 px-3 pt-20 lg:hidden">
              <img src={sceneSrc(cover)} alt={cover.alt} decoding="async" fetchPriority="high" className="machine-hero-photo size-full object-contain" />
            </div>
          )}
          <div className="hero-rise mx-auto w-full max-w-6xl px-5 pt-4 pb-16 sm:pb-20 lg:pt-32">
            <Link
              to={paths.destination(destinationId)}
              viewTransition
              className="text-legible inline-flex min-h-11 items-center gap-2 text-sm font-medium text-starlight/85 transition-colors hover:text-world"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              {t('machine.back', { destination: t(`destinations.${destinationId}.name`) })}
            </Link>
            {/* US-5.14 cold open: the page starts from the end — the last signal — then the name decodes. */}
            {coldOpen && (
              <p className={cn(eyebrow, 'mt-6 text-world')}>
                <DecodeText text={coldOpen} delay={100} duration={900} />
              </p>
            )}
            <p className={cn(eyebrow, 'mt-3 text-moon-dust')}>
              {machine.mission?.name} · {t(`machineType.${machine.type}`)}
            </p>
            <h1
              id="machine-title"
              data-narrate
              data-narrate-text={machine.name}
              className="text-glow mt-2 font-heading text-[clamp(2.8rem,9vw,7rem)] leading-[0.92] font-bold tracking-tight"
            >
              <DecodeText text={machine.name} delay={coldOpen ? 900 : 200} duration={1200} />
            </h1>
            {machine.scienceSummary && <p data-narrate className="text-legible mt-5 max-w-2xl text-lg text-starlight sm:text-2xl">{machine.scienceSummary.value}</p>}
            <TelemetryBar machine={machine} className="mt-6" />
            <div className="mt-8 flex flex-wrap gap-3">
              <NarrationButton />
            </div>
          </div>
        </section>

        {biography && (
          <Chapter id="who" narrate register={register} eyebrowText={t('machine.whoEyebrow')} title={t('machine.whoTitle', { name: machine.name })}>
            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
              <Reveal>
                <p data-narrate className="reading-panel rounded-3xl p-6 text-lg leading-relaxed sm:p-8 sm:text-xl sm:leading-relaxed">
                  {biography.description.value}
                </p>
              </Reveal>
              {portrait && (
                <Reveal delay={150} className="max-lg:order-first">
                  <MachinePortrait media={portrait} parts={portraitParts} />
                </Reveal>
              )}
            </div>
          </Chapter>
        )}

        <Chapter id="life" narrate register={register} eyebrowText={t('machine.lifeEyebrow')} title={t(machine.lifespan?.stillWorking?.value ? 'machine.lifeTitleAlive' : 'machine.lifeTitle', { name: machine.name })}>
          <LifeLine born={machine.date} lifespan={machine.lifespan} />
        </Chapter>

        {/* US-5.14: the acts of its life — a title card, then the flight of that act's moments. */}
        {acts.map((act, index) => (
          <section key={act.key} id={`act-${act.key}`} ref={register(`act-${act.key}`)} aria-labelledby={`act-${act.key}-title`} className="scroll-mt-16" data-tone={act.key}>
            <ActCard act={act} number={index + 1} titleId={`act-${act.key}-title`} destinationId={destinationId} machineName={machine.name} />
            {act.chapters.length > 0 && <PhotoFlight label={`${t('journey.flightLabel', { name: machine.name })} · ${actTitle(act)}`} items={flightItems(act.chapters)} />}
            {act.chapters.length > 0 && (
              <div className="mx-auto max-w-6xl px-5 pb-6">
                <WordsToKnow words={wordsIn(act.chapters.map((chapter) => chapter.text), glossaryEntries, locale)} />
              </div>
            )}
          </section>
        ))}

        {forEarth.length > 0 && (
          <Chapter id="earth" narrate register={register} eyebrowText={t('machine.earthEyebrow')} title={t('machine.earthTitle', { name: machine.name })}>
            <ul className="grid gap-5 md:grid-cols-2">
              {forEarth.map((benefit, index) => {
                const picture = bestStill(benefit.mediaIds.map((id) => mediaById.get(id)).filter((m): m is Media => m !== undefined && !shownPictures.has(m.id)))
                if (picture) shownPictures.add(picture.id)
                return (
                  <li key={benefit.id}>
                    <Reveal delay={index * 90} className="reading-panel earth-card h-full overflow-hidden rounded-3xl">
                      {picture && <img src={cardSrc(picture)} alt={picture.alt} loading="lazy" className="block h-auto max-h-[60vh] w-full bg-void object-contain" />}
                      <div className="p-6">
                        <h3 data-narrate className="font-heading text-xl font-bold text-world sm:text-2xl">
                          {benefit.title}
                        </h3>
                        <p data-narrate className="mt-2 leading-relaxed sm:text-lg">
                          {benefit.text}
                        </p>
                      </div>
                    </Reveal>
                  </li>
                )
              })}
            </ul>
          </Chapter>
        )}

        {videos.length > 0 && (
          <Chapter id="videos" register={register} eyebrowText={t('machine.videosEyebrow')} title={t('machine.videosTitle')}>
            <VideoReel
              videos={videos}
              label={t('video.label', { name: machine.name })}
              onFinished={() => goTo(model ? 'model' : machine.relations.length > 0 ? 'legacy' : 'end')}
            />
          </Chapter>
        )}

        {model && (
          <Chapter id="model" register={register} eyebrowText={t('machine.modelEyebrow')} title={t('machine.modelTitle')}>
            <LazyModel model={model} parts={parts?.items ?? []} arFallback={<ArFallback url={`${window.location.origin}${paths.ar(destinationId, machine.id)}`} name={machine.name} />} />
            {parts && placedParts(parts.items).length > 0 && (
              <Link
                to={paths.ar(destinationId, machine.id)}
                className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-world/60 px-5 font-semibold hover:bg-world hover:text-void"
              >
                <Gamepad2 aria-hidden="true" className="size-5" />
                {t('ar.playLink')}
              </Link>
            )}
          </Chapter>
        )}

        {machine.relations.length > 0 && (
          <Chapter id="legacy" register={register} eyebrowText={t('machine.legacyEyebrow')} title={t('machine.legacyTitle')}>
            <ul className="grid gap-4 md:grid-cols-2">
              {machine.relations.map((relation, index) => (
                <li key={relation.id}>
                  <Reveal delay={index * 90} className="glass h-full rounded-3xl p-6">
                    <RelationEnds relation={relation} />
                    <p data-narrate className="mt-3 text-lg leading-relaxed text-starlight">{relation.transmitted}</p>
                  </Reveal>
                </li>
              ))}
            </ul>
          </Chapter>
        )}

        {/* Its last signal: the heartbeat goes flat. */}
        <section
          id="end"
          ref={(element) => {
            endRef.current = element
            sectionRefs.current.end = element
          }}
          aria-labelledby="end-title"
          className={cn('end-sequence mx-auto flex min-h-[80dvh] max-w-4xl scroll-mt-16 flex-col items-center justify-center px-5 py-24 text-center', endLive && 'is-live', alive && 'is-alive-end')}
        >
          <p className={cn(eyebrow, 'text-world')}>{t('machine.endEyebrow')}</p>
          <h2 id="end-title" data-narrate className="mt-3 font-heading text-4xl font-bold sm:text-6xl">
            {machine.lifespan?.stillWorking?.value ? t('machine.endAlive') : t('machine.endTitle')}
          </h2>
          <svg aria-hidden="true" viewBox="0 0 600 80" preserveAspectRatio="none" className={cn('flatline mt-8 h-20 w-full max-w-2xl', machine.lifespan?.stillWorking?.value && 'is-alive')}>
            <path d="M0 40 H150 L162 16 L174 64 L186 40 H260 L268 30 L276 50 L284 40 H600" pathLength={1} className="flatline-path" />
          </svg>
          {signal && !machine.lifespan?.stillWorking?.value && (
            <p data-narrate data-narrate-text={formatPartialDate(signal.value, locale)} className="mt-6 font-mono text-2xl text-starlight sm:text-3xl">
              <time dateTime={signal.value} className="typewriter" style={{ '--n': formatPartialDate(signal.value, locale).length } as CSSProperties}>
                {formatPartialDate(signal.value, locale)}
              </time>
            </p>
          )}
          {epilogue && <p data-narrate className="end-after text-legible mt-6 max-w-2xl text-lg leading-relaxed text-starlight">{epilogue}</p>}
          {yourTurn.length > 0 && (
            <div className="end-after reading-panel mt-10 max-w-2xl rounded-3xl p-6 text-left sm:p-8">
              <VoiceTag voice="imagination" />
              {yourTurn.map((block, index) => (
                <p key={index} data-narrate className="mt-3 text-lg leading-relaxed italic">
                  {block.text}
                </p>
              ))}
            </div>
          )}
          {machine.locationName && (
            <p data-narrate className="end-after mt-6 inline-flex items-center gap-2 text-moon-dust">
              <MapPin aria-hidden="true" className="size-4" />
              {t('machine.restsAt', { place: machine.locationName.value })}
            </p>
          )}
        </section>

        <section id="quiz" ref={register('quiz')} aria-labelledby="quiz-title" className="scene-blend mx-auto max-w-4xl scroll-mt-16 px-5 pb-16">
          <h2 id="quiz-title" className="sr-only">
            {t('quiz.title')}
          </h2>
          <MachineQuiz machine={machine} world={t(`destinations.${destinationId}.name`)} />
        </section>

        {next && (
          <section id="next" ref={register('next')} aria-labelledby="next-title" className="mx-auto max-w-4xl scroll-mt-16 px-5 pb-28">
            <p className={cn(eyebrow, 'text-center text-world')}>{t('machine.next')}</p>
            <Link
              to={paths.machine(destinationId, next.machine.id)}
              viewTransition
              className="group relative mt-6 block overflow-hidden rounded-3xl border border-white/10"
            >
              {next.machine.cover && (
                <img
                  src={cardSrc(next.machine.cover)}
                  alt=""
                  loading="lazy"
                  className="aspect-[21/9] w-full object-cover opacity-70 transition-[transform,opacity] duration-700 group-hover:scale-105 group-hover:opacity-90"
                />
              )}
              <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-void via-void/60 to-transparent" />
              <span className="absolute inset-y-0 left-0 flex flex-col justify-center p-6 sm:p-10">
                <span className="font-mono text-xs tracking-[0.25em] text-world uppercase">{next.mission.name}</span>
                <span id="next-title" className="mt-2 font-heading text-3xl font-bold sm:text-5xl">
                  {next.machine.name}
                </span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">
                  {t('hangar.wake')}
                  <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </span>
            </Link>
            <div className="mt-8 text-center">
              <Link to={paths.destination(destinationId)} viewTransition className="inline-flex min-h-11 items-center gap-2 text-sm text-moon-dust hover:text-world">
                <ArrowLeft aria-hidden="true" className="size-4" />
                {t('machine.back', { destination: t(`destinations.${destinationId}.name`) })}
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

interface ChapterProps {
  id: string
  eyebrowText: string
  title: string
  /** Its title is read by the narration (US-5.12 read-along). */
  narrate?: boolean
  register: (id: string) => (element: HTMLElement | null) => void
  children: ReactNode
}

/** One clearly separated part of the machine's life: eyebrow, title, content. */
function Chapter({ id, eyebrowText, title, narrate, register, children }: ChapterProps) {
  return (
    <section id={id} ref={register(id)} aria-labelledby={`${id}-title`} className="scene-blend mx-auto max-w-6xl scroll-mt-16 px-5 py-20">
      <Reveal>
        <p className={cn(eyebrow, 'text-world')}>{eyebrowText}</p>
        <h2 id={`${id}-title`} data-narrate={narrate || undefined} className="mt-2 font-heading text-4xl font-bold sm:text-5xl">
          {title}
        </h2>
      </Reveal>
      <div className="mt-10">{children}</div>
    </section>
  )
}

/** The NASA 3D model, loaded only when its chapter comes near (the viewer weighs ~140 KB). */
function LazyModel({ model, parts, arFallback }: { model: Media; parts: readonly MachinePart[]; arFallback?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const element = ref.current
    if (!element || near) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: '60% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [near])
  return (
    <div ref={ref} className="h-[28rem] lg:h-[36rem]">
      {near && <ModelViewer3D model={model} parts={parts} arFallback={arFallback} />}
    </div>
  )
}
