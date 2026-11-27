/**
 * Content model — see docs/architecture/DATA_MODEL.md.
 * All editorial text is bilingual (LocalizedText); proper names stay as plain strings.
 */

export const LANGS = ['en', 'fr'] as const
export type Lang = (typeof LANGS)[number]

export interface LocalizedText {
  en: string
  fr: string
}

/** A displayed fact: always tied to at least one source (SOURCE-001). */
export interface Sourced<T> {
  value: T
  sourceIds: string[]
  note?: LocalizedText
}

export const DESTINATION_IDS = ['moon', 'mars'] as const
export type DestinationId = (typeof DESTINATION_IDS)[number]

export interface Destination {
  id: DestinationId
  name: LocalizedText
  kind: 'natural-satellite' | 'planet'
  intro: LocalizedText
  order: number
}

export interface Period {
  start: string
  end?: string | null
}

export interface Mission {
  id: string
  name: string
  destinationId: DestinationId
  agency: string[]
  nssdcaIds: string[]
  period: Sourced<Period> | null
  summary: LocalizedText
  mainStoryId: string | null
  sourceIds: string[]
  order: number
  /** Key steps of the mission, oldest first, explained in plain language. */
  timeline: TimelineEvent[]
}

/** One dated step of a mission (launch, landing, discovery, end…). */
export interface TimelineEvent {
  id: string
  /** The date is a fact: it is sourced like any other. */
  date: Sourced<string>
  title: LocalizedText
  /** Plain-language explanation for a general audience (10–15 year olds first). */
  description: LocalizedText
  /** Illustrations; each must be linked to this mission. */
  mediaIds: string[]
}

export const MACHINE_STATUSES = ['operational', 'contact-lost', 'inactive', 'mission-ended', 'unknown'] as const
export type MachineStatus = (typeof MACHINE_STATUSES)[number]

export const MACHINE_TYPES = ['lander', 'rover', 'descent-stage', 'experiment', 'helicopter', 'impactor', 'other'] as const
export type MachineType = (typeof MACHINE_TYPES)[number]

export interface Coordinates {
  lat: number
  lon: number
}

export const LIFESPAN_UNITS = ['days', 'sols', 'flights', 'years'] as const
export type LifespanUnit = (typeof LIFESPAN_UNITS)[number]

/**
 * How long a machine was meant to live and when it really fell silent (US-5.12, rule V16).
 * Every value is sourced; `status` stays "draft" until a human has checked it.
 */
export interface Lifespan {
  status: 'draft' | 'reviewed'
  /** Designed / primary-mission duration announced by NASA. */
  planned: Sourced<{ amount: number; unit: LifespanUnit }> | null
  /** Last signal received from the machine. */
  lastContact: Sourced<string> | null
  /** Official end of its mission or of its active role. */
  missionEnd: Sourced<string> | null
  /** Still in use today (e.g. a laser retroreflector). */
  stillWorking: Sourced<boolean> | null
  /** What it achieved beyond the plan, in plain words. */
  achievements: Sourced<LocalizedText>[]
}

/**
 * One dated moment of a single machine's own life (US-5.13, rule V17): what it did, told in
 * full plain sentences. Its pictures show this machine; its facts are sourced.
 */
export interface MachineChapter {
  id: string
  /** Full or partial date, sourced; null for a moment without a precise date. */
  date: Sourced<string> | null
  title: LocalizedText
  text: LocalizedText
  /** Pictures of this moment; each must be linked to this machine. */
  mediaIds: string[]
  sourceIds: string[]
}

/**
 * The machine's own life story (US-5.13, rule V17): a complete presentation, then its chapters
 * in order. Kept apart from its mission's timeline so twin machines never share chapters.
 * `status` stays "draft" until a human has checked it.
 */
export interface Biography {
  status: 'draft' | 'reviewed'
  /** What the machine is, how it works and why it was sent, in a few full sentences. */
  description: Sourced<LocalizedText>
  chapters: MachineChapter[]
  /** What it brought to people on Earth or to human progress (US-5.13), each sourced. */
  forEarth?: EarthBenefit[]
}

/** One thing a machine brought back to Earth: a technology, a method, a discovery (US-5.13). */
export interface EarthBenefit {
  id: string
  title: LocalizedText
  text: LocalizedText
  mediaIds: string[]
  sourceIds: string[]
}

/**
 * The machine's important parts, shown as touch points on one photo and, when it has one, on
 * its 3D model (US-5.13, rule V18). `status` stays "draft" until a human has checked it.
 */
export interface MachineParts {
  status: 'draft' | 'reviewed'
  /** Photo the touch points are placed on (it must show this machine). */
  photoMediaId: string | null
  /** 3D model whose nodes are named, when there is one. */
  modelMediaId: string | null
  items: MachinePart[]
}

export interface MachinePart {
  id: string
  name: LocalizedText
  description: LocalizedText
  sourceIds: string[]
  /** Centre of the part on the photo, in percent of its width and height. */
  photo: { x: number; y: number } | null
  /** Name of the node of the 3D model that is this part. */
  modelNode: string | null
  /** Centre of the part in the 3D model's own coordinates (metres), for its touch point. */
  modelPosition?: { x: number; y: number; z: number } | null
}

export interface Machine {
  id: string
  name: string
  missionId: string
  type: MachineType
  nssdcaId: string | null
  date: Sourced<string> | null
  dateLabel?: 'landing' | 'deployment' | 'impact' | 'last-contact'
  locationName: Sourced<string> | null
  coordinates: Sourced<Coordinates> | null
  status: Sourced<MachineStatus>
  scienceSummary: Sourced<LocalizedText> | null
  storyIds: string[]
  lifespan?: Lifespan | null
  biography?: Biography | null
  parts?: MachineParts | null
}

export const RELATION_TYPES = ['method', 'technology', 'data', 'knowledge', 'inspiration'] as const
export type RelationType = (typeof RELATION_TYPES)[number]

export interface EntityRef {
  kind: 'machine' | 'mission'
  id: string
}

export interface Relation {
  id: string
  from: EntityRef
  to: EntityRef
  type: RelationType
  transmitted: LocalizedText
  evidence: LocalizedText
  sourceIds: string[]
  showOnMap: boolean
}

export const STEP_KEYS = ['signal', 'why', 'how', 'discovery', 'relay', 'your-turn'] as const
export type StepKey = (typeof STEP_KEYS)[number]

export const VOICES = ['data', 'interpretation', 'imagination'] as const
export type Voice = (typeof VOICES)[number]

export interface StoryBlock {
  voice: Voice
  text: LocalizedText
  sourceIds: string[]
  mediaIds?: string[]
}

export interface StoryStep {
  key: StepKey
  title: LocalizedText
  blocks: StoryBlock[]
  relationIds?: string[]
}

export interface Story {
  id: string
  kind: 'mission' | 'machine'
  /** Missions this story belongs to (a story may span two missions, e.g. Surveyor 3 + Apollo 12). */
  missionIds: string[]
  machineIds: string[]
  title: LocalizedText
  status: 'draft' | 'reviewed'
  steps: StoryStep[]
}

export const SOURCE_TYPES = ['nssdca', 'nasa-mission-page', 'nasa-news', 'press', 'paper', 'other'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export interface Source {
  id: string
  organization: string
  title: string
  url: string
  type: SourceType
  publishedOn: string | null
  accessedOn: string
  note?: LocalizedText
}

export const MEDIA_TYPES = ['image', 'animation', 'video', '3d-model', 'document'] as const
export type MediaType = (typeof MEDIA_TYPES)[number]

/**
 * - photo: real photograph or real footage (including GIFs built from real camera frames)
 * - artwork: artist's concept, illustration, poster — NOT a photo
 * - simulation: computer-generated image, animation, 3D model or software screenshot — NOT a photo
 * - diagram: map, infographic, labelled diagram, chart
 * - mixed: combines real footage with drawings or animation (most edited videos, not checked frame by frame)
 * - document: report or PDF
 */
export const DEPICTIONS = ['photo', 'artwork', 'simulation', 'diagram', 'mixed', 'document'] as const
export type Depiction = (typeof DEPICTIONS)[number]

/** A reference to an external media file (not stored in the repository). */
export interface Media {
  id: string
  type: MediaType
  url: string
  /**
   * SHA-256 (64 lowercase hex) of the file at `url`, required for 3D models (V19, ADR-028): the
   * site refuses to show a model whose bytes changed since the team verified it.
   */
  sha256?: string
  pageUrl: string
  title: string | null
  /** Caption copied verbatim from the source page (English), or null if none is shown. */
  caption: string | null
  alt: LocalizedText
  credit: string | null
  license: string
  missionIds: string[]
  machineIds: string[]
  sourceId: string
  aiGenerated: boolean
  /**
   * What the media really shows. The frontend MUST display a visible label for anything other
   * than "photo" or "document" (e.g. "Artist's view — not a photo"), so that a drawing or a
   * simulation is never mistaken for evidence (CDC §8, CLAUDE.md §7).
   */
  depiction: Depiction
  /**
   * The story behind the picture, for a general audience (US-5.10): restates only what the
   * media's own caption says. Shown next to the picture in the mission log.
   */
  description?: LocalizedText
  /** Required with `description`: only a human reviewer may set "reviewed" (CLAUDE.md §7). */
  descriptionStatus?: 'draft' | 'reviewed'
  /** Small preview image (NASA Image and Video Library items), when available. */
  thumbnailUrl?: string | null
  /**
   * A mid-size copy of the same picture (≤ ~1 900 px) that is known to exist, for pages that
   * draw it in a column or full screen; the original stays `url`. Filled by a verified script
   * (US-5.14): never guessed, since the library does not publish every size of every picture.
   */
  largeUrl?: string | null
  /** NASA Image and Video Library identifier, when the media comes from it. */
  nasaId?: string
  dateCreated?: string | null
}

/**
 * A word a 10–15 year old may not know, explained in one or two sentences taken from the
 * stories' own wording and sourced like them. Shown next to the story steps that use it.
 */
export interface GlossaryEntry {
  id: string
  status: 'draft' | 'reviewed'
  /** Forms of the word as they appear in the story texts, per language (case-insensitive). */
  terms: { en: string[]; fr: string[] }
  label: LocalizedText
  definition: LocalizedText
  sourceIds: string[]
}

export interface Content {
  destinations: Destination[]
  missions: Mission[]
  machines: Machine[]
  relations: Relation[]
  stories: Story[]
  sources: Source[]
  media: Media[]
  glossary: GlossaryEntry[]
}
